import { CheckCircle2, CircleAlert, Database, Download, Radio, RefreshCw } from 'lucide-react'
import type { DatasetSummary, LoadState, Task } from '../model/types'
import { clip } from '../shared/text'

interface ResearchOutcomeProps {
  task: Task
  summary?: DatasetSummary
  summaryState: LoadState
  exportUrl: string
  onRefine: () => void
  onViewSources: () => void
}

export function ResearchOutcome({ task, summary, summaryState, exportUrl, onRefine, onViewSources }: ResearchOutcomeProps) {
  const totalRecords = summary?.totalRecords ?? task.recordCount
  const hasResults = totalRecords > 0
  const allDemo = Boolean(summary ? summary.totalRecords > 0 && summary.demoRecords === summary.totalRecords : task.demoMode && hasResults)
  const mixedDemo = Boolean(summary && summary.demoRecords > 0 && summary.demoRecords < summary.totalRecords)
  const updatedAt = summary?.latestCollectedAt || task.completedAt || task.createdAt
  const limited = Boolean(
    summary
      && (summary.sourceCoverageState === 'PARTIAL'
        || summary.sourceCoverageState === 'NONE'
        || summary.failedSources > 0
        || summary.notAttemptedSources > 0)
      && hasResults
      && !allDemo
  )

  return <section className="researchOutcome panel" aria-labelledby={`outcome-${task.id}`}>
    <div className="outcomeHeader">
      <div className="outcomeTitle">
        <span className={`outcomeState ${allDemo || mixedDemo ? 'demo' : limited ? 'limited' : hasResults ? 'ready' : 'empty'}`}>
          {allDemo || mixedDemo
            ? <Database size={14} aria-hidden="true"/>
            : limited
              ? <CircleAlert size={14} aria-hidden="true"/>
              : <CheckCircle2 size={14} aria-hidden="true"/>}
          {allDemo ? 'Demo dataset' : mixedDemo ? 'Mixed dataset' : limited ? 'Complete with limitations' : 'Research complete'}
        </span>
        <h2 id={`outcome-${task.id}`}>{clip(task.prompt, 120)}</h2>
        <p>{summary ? summaryText(summary) : hasResults ? summaryState === 'error' ? 'Published results are ready, but dataset-wide coverage is temporarily unavailable.' : 'Published results are ready. Loading exact dataset coverage…' : 'No publishable results were produced for this run.'}</p>
      </div>

      <div className="outcomeActions" aria-label="Research actions">
        <button type="button" className="secondaryAction" onClick={onRefine}><RefreshCw size={14} aria-hidden="true"/> Refine research</button>
        {(task.sourceUrls.length > 0 || task.demoMode || hasResults) && <button type="button" className="secondaryAction" onClick={onViewSources}><Radio size={14} aria-hidden="true"/> View sources</button>}
        {hasResults && <a className="secondaryAction" href={exportUrl}><Download size={15} aria-hidden="true"/> Export CSV</a>}
      </div>
    </div>

    {summary ? <>
      <div className="outcomeFacts" aria-label="Research outcome summary">
        <OutcomeFact label="Results" value={summary.totalRecords.toString()} detail={allDemo ? 'sample records' : mixedDemo ? 'mixed-source records' : 'published records'}/>
        <OutcomeFact label="Organizations" value={summary.uniqueOrganizations.toString()} detail="unique values"/>
        <OutcomeFact label="Sources" value={sourceCoverageValue(summary)} detail={summary.configuredSources > 0 ? 'collected / configured' : 'contributing sources'}/>
        <OutcomeFact label="Locations" value={summary.uniqueLocations.toString()} detail="unique values"/>
        <OutcomeFact
          label="Evidence linked"
          value={summary.totalRecords > 0 ? `${summary.evidenceLinkedRecords}/${summary.totalRecords}` : '—'}
          detail={summary.totalRecords > 0 ? 'records with captured evidence' : 'no published records'}
        />
        <OutcomeFact label="Updated" value={formatRelative(updatedAt)} detail={formatDate(updatedAt)}/>
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

function OutcomeFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="outcomeFact">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>
}

function summaryText(summary: DatasetSummary): string {
  if (summary.totalRecords === 0) return 'No publishable results were produced for this run. Refine the question or source scope and run the research again.'

  const resultLabel = summary.totalRecords === 1 ? 'result' : 'results'
  const organizationLabel = summary.uniqueOrganizations === 1 ? 'organization' : 'organizations'
  const sourceLabel = summary.uniqueSources === 1 ? 'source' : 'sources'

  if (summary.demoRecords === summary.totalRecords) {
    return `${summary.totalRecords} sample ${resultLabel} across ${summary.uniqueOrganizations} ${organizationLabel} from ${summary.uniqueSources} demo ${sourceLabel}. Demo content is for product evaluation and is not live intelligence.`
  }

  if (summary.demoRecords > 0) {
    return `${summary.totalRecords} published ${resultLabel} across ${summary.uniqueOrganizations} ${organizationLabel} from ${summary.uniqueSources} ${sourceLabel}. ${summary.demoRecords} records are explicitly marked as demo content.`
  }

  return `${summary.totalRecords} published ${resultLabel} across ${summary.uniqueOrganizations} ${organizationLabel} from ${summary.uniqueSources} contributing ${sourceLabel}.${sourceLimitationText(summary)} Open a result to inspect its captured evidence.`
}

function sourceLimitationText(summary: DatasetSummary): string {
  const details: string[] = []
  if (summary.unavailableSources > 0) details.push(`${summary.unavailableSources} unavailable`)
  if (summary.unauthorizedSources > 0) details.push(`${summary.unauthorizedSources} access denied`)
  if (summary.rejectedSources > 0) details.push(`${summary.rejectedSources} rejected by source policy`)
  if (summary.rateLimitedSources > 0) details.push(`${summary.rateLimitedSources} rate limited`)
  if (summary.notAttemptedSources > 0) details.push(`${summary.notAttemptedSources} not attempted`)

  const classifiedFailures = summary.unavailableSources
    + summary.unauthorizedSources
    + summary.rejectedSources
    + summary.rateLimitedSources
  const unclassifiedFailures = Math.max(0, summary.failedSources - classifiedFailures)
  if (unclassifiedFailures > 0) details.push(`${unclassifiedFailures} failed`)

  if (!details.length) return ''
  return ` Source limitations: ${details.join(', ')}.`
}

function sourceCoverageValue(summary: DatasetSummary): string {
  if (summary.configuredSources <= 0) return summary.uniqueSources.toString()
  return `${summary.successfulSources}/${summary.configuredSources}`
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
