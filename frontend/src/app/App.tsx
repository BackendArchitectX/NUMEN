import { useEffect, useState } from 'react'
import { Activity, Database, History, Moon, Sun } from 'lucide-react'
import { DatasetExplorer } from '../components/DatasetExplorer'
import { PromptComposer } from '../components/PromptComposer'
import { ResearchOutcome } from '../components/ResearchOutcome'
import { Sidebar } from '../components/Sidebar'
import { WorkflowHistory } from '../components/WorkflowHistory'
import { WorkflowPanel } from '../components/WorkflowPanel'
import { useIntelligenceWorkspace } from '../hooks/useIntelligenceWorkspace'
import type { Task, WorkspaceView } from '../model/types'

type Theme = 'light' | 'dark'

export default function App() {
  const workspace = useIntelligenceWorkspace()
  const [view, setView] = useState<WorkspaceView>(() => readView())
  const [theme, setTheme] = useState<Theme>(() => readTheme())

  useEffect(() => {
    const syncFromHash = () => setView(readView())
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('numen-theme', theme)
    } catch {
      // Theme preference persistence is best-effort when browser storage is unavailable.
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', theme === 'dark' ? '#050B14' : '#08111F')
  }, [theme])

  const navigate = (next: WorkspaceView) => {
    setView(next)
    if (typeof window !== 'undefined') {
      const nextHash = `#${next}`
      if (window.location.hash !== nextHash) window.location.hash = next
    }
  }

  const selectAndOpen = (id: string, destination: WorkspaceView) => {
    workspace.setSelectedId(id)
    navigate(destination)
  }

  const selectedComplete = workspace.selected?.status === 'COMPLETED'
  const toggleTheme = () => setTheme(currentTheme => currentTheme === 'light' ? 'dark' : 'light')

  return <div className="shell">
    <Sidebar
      tasks={workspace.tasks}
      selectedId={workspace.selectedId}
      totalRecords={workspace.totalRecords}
      activeView={view}
      theme={theme}
      onToggleTheme={toggleTheme}
      onNavigate={navigate}
      onSelect={id => selectAndOpen(id, 'console')}
    />

    <main id="main-content">
      <nav className="mobileNav" aria-label="Workspace views">
        <button type="button" className={view === 'console' ? 'active' : ''} onClick={() => navigate('console')}><Activity size={15} aria-hidden="true"/> Research</button>
        <button type="button" className={view === 'datasets' ? 'active' : ''} onClick={() => navigate('datasets')}><Database size={15} aria-hidden="true"/> Datasets</button>
        <button type="button" className={view === 'history' ? 'active' : ''} onClick={() => navigate('history')}><History size={15} aria-hidden="true"/> Runs</button>
      </nav>

      <WorkspaceHeader view={view} online={workspace.online} theme={theme} onToggleTheme={toggleTheme}/>
      {workspace.error && <div className="error" role="alert">{workspace.error}</div>}

      {view === 'console' && <>
        <PromptComposer prompt={workspace.prompt} busy={workspace.busy} online={workspace.online} onPromptChange={workspace.setPrompt} onRun={() => void workspace.createTask()}/>

        {workspace.selected ? <>
          {selectedComplete
            ? <ResearchOutcome task={workspace.selected} records={workspace.records} exportUrl={workspace.exportUrl}/>
            : <WorkflowPanel task={workspace.selected} timeline={workspace.timeline} exportUrl={workspace.exportUrl} onCancel={id => void workspace.cancelTask(id)}/>}

          <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
            onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>

          {selectedComplete && <WorkflowPanel task={workspace.selected} timeline={workspace.timeline} exportUrl={workspace.exportUrl} onCancel={id => void workspace.cancelTask(id)}/>}
        </> : <section className="emptyState panel"><Activity aria-hidden="true"/><h2>Your research workspace is ready</h2><p>Ask a question above. Results, sources and captured evidence will stay connected to the run that produced them.</p></section>}
      </>}

      {view === 'datasets' && <>
        <RunSelector tasks={workspace.tasks} selectedId={workspace.selectedId} onSelect={workspace.setSelectedId}/>
        {workspace.selected ? <>
          {workspace.selected.status === 'COMPLETED' && <ResearchOutcome task={workspace.selected} records={workspace.records} exportUrl={workspace.exportUrl}/>}
          <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
            onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>
        </> : <section className="emptyState panel"><Database aria-hidden="true"/><h2>No dataset available</h2><p>Run research first. Published records will be inspectable here with their source evidence.</p></section>}
      </>}

      {view === 'history' && <WorkflowHistory
        tasks={workspace.tasks}
        onOpen={id => selectAndOpen(id, 'console')}
        onOpenDataset={id => selectAndOpen(id, 'datasets')}
      />}
    </main>
  </div>
}

function WorkspaceHeader({ view, online, theme, onToggleTheme }: { view: WorkspaceView; online: boolean; theme: Theme; onToggleTheme: () => void }) {
  const content = {
    console: {
      title: 'Research',
      description: 'Ask a question. NUMEN turns it into structured results with source evidence attached.'
    },
    datasets: {
      title: 'Datasets',
      description: 'Explore published research outputs and inspect the evidence behind individual records.'
    },
    history: {
      title: 'Runs',
      description: 'Review previous research activity, outcomes and technical details when you need them.'
    }
  }[view]

  return <header className="workspaceHeader">
    <div className="workspaceHeaderCopy">
      <h1>{content.title}</h1>
      <p>{content.description}</p>
    </div>
    <div className="workspaceHeaderActions">
      <div className={`livePill ${online ? 'online' : 'offline'}`} role="status" aria-live="polite"><span aria-hidden="true"/> {online ? 'Engine online' : 'Engine offline'}</div>
      <button type="button" className="themeToggle" onClick={onToggleTheme} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} title={theme === 'light' ? 'Dark theme' : 'Light theme'}>
        {theme === 'light' ? <Moon size={16} aria-hidden="true"/> : <Sun size={16} aria-hidden="true"/>}
      </button>
    </div>
  </header>
}

function RunSelector({ tasks, selectedId, onSelect }: { tasks: Task[]; selectedId?: string; onSelect: (id: string) => void }) {
  if (!tasks.length) return null
  return <section className="runSelector panel" aria-label="Dataset run selector">
    <div><span>Dataset source run</span><strong>Select the research run whose published records you want to inspect.</strong></div>
    <select aria-label="Select research dataset" value={selectedId || ''} onChange={event => onSelect(event.target.value)}>
      {tasks.map(task => <option value={task.id} key={task.id}>{statusLabel(task.status)} · {task.prompt.slice(0, 80)}</option>)}
    </select>
  </section>
}

function readView(): WorkspaceView {
  if (typeof window === 'undefined') return 'console'
  const value = window.location.hash.replace('#', '')
  return value === 'datasets' || value === 'history' ? value : 'console'
}

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = localStorage.getItem('numen-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Fall through to the operating-system preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function statusLabel(status: Task['status']): string {
  switch (status) {
    case 'QUEUED': return 'Queued'
    case 'PLANNING': return 'Preparing'
    case 'COLLECTING': return 'Searching'
    case 'PROCESSING': return 'Validating'
    case 'COMPLETED': return 'Ready'
    case 'CANCELLED': return 'Cancelled'
    case 'FAILED': return 'Needs attention'
  }
}
