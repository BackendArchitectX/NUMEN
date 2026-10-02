import { ArrowRight, FlaskConical, Radio } from 'lucide-react'
import type { Task } from '../model/types'
import { clip } from '../shared/text'
import { formatInstant, formatRelativeInstant } from '../shared/time'

interface SourceResearchIndexProps {
  tasks: Task[]
  onOpen: (id: string) => void
  onNewResearch: () => void
}

export function SourceResearchIndex({ tasks, onOpen, onNewResearch }: SourceResearchIndexProps) {
  if (!tasks.length) {
    return <section className="sourceIndex sourceIndexEmpty" aria-labelledby="source-index-heading">
      <div>
        <span className="sourceIndexKicker">Provenance workspace</span>
        <h2 id="source-index-heading">No source activity yet</h2>
        <p>Start research with a public source or explicit Demo mode. Collection outcomes and evidence contribution will appear here.</p>
      </div>
      <button type="button" className="primaryAction" onClick={onNewResearch}>Start research</button>
    </section>
  }

  return <section className="sourceIndex" aria-labelledby="source-index-heading">
    <header className="sourceIndexHeader">
      <div>
        <span className="sourceIndexKicker">Provenance workspace</span>
        <h2 id="source-index-heading">Choose research to inspect its sources</h2>
        <p>Open a source set to see collection outcomes, evidence contribution and the most recent successful observation or attempt.</p>
      </div>
    </header>

    <div className="sourceIndexList">
      {tasks.slice(0, 12).map(task => <button type="button" key={task.id} className="sourceIndexRow" onClick={() => onOpen(task.id)}>
        <span className={task.demoMode ? 'sourceIndexGlyph demo' : 'sourceIndexGlyph'} aria-hidden="true">
          {task.demoMode ? <FlaskConical size={15}/> : <Radio size={15}/>}
        </span>
        <span className="sourceIndexIdentity">
          <strong>{clip(task.prompt, 100)}</strong>
          <small>{sourceSetDescription(task)}</small>
        </span>
        <span className="sourceIndexTime" title={formatInstant(task.completedAt || task.createdAt)}>
          {formatRelativeInstant(task.completedAt || task.createdAt)}
        </span>
        <span className="sourceIndexOpen">Inspect <ArrowRight size={13} aria-hidden="true"/></span>
      </button>)}
    </div>
  </section>
}

function sourceSetDescription(task: Task): string {
  if (task.demoMode) return `Demo source set · ${task.recordCount} ${task.recordCount === 1 ? 'published record' : 'published records'}`
  const sourceCount = task.sourceUrls.length
  const scope = `${sourceCount} configured ${sourceCount === 1 ? 'source' : 'sources'}`
  if (task.status === 'FAILED') return `${scope} · run stopped before completion`
  if (task.status === 'CANCELLED') return `${scope} · run cancelled`
  return `${scope} · ${task.recordCount} ${task.recordCount === 1 ? 'published record' : 'published records'}`
}
