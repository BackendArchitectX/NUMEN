import { ChevronDown, Clock3, FileJson2, ShieldCheck } from 'lucide-react'
import type { LoadState, SourceSummary, Task, TaskTimelineEvent } from '../model/types'
import { clip } from '../shared/text'
import { formatInstant } from '../shared/time'

interface WorkflowPanelProps {
  task: Task
  timeline: TaskTimelineEvent[]
  sources: SourceSummary[]
  sourcesState: LoadState
  onCancel: (id: string) => void
}

interface PersistedPlan {
  useCase?: string
  fields?: string[]
  stages?: string[]
  safeguards?: string[]
}

export function WorkflowPanel({ task, timeline, sources, sourcesState, onCancel }: WorkflowPanelProps) {
  const active = !['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)
  const plan = parsePlan(task.planJson)
  const completed = task.status === 'COMPLETED'
  const sourceProgress = describeSourceProgress(task, sources, sourcesState)

  if (completed) {
    return <section className="technicalPanel panel" aria-label="Technical run details">
      <details className="runDetails">
        <summary>
          <div><span>Run details</span><small>Execution plan, persisted lifecycle and safeguards</small></div>
          <ChevronDown size={16} aria-hidden="true"/>
        </summary>
        <TechnicalDetails task={task} timeline={timeline} plan={plan}/>
      </details>
    </section>
  }

  return <section className="runPanel panel" aria-labelledby={`workflow-${task.id}`}>
    <div className="runHeader">
      <div className="runIdentity">
        <span className={`status ${task.status.toLowerCase()}`} aria-live="polite">{statusLabel(task.status)}</span>
        <div>
          <span className="runKicker">{task.demoMode ? 'Demo research in progress' : 'Research in progress'}</span>
          <h2 id={`workflow-${task.id}`}>{clip(task.prompt, 100)}</h2>
        </div>
      </div>
      {active && <button type="button" className="secondaryAction" onClick={() => onCancel(task.id)}>Cancel</button>}
    </div>

    <div className="activityPanel" aria-live="polite">
      <span className="activityPulse" aria-hidden="true"/>
      <div>
        <span>Current activity</span>
        <strong>{task.errorMessage || statusLabel(task.status)}</strong>
        <small>{activityDescription(task)}</small>
        {sourceProgress && <div className="activityProgress">{sourceProgress}</div>}
      </div>
    </div>

    <details className="runDetails">
      <summary>
        <div><span>Run details</span><small>Persisted lifecycle and execution plan</small></div>
        <ChevronDown size={16} aria-hidden="true"/>
      </summary>
      <TechnicalDetails task={task} timeline={timeline} plan={plan}/>
    </details>
  </section>
}

function TechnicalDetails({ task, timeline, plan }: { task: Task; timeline: TaskTimelineEvent[]; plan?: PersistedPlan }) {
  return <div className="runDetailsContent">
    <div className="technicalMeta"><span>Run ID</span><code>{task.id}</code></div>
    <section className="timelineSection" aria-labelledby={`timeline-${task.id}`}>
      <div className="sectionTitle"><Clock3 size={16} aria-hidden="true"/><div><span>Run lifecycle</span><strong id={`timeline-${task.id}`}>{timeline.length} persisted run events</strong></div></div>
      {timeline.length ? <ol className="timelineList">{timeline.map(event => <li key={event.id}>
        <span className={`timelineDot ${event.status.toLowerCase()}`} aria-hidden="true"/>
        <div className="timelineBody">
          <div><strong>{humanizeStage(event.stage)}</strong><span>{humanizeEvent(event.eventType)}</span></div>
          <p>{event.detail || statusLabel(event.status)}</p>
          <time dateTime={event.occurredAt}>{formatInstant(event.occurredAt)}</time>
        </div>
      </li>)}</ol> : <p className="planEmpty">No persisted timeline events are available for this run yet.</p>}
    </section>

    <section className="executionPlan" aria-label="Persisted execution plan">
      <div className="sectionTitle"><FileJson2 size={16} aria-hidden="true"/><div><span>Execution plan</span><strong>{plan?.useCase ? humanizeStage(plan.useCase) : 'Plan pending'}</strong></div></div>
      {plan ? <div className="planGrid">
        <div>
          <span className="planLabel">Stages</span>
          {plan.stages?.length ? <ol className="planList">{plan.stages.map(stage => <li key={stage}>{humanizeStage(stage)}</li>)}</ol> : <p className="planEmpty">No stages declared by the persisted plan.</p>}
        </div>
        <div>
          <span className="planLabel">Output fields</span>
          {plan.fields?.length ? <div className="planChips">{plan.fields.map(field => <span key={field}>{humanizeStage(field)}</span>)}</div> : <p className="planEmpty">No output fields declared yet.</p>}
        </div>
        <div>
          <span className="planLabel">Safeguards</span>
          {plan.safeguards?.length ? <ul className="safeguardList">{plan.safeguards.map(item => <li key={item}><ShieldCheck size={13} aria-hidden="true"/>{humanizeStage(item)}</li>)}</ul> : <p className="planEmpty">No safeguards declared by the plan.</p>}
        </div>
      </div> : <p className="planEmpty">NUMEN is still preparing the persisted execution plan.</p>}
    </section>
  </div>
}

function describeSourceProgress(task: Task, sources: SourceSummary[], state: LoadState): string | undefined {
  if (task.demoMode) return task.status === 'FAILED' ? undefined : 'Demo mode uses labeled sample records; no live sources are contacted.'
  if (state === 'error') return 'Live source progress is temporarily unavailable; the research run is still persisted.'

  const configured = sources.filter(source => source.configured && !source.demo)
  const total = Math.max(task.sourceUrls.length, configured.length)
  if (total === 0) return undefined

  const resolved = configured.filter(source => source.collectionStatus !== 'NOT_ATTEMPTED').length
  const limited = configured.filter(source =>
    ['UNAVAILABLE', 'UNAUTHORIZED', 'REJECTED', 'RATE_LIMITED', 'FAILED'].includes(source.collectionStatus)
  ).length
  const checked = Math.min(total, resolved)
  const limitation = limited ? ` · ${limited} with limitations` : ''

  if (task.status === 'PLANNING' || task.status === 'QUEUED') return `0 / ${total} sources checked`
  if (task.status === 'COLLECTING') return `${checked} / ${total} sources checked${limitation}`
  if (task.status === 'PROCESSING') return `${checked} / ${total} sources checked${limitation}`
  return undefined
}

function parsePlan(value?: string): PersistedPlan | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value) as PersistedPlan
    return {
      useCase: typeof parsed.useCase === 'string' ? parsed.useCase : undefined,
      fields: stringList(parsed.fields),
      stages: stringList(parsed.stages),
      safeguards: stringList(parsed.safeguards)
    }
  } catch {
    return undefined
  }
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function statusLabel(status: Task['status']): string {
  switch (status) {
    case 'QUEUED': return 'Queued'
    case 'PLANNING': return 'Preparing research'
    case 'COLLECTING': return 'Searching sources'
    case 'PROCESSING': return 'Validating results'
    case 'COMPLETED': return 'Ready'
    case 'CANCELLED': return 'Cancelled'
    case 'FAILED': return 'Needs attention'
  }
}

function activityDescription(task: Task): string {
  switch (task.status) {
    case 'QUEUED': return 'Waiting for execution capacity.'
    case 'PLANNING': return 'Structuring the request and preparing the collection plan.'
    case 'COLLECTING': return 'Collecting permitted source material and candidate records.'
    case 'PROCESSING': return 'Checking collected records before publication.'
    case 'FAILED': return 'The run stopped before a complete result could be published.'
    case 'CANCELLED': return 'This run was cancelled.'
    case 'COMPLETED': return `${task.recordCount} records published.`
  }
}

function humanizeStage(value: string): string {
  return value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function humanizeEvent(value: TaskTimelineEvent['eventType']): string {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase())
}
