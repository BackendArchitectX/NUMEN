import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpRight, FileSearch, Search, X } from 'lucide-react'
import type { DatasetRecord, TaskStatus } from '../model/types'
import { clip } from '../shared/text'

interface DatasetExplorerProps {
  records: DatasetRecord[]
  status: TaskStatus
  query: string
  minQuality: number
  onQueryChange: (value: string) => void
  onMinQualityChange: (value: number) => void
}

type SortKey = 'title' | 'organization' | 'location' | 'qualityScore' | 'sourceName'
type SortDirection = 'asc' | 'desc'

export function DatasetExplorer({ records, status, query, minQuality, onQueryChange, onMinQualityChange }: DatasetExplorerProps) {
  const [sortKey, setSortKey] = useState<SortKey>('qualityScore')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedRecordId, setSelectedRecordId] = useState<string>()
  const inspectorRef = useRef<HTMLElement>(null)

  const sortedRecords = useMemo(() => [...records].sort((left, right) => {
    const leftValue = left[sortKey]
    const rightValue = right[sortKey]
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, { sensitivity: 'base' })
    return sortDirection === 'asc' ? comparison : -comparison
  }), [records, sortKey, sortDirection])

  const selectedRecord = records.find(record => record.id === selectedRecordId)
  const containsDemoData = records.some(record => record.sourceType === 'DEMO')

  useEffect(() => {
    if (!selectedRecord) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const inspector = inspectorRef.current
    const focusable = () => inspector
      ? [...inspector.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      : []

    window.requestAnimationFrame(() => focusable()[0]?.focus())

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSelectedRecordId(undefined)
        return
      }

      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [selectedRecord])

  const sortBy = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection(key === 'qualityScore' ? 'desc' : 'asc')
  }

  return <section className="results panel" aria-labelledby="dataset-heading">
    <div className="resultsHeader">
      <div className="resultsTitle"><FileSearch size={18} aria-hidden="true"/><div><h3 id="dataset-heading">Results</h3><span>{records.length} visible rows</span></div></div>
      <div className="filters">
        <label className="searchField"><span className="srOnly">Search records</span><Search size={15} aria-hidden="true"/><input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search results"/></label>
        <label className="srOnly" htmlFor="quality-filter">Minimum data quality</label>
        <select id="quality-filter" aria-label="Minimum data quality" value={minQuality} onChange={event => onMinQualityChange(Number(event.target.value))}>
          <option value={0}>All records</option><option value={80}>Quality 80%+</option><option value={90}>Quality 90%+</option>
        </select>
      </div>
    </div>

    {containsDemoData && <div className="demoNotice" role="note"><strong>Demo dataset</strong><span>These sample records are for product evaluation and are not live market intelligence.</span></div>}

    <div className="tableWrap"><table>
      <caption className="srOnly">Collected intelligence records and source provenance</caption>
      <thead><tr>
        <SortableHeader label="Result" column="title" active={sortKey} direction={sortDirection} onSort={sortBy}/>
        <SortableHeader label="Organization" column="organization" active={sortKey} direction={sortDirection} onSort={sortBy}/>
        <SortableHeader label="Location" column="location" active={sortKey} direction={sortDirection} onSort={sortBy}/>
        <SortableHeader label="Data quality" column="qualityScore" active={sortKey} direction={sortDirection} onSort={sortBy}/>
        <SortableHeader label="Source" column="sourceName" active={sortKey} direction={sortDirection} onSort={sortBy}/>
      </tr></thead>
      <tbody>
        {sortedRecords.map(record => <tr key={record.id} className={record.id === selectedRecordId ? 'selectedRow' : undefined}>
          <td><button type="button" className="recordTitleButton" aria-haspopup="dialog" onClick={() => setSelectedRecordId(record.id)}><strong>{record.title}</strong><small>{clip(record.excerpt, 78)}</small></button></td>
          <td>{record.organization || '—'}</td>
          <td>{record.location || '—'}</td>
          <td><span className="quality" title="Persisted data-quality score">{Math.round(record.qualityScore)}%</span></td>
          <td>{record.sourceUrl.startsWith('http')
            ? <a href={record.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source ${record.sourceName} in a new tab`}>{record.sourceName}<ArrowUpRight size={13} aria-hidden="true"/></a>
            : <span className="demoSource">{record.sourceName || 'Demo source'}</span>}</td>
        </tr>)}
        {!records.length && <tr><td colSpan={5} className="empty">{emptyMessage(status, query, minQuality)}</td></tr>}
      </tbody>
    </table></div>

    {selectedRecord && <>
      <div className="inspectorBackdrop" aria-hidden="true" onClick={() => setSelectedRecordId(undefined)}/>
      <aside ref={inspectorRef} className="recordInspector" role="dialog" aria-modal="true" aria-labelledby="record-inspector-title">
        <div className="inspectorHeader">
          <div><span>Record evidence</span><h4 id="record-inspector-title">{selectedRecord.title}</h4><p>{selectedRecord.organization || 'Unknown organization'}</p></div>
          <button type="button" className="iconAction" onClick={() => setSelectedRecordId(undefined)} aria-label="Close record evidence"><X size={17} aria-hidden="true"/></button>
        </div>

        <div className="evidenceTrust">
          <span className={selectedRecord.sourceType === 'DEMO' ? 'trustDemo' : 'trustSource'}>
            {selectedRecord.sourceType === 'DEMO' ? 'Demo record' : 'Source-backed record'}
          </span>
          <span>Collected {formatRelative(selectedRecord.collectedAt)}</span>
        </div>

        <div className="inspectorGrid">
          <Detail label="Organization" value={selectedRecord.organization || '—'}/>
          <Detail label="Location" value={selectedRecord.location || '—'}/>
          <Detail label="Data quality" value={`${Math.round(selectedRecord.qualityScore)}%`}/>
          <Detail label="Source type" value={selectedRecord.sourceType || '—'}/>
          <Detail label="Collected" value={formatDate(selectedRecord.collectedAt)}/>
          <Detail label="Fingerprint" value={selectedRecord.fingerprint || '—'} code/>
        </div>

        <div className="evidenceExcerpt">
          <span>Captured evidence</span>
          <p>{selectedRecord.excerpt || 'No excerpt was persisted for this record.'}</p>
        </div>

        <div className="evidenceSource">
          <span>Source</span>
          {selectedRecord.sourceUrl.startsWith('http')
            ? <a href={selectedRecord.sourceUrl} target="_blank" rel="noreferrer">{selectedRecord.sourceName || selectedRecord.sourceUrl}<ArrowUpRight size={13} aria-hidden="true"/></a>
            : <code>{selectedRecord.sourceUrl}</code>}
        </div>
      </aside>
    </>}
  </section>
}

function SortableHeader({ label, column, active, direction, onSort }: {
  label: string
  column: SortKey
  active: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
}) {
  const selected = active === column
  return <th scope="col" aria-sort={selected ? direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" className="sortButton" onClick={() => onSort(column)} aria-label={`Sort by ${label.toLowerCase()}`}>
    {label}{selected ? direction === 'asc' ? <ArrowUp size={12} aria-hidden="true"/> : <ArrowDown size={12} aria-hidden="true"/> : null}
  </button></th>
}

function Detail({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return <div><span>{label}</span>{code ? <code className="codeValue">{value}</code> : <strong>{value}</strong>}</div>
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatRelative(value: string): string {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 'recently'
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function emptyMessage(status: TaskStatus, query: string, minQuality: number): string {
  if (status === 'COMPLETED' && (query.trim() || minQuality > 0)) return 'No records match the current filters. Clear or relax the filters to see more results.'
  if (status === 'COMPLETED') return 'This run completed without publishable records.'
  if (status === 'FAILED') return 'Research stopped before a publishable dataset was available. Open Run details for diagnostics.'
  if (status === 'CANCELLED') return 'This research run was cancelled before a publishable dataset was available.'
  return 'Results will appear here when publishable records are available.'
}
