import { useEffect, useMemo, useState } from 'react'
import { Activity, Database, History, Moon, Radio, Sun } from 'lucide-react'
import { DatasetExplorer } from '../components/DatasetExplorer'
import { PromptComposer } from '../components/PromptComposer'
import { ResearchOutcome } from '../components/ResearchOutcome'
import { Sidebar } from '../components/Sidebar'
import { SourceExplorer } from '../components/SourceExplorer'
import { WorkflowHistory } from '../components/WorkflowHistory'
import { WorkflowPanel } from '../components/WorkflowPanel'
import { useIntelligenceWorkspace } from '../hooks/useIntelligenceWorkspace'
import type { Task, WorkspaceView } from '../model/types'

type Theme = 'light' | 'dark'

interface WorkspaceRoute {
  view: WorkspaceView
  taskId?: string
}

export default function App() {
  const workspace = useIntelligenceWorkspace()
  const [view, setView] = useState<WorkspaceView>(() => readRoute().view)
  const [theme, setTheme] = useState<Theme>(() => readTheme())

  useEffect(() => {
    const syncFromHash = () => {
      const route = readRoute()
      setView(route.view)
      if (route.view !== 'history') workspace.selectTask(route.taskId)
    }
    window.addEventListener('hashchange', syncFromHash)
    syncFromHash()
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

  const navigate = (next: WorkspaceView, taskId?: string) => {
    setView(next)
    const hash = buildHash(next, taskId)
    if (window.location.hash !== hash) window.location.hash = hash
  }

  const navigateWorkspace = (next: WorkspaceView) => {
    navigate(next, next === 'history' ? undefined : workspace.selectedId)
  }

  const selectAndOpen = (id: string, destination: WorkspaceView) => {
    workspace.selectTask(id)
    navigate(destination, id)
  }

  const startNewResearch = () => {
    workspace.startNewResearch()
    navigate('research')
  }

  const publishedTasks = useMemo(
    () => workspace.tasks.filter(task => task.status === 'COMPLETED' && task.recordCount > 0),
    [workspace.tasks]
  )
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
      onNewResearch={startNewResearch}
      onNavigate={navigateWorkspace}
      onSelect={id => selectAndOpen(id, 'research')}
    />

    <main id="main-content">
      <nav className="mobileNav" aria-label="Workspace views">
        <button type="button" className={view === 'research' ? 'active' : ''} onClick={() => navigateWorkspace('research')}><Activity size={15} aria-hidden="true"/> Research</button>
        <button type="button" className={view === 'datasets' ? 'active' : ''} onClick={() => navigateWorkspace('datasets')}><Database size={15} aria-hidden="true"/> Datasets</button>
        <button type="button" className={view === 'sources' ? 'active' : ''} onClick={() => navigateWorkspace('sources')}><Radio size={15} aria-hidden="true"/> Sources</button>
        <button type="button" className={view === 'history' ? 'active' : ''} onClick={() => navigateWorkspace('history')}><History size={15} aria-hidden="true"/> Runs</button>
      </nav>

      <WorkspaceHeader view={view} online={workspace.online === true} theme={theme} onToggleTheme={toggleTheme}/>
      {workspace.error && <div className="error" role="alert">{workspace.error}</div>}

      {view === 'research' && <>
        <PromptComposer prompt={workspace.prompt} busy={workspace.busy} online={workspace.online} onPromptChange={workspace.setPrompt} onRun={() => void workspace.createTask()}/>

        {workspace.selected ? <>
          {selectedComplete
            ? <ResearchOutcome task={workspace.selected} records={workspace.records} exportUrl={workspace.exportUrl}/>
            : <WorkflowPanel task={workspace.selected} timeline={workspace.timeline} exportUrl={workspace.exportUrl} onCancel={id => void workspace.cancelTask(id)}/>}

          <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
            onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>

          {selectedComplete && <WorkflowPanel task={workspace.selected} timeline={workspace.timeline} exportUrl={workspace.exportUrl} onCancel={id => void workspace.cancelTask(id)}/>}
        </> : <RecentResearch tasks={workspace.tasks} onOpen={id => selectAndOpen(id, 'research')}/>}
      </>}

      {view === 'datasets' && <>
        <RunSelector label="Published dataset" tasks={publishedTasks} selectedId={workspace.selectedId} onSelect={id => selectAndOpen(id, 'datasets')}/>
        {workspace.selected && workspace.selected.status === 'COMPLETED' && workspace.selected.recordCount > 0 ? <>
          <ResearchOutcome task={workspace.selected} records={workspace.records} exportUrl={workspace.exportUrl}/>
          <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
            onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>
        </> : <section className="emptyState panel"><Database aria-hidden="true"/><h2>Select a published dataset</h2><p>Only completed research with published records appears here. Choose a dataset above or start new research.</p></section>}
      </>}

      {view === 'sources' && <>
        <RunSelector label="Research source set" tasks={publishedTasks} selectedId={workspace.selectedId} onSelect={id => selectAndOpen(id, 'sources')}/>
        {workspace.selected && workspace.selected.status === 'COMPLETED' && workspace.selected.recordCount > 0
          ? <SourceExplorer records={workspace.records}/>
          : <section className="emptyState panel"><Radio aria-hidden="true"/><h2>Select published research</h2><p>Source contribution and captured-evidence coverage are shown for completed research with published records.</p></section>}
      </>}

      {view === 'history' && <WorkflowHistory
        tasks={workspace.tasks}
        onOpen={id => selectAndOpen(id, 'research')}
        onOpenDataset={id => selectAndOpen(id, 'datasets')}
        onOpenSources={id => selectAndOpen(id, 'sources')}
      />}
    </main>
  </div>
}

function WorkspaceHeader({ view, online, theme, onToggleTheme }: { view: WorkspaceView; online: boolean | null; theme: Theme; onToggleTheme: () => void }) {
  const content = {
    research: {
      title: 'Research',
      description: 'Ask a question. NUMEN turns it into structured results with source evidence attached.'
    },
    datasets: {
      title: 'Datasets',
      description: 'Explore published research outputs and inspect the evidence behind individual records.'
    },
    sources: {
      title: 'Sources',
      description: 'See which sources contributed records, how much evidence they supplied and when they were last collected.'
    },
    history: {
      title: 'Runs',
      description: 'Review research activity and reopen outcomes without exposing engine internals by default.'
    }
  }[view]

  return <header className="workspaceHeader">
    <div className="workspaceHeaderCopy">
      <h1>{content.title}</h1>
      <p>{content.description}</p>
    </div>
    <div className="workspaceHeaderActions">
      {online === false && <div className="livePill offline" role="status" aria-live="polite"><span aria-hidden="true"/> Service unavailable</div>}
      <button type="button" className="themeToggle" onClick={onToggleTheme} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} title={theme === 'light' ? 'Dark theme' : 'Light theme'}>
        {theme === 'light' ? <Moon size={16} aria-hidden="true"/> : <Sun size={16} aria-hidden="true"/>}
      </button>
    </div>
  </header>
}

function RecentResearch({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  if (!tasks.length) {
    return <section className="emptyState panel"><Activity aria-hidden="true"/><h2>Your research workspace is ready</h2><p>Ask a question above. Results, sources and captured evidence will stay connected to the run that produced them.</p></section>
  }

  return <section className="recentResearch panel" aria-labelledby="recent-research-heading">
    <div className="resultsHeader">
      <div className="resultsTitle"><History size={18} aria-hidden="true"/><div><h3 id="recent-research-heading">Recent research</h3><span>Continue from a previous outcome or start something new above.</span></div></div>
    </div>
    <div className="recentResearchList">
      {tasks.slice(0, 6).map(task => <button type="button" key={task.id} onClick={() => onOpen(task.id)}>
        <span className={`dot ${task.status.toLowerCase()}`} aria-hidden="true"/>
        <span className="recentResearchCopy"><strong>{task.prompt}</strong><small>{researchMeta(task)}</small></span>
        <span className="recentResearchStatus">{statusLabel(task.status)}</span>
      </button>)}
    </div>
  </section>
}

function RunSelector({ label, tasks, selectedId, onSelect }: { label: string; tasks: Task[]; selectedId?: string; onSelect: (id: string) => void }) {
  if (!tasks.length) return null
  const selectedPublished = selectedId && tasks.some(task => task.id === selectedId) ? selectedId : ''

  return <section className="runSelector panel" aria-label={label}>
    <div><span>{label}</span><strong>Select completed research with published records.</strong></div>
    <select aria-label={`Select ${label.toLowerCase()}`} value={selectedPublished} onChange={event => event.target.value && onSelect(event.target.value)}>
      <option value="">Choose research…</option>
      {tasks.map(task => <option value={task.id} key={task.id}>{task.recordCount} records · {task.prompt.slice(0, 78)}</option>)}
    </select>
  </section>
}

function readRoute(): WorkspaceRoute {
  if (typeof window === 'undefined') return { view: 'research' }
  const raw = window.location.hash.replace(/^#/, '')
  const [routeValue, encodedTaskId] = raw.split('/')
  const taskId = encodedTaskId ? decodeURIComponent(encodedTaskId) : undefined

  if (routeValue === 'datasets') return { view: 'datasets', taskId }
  if (routeValue === 'sources') return { view: 'sources', taskId }
  if (routeValue === 'history' || routeValue === 'runs') return { view: 'history' }
  if (routeValue === 'console') return { view: 'research', taskId }
  return { view: 'research', taskId }
}

function buildHash(view: WorkspaceView, taskId?: string): string {
  const route = view === 'history' ? 'runs' : view
  return taskId && view !== 'history' ? `#${route}/${encodeURIComponent(taskId)}` : `#${route}`
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

function researchMeta(task: Task): string {
  if (task.status === 'COMPLETED') return `${task.recordCount} published records · ${formatRelative(task.completedAt || task.createdAt)}`
  if (task.status === 'FAILED') return 'Stopped before a complete outcome was published'
  if (task.status === 'CANCELLED') return 'Cancelled'
  return `${statusLabel(task.status)} · ${formatRelative(task.startedAt || task.createdAt)}`
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

function formatRelative(value: string): string {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 'recently'
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
