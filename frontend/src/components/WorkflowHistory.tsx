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
      <div><History size={18} aria-hidden="true"/><h3 id="history-heading">Workflow history</h3><span>{tasks.length} persisted runs</span></div>
    </div>
    {tasks.length ? <div className="tableWrap"><table className="historyTable">
      <caption className="srOnly">Persisted workflow run history</caption>
      <thead><tr><th scope="col">REQUEST</th><th scope="col">STATUS</th><th scope="col">CURRENT / FINAL STAGE</th><th scope="col">RECORDS</th><th scope="col">QUALITY</th><th scope="col">CREATED</th><th scope="col">ACTIONS</th></tr></thead>
      <tbody>{tasks.map(task => <tr key={task.id}>
        <td><strong>{clip(task.prompt, 62)}</strong><small>{task.id}</small></td>
        <td><span className={`status ${task.status.toLowerCase()}`}>{task.status}</span></td>
        <td>{task.stage}</td>
        <td>{task.recordCount}</td>
        <td>{task.recordCount ? `${Math.round(task.averageQuality)}%` : '—'}</td>
        <td><time dateTime={task.createdAt}>{formatDate(task.createdAt)}</time></td>
        <td><div className="historyActions">
          <button type="button" className="tableAction" onClick={() => onOpen(task.id)}>Open run <ArrowRight size={13} aria-hidden="true"/></button>
          {task.recordCount > 0 && <button type="button" className="tableAction" onClick={() => onOpenDataset(task.id)}><Database size={13} aria-hidden="true"/> Dataset</button>}
        </div></td>
      </tr>)}</tbody>
    </table></div> : <div className="emptyState compact"><History aria-hidden="true"/><h2>No workflow history yet</h2><p>Completed and in-progress runs will appear here after they are created.</p></div>}
  </section>
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
