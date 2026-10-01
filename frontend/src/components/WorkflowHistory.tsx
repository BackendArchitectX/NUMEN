import { ArrowRight, Database, History } from 'lucide-react'
import type { Task } from '../model/types'
import { clip } from '../shared/text'

interface WorkflowHistoryProps {
  tasks: Task[]
  onOpen: (id: string) => void
  onOpenDataset: (id: string) => void
}

export function WorkflowHistory({ tasks, onOpen, onOpenDataset }: WorkflowHistoryProps) {
  return <section className="historyPanel panel" aria-labelledby="history-heading">
    <div className="resultsHeader">
      <div className="resultsTitle"><History size={18} aria-hidden="true"/><div><h3 id="history-heading">Runs</h3><span>{tasks.length} persisted research runs</span></div></div>
    </div>
    {tasks.length ? <div className="tableWrap"><table className="historyTable">
      <caption className="srOnly">Persisted research run history</caption>
      <thead><tr><th scope="col">Research</th><th scope="col">Status</th><th scope="col">Activity</th><th scope="col">Records</th><th scope="col">Quality</th><th scope="col">Created</th><th scope="col">Actions</th></tr></thead>
      <tbody>{tasks.map(task => <tr key={task.id}>
        <td><strong>{clip(task.prompt, 62)}</strong><small>{task.id}</small></td>
        <td><span className={`status ${task.status.toLowerCase()}`}>{statusLabel(task.status)}</span></td>
        <td>{task.stage}</td>
        <td>{task.recordCount}</td>
        <td>{task.recordCount ? `${Math.round(task.averageQuality)}%` : '—'}</td>
        <td><time dateTime={task.createdAt}>{formatDate(task.createdAt)}</time></td>
        <td><div className="historyActions">
          <button type="button" className="tableAction" onClick={() => onOpen(task.id)}>Open run <ArrowRight size={13} aria-hidden="true"/></button>
          {task.recordCount > 0 && <button type="button" className="tableAction" onClick={() => onOpenDataset(task.id)}><Database size={13} aria-hidden="true"/> Dataset</button>}
        </div></td>
      </tr>)}</tbody>
    </table></div> : <div className="emptyState compact"><History aria-hidden="true"/><h2>No runs yet</h2><p>Completed and in-progress research runs will appear here after they are created.</p></div>}
  </section>
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function statusLabel(status: Task['status']): string {
  switch (status) {
    case 'QUEUED': return 'Queued'
    case 'PLANNING': return 'Preparing'
    case 'COLLECTING': return 'Searching'
    case 'PROCESSING': return 'Validating'
    case 'COMPLETED': return 'Ready'
    case 'CANCELLED': return 'Cancelled'
    case 'FAILED': return 'Needs attention'
  }
}
