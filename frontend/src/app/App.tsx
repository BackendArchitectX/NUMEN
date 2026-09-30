import { Sparkles, XCircle } from 'lucide-react'
import { DatasetExplorer } from '../components/DatasetExplorer'
import { MetricsGrid } from '../components/MetricsGrid'
import { PromptComposer } from '../components/PromptComposer'
import { Sidebar } from '../components/Sidebar'
import { WorkflowPanel } from '../components/WorkflowPanel'
import { useIntelligenceWorkspace } from '../hooks/useIntelligenceWorkspace'

export default function App() {
  const workspace = useIntelligenceWorkspace()

  return <div className="shell">
    <Sidebar tasks={workspace.tasks} selectedId={workspace.selectedId} totalRecords={workspace.totalRecords} onSelect={workspace.setSelectedId}/>
    <main id="main-content">
      <header>
        <div>
          <span className="eyebrow">AI-POWERED DATA INTELLIGENCE PLATFORM</span>
          <h1>From intent to <em>traceable data.</em></h1>
          <p>Describe what you need. NUMEN designs the workflow, collects permitted sources, validates evidence and returns a clean dataset.</p>
        </div>
        <div className={`livePill ${workspace.online ? 'online' : 'offline'}`} role="status" aria-live="polite"><span aria-hidden="true"/> {workspace.online ? 'ENGINE ONLINE' : 'ENGINE OFFLINE'}</div>
      </header>

      <PromptComposer prompt={workspace.prompt} busy={workspace.busy} online={workspace.online} onPromptChange={workspace.setPrompt} onRun={() => void workspace.createTask()}/>
      {workspace.error && <div className="error" role="alert"><XCircle size={16} aria-hidden="true"/>{workspace.error}</div>}
      <MetricsGrid workflows={workspace.tasks.length} completed={workspace.completed} records={workspace.totalRecords} averageQuality={workspace.avgQuality}/>

      {workspace.selected ? <>
        <WorkflowPanel task={workspace.selected} exportUrl={workspace.exportUrl} onCancel={id => void workspace.cancelTask(id)}/>
        <DatasetExplorer records={workspace.records} status={workspace.selected.status} query={workspace.query} minQuality={workspace.minQuality}
          onQueryChange={workspace.setQuery} onMinQualityChange={workspace.setMinQuality}/>
      </> : <section className="emptyState panel"><Sparkles aria-hidden="true"/><h2>Start your first intelligence run</h2><p>Use the prompt above to create a managed data-collection workflow.</p></section>}
    </main>
  </div>
}
