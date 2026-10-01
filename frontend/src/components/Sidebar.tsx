import { Activity, Database, History, ShieldCheck } from 'lucide-react'
import type { Task, WorkspaceView } from '../model/types'
import { clip } from '../shared/text'

interface SidebarProps {
  tasks: Task[]
  selectedId?: string
  totalRecords: number
  activeView: WorkspaceView
  onNavigate: (view: WorkspaceView) => void
  onSelect: (id: string) => void
}

export function Sidebar({ tasks, selectedId, totalRecords, activeView, onNavigate, onSelect }: SidebarProps) {
  return <aside className="sidebar" aria-label="NUMEN workspace">
    <div className="brand">
      <div className="brandMark" aria-hidden="true"><span>N</span></div>
      <div className="brandCopy"><b>NUMEN</b><span>Intelligence workspace</span></div>
    </div>

    <div className="navLabel">Workspace</div>
    <button type="button" className={`nav ${activeView === 'console' ? 'active' : ''}`} aria-current={activeView === 'console' ? 'page' : undefined} onClick={() => onNavigate('console')}>
      <Activity size={17} aria-hidden="true"/> <span className="navText">Console</span>
    </button>
    <button type="button" className={`nav ${activeView === 'datasets' ? 'active' : ''}`} aria-current={activeView === 'datasets' ? 'page' : undefined} onClick={() => onNavigate('datasets')}>
      <Database size={17} aria-hidden="true"/> <span className="navText">Datasets</span><span className="navCount">{totalRecords}</span>
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

    <div className="sidebarFooter"><ShieldCheck size={15} aria-hidden="true"/><span>Protected collection</span></div>
  </aside>
}

function recentMeta(task: Task): string {
  if (task.status === 'COMPLETED') return `${task.recordCount} records · complete`
  if (task.status === 'FAILED') return 'Needs attention'
  if (task.status === 'CANCELLED') return 'Cancelled'
  return humanize(task.stage)
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase())
}
