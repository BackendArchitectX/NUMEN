import { Activity, Database, Layers3, ShieldCheck } from 'lucide-react'
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
    <div className="brand"><div className="brandMark" aria-hidden="true">N</div><div><b>NUMEN</b><span>DATA INTELLIGENCE</span></div></div>
    <div className="navLabel">WORKSPACE</div>
    <button type="button" className={`nav ${activeView === 'console' ? 'active' : ''}`} aria-current={activeView === 'console' ? 'page' : undefined} onClick={() => onNavigate('console')}>
      <Activity size={16} aria-hidden="true"/> Intelligence Console
    </button>
    <button type="button" className={`nav ${activeView === 'datasets' ? 'active' : ''}`} aria-current={activeView === 'datasets' ? 'page' : undefined} onClick={() => onNavigate('datasets')}>
      <Database size={16} aria-hidden="true"/> Datasets <span>{totalRecords}</span>
    </button>
    <button type="button" className={`nav ${activeView === 'history' ? 'active' : ''}`} aria-current={activeView === 'history' ? 'page' : undefined} onClick={() => onNavigate('history')}>
      <Layers3 size={16} aria-hidden="true"/> Workflow History <span>{tasks.length}</span>
    </button>
    <div className="navLabel">RECENT RUNS</div>
    <div className="recentList">
      {tasks.slice(0, 7).map(task => <button
        type="button"
        key={task.id}
        className={`recent ${task.id === selectedId ? 'selected' : ''}`}
        aria-pressed={task.id === selectedId}
        onClick={() => onSelect(task.id)}
      >
        <span className={`dot ${task.status.toLowerCase()}`} aria-hidden="true"/>
        <div><strong>{clip(task.prompt, 34)}</strong><small>{task.stage}</small></div>
      </button>)}
    </div>
    <div className="trust"><ShieldCheck size={18} aria-hidden="true"/><div><b>Guarded collection</b><span>Public HTTP(S) only · SSRF protection · provenance</span></div></div>
  </aside>
}
