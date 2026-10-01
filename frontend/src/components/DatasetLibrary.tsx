import { ArrowRight, Database, FlaskConical, Radio } from 'lucide-react'
import type { Task } from '../model/types'
import { clip } from '../shared/text'
import { formatInstant, formatRelativeInstant } from '../shared/time'

interface DatasetLibraryProps {
  tasks: Task[]
  onOpen: (id: string) => void
  onOpenSources: (id: string) => void
  onNewResearch: () => void
}

export function DatasetLibrary({ tasks, onOpen, onOpenSources, onNewResearch }: DatasetLibraryProps) {
  if (!tasks.length) {
    return <section className="emptyState panel">
      <Database aria-hidden="true"/>
      <h2>No published datasets yet</h2>
      <p>Complete research with at least one publishable result and the dataset will appear here.</p>
      <button type="button" className="primaryAction" onClick={onNewResearch}>Start research</button>
    </section>
  }

  return <section className="datasetLibrary panel" aria-labelledby="dataset-library-heading">
    <div className="resultsHeader">
      <div className="resultsTitle">
        <Database size={18} aria-hidden="true"/>
        <div>
          <h3 id="dataset-library-heading">Recent published datasets</h3>
          <span>Showing {tasks.length} recent reusable research {tasks.length === 1 ? 'output' : 'outputs'}</span>
        </div>
      </div>
    </div>

    <div className="datasetLibraryList">
      {tasks.map(task => <article key={task.id} className="datasetLibraryRow">
        <div className="datasetLibraryIdentity">
          <span className={task.demoMode ? 'datasetKind demo' : 'datasetKind live'} aria-hidden="true">
            {task.demoMode ? <FlaskConical size={15}/> : <Database size={15}/>}
          </span>
          <div>
            <strong>{clip(task.prompt, 96)}</strong>
            <small>{task.demoMode ? 'Demo dataset · sample content' : 'Published research dataset'}</small>
          </div>
        </div>

        <div className="datasetLibraryMetric">
          <span>Results</span>
          <strong>{task.recordCount}</strong>
        </div>

        <div className="datasetLibraryMetric">
          <span>Completed</span>
          <strong>{task.completedAt
            ? <time dateTime={task.completedAt} title={formatInstant(task.completedAt)}>{formatRelativeInstant(task.completedAt)}</time>
            : 'Unavailable'}</strong>
        </div>

        <div className="datasetLibraryActions">
          <button type="button" className="tableAction" onClick={() => onOpenSources(task.id)}>
            <Radio size={13} aria-hidden="true"/> Sources
          </button>
          <button type="button" className="tableAction primaryTableAction" onClick={() => onOpen(task.id)}>
            Open dataset <ArrowRight size={13} aria-hidden="true"/>
          </button>
        </div>
      </article>)}
    </div>
  </section>
}
