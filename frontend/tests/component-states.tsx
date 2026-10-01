import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { DatasetExplorer } from '../src/components/DatasetExplorer'
import { PromptComposer } from '../src/components/PromptComposer'
import { ResearchOutcome } from '../src/components/ResearchOutcome'
import { Sidebar } from '../src/components/Sidebar'
import { SourceExplorer } from '../src/components/SourceExplorer'
import { WorkflowHistory } from '../src/components/WorkflowHistory'
import { WorkflowPanel } from '../src/components/WorkflowPanel'
import type { DatasetRecord, DatasetSummary, SourceSummary, Task, TaskTimelineEvent } from '../src/model/types'

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
    demoMode={false}
    sourceUrls={[]}
    busy={false}
    online={false}
    onPromptChange={noop}
    onDemoModeChange={noop}
    onSourceUrlsChange={noop}
    onRun={noop}
  />
)
includes(offlinePrompt, 'disabled=""', 'offline research submission must be disabled')
includes(offlinePrompt, 'aria-busy="false"', 'idle submission must expose aria-busy=false')
includes(offlinePrompt, 'New research', 'composer must present plain-language research terminology')

const busyPrompt = renderToStaticMarkup(
  <PromptComposer
    prompt="Collect traceable public intelligence"
    demoMode={false}
    sourceUrls={[]}
    busy={true}
    online={true}
    onPromptChange={noop}
    onDemoModeChange={noop}
    onSourceUrlsChange={noop}
    onRun={noop}
  />
)
includes(busyPrompt, 'aria-busy="true"', 'busy submission must expose aria-busy=true')
includes(busyPrompt, 'disabled=""', 'busy submission must remain disabled')

const sourceLessPrompt = renderToStaticMarkup(
  <PromptComposer
    prompt="Find Java backend engineering roles in India"
    demoMode={false}
    sourceUrls={[]}
    busy={false}
    online={true}
    onPromptChange={noop}
    onDemoModeChange={noop}
    onSourceUrlsChange={noop}
    onRun={noop}
  />
)
includes(sourceLessPrompt, 'Source required.', 'composer must explain that live research requires supplied public sources')
includes(sourceLessPrompt, 'disabled=""', 'source-less live research must be disabled rather than silently generating demo data')

const liveSourcePrompt = renderToStaticMarkup(
  <PromptComposer
    prompt="Research a public technology source and preserve evidence"
    demoMode={false}
    sourceUrls={['https://example.com/']}
    busy={false}
    online={true}
    onPromptChange={noop}
    onDemoModeChange={noop}
    onSourceUrlsChange={noop}
    onRun={noop}
  />
)
includes(liveSourcePrompt, '1 public source configured.', 'composer must confirm the explicit live source scope')
excludes(liveSourcePrompt, 'disabled=""', 'valid explicit-source research must be runnable when the service is online')

const explicitDemoPrompt = renderToStaticMarkup(
  <PromptComposer
    prompt="Find Java backend engineering roles in India"
    demoMode={true}
    sourceUrls={[]}
    busy={false}
    online={true}
    onPromptChange={noop}
    onDemoModeChange={noop}
    onSourceUrlsChange={noop}
    onRun={noop}
  />
)
includes(explicitDemoPrompt, 'Demo mode', 'demo generation must require an explicit visible mode')
excludes(explicitDemoPrompt, 'disabled=""', 'explicit demo research may run without external URLs')

const emptyCompleted = renderToStaticMarkup(
  <DatasetExplorer
    records={[]}
    totalRecords={0}
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
    totalRecords={1}
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
includes(populated, 'aria-haspopup="dialog"', 'record rows must announce that evidence opens in a dialog')

const truncated = renderToStaticMarkup(
  <DatasetExplorer
    records={[record]}
    totalRecords={2}
    status="COMPLETED"
    query=""
    minQuality={0}
    onQueryChange={noop}
    onMinQualityChange={noop}
  />
)
includes(truncated, 'Showing the first 1 of 2 published rows', 'result windows must disclose truncation rather than implying completeness')

const activeTask: Task = {
  id: 'task-active',
  prompt: 'Collect permitted public sources and return traceable records',
  demoMode: false,
  sourceUrls: ['https://example.com/'],
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
  createdAt: '2026-09-30T00:00:00Z',
  startedAt: '2026-09-30T00:00:05Z'
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


const summary: DatasetSummary = {
  totalRecords: 1,
  uniqueOrganizations: 1,
  uniqueLocations: 1,
  uniqueSources: 1,
  evidenceLinkedRecords: 1,
  demoRecords: 0,
  latestCollectedAt: record.collectedAt,
  topLocations: [{ value: 'Remote', count: 1 }]
}

const sourceSummary: SourceSummary = {
  name: 'Example Careers',
  url: 'https://example.com/jobs/1',
  type: 'WEB',
  records: 1,
  evidence: 1,
  latestCollectedAt: record.collectedAt,
  demo: false
}

const outcome = renderToStaticMarkup(
  <ResearchOutcome task={completedTask} summary={summary} summaryState="ready" exportUrl="/api/v1/tasks/task-completed/export.csv" />
)
includes(outcome, 'Research ready', 'completed live research must foreground the outcome state')
includes(outcome, '1 published result', 'outcome summary must be derived from actual persisted records')
includes(outcome, 'Evidence linked', 'outcome must foreground evidence coverage')
includes(outcome, 'Export CSV', 'completed research must expose its export action')

const demoOutcome = renderToStaticMarkup(
  <ResearchOutcome
    task={{ ...completedTask, demoMode: true }}
    summary={{ ...summary, demoRecords: 1 }}
    summaryState="ready"
    exportUrl="/api/v1/tasks/task-completed/export.csv"
  />
)
includes(demoOutcome, 'Demo dataset', 'demo tasks must remain visibly labeled after publication')

const zeroOutcome = renderToStaticMarkup(
  <ResearchOutcome task={{ ...completedTask, recordCount: 0 }} summary={{ ...summary, totalRecords: 0, uniqueOrganizations: 0, uniqueLocations: 0, uniqueSources: 0, evidenceLinkedRecords: 0, topLocations: [] }} summaryState="ready" exportUrl="#" />
)
includes(zeroOutcome, 'Research complete', 'zero-result completion must not be labelled as ready')
includes(zeroOutcome, 'No publishable results', 'zero-result completion must explain the outcome honestly')
excludes(zeroOutcome, 'Export CSV', 'zero-result completion must not expose an empty export')

const summaryFailure = renderToStaticMarkup(
  <ResearchOutcome task={completedTask} summaryState="error" exportUrl="/api/v1/tasks/task-completed/export.csv" />
)
includes(summaryFailure, 'coverage is temporarily unavailable', 'summary failure must not masquerade as a zero-result dataset')

const sourceFailure = renderToStaticMarkup(
  <SourceExplorer sources={[]} totalRecords={1} state="error" />
)
includes(sourceFailure, 'Source coverage is temporarily unavailable', 'source-summary failure must be distinct from no contributing sources')

const sources = renderToStaticMarkup(<SourceExplorer sources={[sourceSummary]} totalRecords={1} state="ready" />)
includes(sources, 'Sources', 'source workspace must be first-class')
includes(sources, 'Example Careers', 'source workspace must aggregate contributing sources')
includes(sources, '1/1', 'source workspace must expose evidence contribution')
includes(sources, 'Open source', 'live sources must expose a real external-source action')

const sidebar = renderToStaticMarkup(
  <Sidebar
    tasks={[completedTask]}
    selectedId={completedTask.id}
    totalRecords={1}
    activeView="sources"
    theme="light"
    onToggleTheme={noop}
    onNewResearch={noop}
    onNavigate={noop}
    onSelect={noop}
  />
)
includes(sidebar, '>Research<', 'workspace navigation must use research terminology')
includes(sidebar, '>Sources<', 'source evidence must have a first-class workspace destination')
includes(sidebar, 'New research', 'sidebar must expose an explicit new-research action')
includes(sidebar, 'aria-current="page"', 'active workspace destination must expose current-page semantics')
includes(sidebar, 'Appearance', 'sidebar must expose the theme control without infrastructure marketing')

const history = renderToStaticMarkup(
  <WorkflowHistory tasks={[completedTask]} onOpen={noop} onOpenDataset={noop} onOpenSources={noop} />
)
includes(history, 'Runs', 'history view must render persisted research runs')
includes(history, 'class="tableAction">Open ', 'history rows must expose a functional run action')
includes(history, '1 published record', 'run history must describe user outcomes instead of raw engine stages')
includes(history, 'Dataset', 'completed runs with data must expose their dataset action')
includes(history, 'Sources', 'completed runs with data must expose source coverage')

console.log('[NUMEN] frontend component-state tests passed')
