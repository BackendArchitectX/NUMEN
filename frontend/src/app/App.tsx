import { useEffect, useState } from 'react'
import { Activity, Database, History, Sparkles } from 'lucide-react'
import { DatasetExplorer } from '../components/DatasetExplorer'
import { MetricsGrid } from '../components/MetricsGrid'
import { PromptComposer } from '../components/PromptComposer'
import { Sidebar } from '../components/Sidebar'
import { WorkflowHistory } from '../components/WorkflowHistory'
import { WorkflowPanel } from '../components/WorkflowPanel'
import { useIntelligenceWorkspace } from '../hooks/useIntelligenceWorkspace'
import type { Task, WorkspaceView } from '../model/types'

export default function App() {
  const workspace = useIntelligenceWorkspace()
  const [view, setView] = useState<WorkspaceView>(() => readView())

  useEffect(() => {
    const syncFromHash = () => setView(readView())
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

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

  return <div className="shell">
    <Sidebar
      tasks={workspace.tasks}
      selectedId={workspace.selectedId}
      totalRecords={workspace.totalRecords}
      activeView={view}
      onNavigate={navigate}
      onSelect={id => selectAndOpen(id, 'console')}
    />

    <main id="main-content">
      <nav className="mobileNav" aria-label="Workspace views">
        <button type="button" className={view === 'console' ? 'active' : ''} onClick={() => navigate('console')}><Activity size={15} aria-hidden="true"/> Console</button>
        <button type="button" className={view === 'datasets' ? 'active' : ''} onClick={() => navigate('datasets')}><Database size={15} aria-hidden="true"/> Datasets</button>
        <button type="button" className={view === 'history' ? 'active' : ''} onClick={() => navigate('history')}><History size={15} aria-hidden="true"/> Runs</button>
      </nav>

      <WorkspaceHeader view={view} online={workspace.online}/>
      {workspace.error && <div className="error" role="alert">{workspace.error}</div>}

      {view === 'console' && <>
        <PromptComposer prompt={workspace.prompt} busy={workspace.busy} online={workspace.online} onPromptChange={workspace.setPrompt} onRun={() => void workspace.createTask()}/>
        <MetricsGrid workflows={workspace.tasks.length} completed={workspace.completed} records={workspace.totalRecords} averageQuality={workspace.avgQuality}/>

        {workspace.selected ? <>
          {selectedComplete && <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
            onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>}

          <WorkflowPanel task={workspace.selected} timeline={workspace.timeline} exportUrl={workspace.exportUrl} onCancel={id => void workspace.cancelTask(id)}/>

          {!selectedComplete && <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
            onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>}
        </> : <section className="emptyState panel"><Sparkles aria-hidden="true"/><h2>Start your first research run</h2><p>Describe what you need above. NUMEN will structure the request and preserve the evidence behind the results.</p></section>}
      </>}

      {view === 'datasets' && <>
        <MetricsGrid workflows={workspace.tasks.length} completed={workspace.completed} records={workspace.totalRecords} averageQuality={workspace.avgQuality}/>
        <RunSelector tasks={workspace.tasks} selectedId={workspace.selectedId} onSelect={workspace.setSelectedId}/>
        {workspace.selected
          ? <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
              onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>
          : <section className="emptyState panel"><Database aria-hidden="true"/><h2>No dataset available</h2><p>Run research first. Published records will be inspectable here with their source evidence.</p></section>}
      </>}

      {view === 'history' && <>
        <MetricsGrid workflows={workspace.tasks.length} completed={workspace.completed} records={workspace.totalRecords} averageQuality={workspace.avgQuality}/>
        <WorkflowHistory
          tasks={workspace.tasks}
          onOpen={id => selectAndOpen(id, 'console')}
          onOpenDataset={id => selectAndOpen(id, 'datasets')}
        />
      </>}
    </main>
  </div>
}

function WorkspaceHeader({ view, online }: { view: WorkspaceView; online: boolean }) {
  const content = {
    console: {
      eyebrow: 'Research workspace',
      title: 'Turn a question into traceable intelligence.',
      description: 'Describe the outcome you need. NUMEN structures the request, collects permitted sources and keeps the evidence behind every published record.'
    },
    datasets: {
      eyebrow: 'Datasets',
      title: 'Explore published results.',
      description: 'Search, sort and inspect the records created by each research run without losing the source evidence behind them.'
    },
    history: {
      eyebrow: 'Runs',
      title: 'Review research activity.',
      description: 'Open previous runs, inspect outcomes and return to their published datasets or technical details when needed.'
    }
  }[view]

  return <header className="workspaceHeader">
    <div className="workspaceHeaderCopy">
      <span className="eyebrow">{content.eyebrow}</span>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
    </div>
    <div className={`livePill ${online ? 'online' : 'offline'}`} role="status" aria-live="polite"><span aria-hidden="true"/> {online ? 'Engine online' : 'Engine offline'}</div>
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
