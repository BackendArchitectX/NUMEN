import { CheckCircle2, Download } from 'lucide-react'
import type { Task } from '../model/types'
import { clip } from '../shared/text'

const stages = ['Interpret', 'Discover', 'Collect', 'Normalize', 'Validate', 'Deduplicate', 'Publish']
const thresholds = [10, 25, 45, 60, 72, 82, 100]

interface WorkflowPanelProps {
  task: Task
  exportUrl: string
  onCancel: (id: string) => void
}

export function WorkflowPanel({ task, exportUrl, onCancel }: WorkflowPanelProps) {
  const active = !['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)
  return <section className="runPanel panel">
    <div className="runHeader">
      <div><span className={`status ${task.status.toLowerCase()}`}>{task.status}</span><h2>{clip(task.prompt, 90)}</h2></div>
      <div className="runActions">
        {active && <button onClick={() => onCancel(task.id)}>Cancel</button>}
        <a className="export" href={exportUrl}><Download size={15}/> Export CSV</a>
      </div>
    </div>
    <div className="progressTrack"><div style={{ width: `${task.progress}%` }}/></div>
    <div className="progressMeta"><span>{task.errorMessage || task.stage}</span><b>{task.progress}%</b></div>
    <div className="pipeline">
      {stages.map((stage, index) => <div className={task.progress >= thresholds[index] ? 'done' : ''} key={stage}>
        <CheckCircle2 size={15}/><span>{stage}</span>
      </div>)}
    </div>
  </section>
}
