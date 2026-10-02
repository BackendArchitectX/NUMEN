import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, FileSearch, Search, X } from 'lucide-react'
import type { DatasetRecord, DatasetSortKey, LoadState, SortDirection, TaskStatus } from '../model/types'
import { clip } from '../shared/text'
import { formatInstant, formatRelativeInstant } from '../shared/time'
import { safeExternalHttpUrl, sourceHostname, sourceProvenanceLabel } from '../shared/sourceUrl'

interface DatasetExplorerProps {
  records: DatasetRecord[]
  totalRecords: number
  matchedRecords: number
  demoRecords?: number
  generalResearch?: boolean
  status: TaskStatus
  loadState: LoadState
  query: string
  minQuality: number
  page: number
  pageSize: number
  totalPages: number
  sortKey: DatasetSortKey
  sortDirection: SortDirection
  onQueryChange: (value: string) => void
  onMinQualityChange: (value: number) => void
  onSort: (key: DatasetSortKey) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function DatasetExplorer({
  records,
  totalRecords,
  matchedRecords,
  demoRecords = 0,
  generalResearch = false,
  status,
  loadState,
  query,
  minQuality,
  page,
  pageSize,
  totalPages,
  sortKey,
  sortDirection,
  onQueryChange,
  onMinQualityChange,
  onSort,
  onPageChange,
  onPageSizeChange
}: DatasetExplorerProps) {
  const [selectedRecordId, setSelectedRecordId] = useState<string>()
  const inspectorRef = useRef<HTMLElement>(null)

  const selectedRecord = records.find(record => record.id === selectedRecordId)
  const sourceUrlsByLabel = new Map<string, Set<string>>()
  for (const record of records) {
    const base = (record.sourceName?.trim() || sourceHostname(record.sourceUrl) || 'source').toLowerCase()
    const urls = sourceUrlsByLabel.get(base) ?? new Set<string>()
    if (record.sourceUrl) urls.add(record.sourceUrl)
    sourceUrlsByLabel.set(base, urls)
  }
  const selectedSourceHref = selectedRecord ? safeExternalHttpUrl(selectedRecord.sourceUrl) : undefined
  const selectedSourceHost = selectedRecord ? sourceHostname(selectedRecord.sourceUrl) : ''
  const selectedSourceBaseLabel = selectedRecord?.sourceName?.trim() || selectedSourceHost
  const selectedSourceLabel = selectedRecord
    ? sourceProvenanceLabel(
        selectedRecord.sourceName,
        selectedRecord.sourceUrl,
        (sourceUrlsByLabel.get((selectedSourceBaseLabel || 'source').toLowerCase())?.size ?? 0) > 1
      )
    : ''
  const selectedSourceHasDistinctHost = Boolean(
    selectedSourceHost && selectedSourceLabel && selectedSourceHost.toLowerCase() !== selectedSourceLabel.toLowerCase()
  )
  const filtered = Boolean(query.trim()) || minQuality > 0
  const pageStart = matchedRecords > 0 ? page * pageSize + 1 : 0
  const pageEnd = matchedRecords > 0 ? Math.min(page * pageSize + records.length, matchedRecords) : 0
  const allDemo = totalRecords > 0 && demoRecords === totalRecords
  const mixedDemo = demoRecords > 0 && demoRecords < totalRecords

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

  useEffect(() => {
    if (selectedRecordId && !records.some(record => record.id === selectedRecordId)) {
      setSelectedRecordId(undefined)
    }
  }, [records, selectedRecordId])

  const clearFilters = () => {
    onQueryChange('')
    onMinQualityChange(0)
  }

  return <section className="results panel" aria-labelledby="dataset-heading" aria-busy={loadState === 'loading'}>
    <div className="resultsHeader">
      <div className="resultsTitle">
        <FileSearch size={18} aria-hidden="true"/>
        <div>
          <h3 id="dataset-heading">Results</h3>
          <span>{resultRangeText(loadState, filtered, pageStart, pageEnd, matchedRecords, totalRecords)}</span>
        </div>
      </div>

      <div className="filters">
        <label className="searchField">
          <span className="srOnly">Search records</span>
          <Search size={15} aria-hidden="true"/>
          <input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search results"/>
        </label>
        <label className="srOnly" htmlFor="quality-filter">Minimum record heuristic</label>
        <select
          id="quality-filter"
          aria-label={allDemo ? 'Record heuristic filter unavailable for demo records' : 'Minimum record heuristic'}
          value={allDemo ? 0 : minQuality}
          disabled={allDemo}
          onChange={event => onMinQualityChange(Number(event.target.value))}
        >
          <option value={0}>{allDemo ? 'Demo records · no quality filter' : 'All records'}</option>
          {!allDemo && <option value={80}>Record heuristic 80+</option>}
          {!allDemo && <option value={90}>Record heuristic 90+</option>}
        </select>
        {filtered && <button type="button" className="clearFilters" onClick={clearFilters}>Clear</button>}
      </div>
    </div>

    {allDemo && <div className="demoNotice" role="note"><strong>Demo dataset</strong><span>These sample records are for product evaluation and are not live market intelligence.</span></div>}
    {mixedDemo && <div className="demoNotice" role="note"><strong>Mixed dataset</strong><span>{demoRecords} of {totalRecords} published records are explicitly labeled demo content.</span></div>}

    <div className="tableWrap"><table>
      <caption className="srOnly">Collected intelligence records and source provenance</caption>
      <thead><tr>
        <SortableHeader label="Result" column="title" active={sortKey} direction={sortDirection} onSort={onSort}/>
        {!generalResearch && <SortableHeader label="Organization" column="organization" active={sortKey} direction={sortDirection} onSort={onSort}/>}
        {!generalResearch && <SortableHeader label="Location" column="location" active={sortKey} direction={sortDirection} onSort={onSort}/>}
        <SortableHeader label="Record heuristic" column="qualityScore" active={sortKey} direction={sortDirection} onSort={onSort}/>
        <SortableHeader label="Source" column="sourceName" active={sortKey} direction={sortDirection} onSort={onSort}/>
      </tr></thead>
      <tbody>
        {loadState === 'error'
          ? <tr><td colSpan={generalResearch ? 3 : 5} className="empty errorState">Results are temporarily unavailable. The research run remains persisted; retry by refreshing or reopening this dataset.</td></tr>
          : records.map(record => {
            const sourceHref = safeExternalHttpUrl(record.sourceUrl)
            const sourceHost = sourceHostname(record.sourceUrl)
            const sourceBaseLabel = record.sourceName?.trim() || sourceHost
            const sourceLabel = sourceProvenanceLabel(
              record.sourceName,
              record.sourceUrl,
              (sourceUrlsByLabel.get((sourceBaseLabel || 'source').toLowerCase())?.size ?? 0) > 1
            )
            const sourceHasDistinctHost = Boolean(
              sourceHost && sourceBaseLabel && sourceHost.toLowerCase() !== sourceBaseLabel.toLowerCase()
            )
            return <tr key={record.id} className={record.id === selectedRecordId ? 'selectedRow' : undefined}>
            <td><button type="button" className="recordTitleButton" aria-haspopup="dialog" onClick={() => setSelectedRecordId(record.id)}><strong>{record.title}</strong><small>{clip(record.excerpt, 78)}</small></button></td>
            {!generalResearch && <td>{record.organization || '—'}</td>}
            {!generalResearch && <td>{record.location || '—'}</td>}
            <td>{record.sourceType === 'DEMO'
              ? <span className="quality demoQuality" title="Demo records do not represent verified live-data quality">Sample</span>
              : <span className="quality" title="Persisted collection heuristic based on record/source fields; not factual confidence">{Math.round(record.qualityScore)}/100</span>}</td>
            <td>{sourceHref
              ? <a href={sourceHref} target="_blank" rel="noreferrer" aria-label={`Open source ${sourceHost || sourceLabel} in a new tab`}><span>{sourceLabel}</span>{sourceHasDistinctHost && <bdi className="sourceHost" dir="ltr">{sourceHost}</bdi>}<ArrowUpRight size={13} aria-hidden="true"/></a>
              : <span className="demoSource">{record.sourceType === 'DEMO' ? record.sourceName || 'Demo source' : 'External source URL unavailable'}</span>}</td>
          </tr>
          })}
        {loadState !== 'error' && loadState !== 'loading' && !records.length && <tr><td colSpan={generalResearch ? 3 : 5} className="empty">{emptyMessage(status, query, minQuality)}</td></tr>}
        {loadState === 'loading' && !records.length && <tr><td colSpan={generalResearch ? 3 : 5} className="empty">Loading results…</td></tr>}
      </tbody>
    </table></div>

    {(matchedRecords > 0 || loadState === 'loading') && <footer className="resultsPagination">
      <div className="pageSizeControl">
        <label htmlFor="page-size">Rows</label>
        <select id="page-size" value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      <div className="pageControls" aria-label="Result pages">
        <button type="button" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page <= 0 || loadState === 'loading'} aria-label="Previous result page"><ChevronLeft size={14} aria-hidden="true"/> Previous</button>
        <span>Page <strong>{totalPages ? page + 1 : 0}</strong> of <strong>{totalPages}</strong></span>
        <button type="button" onClick={() => onPageChange(Math.min(Math.max(0, totalPages - 1), page + 1))} disabled={page + 1 >= totalPages || loadState === 'loading'} aria-label="Next result page">Next <ChevronRight size={14} aria-hidden="true"/></button>
      </div>
      {filtered && <span className="exportScopeNote">CSV export includes the full published dataset.</span>}
    </footer>}

    {selectedRecord && <>
      <div className="inspectorBackdrop" aria-hidden="true" onClick={() => setSelectedRecordId(undefined)}/>
      <aside ref={inspectorRef} className="recordInspector" role="dialog" aria-modal="true" aria-labelledby="record-inspector-title">
        <div className="inspectorHeader">
          <div><span>Record evidence</span><h4 id="record-inspector-title">{selectedRecord.title}</h4><p>{generalResearch ? 'Evidence-backed research result' : selectedRecord.organization || 'Unknown organization'}</p></div>
          <button type="button" className="iconAction" onClick={() => setSelectedRecordId(undefined)} aria-label="Close record evidence"><X size={17} aria-hidden="true"/></button>
        </div>

        <div className="evidenceProvenance">
          <span className={selectedRecord.sourceType === 'DEMO' ? 'provenanceDemo' : 'provenanceSource'}>
            {selectedRecord.sourceType === 'DEMO' ? 'Demo record' : 'Source-backed record'}
          </span>
          <span title={formatInstant(selectedRecord.collectedAt)}>NUMEN collected {formatRelativeInstant(selectedRecord.collectedAt)}</span>
        </div>

        <div className="inspectorGrid">
          {!generalResearch && <Detail label="Organization" value={selectedRecord.organization || '—'}/>}
          {!generalResearch && <Detail label="Location" value={selectedRecord.location || '—'}/>}
          <Detail label="Record heuristic" value={selectedRecord.sourceType === 'DEMO' ? 'Not scored · demo' : `${Math.round(selectedRecord.qualityScore)}/100 · not factual confidence`}/>
          <Detail label="Source type" value={selectedRecord.sourceType || '—'}/>
          <Detail label="Collected by NUMEN" value={formatInstant(selectedRecord.collectedAt)}/>
          <Detail label="Record identity key" value={selectedRecord.fingerprint || '—'} code/>
          <Detail label="Evidence content hash" value={selectedRecord.evidenceHash || 'Unavailable · legacy record'} code/>
          <Detail label="Hash method" value={selectedRecord.evidenceHashAlgorithm || 'Unavailable'} code/>
        </div>

        <p className="evidenceHashNote">The evidence-content hash helps detect whether NUMEN captured identical normalized content across runs. It does not authenticate the source or establish factual truth.</p>

        <div className="evidenceExcerpt">
          <span>Captured evidence</span>
          <p>{selectedRecord.excerpt || 'No excerpt was persisted for this record.'}</p>
        </div>

        <div className="evidenceSource">
          <span>Source</span>
          {selectedSourceHref
            ? <a href={selectedSourceHref} target="_blank" rel="noreferrer"><span>{selectedSourceLabel}</span>{selectedSourceHasDistinctHost && <bdi className="sourceHost" dir="ltr">{selectedSourceHost}</bdi>}<ArrowUpRight size={13} aria-hidden="true"/></a>
            : <code>{selectedRecord.sourceType === 'DEMO' ? selectedRecord.sourceUrl : 'External source URL unavailable'}</code>}
        </div>
      </aside>
    </>}
  </section>
}

function SortableHeader({ label, column, active, direction, onSort }: {
  label: string
  column: DatasetSortKey
  active: DatasetSortKey
  direction: SortDirection
  onSort: (key: DatasetSortKey) => void
}) {
  const selected = active === column
  return <th scope="col" aria-sort={selected ? direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
    <button type="button" className="sortButton" onClick={() => onSort(column)} aria-label={`Sort by ${label.toLowerCase()}`}>
      {label}{selected ? direction === 'asc' ? <ArrowUp size={12} aria-hidden="true"/> : <ArrowDown size={12} aria-hidden="true"/> : null}
    </button>
  </th>
}

function Detail({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return <div><span>{label}</span>{code ? <code className="codeValue">{value}</code> : <strong>{value}</strong>}</div>
}

function resultRangeText(state: LoadState, filtered: boolean, start: number, end: number, matched: number, total: number): string {
  if (state === 'loading' && matched === 0) return 'Loading published results…'
  if (state === 'error') return 'Published result view unavailable'
  if (matched === 0) return filtered ? `0 matches · ${total} published` : `${total} published`
  return filtered
    ? `${start}–${end} of ${matched} matching · ${total} published`
    : `${start}–${end} of ${total} published`
}

function emptyMessage(status: TaskStatus, query: string, minQuality: number): string {
  if (status === 'COMPLETED' && (query.trim() || minQuality > 0)) return 'No records match the current filters. Clear or relax the filters to see more results.'
  if (status === 'COMPLETED') return 'This run completed without publishable records.'
  if (status === 'FAILED') return 'Research stopped before a publishable dataset was available. Open Run details for diagnostics.'
  if (status === 'CANCELLED') return 'This research run was cancelled before a publishable dataset was available.'
  return 'Results will appear here when publishable records are available.'
}
