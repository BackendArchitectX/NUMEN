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
  return <section className="results panel">
    <div className="resultsHeader">
      <div><FileSearch size={18}/><h3>Dataset explorer</h3><span>{records.length} rows</span></div>
      <div className="filters">
        <label><Search size={15}/><input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search records"/></label>
        <select value={minQuality} onChange={event => onMinQualityChange(Number(event.target.value))}>
          <option value={0}>All quality</option><option value={80}>80%+</option><option value={90}>90%+</option>
        </select>
      </div>
    </div>
    <div className="tableWrap"><table><thead><tr><th>INTELLIGENCE</th><th>ORGANIZATION</th><th>LOCATION</th><th>QUALITY</th><th>SOURCE</th></tr></thead><tbody>
      {records.map(record => <tr key={record.id}>
        <td><strong>{record.title}</strong><small>{clip(record.excerpt, 78)}</small></td>
        <td>{record.organization}</td><td>{record.location}</td>
        <td><span className="quality">{Math.round(record.qualityScore)}%</span></td>
        <td>{record.sourceUrl.startsWith('http')
          ? <a href={record.sourceUrl} target="_blank" rel="noreferrer">{record.sourceName}<ArrowUpRight size={13}/></a>
          : <span className="demoSource">{record.sourceName}</span>}</td>
      </tr>)}
      {!records.length && <tr><td colSpan={5} className="empty">{emptyMessage(status)}</td></tr>}
    </tbody></table></div>
  </section>
}

function emptyMessage(status: TaskStatus): string {
  if (status === 'COMPLETED') return 'No records match the current filters.'
  if (status === 'FAILED') return 'Collection failed. Review the workflow message above.'
  return 'Records will appear here as the workflow completes.'
}
