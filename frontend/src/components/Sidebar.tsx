import { Activity, Database, History, Moon, Plus, Radio, Sun } from 'lucide-react'
import type { Task, WorkspaceView } from '../model/types'
import { clip } from '../shared/text'

interface SidebarProps {
  tasks: Task[]
  selectedId?: string
  totalRecords: number
  activeView: WorkspaceView
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onNewResearch: () => void
  onNavigate: (view: WorkspaceView) => void
  onSelect: (id: string) => void
}

export function Sidebar({ tasks, selectedId, totalRecords, activeView, theme, onToggleTheme, onNewResearch, onNavigate, onSelect }: SidebarProps) {
  return <aside className="sidebar" aria-label="NUMEN workspace">
    <div className="brand">
      <div className="brandMark" aria-hidden="true"><span>N</span></div>
      <div className="brandCopy"><b>NUMEN</b><span>Traceable intelligence</span></div>
    </div>

    <button type="button" className="newResearchAction" onClick={onNewResearch}>
      <Plus size={15} aria-hidden="true"/> New research
    </button>

    <div className="navLabel">Workspace</div>
    <button type="button" className={`nav ${activeView === 'research' ? 'active' : ''}`} aria-current={activeView === 'research' ? 'page' : undefined} onClick={() => onNavigate('research')}>
      <Activity size={17} aria-hidden="true"/> <span className="navText">Research</span>
    </button>
    <button type="button" className={`nav ${activeView === 'datasets' ? 'active' : ''}`} aria-current={activeView === 'datasets' ? 'page' : undefined} onClick={() => onNavigate('datasets')}>
      <Database size={17} aria-hidden="true"/> <span className="navText">Datasets</span><span className="navCount">{totalRecords}</span>
    </button>
    <button type="button" className={`nav ${activeView === 'sources' ? 'active' : ''}`} aria-current={activeView === 'sources' ? 'page' : undefined} onClick={() => onNavigate('sources')}>
      <Radio size={17} aria-hidden="true"/> <span className="navText">Sources</span>
    </button>
    <button type="button" className={`nav ${activeView === 'history' ? 'active' : ''}`} aria-current={activeView === 'history' ? 'page' : undefined} onClick={() => onNavigate('history')}>
      <History size={17} aria-hidden="true"/> <span className="navText">Runs</span><span className="navCount">{tasks.length}</span>
    </button>

    <div className="navLabel recentLabel">Recent research</div>
    <div className="recentList">
      {tasks.slice(0, 7).map(task => <button
        type="button"
        key={task.id}
        className={`recent ${task.id === selectedId ? 'selected' : ''}`}
        aria-pressed={task.id === selectedId}
        onClick={() => onSelect(task.id)}
      >
        <span className={`dot ${task.status.toLowerCase()}`} aria-hidden="true"/>
        <div><strong>{clip(task.prompt, 31)}</strong><small>{recentMeta(task)}</small></div>
      </button>)}
      {!tasks.length && <p className="sidebarEmpty">Your recent research will appear here.</p>}
    </div>

    <div className="sidebarFooter">
      <span>Appearance</span>
      <button type="button" onClick={onToggleTheme} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
        {theme === 'light' ? <Moon size={15} aria-hidden="true"/> : <Sun size={15} aria-hidden="true"/>}
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </div>
  </aside>
}

function recentMeta(task: Task): string {
  if (task.status === 'COMPLETED') return `${task.recordCount} records · ready`
  if (task.status === 'FAILED') return 'Needs attention'
  if (task.status === 'CANCELLED') return 'Cancelled'
  return humanize(task.stage)
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase())
}
