import { useMemo, useState } from 'react'
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
        <label><span className="srOnly">Search records</span><Search size={15} aria-hidden="true"/><input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search results"/></label>
        <label className="srOnly" htmlFor="quality-filter">Minimum quality</label>
        <select id="quality-filter" aria-label="Minimum quality" value={minQuality} onChange={event => onMinQualityChange(Number(event.target.value))}>
          <option value={0}>All quality</option><option value={80}>80%+</option><option value={90}>90%+</option>
        </select>
      </div>
    </div>

    {containsDemoData && <div className="demoNotice" role="note"><strong>Demo data</strong><span>These sample records are for product evaluation and are not live market intelligence.</span></div>}

    <div className="tableWrap"><table>
      <caption className="srOnly">Collected intelligence records and source provenance</caption>
      <thead><tr>
        <SortableHeader label="Intelligence" column="title" active={sortKey} direction={sortDirection} onSort={sortBy}/>
        <SortableHeader label="Organization" column="organization" active={sortKey} direction={sortDirection} onSort={sortBy}/>
        <SortableHeader label="Location" column="location" active={sortKey} direction={sortDirection} onSort={sortBy}/>
        <SortableHeader label="Quality" column="qualityScore" active={sortKey} direction={sortDirection} onSort={sortBy}/>
        <SortableHeader label="Source" column="sourceName" active={sortKey} direction={sortDirection} onSort={sortBy}/>
      </tr></thead>
      <tbody>
        {sortedRecords.map(record => <tr key={record.id}>
          <td><button type="button" className="recordTitleButton" onClick={() => setSelectedRecordId(record.id)}><strong>{record.title}</strong><small>{clip(record.excerpt, 78)}</small></button></td>
          <td>{record.organization}</td><td>{record.location}</td>
          <td><span className="quality">{Math.round(record.qualityScore)}%</span></td>
          <td>{record.sourceUrl.startsWith('http')
            ? <a href={record.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source ${record.sourceName} in a new tab`}>{record.sourceName}<ArrowUpRight size={13} aria-hidden="true"/></a>
            : <span className="demoSource">{record.sourceName}</span>}</td>
        </tr>)}
        {!records.length && <tr><td colSpan={5} className="empty">{emptyMessage(status)}</td></tr>}
      </tbody>
    </table></div>

    {selectedRecord && <aside className="recordInspector" aria-labelledby="record-inspector-title">
      <div className="inspectorHeader">
        <div><span>Record evidence</span><h4 id="record-inspector-title">{selectedRecord.title}</h4></div>
        <button type="button" className="iconAction" onClick={() => setSelectedRecordId(undefined)} aria-label="Close record evidence"><X size={17} aria-hidden="true"/></button>
      </div>
      <div className="inspectorGrid">
        <Detail label="Organization" value={selectedRecord.organization || '—'}/>
        <Detail label="Location" value={selectedRecord.location || '—'}/>
        <Detail label="Quality" value={`${Math.round(selectedRecord.qualityScore)}%`}/>
        <Detail label="Source type" value={selectedRecord.sourceType || '—'}/>
        <Detail label="Collected" value={formatDate(selectedRecord.collectedAt)}/>
        <Detail label="Fingerprint" value={selectedRecord.fingerprint || '—'} code/>
      </div>
      <div className="evidenceExcerpt"><span>Captured excerpt</span><p>{selectedRecord.excerpt || 'No excerpt was persisted for this record.'}</p></div>
      <div className="evidenceSource">
        <span>Source</span>
        {selectedRecord.sourceUrl.startsWith('http')
          ? <a href={selectedRecord.sourceUrl} target="_blank" rel="noreferrer">{selectedRecord.sourceName || selectedRecord.sourceUrl}<ArrowUpRight size={13} aria-hidden="true"/></a>
          : <code>{selectedRecord.sourceUrl}</code>}
      </div>
    </aside>}
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
  return <th scope="col"><button type="button" className="sortButton" onClick={() => onSort(column)} aria-label={`Sort by ${label.toLowerCase()}`}>
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

function emptyMessage(status: TaskStatus): string {
  if (status === 'COMPLETED') return 'No records match the current filters.'
  if (status === 'FAILED') return 'Research failed. Review the run details above.'
  if (status === 'CANCELLED') return 'This research run was cancelled before a publishable dataset was available.'
  return 'Results will appear here as the research run completes.'
}
