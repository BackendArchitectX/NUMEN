import { Activity, Database, Layers3, ShieldCheck } from 'lucide-react'
import type { Task } from '../model/types'
import { clip } from '../shared/text'

interface SidebarProps {
  tasks: Task[]
  selectedId?: string
  totalRecords: number
  onSelect: (id: string) => void
}

export function Sidebar({ tasks, selectedId, totalRecords, onSelect }: SidebarProps) {
  return <aside className="sidebar">
    <div className="brand"><div className="brandMark">N</div><div><b>NUMEN</b><span>DATA INTELLIGENCE</span></div></div>
    <div className="navLabel">WORKSPACE</div>
    <button className="nav active"><Activity size={16}/> Intelligence Console</button>
    <button className="nav"><Database size={16}/> Datasets <span>{totalRecords}</span></button>
    <button className="nav"><Layers3 size={16}/> Workflow History <span>{tasks.length}</span></button>
    <div className="navLabel">RECENT RUNS</div>
    <div className="recentList">
      {tasks.slice(0, 7).map(task => <button key={task.id} className={`recent ${task.id === selectedId ? 'selected' : ''}`} onClick={() => onSelect(task.id)}>
        <span className={`dot ${task.status.toLowerCase()}`}/>
        <div><strong>{clip(task.prompt, 34)}</strong><small>{task.stage}</small></div>
      </button>)}
    </div>
    <div className="trust"><ShieldCheck size={18}/><div><b>Guarded collection</b><span>Public HTTP(S) only · SSRF protection · provenance</span></div></div>
  </aside>
}
