import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { DatasetExplorer } from '../src/components/DatasetExplorer'
import { DatasetLibrary } from '../src/components/DatasetLibrary'
import { PromptComposer } from '../src/components/PromptComposer'
import { ResearchOutcome } from '../src/components/ResearchOutcome'
import { Sidebar } from '../src/components/Sidebar'
import { SourceExplorer } from '../src/components/SourceExplorer'
import { WorkflowHistory } from '../src/components/WorkflowHistory'
import { WorkflowPanel } from '../src/components/WorkflowPanel'
import type { DatasetRecord, DatasetSummary, SourceSummary, Task, TaskTimelineEvent } from '../src/model/types'
import { groupResearchTasks } from '../src/shared/research'

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
includes(offlinePrompt, 'class="run" disabled=""', 'offline research submission must disable the Run research action')
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
includes(busyPrompt, 'class="run" disabled=""', 'busy submission must keep the Run research action disabled')

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
includes(sourceLessPrompt, 'Required before live research can run', 'composer must keep source setup visible without dominating the primary research surface')
includes(sourceLessPrompt, 'class="composerAdvanced needsSetup"', 'source configuration must remain progressively disclosed')
includes(sourceLessPrompt, 'Source scope required.', 'expanded source details must explain that live research requires supplied public sources')
includes(sourceLessPrompt, 'class="run" disabled=""', 'source-less live research must disable Run research rather than silently generating demo data')

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
excludes(liveSourcePrompt, 'class="run" disabled=""', 'valid explicit-source research must enable the Run research action when the service is online')

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
excludes(explicitDemoPrompt, 'class="run" disabled=""', 'explicit demo research may enable Run research without external URLs')

const emptyCompleted = renderToStaticMarkup(
  <DatasetExplorer
    records={[]}
    totalRecords={0}
    matchedRecords={0}
    demoRecords={0}
    status="COMPLETED"
    loadState="ready"
    query=""
    minQuality={0}
    page={0}
    pageSize={50}
    totalPages={0}
    sortKey="qualityScore"
    sortDirection="desc"
    onQueryChange={noop}
    onMinQualityChange={noop}
    onSort={noop}
    onPageChange={noop}
    onPageSizeChange={noop}
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
    matchedRecords={1}
    demoRecords={0}
    status="COMPLETED"
    loadState="ready"
    query=""
    minQuality={0}
    page={0}
    pageSize={50}
    totalPages={1}
    sortKey="qualityScore"
    sortDirection="desc"
    onQueryChange={noop}
    onMinQualityChange={noop}
    onSort={noop}
    onPageChange={noop}
    onPageSizeChange={noop}
  />
)
includes(populated, 'Backend Engineer', 'dataset explorer must render returned records')
includes(populated, '95%', 'data-quality display should round the persisted score')
includes(populated, 'target="_blank"', 'live provenance links should open separately')
includes(populated, 'rel="noreferrer"', 'external provenance links must suppress referrer leakage')
includes(populated, 'Data quality', 'quality terminology must be explicit rather than an unexplained percentage')
includes(populated, 'aria-haspopup="dialog"', 'record rows must announce that evidence opens in a dialog')

const demoRecord: DatasetRecord = { ...record, id: 'record-demo', sourceType: 'DEMO', sourceUrl: 'urn:numen:demo:test:1', sourceName: 'NUMEN Demo Catalog' }
const demoDataset = renderToStaticMarkup(
  <DatasetExplorer
    records={[demoRecord]}
    totalRecords={1}
    matchedRecords={1}
    demoRecords={1}
    status="COMPLETED"
    loadState="ready"
    query=""
    minQuality={0}
    page={0}
    pageSize={50}
    totalPages={1}
    sortKey="qualityScore"
    sortDirection="desc"
    onQueryChange={noop}
    onMinQualityChange={noop}
    onSort={noop}
    onPageChange={noop}
    onPageSizeChange={noop}
  />
)
includes(demoDataset, 'Sample', 'demo records must not present arbitrary quality precision')
includes(demoDataset, 'Demo records · no quality filter', 'demo-only datasets must disable misleading quality filtering')
excludes(demoDataset, '95%', 'demo records must not display synthetic quality as verified precision')

const paged = renderToStaticMarkup(
  <DatasetExplorer
    records={[record]}
    totalRecords={2}
    matchedRecords={2}
    demoRecords={0}
    status="COMPLETED"
    loadState="ready"
    query=""
    minQuality={0}
    page={0}
    pageSize={1}
    totalPages={2}
    sortKey="qualityScore"
    sortDirection="desc"
    onQueryChange={noop}
    onMinQualityChange={noop}
    onSort={noop}
    onPageChange={noop}
    onPageSizeChange={noop}
  />
)
includes(paged, '1–1 of 2 published', 'paged result ranges must state exactly what is visible')
includes(paged, 'Page <strong>1</strong> of <strong>2</strong>', 'paged datasets must expose navigable page context')

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
  <WorkflowPanel task={activeTask} timeline={timeline} sources={[]} sourcesState="ready" onCancel={noop} />
)
includes(activeWorkflow, '>Cancel<', 'active research needs a cancellation control')
includes(activeWorkflow, 'Current activity', 'active research must explain what NUMEN is doing')
includes(activeWorkflow, 'Searching sources', 'active research must use user-facing status language')
includes(activeWorkflow, 'Hiring Intelligence', 'run details must retain the persisted plan')
includes(activeWorkflow, 'Run timeline', 'run details must retain persisted lifecycle evidence')
excludes(activeWorkflow, 'role="progressbar"', 'fixed engine milestones must not be presented as precise user progress')
excludes(activeWorkflow, '45%', 'primary active state must not expose decorative precision')


const sourceProgress: SourceSummary[] = [{
  name: 'Example Careers',
  url: 'https://example.com/',
  type: 'WEB',
  records: 0,
  evidence: 0,
  latestCollectedAt: null,
  collectionStatus: 'SUCCEEDED',
  errorCode: null,
  errorMessage: null,
  lastAttemptedAt: '2026-09-30T00:00:12Z',
  demo: false,
  configured: true
}]
const sourceAwareWorkflow = renderToStaticMarkup(
  <WorkflowPanel task={activeTask} timeline={timeline} sources={sourceProgress} sourcesState="ready" onCancel={noop} />
)
includes(sourceAwareWorkflow, '1 / 1 sources checked', 'active research must expose measurable source progress when source attempts exist')
excludes(sourceAwareWorkflow, '45%', 'source-aware progress must not reintroduce milestone percentages')

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
  <WorkflowPanel task={completedTask} timeline={timeline} sources={[]} sourcesState="ready" onCancel={noop} />
)
excludes(completedWorkflow, '>Cancel<', 'terminal workflows must not expose cancellation')
includes(completedWorkflow, 'Run details', 'completed workflow mechanics must remain available behind disclosure')
excludes(completedWorkflow, 'Research outcome', 'completed technical panel must not compete with the result outcome')


const summary: DatasetSummary = {
  totalRecords: 1,
  uniqueOrganizations: 1,
  uniqueLocations: 1,
  uniqueSources: 1,
  configuredSources: 1,
  failedSources: 0,
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
  collectionStatus: 'SUCCEEDED',
  errorCode: null,
  errorMessage: null,
  lastAttemptedAt: record.collectedAt,
  demo: false,
  configured: true
}

const outcome = renderToStaticMarkup(
  <ResearchOutcome task={completedTask} summary={summary} summaryState="ready" exportUrl="/api/v1/tasks/task-completed/export.csv" onRefine={noop} onViewSources={noop} />
)
includes(outcome, 'Research complete', 'completed live research must foreground an explicit completed outcome state')
includes(outcome, '1 published result', 'outcome summary must be derived from actual persisted records')
includes(outcome, 'Evidence linked', 'outcome must foreground evidence coverage')
includes(outcome, 'Export CSV', 'completed research must expose its export action')
includes(outcome, 'Refine research', 'completed research must expose a real refine action')
includes(outcome, 'View sources', 'completed research must expose a real source-navigation action')

const limitedOutcome = renderToStaticMarkup(
  <ResearchOutcome
    task={completedTask}
    summary={{ ...summary, configuredSources: 2, failedSources: 1 }}
    summaryState="ready"
    exportUrl="/api/v1/tasks/task-completed/export.csv"
    onRefine={noop}
    onViewSources={noop}
  />
)
includes(limitedOutcome, 'Complete with limitations', 'partial source failure must be visible in the completed outcome')
includes(limitedOutcome, '1/2', 'outcome source coverage must distinguish contributing from configured sources')

const demoOutcome = renderToStaticMarkup(
  <ResearchOutcome
    task={{ ...completedTask, demoMode: true }}
    summary={{ ...summary, demoRecords: 1 }}
    summaryState="ready"
    exportUrl="/api/v1/tasks/task-completed/export.csv"
    onRefine={noop}
    onViewSources={noop}
  />
)
includes(demoOutcome, 'Demo dataset', 'demo tasks must remain visibly labeled after publication')

const zeroOutcome = renderToStaticMarkup(
  <ResearchOutcome task={{ ...completedTask, recordCount: 0 }} summary={{ ...summary, totalRecords: 0, uniqueOrganizations: 0, uniqueLocations: 0, uniqueSources: 0, evidenceLinkedRecords: 0, topLocations: [] }} summaryState="ready" exportUrl="#" onRefine={noop} onViewSources={noop} />
)
includes(zeroOutcome, 'Research complete', 'zero-result completion must not be labelled as ready')
includes(zeroOutcome, 'No publishable results', 'zero-result completion must explain the outcome honestly')
excludes(zeroOutcome, 'Export CSV', 'zero-result completion must not expose an empty export')

const summaryFailure = renderToStaticMarkup(
  <ResearchOutcome task={completedTask} summaryState="error" exportUrl="/api/v1/tasks/task-completed/export.csv" onRefine={noop} onViewSources={noop} />
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

const failedSource: SourceSummary = {
  name: 'Unavailable Careers',
  url: 'https://unavailable.example/jobs',
  type: 'WEB',
  records: 0,
  evidence: 0,
  latestCollectedAt: null,
  collectionStatus: 'FAILED',
  errorCode: 'SOURCE_UNREACHABLE',
  errorMessage: 'Source could not be reached after the configured retry policy',
  lastAttemptedAt: record.collectedAt,
  demo: false,
  configured: true
}
const partialSources = renderToStaticMarkup(<SourceExplorer sources={[sourceSummary, failedSource]} totalRecords={1} state="ready" />)
includes(partialSources, '1</strong> unavailable', 'source workspace must count configured collection failures')
includes(partialSources, 'Source could not be reached', 'source workspace must explain collection failure without hiding partial success')

const zeroSourceCoverage = renderToStaticMarkup(
  <SourceExplorer
    sources={[{ ...sourceSummary, records: 0, evidence: 0, latestCollectedAt: null }]}
    totalRecords={0}
    state="ready"
  />
)
includes(zeroSourceCoverage, 'no published records', 'zero-result source diagnostics must not present a meaningless 0/0 coverage fraction')
excludes(zeroSourceCoverage, '0/0', 'zero-result source evidence must use not-applicable presentation rather than a ratio')

const sidebar = renderToStaticMarkup(
  <Sidebar
    tasks={[completedTask]}
    selectedId={completedTask.id}
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


const datasetLibrary = renderToStaticMarkup(
  <DatasetLibrary
    tasks={[completedTask]}
    onOpen={noop}
    onOpenSources={noop}
    onNewResearch={noop}
  />
)
includes(datasetLibrary, 'Recent published datasets', 'published dataset library must expose reusable outputs')
includes(datasetLibrary, '1', 'published dataset library must expose persisted result counts without claiming a global dataset total')
includes(datasetLibrary, 'Open dataset', 'published dataset library must expose a real open action')
includes(datasetLibrary, 'Sources', 'published dataset library must keep provenance one action away')

const repeatedResearch = groupResearchTasks([
  completedTask,
  { ...completedTask, id: 'task-completed-older', createdAt: '2026-09-29T00:00:00Z' },
  { ...completedTask, id: 'task-different-scope', sourceUrls: ['https://different.example/'], createdAt: '2026-09-28T12:00:00Z' },
  { ...completedTask, id: 'task-other', prompt: 'Compare cloud data platforms', createdAt: '2026-09-28T00:00:00Z' }
])
assert.equal(repeatedResearch.length, 3, 'recent research may group repeated runs only when question, mode and source scope are materially equivalent')
assert.equal(repeatedResearch[0].runs, 2, 'grouped research must preserve the repeated-run count')
assert.equal(repeatedResearch[1].runs, 1, 'a different source scope must remain a distinct research entry')

console.log('[NUMEN] frontend component-state tests passed')
