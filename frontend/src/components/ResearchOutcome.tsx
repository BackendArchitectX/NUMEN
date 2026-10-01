import type { ReactNode } from 'react'
import { Building2, CheckCircle2, Clock3, Database, Download, MapPin, Radio } from 'lucide-react'
import type { DatasetSummary, LoadState, Task } from '../model/types'
import { clip } from '../shared/text'

interface ResearchOutcomeProps {
  task: Task
  summary?: DatasetSummary
  summaryState: LoadState
  exportUrl: string
}

export function ResearchOutcome({ task, summary, summaryState, exportUrl }: ResearchOutcomeProps) {
  const totalRecords = summary?.totalRecords ?? task.recordCount
  const hasResults = totalRecords > 0
  const allDemo = Boolean(summary ? summary.totalRecords > 0 && summary.demoRecords === summary.totalRecords : task.demoMode && hasResults)
  const mixedDemo = Boolean(summary && summary.demoRecords > 0 && summary.demoRecords < summary.totalRecords)
  const updatedAt = summary?.latestCollectedAt || task.completedAt || task.createdAt

  return <section className="researchOutcome panel" aria-labelledby={`outcome-${task.id}`}>
    <div className="outcomeHeader">
      <div className="outcomeTitle">
        <span className={`outcomeState ${allDemo || mixedDemo ? 'demo' : hasResults ? 'ready' : 'empty'}`}>
          {allDemo || mixedDemo ? <Database size={14} aria-hidden="true"/> : <CheckCircle2 size={14} aria-hidden="true"/>}
          {allDemo ? 'Demo dataset' : mixedDemo ? 'Mixed dataset' : hasResults ? 'Research ready' : 'Research complete'}
        </span>
        <h2 id={`outcome-${task.id}`}>{clip(task.prompt, 120)}</h2>
        <p>{summary ? summaryText(summary) : hasResults ? summaryState === 'error' ? 'Published results are ready, but dataset-wide coverage is temporarily unavailable.' : 'Published results are ready. Loading exact dataset coverage…' : 'No publishable results were produced for this run.'}</p>
      </div>
      {hasResults && <a className="primaryAction" href={exportUrl}><Download size={15} aria-hidden="true"/> Export CSV</a>}
    </div>

    {summary ? <>
      <div className="outcomeStats" aria-label="Research outcome summary">
        <OutcomeStat icon={<Database/>} label="Results" value={summary.totalRecords.toString()} detail={allDemo ? 'sample records' : mixedDemo ? 'mixed-source records' : 'published records'}/>
        <OutcomeStat icon={<Building2/>} label="Organizations" value={summary.uniqueOrganizations.toString()} detail="unique values"/>
        <OutcomeStat icon={<Radio/>} label="Sources" value={summary.uniqueSources.toString()} detail="contributing sources"/>
        <OutcomeStat icon={<MapPin/>} label="Locations" value={summary.uniqueLocations.toString()} detail="unique values"/>
        <OutcomeStat icon={<CheckCircle2/>} label="Evidence linked" value={`${summary.evidenceLinkedRecords}/${summary.totalRecords}`} detail="records with captured evidence"/>
        <OutcomeStat icon={<Clock3/>} label="Updated" value={formatRelative(updatedAt)} detail={formatDate(updatedAt)}/>
      </div>

      {summary.topLocations.length > 0 && <div className="outcomeContext">
        <span>Top locations</span>
        <div>{summary.topLocations.map(item => <span key={item.value}>{item.value} <b>{item.count}</b></span>)}</div>
      </div>}
    </> : hasResults && (summaryState === 'error'
      ? <div className="outcomeLoading errorState" role="alert">Dataset-wide coverage could not be loaded. The published result table remains available.</div>
      : <div className="outcomeLoading" role="status">Loading exact dataset summary…</div>)}
  </section>
}

function OutcomeStat({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="outcomeStat">
    <span className="outcomeStatIcon" aria-hidden="true">{icon}</span>
    <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
  </div>
}

function summaryText(summary: DatasetSummary): string {
  if (summary.totalRecords === 0) return 'No publishable results were produced for this run.'

  const resultLabel = summary.totalRecords === 1 ? 'result' : 'results'
  const organizationLabel = summary.uniqueOrganizations === 1 ? 'organization' : 'organizations'
  const sourceLabel = summary.uniqueSources === 1 ? 'source' : 'sources'

  if (summary.demoRecords === summary.totalRecords) {
    return `${summary.totalRecords} sample ${resultLabel} across ${summary.uniqueOrganizations} ${organizationLabel} from ${summary.uniqueSources} demo ${sourceLabel}. Demo content is clearly separated from live intelligence.`
  }

  if (summary.demoRecords > 0) {
    return `${summary.totalRecords} published ${resultLabel} across ${summary.uniqueOrganizations} ${organizationLabel} from ${summary.uniqueSources} ${sourceLabel}. ${summary.demoRecords} records are explicitly marked as demo content.`
  }

  return `${summary.totalRecords} published ${resultLabel} across ${summary.uniqueOrganizations} ${organizationLabel} from ${summary.uniqueSources} contributing ${sourceLabel}. Open any row to inspect its captured evidence.`
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatRelative(value: string): string {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 'Recently'
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000))
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
