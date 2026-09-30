import { ArrowUpRight, FileSearch, Search } from 'lucide-react'
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

export function DatasetExplorer({ records, status, query, minQuality, onQueryChange, onMinQualityChange }: DatasetExplorerProps) {
  return <section className="results panel" aria-labelledby="dataset-heading">
    <div className="resultsHeader">
      <div><FileSearch size={18} aria-hidden="true"/><h3 id="dataset-heading">Dataset explorer</h3><span>{records.length} rows</span></div>
      <div className="filters">
        <label><span className="srOnly">Search records</span><Search size={15} aria-hidden="true"/><input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search records"/></label>
        <label className="srOnly" htmlFor="quality-filter">Minimum quality</label>
        <select id="quality-filter" aria-label="Minimum quality" value={minQuality} onChange={event => onMinQualityChange(Number(event.target.value))}>
          <option value={0}>All quality</option><option value={80}>80%+</option><option value={90}>90%+</option>
        </select>
      </div>
    </div>
    <div className="tableWrap"><table>
      <caption className="srOnly">Collected intelligence records and source provenance</caption>
      <thead><tr><th scope="col">INTELLIGENCE</th><th scope="col">ORGANIZATION</th><th scope="col">LOCATION</th><th scope="col">QUALITY</th><th scope="col">SOURCE</th></tr></thead>
      <tbody>
        {records.map(record => <tr key={record.id}>
          <td><strong>{record.title}</strong><small>{clip(record.excerpt, 78)}</small></td>
          <td>{record.organization}</td><td>{record.location}</td>
          <td><span className="quality">{Math.round(record.qualityScore)}%</span></td>
          <td>{record.sourceUrl.startsWith('http')
            ? <a href={record.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source ${record.sourceName} in a new tab`}>{record.sourceName}<ArrowUpRight size={13} aria-hidden="true"/></a>
            : <span className="demoSource">{record.sourceName}</span>}</td>
        </tr>)}
        {!records.length && <tr><td colSpan={5} className="empty">{emptyMessage(status)}</td></tr>}
      </tbody>
    </table></div>
  </section>
}

function emptyMessage(status: TaskStatus): string {
  if (status === 'COMPLETED') return 'No records match the current filters.'
  if (status === 'FAILED') return 'Collection failed. Review the workflow message above.'
  return 'Records will appear here as the workflow completes.'
}
