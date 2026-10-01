import { ChevronDown, Clock3, Download, FileJson2, ShieldCheck } from 'lucide-react'
import type { Task, TaskTimelineEvent } from '../model/types'
import { clip } from '../shared/text'

interface WorkflowPanelProps {
  task: Task
  timeline: TaskTimelineEvent[]
  exportUrl: string
  onCancel: (id: string) => void
}

interface PersistedPlan {
  useCase?: string
  fields?: string[]
  stages?: string[]
  safeguards?: string[]
}

export function WorkflowPanel({ task, timeline, exportUrl, onCancel }: WorkflowPanelProps) {
  const active = !['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)
  const plan = parsePlan(task.planJson)
  const completed = task.status === 'COMPLETED'

  return <section className="runPanel panel" aria-labelledby={`workflow-${task.id}`}>
    <div className="runHeader">
      <div className="runIdentity">
        <span className={`status ${task.status.toLowerCase()}`} aria-live="polite">{statusLabel(task.status)}</span>
        <div>
          <span className="runKicker">{completed ? 'Research outcome' : 'Research in progress'}</span>
          <h2 id={`workflow-${task.id}`}>{clip(task.prompt, 90)}</h2>
        </div>
      </div>
      <div className="runActions">
        {active && <button type="button" onClick={() => onCancel(task.id)}>Cancel</button>}
        {task.recordCount > 0 && <a className="export" href={exportUrl}><Download size={15} aria-hidden="true"/> Export CSV</a>}
      </div>
    </div>

    <div className="runSummary" aria-label="Current persisted workflow state">
      <div>
        <span>{completed ? 'Published result' : 'Current activity'}</span>
        <strong>{task.errorMessage || task.stage}</strong>
        <small>{completed ? `${task.recordCount} records published` : humanizeStage(task.stage)}</small>
      </div>
      {!completed && <div className="runProgressMeta"><span className="srOnly">Progress</span><b>{task.progress}%</b></div>}
    </div>

    {!completed && <div className="progressTrack" role="progressbar" aria-label="Workflow progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={task.progress}>
      <div style={{ width: `${task.progress}%` }}/>
    </div>}

    <details className="runDetails">
      <summary><span>Run details</span><small>Execution plan, persisted events and safeguards</small><ChevronDown size={16} aria-hidden="true"/></summary>
      <div className="runDetailsContent">
        <section className="timelineSection" aria-labelledby={`timeline-${task.id}`}>
          <div className="sectionTitle"><Clock3 size={16} aria-hidden="true"/><div><span>Run timeline</span><strong id={`timeline-${task.id}`}>{timeline.length} persisted events</strong></div></div>
          {timeline.length ? <ol className="timelineList">{timeline.map(event => <li key={event.id}>
            <span className={`timelineDot ${event.status.toLowerCase()}`} aria-hidden="true"/>
            <div className="timelineBody">
              <div><strong>{event.stage}</strong><span>{humanizeEvent(event.eventType)}</span></div>
              <p>{event.detail || `${statusLabel(event.status)} · ${event.progress}%`}</p>
              <time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
            </div>
          </li>)}</ol> : <p className="planEmpty">No persisted timeline events are available for this run yet.</p>}
        </section>

        <section className="executionPlan" aria-label="Persisted execution plan">
          <div className="sectionTitle"><FileJson2 size={16} aria-hidden="true"/><div><span>Execution plan</span><strong>{plan?.useCase || 'Plan pending'}</strong></div></div>
          {plan ? <div className="planGrid">
            <div>
              <span className="planLabel">Stages</span>
              {plan.stages?.length ? <ol className="planList">{plan.stages.map(stage => <li key={stage}>{humanizeStage(stage)}</li>)}</ol> : <p className="planEmpty">No stages declared by the persisted plan.</p>}
            </div>
            <div>
              <span className="planLabel">Output fields</span>
              {plan.fields?.length ? <div className="planChips">{plan.fields.map(field => <span key={field}>{field}</span>)}</div> : <p className="planEmpty">No output fields declared yet.</p>}
            </div>
            <div>
              <span className="planLabel">Safeguards</span>
              {plan.safeguards?.length ? <ul className="safeguardList">{plan.safeguards.map(item => <li key={item}><ShieldCheck size={13} aria-hidden="true"/>{humanizeStage(item)}</li>)}</ul> : <p className="planEmpty">No safeguards declared by the plan.</p>}
            </div>
          </div> : <p className="planEmpty">NUMEN is still preparing the persisted execution plan.</p>}
        </section>
      </div>
    </details>
  </section>
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

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function statusLabel(status: Task['status']): string {
  switch (status) {
    case 'QUEUED': return 'Queued'
    case 'PLANNING': return 'Preparing'
    case 'COLLECTING': return 'Searching sources'
    case 'PROCESSING': return 'Validating'
    case 'COMPLETED': return 'Ready'
    case 'CANCELLED': return 'Cancelled'
    case 'FAILED': return 'Needs attention'
  }
}

function humanizeStage(value: string): string {
  return value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function humanizeEvent(value: TaskTimelineEvent['eventType']): string {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase())
}
