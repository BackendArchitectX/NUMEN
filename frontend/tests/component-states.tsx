import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { DatasetExplorer } from '../src/components/DatasetExplorer'
import { PromptComposer } from '../src/components/PromptComposer'
import { ResearchOutcome } from '../src/components/ResearchOutcome'
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
includes(offlinePrompt, 'disabled=""', 'offline research submission must be disabled')
includes(offlinePrompt, 'aria-busy="false"', 'idle submission must expose aria-busy=false')
includes(offlinePrompt, 'New research', 'composer must present plain-language research terminology')

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
includes(emptyCompleted, 'completed without publishable records', 'completed empty datasets need an honest empty state')
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
includes(populated, '95%', 'data-quality display should round the persisted score')
includes(populated, 'target="_blank"', 'live provenance links should open separately')
includes(populated, 'rel="noreferrer"', 'external provenance links must suppress referrer leakage')
includes(populated, 'Data quality', 'quality terminology must be explicit rather than an unexplained percentage')

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
includes(activeWorkflow, '>Cancel<', 'active research needs a cancellation control')
includes(activeWorkflow, 'Current activity', 'active research must explain what NUMEN is doing')
includes(activeWorkflow, 'Searching sources', 'active research must use user-facing status language')
includes(activeWorkflow, 'Hiring intelligence', 'run details must retain the persisted plan')
includes(activeWorkflow, 'Run timeline', 'run details must retain persisted lifecycle evidence')
excludes(activeWorkflow, 'role="progressbar"', 'fixed engine milestones must not be presented as precise user progress')
excludes(activeWorkflow, '45%', 'primary active state must not expose decorative precision')

const completedTask: Task = {
  ...activeTask,
  id: 'task-completed',
  status: 'COMPLETED',
  stage: 'Ready',
  progress: 100,
  recordCount: 1,
  averageQuality: 94.6,
  completedAt: '2026-09-30T00:01:00Z'
}

const completedWorkflow = renderToStaticMarkup(
  <WorkflowPanel task={completedTask} timeline={timeline} exportUrl="/api/v1/tasks/task-completed/export.csv" onCancel={noop} />
)
excludes(completedWorkflow, '>Cancel<', 'terminal workflows must not expose cancellation')
includes(completedWorkflow, 'Run details', 'completed workflow mechanics must remain available behind disclosure')
excludes(completedWorkflow, 'Research outcome', 'completed technical panel must not compete with the result outcome')

const outcome = renderToStaticMarkup(
  <ResearchOutcome task={completedTask} records={[record]} exportUrl="/api/v1/tasks/task-completed/export.csv" />
)
includes(outcome, 'Research ready', 'completed live research must foreground the outcome state')
includes(outcome, '1 published results', 'outcome summary must be derived from actual persisted records')
includes(outcome, 'Evidence linked', 'outcome must foreground evidence coverage')
includes(outcome, 'Export CSV', 'completed research must expose its export action')

const sidebar = renderToStaticMarkup(
  <Sidebar
    tasks={[completedTask]}
    selectedId={completedTask.id}
    totalRecords={1}
    activeView="datasets"
    theme="light"
    onToggleTheme={noop}
    onNavigate={noop}
    onSelect={noop}
  />
)
includes(sidebar, '>Research<', 'workspace navigation must use research terminology')
includes(sidebar, 'aria-current="page"', 'active workspace destination must expose current-page semantics')
includes(sidebar, 'Appearance', 'sidebar must expose the theme control without infrastructure marketing')

const history = renderToStaticMarkup(
  <WorkflowHistory tasks={[completedTask]} onOpen={noop} onOpenDataset={noop} />
)
includes(history, 'Runs', 'history view must render persisted research runs')
includes(history, 'Open run', 'history rows must expose a functional run action')
includes(history, 'Dataset', 'completed runs with data must expose their dataset action')

console.log('[NUMEN] frontend component-state tests passed')
