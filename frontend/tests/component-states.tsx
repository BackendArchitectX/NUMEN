import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { DatasetExplorer } from '../src/components/DatasetExplorer'
import { MetricsGrid } from '../src/components/MetricsGrid'
import { PromptComposer } from '../src/components/PromptComposer'
import { Sidebar } from '../src/components/Sidebar'
import { WorkflowHistory } from '../src/components/WorkflowHistory'
import { WorkflowPanel } from '../src/components/WorkflowPanel'
import type { DatasetRecord, Task, TaskTimelineEvent } from '../src/model/types'

const noop = () => undefined

function includes(markup: string, fragment: string, message: string) {
  assert.ok(markup.includes(fragment), message + '\nRendered markup:\n' + markup)
}

function excludes(markup: string, fragment: string, message: string) {
  assert.ok(!markup.includes(fragment), message + '\nRendered markup:\n' + markup)
}

const offlinePrompt = renderToStaticMarkup(
  <PromptComposer
    prompt="Collect traceable public intelligence"
    busy={false}
    online={false}
    onPromptChange={noop}
    onRun={noop}
  />
)
includes(offlinePrompt, 'disabled=""', 'offline workflow submission must be disabled')
includes(offlinePrompt, 'aria-busy="false"', 'idle submission must expose aria-busy=false')
includes(offlinePrompt, 'What do you want to research?', 'prompt composer must expose the research question label')

const busyPrompt = renderToStaticMarkup(
  <PromptComposer
    prompt="Collect traceable public intelligence"
    busy={true}
    online={true}
    onPromptChange={noop}
    onRun={noop}
  />
)
includes(busyPrompt, 'aria-busy="true"', 'busy submission must expose aria-busy=true')
includes(busyPrompt, 'disabled=""', 'busy submission must remain disabled')

const emptyCompleted = renderToStaticMarkup(
  <DatasetExplorer
    records={[]}
    status="COMPLETED"
    query=""
    minQuality={0}
    onQueryChange={noop}
    onMinQualityChange={noop}
  />
)
includes(emptyCompleted, 'No records match the current filters.', 'completed empty datasets need a clear empty state')
includes(emptyCompleted, 'Collected intelligence records and source provenance', 'dataset table needs an accessible caption')

const record: DatasetRecord = {
  id: 'record-1',
  taskId: 'task-1',
  title: 'Backend Engineer',
  organization: 'Example Org',
  location: 'Remote',
  website: 'https://example.com',
  sourceUrl: 'https://example.com/jobs/1',
  sourceName: 'Example Careers',
  sourceType: 'WEB',
  excerpt: 'A source-backed engineering role used for deterministic component verification.',
  qualityScore: 94.6,
  fingerprint: 'a'.repeat(64),
  collectedAt: '2026-09-30T00:00:00Z'
}

const populated = renderToStaticMarkup(
  <DatasetExplorer
    records={[record]}
    status="COMPLETED"
    query=""
    minQuality={0}
    onQueryChange={noop}
    onMinQualityChange={noop}
  />
)
includes(populated, 'Backend Engineer', 'dataset explorer must render returned records')
includes(populated, '95%', 'quality display should round the persisted score')
includes(populated, 'target="_blank"', 'live provenance links should open separately')
includes(populated, 'rel="noreferrer"', 'external provenance links must suppress referrer leakage')

const activeTask: Task = {
  id: 'task-active',
  prompt: 'Collect permitted public sources and return traceable records',
  status: 'COLLECTING',
  stage: 'Collecting permitted sources',
  progress: 45,
  planJson: JSON.stringify({
    useCase: 'Hiring intelligence',
    fields: ['title', 'organization'],
    stages: ['Interpret', 'Collect', 'Publish'],
    safeguards: ['Preserve source provenance']
  }),
  recordCount: 0,
  averageQuality: 0,
  createdAt: '2026-09-30T00:00:00Z'
}

const timeline: TaskTimelineEvent[] = [{
  id: 'timeline-1',
  taskId: activeTask.id,
  eventType: 'STATE_CHANGED',
  status: 'COLLECTING',
  stage: 'Collecting permitted sources',
  progress: 45,
  occurredAt: '2026-09-30T00:00:15Z'
}]

const activeWorkflow = renderToStaticMarkup(
  <WorkflowPanel task={activeTask} timeline={timeline} exportUrl="#" onCancel={noop} />
)
includes(activeWorkflow, '>Cancel<', 'active workflows need a cancellation control')
includes(activeWorkflow, 'aria-valuenow="45"', 'workflow progress must be exposed semantically')
includes(activeWorkflow, 'Hiring intelligence', 'workflow panel must expose the persisted plan rather than a fabricated pipeline')
includes(activeWorkflow, 'Preserve Source Provenance', 'workflow panel must expose persisted safeguards')
includes(activeWorkflow, 'Run timeline', 'workflow panel must expose the persisted run timeline')
includes(activeWorkflow, 'Collecting permitted sources', 'workflow panel must render persisted timeline events')
excludes(activeWorkflow, 'Export CSV', 'empty in-progress workflows must not advertise an export')

const completedTask: Task = {
  ...activeTask,
  id: 'task-completed',
  status: 'COMPLETED',
  stage: 'Ready',
  progress: 100,
  recordCount: 3,
  averageQuality: 92.3,
  completedAt: '2026-09-30T00:01:00Z'
}

const completedWorkflow = renderToStaticMarkup(
  <WorkflowPanel task={completedTask} timeline={timeline} exportUrl="/api/v1/tasks/task-completed/export.csv" onCancel={noop} />
)
excludes(completedWorkflow, '>Cancel<', 'terminal workflows must not expose cancellation')
includes(completedWorkflow, 'Export CSV', 'completed workflows with records need export access')
includes(completedWorkflow, '3 records published', 'completed workflow should summarize the published outcome instead of emphasizing a progress bar')
excludes(completedWorkflow, 'role="progressbar"', 'completed workflow should not keep a decorative progress bar visible')

const metrics = renderToStaticMarkup(
  <MetricsGrid workflows={4} completed={3} records={12} averageQuality={91} />
)
includes(metrics, 'Runs', 'metrics grid should expose workflow summary')
includes(metrics, 'Completed', 'metrics grid should expose completed-run count instead of a fabricated provenance percentage')
includes(metrics, '12', 'metrics grid should expose record count')
includes(metrics, '91%', 'metrics grid should expose measured quality')

const sidebar = renderToStaticMarkup(
  <Sidebar
    tasks={[completedTask]}
    selectedId={completedTask.id}
    totalRecords={3}
    activeView="datasets"
    onNavigate={noop}
    onSelect={noop}
  />
)
includes(sidebar, '<button', 'workspace navigation must use real interactive controls')
includes(sidebar, 'aria-current="page"', 'active workspace destination must expose current-page semantics')

const history = renderToStaticMarkup(
  <WorkflowHistory tasks={[completedTask]} onOpen={noop} onOpenDataset={noop} />
)
includes(history, 'Runs', 'history view must render persisted research runs')
includes(history, 'Open run', 'history rows must expose a functional run action')
includes(history, 'Dataset', 'completed runs with data must expose their dataset action')

console.log('[NUMEN] frontend component-state tests passed')
