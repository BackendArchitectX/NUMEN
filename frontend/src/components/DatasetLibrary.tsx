import { ArrowRight, Database, FlaskConical, Radio } from 'lucide-react'
import type { Task } from '../model/types'
import { clip } from '../shared/text'

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
          <h3 id="dataset-library-heading">Published datasets</h3>
          <span>{tasks.length} reusable research {tasks.length === 1 ? 'output' : 'outputs'}</span>
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
          <span>Updated</span>
          <strong>{formatRelative(task.completedAt || task.createdAt)}</strong>
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
