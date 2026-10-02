import { Activity, Database, History, Plus, Radio } from 'lucide-react'
import type { Task, WorkspaceView } from '../model/types'
import { groupResearchTasks } from '../shared/research'
import { clip } from '../shared/text'

interface SidebarProps {
  tasks: Task[]
  selectedId?: string
  activeView: WorkspaceView
  onNewResearch: () => void
  onNavigate: (view: WorkspaceView) => void
  onSelect: (id: string) => void
}

export function Sidebar({ tasks, selectedId, activeView, onNewResearch, onNavigate, onSelect }: SidebarProps) {
  const recentResearch = groupResearchTasks(tasks).slice(0, 7)

  return <aside className="sidebar" aria-label="NUMEN workspace">
    <div className="brand">
      <div className="brandMark" aria-hidden="true">
        <svg className="brandGlyph" viewBox="0 0 40 40" role="img">
          <path className="brandGlyphLetter" d="M9 30V10h5.2l11.6 13.5V10H31v20h-5.1L14.1 16.4V30z"/>
          <path className="brandGlyphSpark" d="M31.8 5.2l1.05 2.45 2.45 1.05-2.45 1.05-1.05 2.45-1.05-2.45-2.45-1.05 2.45-1.05z"/>
        </svg>
      </div>
      <div className="brandCopy"><b>NUMEN</b><span>Research intelligence</span></div>
    </div>

    <button type="button" className="newResearchAction" onClick={onNewResearch}>
      <Plus size={15} aria-hidden="true"/> New research
    </button>

    <div className="navLabel">Workspace</div>
    <button type="button" className={`nav ${activeView === 'research' ? 'active' : ''}`} aria-current={activeView === 'research' ? 'page' : undefined} onClick={() => onNavigate('research')}>
      <Activity size={17} aria-hidden="true"/> <span className="navText">Research</span>
    </button>
    <button type="button" className={`nav ${activeView === 'datasets' ? 'active' : ''}`} aria-current={activeView === 'datasets' ? 'page' : undefined} onClick={() => onNavigate('datasets')}>
      <Database size={17} aria-hidden="true"/> <span className="navText">Datasets</span>
    </button>
    <button type="button" className={`nav ${activeView === 'sources' ? 'active' : ''}`} aria-current={activeView === 'sources' ? 'page' : undefined} onClick={() => onNavigate('sources')}>
      <Radio size={17} aria-hidden="true"/> <span className="navText">Sources</span>
    </button>
    <button type="button" className={`nav ${activeView === 'history' ? 'active' : ''}`} aria-current={activeView === 'history' ? 'page' : undefined} onClick={() => onNavigate('history')}>
      <History size={17} aria-hidden="true"/> <span className="navText">Runs</span>
    </button>

    <div className="navLabel recentLabel">Recent research</div>
    <div className="recentList">
      {recentResearch.map(({ latest: task, runs }) => <button
        type="button"
        key={task.id}
        className={`recent ${task.id === selectedId ? 'selected' : ''}`}
        aria-pressed={task.id === selectedId}
        onClick={() => onSelect(task.id)}
      >
        <span className={`dot ${task.status.toLowerCase()}`} aria-hidden="true"/>
        <div><strong>{clip(task.prompt, 31)}</strong><small>{recentMeta(task, runs)}</small></div>
      </button>)}
      {!recentResearch.length && <p className="sidebarEmpty">Your recent research will appear here.</p>}
    </div>

    <div className="sidebarFooter" aria-label="NUMEN workspace principle">
      <span>Evidence-first research</span>
      <small>Light workspace</small>
    </div>
  </aside>
}

function recentMeta(task: Task, runs: number): string {
  const runCount = runs > 1 ? ` · ${runs} runs` : ''
  if (task.status === 'COMPLETED') return `${task.demoMode ? 'Demo · ' : ''}${task.recordCount} ${recordLabel(task.recordCount)}${runCount} · complete`
  if (task.status === 'FAILED') return `Needs attention${runCount}`
  if (task.status === 'CANCELLED') return `Cancelled${runCount}`
  if (task.status === 'QUEUED') return `Queued${runCount}`
  if (task.status === 'PLANNING') return `Preparing research${runCount}`
  if (task.status === 'COLLECTING') return `Searching sources${runCount}`
  return `Validating results${runCount}`
}

function recordLabel(count: number): string {
  return count === 1 ? 'record' : 'records'
}
