import { ArrowRight, Database, History, Radio } from 'lucide-react'
import type { Task } from '../model/types'
import { clip } from '../shared/text'
import { formatInstant, formatRelativeInstant, taskTemporalReference } from '../shared/time'

interface WorkflowHistoryProps {
  tasks: Task[]
  onOpen: (id: string) => void
  onOpenDataset: (id: string) => void
  onOpenSources: (id: string) => void
}

export function WorkflowHistory({ tasks, onOpen, onOpenDataset, onOpenSources }: WorkflowHistoryProps) {
  return <section className="historyPanel panel" aria-labelledby="history-heading">
    <div className="resultsHeader">
      <div className="resultsTitle"><History size={18} aria-hidden="true"/><div><h3 id="history-heading">Runs</h3><span>Showing {tasks.length} recent persisted {tasks.length === 1 ? 'run' : 'runs'}</span></div></div>
    </div>
    {tasks.length ? <div className="tableWrap"><table className="historyTable">
      <caption className="srOnly">Persisted research run history</caption>
      <thead><tr><th scope="col">Research</th><th scope="col">Status</th><th scope="col">Outcome</th><th scope="col">Duration</th><th scope="col">Run time</th><th scope="col">Actions</th></tr></thead>
      <tbody>{tasks.map(task => <tr key={task.id}>
        <td><strong>{clip(task.prompt, 72)}</strong></td>
        <td><span className={`status ${task.status.toLowerCase()}`}>{statusLabel(task.status)}</span></td>
        <td>{outcomeLabel(task)}</td>
        <td>{durationLabel(task)}</td>
        <td>{historyTime(task)}</td>
        <td><div className="historyActions">
          <button type="button" className="tableAction" onClick={() => onOpen(task.id)}>Open <ArrowRight size={13} aria-hidden="true"/></button>
          {task.status === 'COMPLETED' && task.recordCount > 0 &&
            <button type="button" className="tableAction" onClick={() => onOpenDataset(task.id)}><Database size={13} aria-hidden="true"/> Dataset</button>}
          {isTerminal(task.status) && (task.sourceUrls.length > 0 || task.demoMode || task.recordCount > 0) &&
            <button type="button" className="tableAction" onClick={() => onOpenSources(task.id)}><Radio size={13} aria-hidden="true"/> Sources</button>}
        </div></td>
      </tr>)}</tbody>
    </table></div> : <div className="emptyState compact"><History aria-hidden="true"/><h2>No runs yet</h2><p>Research activity will appear here after you start your first run.</p></div>}
  </section>
}

function isTerminal(status: Task['status']): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED'
}

function outcomeLabel(task: Task): string {
  if (task.status === 'COMPLETED') return task.recordCount > 0 ? `${task.demoMode ? 'Demo · ' : ''}${task.recordCount} published ${task.recordCount === 1 ? 'record' : 'records'}` : 'No publishable records'
  if (task.status === 'FAILED') return 'Stopped before completion'
  if (task.status === 'CANCELLED') return 'Cancelled before completion'
  return statusLabel(task.status)
}

function durationLabel(task: Task): string {
  if (!task.startedAt) return '—'
  const start = Date.parse(task.startedAt)
  const end = Date.parse(task.completedAt || '')
  if (!Number.isFinite(start)) return '—'
  if (!Number.isFinite(end)) return task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED' ? '—' : 'Running'

  const seconds = Math.max(0, Math.round((end - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`
}

function historyTime(task: Task) {
  const reference = taskTemporalReference(task)
  return <span title={formatInstant(reference.value)}>
    <small>{reference.label}</small>{' '}
    <time dateTime={reference.value}>{formatRelativeInstant(reference.value)}</time>
  </span>
}

function statusLabel(status: Task['status']): string {
  switch (status) {
    case 'QUEUED': return 'Queued'
    case 'PLANNING': return 'Preparing'
    case 'COLLECTING': return 'Searching'
    case 'PROCESSING': return 'Validating'
    case 'COMPLETED': return 'Complete'
    case 'CANCELLED': return 'Cancelled'
    case 'FAILED': return 'Needs attention'
  }
}
