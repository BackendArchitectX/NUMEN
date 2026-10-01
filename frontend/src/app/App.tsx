import { useEffect, useState } from 'react'
import { Activity, Database, Layers3, Sparkles } from 'lucide-react'
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
        <button type="button" className={view === 'history' ? 'active' : ''} onClick={() => navigate('history')}><Layers3 size={15} aria-hidden="true"/> History</button>
      </nav>

      <WorkspaceHeader view={view} online={workspace.online}/>
      {workspace.error && <div className="error" role="alert">{workspace.error}</div>}

      {view === 'console' && <>
        <PromptComposer prompt={workspace.prompt} busy={workspace.busy} online={workspace.online} onPromptChange={workspace.setPrompt} onRun={() => void workspace.createTask()}/>
        <MetricsGrid workflows={workspace.tasks.length} completed={workspace.completed} records={workspace.totalRecords} averageQuality={workspace.avgQuality}/>
        {workspace.selected ? <>
          <WorkflowPanel task={workspace.selected} timeline={workspace.timeline} exportUrl={workspace.exportUrl} onCancel={id => void workspace.cancelTask(id)}/>
          <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
            onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>
        </> : <section className="emptyState panel"><Sparkles aria-hidden="true"/><h2>Start your first intelligence run</h2><p>Use the composer above to create a managed source-backed workflow.</p></section>}
      </>}

      {view === 'datasets' && <>
        <MetricsGrid workflows={workspace.tasks.length} completed={workspace.completed} records={workspace.totalRecords} averageQuality={workspace.avgQuality}/>
        <RunSelector tasks={workspace.tasks} selectedId={workspace.selectedId} onSelect={workspace.setSelectedId}/>
        {workspace.selected
          ? <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
              onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>
          : <section className="emptyState panel"><Database aria-hidden="true"/><h2>No dataset available</h2><p>Run an intelligence workflow first. Published records will be inspectable here.</p></section>}
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
      eyebrow: 'INTELLIGENCE CONSOLE',
      title: 'Plan, run and inspect intelligence.',
      description: 'Turn a business requirement into a persisted execution plan, collect permitted sources and inspect the resulting evidence-backed records.'
    },
    datasets: {
      eyebrow: 'DATASETS',
      title: 'Inspect published intelligence.',
      description: 'Search, sort and inspect the persisted records produced by each workflow without losing their source evidence.'
    },
    history: {
      eyebrow: 'WORKFLOW HISTORY',
      title: 'Every run stays inspectable.',
      description: 'Review persisted workflow state, outcomes, record counts and quality instead of relying on decorative activity indicators.'
    }
  }[view]

  return <header className="workspaceHeader">
    <div className="workspaceHeaderCopy">
      <span className="eyebrow">{content.eyebrow}</span>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
    </div>
    <div className={`livePill ${online ? 'online' : 'offline'}`} role="status" aria-live="polite"><span aria-hidden="true"/> {online ? 'ENGINE ONLINE' : 'ENGINE OFFLINE'}</div>
  </header>
}

function RunSelector({ tasks, selectedId, onSelect }: { tasks: Task[]; selectedId?: string; onSelect: (id: string) => void }) {
  if (!tasks.length) return null
  return <section className="runSelector panel" aria-label="Dataset run selector">
    <div><span>DATASET SOURCE RUN</span><strong>Select the workflow whose published records you want to inspect.</strong></div>
    <select aria-label="Select workflow dataset" value={selectedId || ''} onChange={event => onSelect(event.target.value)}>
      {tasks.map(task => <option value={task.id} key={task.id}>{task.status} · {task.prompt.slice(0, 80)}</option>)}
    </select>
  </section>
}

function readView(): WorkspaceView {
  if (typeof window === 'undefined') return 'console'
  const value = window.location.hash.replace('#', '')
  return value === 'datasets' || value === 'history' ? value : 'console'
}
