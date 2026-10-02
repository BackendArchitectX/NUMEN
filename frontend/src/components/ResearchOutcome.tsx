import { CheckCircle2, CircleAlert, Database, Download, Radio, RefreshCw } from 'lucide-react'
import type { DatasetSummary, LoadState, RunChangeSummary, Task } from '../model/types'
import { isGeneralResearchTask } from '../shared/research'
import { clip } from '../shared/text'
import { formatInstant, formatRelativeInstant } from '../shared/time'

interface ResearchOutcomeProps {
  task: Task
  summary?: DatasetSummary
  summaryState: LoadState
  changes?: RunChangeSummary
  changesState?: LoadState
  exportUrl: string
  onRefine: () => void
  onViewSources: () => void
}

export function ResearchOutcome({ task, summary, summaryState, changes, changesState = 'idle', exportUrl, onRefine, onViewSources }: ResearchOutcomeProps) {
  const totalRecords = summary?.totalRecords ?? task.recordCount
  const generalResearch = isGeneralResearchTask(task)
  const hasResults = totalRecords > 0
  const allDemo = Boolean(summary ? summary.totalRecords > 0 && summary.demoRecords === summary.totalRecords : task.demoMode && hasResults)
  const mixedDemo = Boolean(summary && summary.demoRecords > 0 && summary.demoRecords < summary.totalRecords)
  const temporalReference = outcomeTemporalReference(task, summary)
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
        <p>{summary ? summaryText(summary, generalResearch) : hasResults ? summaryState === 'error' ? 'Published results are ready, but dataset-wide coverage is temporarily unavailable.' : 'Published results are ready. Loading exact dataset coverage…' : 'No publishable results were produced for this run.'}</p>
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
        {!generalResearch && <OutcomeFact label="Organizations" value={summary.uniqueOrganizations.toString()} detail="unique values"/>}
        <OutcomeFact label="Sources" value={sourceCoverageValue(summary)} detail={summary.configuredSources > 0 ? 'collected / configured' : 'contributing sources'}/>
        {!generalResearch && <OutcomeFact label="Locations" value={summary.uniqueLocations.toString()} detail="unique values"/>}
        <OutcomeFact
          label="Evidence linked"
          value={summary.totalRecords > 0 ? `${summary.evidenceLinkedRecords}/${summary.totalRecords}` : '—'}
          detail={summary.totalRecords > 0 ? 'records with captured evidence' : 'no published records'}
        />
        <OutcomeFact label={temporalReference.label} value={formatRelativeInstant(temporalReference.value)} detail={formatInstant(temporalReference.value)}/>
      </div>

      {summary.totalRecords > 0 && <div className="outcomeIntegrity" role="note">
        <div>
          <span>Snapshot integrity</span>
          <strong>{summary.evidenceHashedRecords == null ? 'Evidence-content hashes unavailable for this dataset' : `${summary.evidenceHashedRecords}/${summary.totalRecords} evidence-content hashes available`}</strong>
          <small>Hashes help detect captured-content changes. They do not prove source authenticity, independence or factual truth.</small>
        </div>
        {(summary.matchingEvidenceSnapshotGroups ?? 0) > 0 && <p>
          {summary.matchingEvidenceSnapshotGroups} exact matching evidence {summary.matchingEvidenceSnapshotGroups === 1 ? 'snapshot group appears' : 'snapshot groups appear'} across multiple source URLs. Matching captures are not independent corroboration.
        </p>}
      </div>}

      <RunChangeContext changes={changes} state={changesState}/>

      {!generalResearch && summary.topLocations.length > 0 && <div className="outcomeContext">
        <span>Top locations</span>
        <div>{summary.topLocations.map(item => <span key={item.value}>{item.value} <b>{item.count}</b></span>)}</div>
      </div>}
    </> : hasResults && (summaryState === 'error'
      ? <div className="outcomeLoading errorState" role="alert">Dataset-wide coverage could not be loaded. The published result table remains available.</div>
      : <div className="outcomeLoading" role="status">Loading exact dataset summary…</div>)}
  </section>
}

function RunChangeContext({ changes, state }: { changes?: RunChangeSummary; state: LoadState }) {
  if (state === 'loading') {
    return <div className="changeContext" role="status"><span>Previous-run comparison</span><small>Checking the latest equivalent completed run…</small></div>
  }
  if (state === 'error') {
    return <div className="changeContext limited" role="note"><span>Previous-run comparison unavailable</span><small>The current dataset remains available; NUMEN is not making a change claim.</small></div>
  }
  if (!changes || state !== 'ready') return null

  if (changes.status === 'NO_BASELINE') {
    return <div className="changeContext"><span>First comparable snapshot</span><small>No earlier completed run with the same normalized question, mode and source scope is available for comparison.</small></div>
  }
  if (changes.status === 'CURRENT_NOT_COMPLETED') return null

  const baselineTime = changes.baselineCompletedAt ? formatInstant(changes.baselineCompletedAt) : 'the previous comparable run'
  if (changes.completeObservation) {
    const headline = changes.changedSources === 0
      ? `No captured snapshot changes detected across ${changes.comparedSources} observed ${changes.comparedSources === 1 ? 'source' : 'sources'}`
      : `${changes.changedSources} of ${changes.comparedSources} observed source ${changes.comparedSources === 1 ? 'snapshot changed' : 'snapshots changed'}`

    return <div className={`changeContext ${changes.changedSources > 0 ? 'changed' : 'stable'}`}>
      <span>Compared with previous equivalent run</span>
      <strong>{headline}</strong>
      <small>Baseline completed {baselineTime}. This compares captured evidence content, not real-world facts or source independence.</small>
    </div>
  }

  const limitations: string[] = []
  if (changes.unobservedCurrentSources > 0) limitations.push(`${changes.unobservedCurrentSources} not successfully observed now`)
  if (changes.newlyObservedSources > 0) limitations.push(`${changes.newlyObservedSources} not observed in the baseline`)
  if (changes.unhashableSources > 0) limitations.push(`${changes.unhashableSources} without comparable snapshot hashes`)

  return <div className="changeContext limited" role="note">
    <span>Partial previous-run comparison</span>
    <strong>{changes.comparedSources} of {changes.expectedSources} source snapshots are directly comparable</strong>
    <small>{limitations.join(' · ') || 'Comparison coverage is incomplete'}. NUMEN does not call the research unchanged when required observations are missing.</small>
  </div>
}

function OutcomeFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="outcomeFact">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>
}

function summaryText(summary: DatasetSummary, generalResearch: boolean): string {
  if (summary.totalRecords === 0) return 'No publishable results were produced for this run. Refine the question or source scope and run the research again.'

  const resultLabel = summary.totalRecords === 1 ? 'result' : 'results'
  const organizationLabel = summary.uniqueOrganizations === 1 ? 'organization' : 'organizations'
  const sourceLabel = summary.uniqueSources === 1 ? 'source' : 'sources'

  if (generalResearch && summary.demoRecords === 0) {
    return `${summary.totalRecords} published ${resultLabel} from ${summary.uniqueSources} contributing ${sourceLabel}.${sourceLimitationText(summary)} Open a result to inspect its captured evidence.`
  }

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

function outcomeTemporalReference(task: Task, summary?: DatasetSummary): { label: string; value: string } {
  if (summary?.latestCollectedAt) {
    return { label: 'Last evidence collected', value: summary.latestCollectedAt }
  }
  if (task.completedAt) return { label: 'Completed', value: task.completedAt }
  if (task.startedAt) return { label: 'Started', value: task.startedAt }
  return { label: 'Created', value: task.createdAt }
}
