import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, Database, History, Plus, Radio } from 'lucide-react'
import { DatasetExplorer } from '../components/DatasetExplorer'
import { DatasetLibrary } from '../components/DatasetLibrary'
import { PromptComposer } from '../components/PromptComposer'
import { ResearchOutcome } from '../components/ResearchOutcome'
import { Sidebar } from '../components/Sidebar'
import { SourceExplorer } from '../components/SourceExplorer'
import { SourceResearchIndex } from '../components/SourceResearchIndex'
import { WorkflowHistory } from '../components/WorkflowHistory'
import { WorkflowPanel } from '../components/WorkflowPanel'
import { useIntelligenceWorkspace } from '../hooks/useIntelligenceWorkspace'
import type { Task, WorkspaceView } from '../model/types'
import { groupResearchTasks } from '../shared/research'
import { formatRelativeInstant } from '../shared/time'

interface WorkspaceRoute {
  view: WorkspaceView
  taskId?: string
}

export default function App() {
  const workspace = useIntelligenceWorkspace()
  const [view, setView] = useState<WorkspaceView>(() => readRoute().view)

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
    document.documentElement.removeAttribute('data-theme')
    try {
      localStorage.removeItem('numen-theme')
    } catch {
      // Legacy theme preference cleanup is best-effort.
    }
  }, [])

  const navigate = (next: WorkspaceView, taskId?: string) => {
    setView(next)
    const hash = buildHash(next, taskId)
    if (window.location.hash !== hash) window.location.hash = hash
  }

  const navigateWorkspace = (next: WorkspaceView) => {
    if (next !== 'research') workspace.selectTask(undefined)
    navigate(next, next === 'research' ? workspace.selectedId : undefined)
  }

  const selectAndOpen = (id: string, destination: WorkspaceView) => {
    workspace.selectTask(id)
    navigate(destination, id)
  }

  const startNewResearch = () => {
    workspace.startNewResearch()
    navigate('research')
    focusResearchComposer()
  }

  const refineResearch = (task: Task) => {
    workspace.refineTask(task)
    navigate('research')
    focusResearchComposer()
  }

  const publishedTasks = useMemo(
    () => workspace.tasks.filter(task => task.status === 'COMPLETED' && task.recordCount > 0),
    [workspace.tasks]
  )
  const sourceTasks = useMemo(
    () => workspace.tasks.filter(task =>
      ['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)
      && (task.sourceUrls.length > 0 || task.demoMode || task.recordCount > 0)
    ),
    [workspace.tasks]
  )
  const selectedComplete = workspace.selected?.status === 'COMPLETED'
  const selectedTerminalWithDiagnostics = workspace.selected?.status === 'FAILED' || workspace.selected?.status === 'CANCELLED'

  return <div className="shell">
    <Sidebar
      tasks={workspace.tasks}
      selectedId={workspace.selectedId}
      activeView={view}
      onNewResearch={startNewResearch}
      onNavigate={navigateWorkspace}
      onSelect={id => selectAndOpen(id, 'research')}
    />

    <main id="main-content" className={`workspaceMain workspace-${view}`}>
      <nav className="mobileNav" aria-label="Workspace views">
        <button type="button" className={view === 'research' ? 'active' : ''} onClick={() => navigateWorkspace('research')}><Activity size={15} aria-hidden="true"/> Research</button>
        <button type="button" className={view === 'datasets' ? 'active' : ''} onClick={() => navigateWorkspace('datasets')}><Database size={15} aria-hidden="true"/> Datasets</button>
        <button type="button" className={view === 'sources' ? 'active' : ''} onClick={() => navigateWorkspace('sources')}><Radio size={15} aria-hidden="true"/> Sources</button>
        <button type="button" className={view === 'history' ? 'active' : ''} onClick={() => navigateWorkspace('history')}><History size={15} aria-hidden="true"/> Runs</button>
      </nav>

      {(view !== 'research' || workspace.selected) && <WorkspaceHeader
        view={view}
        online={workspace.online}
        showNewResearch={view !== 'research' || Boolean(workspace.selected)}
        onNewResearch={startNewResearch}
      />}
      {workspace.error && <div className="error" role="alert">{workspace.error}</div>}

      {view === 'research' && <>
        {!workspace.selected && <ResearchIntro />}
        {!workspace.selected && <PromptComposer
          prompt={workspace.prompt}
          demoMode={workspace.demoMode}
          sourceUrls={workspace.sourceUrls}
          busy={workspace.busy}
          online={workspace.online === true}
          onPromptChange={workspace.setPrompt}
          onDemoModeChange={workspace.setDemoMode}
          onSourceUrlsChange={workspace.setSourceUrls}
          onRun={() => void workspace.createTask()}
        />}

        {workspace.selected ? <>
          {selectedComplete
            ? <ResearchOutcome
                task={workspace.selected}
                summary={workspace.summary}
                summaryState={workspace.summaryState}
                changes={workspace.changes}
                changesState={workspace.changesState}
                exportUrl={workspace.exportUrl}
                onRefine={() => refineResearch(workspace.selected!)}
                onViewSources={() => selectAndOpen(workspace.selected!.id, 'sources')}
              />
            : <WorkflowPanel
                task={workspace.selected}
                timeline={workspace.timeline}
                sources={workspace.sources}
                sourcesState={workspace.sourcesState}
                onCancel={id => void workspace.cancelTask(id)}
              />}

          {selectedTerminalWithDiagnostics && <SourceExplorer
            sources={workspace.sources}
            totalRecords={workspace.selected.recordCount}
            state={workspace.sourcesState}/>}

          <DatasetExplorer
            records={workspace.records}
            totalRecords={workspace.summary?.totalRecords ?? workspace.selected.recordCount}
            matchedRecords={workspace.matchedRecords}
            demoRecords={workspace.summary?.demoRecords ?? (workspace.selected.demoMode ? workspace.selected.recordCount : 0)}
            status={workspace.selected.status}
            loadState={workspace.recordsState}
            query={workspace.query}
            minQuality={workspace.minQuality}
            page={workspace.page}
            pageSize={workspace.pageSize}
            totalPages={workspace.totalPages}
            sortKey={workspace.sortBy}
            sortDirection={workspace.sortDirection}
            onQueryChange={workspace.setQuery}
            onMinQualityChange={workspace.setMinQuality}
            onSort={workspace.setSort}
            onPageChange={workspace.setPage}
            onPageSizeChange={workspace.setPageSize}/>

          {selectedComplete && <WorkflowPanel
            task={workspace.selected}
            timeline={workspace.timeline}
            sources={workspace.sources}
            sourcesState={workspace.sourcesState}
            onCancel={id => void workspace.cancelTask(id)}
          />}
        </> : <RecentResearch tasks={workspace.tasks} onOpen={id => selectAndOpen(id, 'research')}/>}
      </>}

      {view === 'datasets' && <>
        {workspace.selected && workspace.selected.status === 'COMPLETED' && workspace.selected.recordCount > 0
          ? <>
              <div className="contextToolbar">
                <button type="button" className="secondaryAction" onClick={() => { workspace.selectTask(undefined); navigate('datasets') }}>All datasets</button>
                <span>Published dataset</span>
              </div>
              <ResearchOutcome
                task={workspace.selected}
                summary={workspace.summary}
                summaryState={workspace.summaryState}
                changes={workspace.changes}
                changesState={workspace.changesState}
                exportUrl={workspace.exportUrl}
                onRefine={() => refineResearch(workspace.selected!)}
                onViewSources={() => selectAndOpen(workspace.selected!.id, 'sources')}
              />
              <DatasetExplorer
                records={workspace.records}
                totalRecords={workspace.summary?.totalRecords ?? workspace.selected.recordCount}
                matchedRecords={workspace.matchedRecords}
                demoRecords={workspace.summary?.demoRecords ?? (workspace.selected.demoMode ? workspace.selected.recordCount : 0)}
                status={workspace.selected.status}
                loadState={workspace.recordsState}
                query={workspace.query}
                minQuality={workspace.minQuality}
                page={workspace.page}
                pageSize={workspace.pageSize}
                totalPages={workspace.totalPages}
                sortKey={workspace.sortBy}
                sortDirection={workspace.sortDirection}
                onQueryChange={workspace.setQuery}
                onMinQualityChange={workspace.setMinQuality}
                onSort={workspace.setSort}
                onPageChange={workspace.setPage}
                onPageSizeChange={workspace.setPageSize}/>
            </>
          : <DatasetLibrary
              tasks={publishedTasks}
              onOpen={id => selectAndOpen(id, 'datasets')}
              onOpenSources={id => selectAndOpen(id, 'sources')}
              onNewResearch={startNewResearch}
            />}
      </>}

      {view === 'sources' && <>
        {workspace.selected && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(workspace.selected.status)
          ? <>
              <div className="contextToolbar">
                <button type="button" className="secondaryAction" onClick={() => { workspace.selectTask(undefined); navigate('sources') }}>All source sets</button>
                <span>Provenance for selected research</span>
              </div>
              <RunSelector
                label="Research source set"
                description="Switch research without losing the source workspace."
                tasks={sourceTasks}
                selectedId={workspace.selectedId}
                onSelect={id => selectAndOpen(id, 'sources')}/>
              <SourceExplorer sources={workspace.sources} totalRecords={workspace.summary?.totalRecords ?? workspace.selected.recordCount} state={workspace.sourcesState}/>
            </>
          : <SourceResearchIndex tasks={sourceTasks} onOpen={id => selectAndOpen(id, 'sources')} onNewResearch={startNewResearch}/>}
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

function WorkspaceHeader({
  view,
  online,
  showNewResearch,
  onNewResearch
}: {
  view: WorkspaceView
  online: boolean | null
  showNewResearch: boolean
  onNewResearch: () => void
}) {
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
      description: 'Inspect source contribution, collection outcomes and the latest successful observation or attempt.'
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
      {online === true && <div className="livePill connected" role="status" aria-live="polite"><span aria-hidden="true"/> Connected</div>}
      {online === false && <div className="livePill offline" role="status" aria-live="polite"><span aria-hidden="true"/> Service unavailable</div>}
      {showNewResearch && <button type="button" className="headerNewResearch secondaryAction" onClick={onNewResearch}><Plus size={14} aria-hidden="true"/> New research</button>}
    </div>
  </header>
}

function ResearchIntro() {
  return <section className="researchIntro" aria-labelledby="research-intro-title">
    <div>
      <span className="eyebrow">NUMEN research</span>
      <h2 id="research-intro-title">Turn a research question into evidence you can inspect.</h2>
      <p>Define the outcome, attach the public sources NUMEN should inspect and keep every published result connected to its evidence.</p>
    </div>
    <div className="researchIntroSignals" aria-label="NUMEN research capabilities">
      <span>Explicit source scope</span>
      <span>Evidence stays attached</span>
      <span>Structured results</span>
    </div>
  </section>
}

function RecentResearch({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  const groups = groupResearchTasks(tasks).slice(0, 6)
  if (!groups.length) {
    return <section className="emptyState panel"><Activity aria-hidden="true"/><h2>Your research workspace is ready</h2><p>Ask a question above. Results, sources and captured evidence will stay connected to the run that produced them.</p></section>
  }

  return <section className="recentResearch panel" aria-labelledby="recent-research-heading">
    <div className="resultsHeader">
      <div className="resultsTitle"><History size={18} aria-hidden="true"/><div><h3 id="recent-research-heading">Recent research</h3><span>Repeated runs are grouped so the latest outcome stays easy to find.</span></div></div>
    </div>
    <div className="recentResearchList">
      {groups.map(({ latest: task, runs }) => <button type="button" key={task.id} onClick={() => onOpen(task.id)}>
        <span className={`dot ${task.status.toLowerCase()}`} aria-hidden="true"/>
        <span className="recentResearchCopy"><strong>{task.prompt}</strong><small>{researchMeta(task, runs)}</small></span>
        <span className="recentResearchAction"><span>{statusLabel(task.status)}</span><strong>Open</strong><ArrowRight size={13} aria-hidden="true"/></span>
      </button>)}
    </div>
  </section>
}

function RunSelector({ label, description, tasks, selectedId, onSelect }: { label: string; description: string; tasks: Task[]; selectedId?: string; onSelect: (id: string) => void }) {
  if (!tasks.length) return null
  const selectedPublished = selectedId && tasks.some(task => task.id === selectedId) ? selectedId : ''

  return <section className="runSelector panel" aria-label={label}>
    <div><span>{label}</span><strong>{description}</strong></div>
    <select aria-label={`Select ${label.toLowerCase()}`} value={selectedPublished} onChange={event => event.target.value && onSelect(event.target.value)}>
      <option value="">Choose research…</option>
      {tasks.map(task => <option value={task.id} key={task.id}>{task.demoMode ? 'Demo · ' : ''}{task.recordCount} {task.recordCount === 1 ? 'record' : 'records'} · {task.prompt.slice(0, 72)}</option>)}
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

function researchMeta(task: Task, runs: number): string {
  const runCount = runs > 1 ? ` · ${runs} runs` : ''
  if (task.status === 'COMPLETED') return `${task.demoMode ? 'Demo · ' : ''}${task.recordCount} published ${task.recordCount === 1 ? 'record' : 'records'}${runCount} · ${formatRelativeInstant(task.completedAt || task.createdAt)}`
  if (task.status === 'FAILED') return `Stopped before a complete outcome was published${runCount}`
  if (task.status === 'CANCELLED') return `Cancelled${runCount}`
  return `${statusLabel(task.status)}${runCount} · ${formatRelativeInstant(task.startedAt || task.createdAt)}`
}

function statusLabel(status: Task['status']): string {
  switch (status) {
    case 'QUEUED': return 'Queued'
    case 'PLANNING': return 'Preparing'
    case 'COLLECTING': return 'Searching'
    case 'PROCESSING': return 'Validating'
    case 'COMPLETED': return 'Complete'
    case 'CANCELLED': return 'Cancelled'
    case 'FAILED': return 'Needs attention'
  }
}

function focusResearchComposer() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => document.getElementById('research-question')?.focus())
  })
}
