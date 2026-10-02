import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { DatasetExplorer } from '../src/components/DatasetExplorer'
import { DatasetLibrary } from '../src/components/DatasetLibrary'
import { PromptComposer } from '../src/components/PromptComposer'
import { ResearchOutcome } from '../src/components/ResearchOutcome'
import { Sidebar } from '../src/components/Sidebar'
import { SourceExplorer } from '../src/components/SourceExplorer'
import { SourceResearchIndex } from '../src/components/SourceResearchIndex'
import { WorkflowHistory } from '../src/components/WorkflowHistory'
import { WorkflowPanel } from '../src/components/WorkflowPanel'
import type { DatasetRecord, DatasetSummary, SourceSummary, Task, TaskTimelineEvent } from '../src/model/types'
import { groupResearchTasks } from '../src/shared/research'
import { formatInstant, formatRelativeInstant } from '../src/shared/time'
import { normalizePublicHttpUrl, safeExternalHttpUrl, sourceHostname, sourceUrlValidationMessage } from '../src/shared/sourceUrl'

const noop = () => undefined

assert.equal(formatInstant('not-a-date'), 'Unknown', 'invalid exact timestamps must not be described with invented temporal precision')
assert.equal(formatRelativeInstant('not-a-date'), 'Unknown', 'invalid relative timestamps must not fall back to vague recent wording')
assert.equal(
  formatRelativeInstant('2026-09-30T00:01:00Z', Date.parse('2026-09-30T00:00:00Z')),
  'in 1m',
  'relative time formatting must preserve future direction rather than clamping future timestamps to now'
)

assert.equal(normalizePublicHttpUrl('https://example.com/research#section'), 'https://example.com/research', 'source URL normalization must remove fragments')
assert.equal(safeExternalHttpUrl('javascript:alert(1)'), undefined, 'unsafe external schemes must never become clickable links')
assert.equal(safeExternalHttpUrl('https://user:pass@example.com/private'), undefined, 'credential-bearing URLs must not become clickable links')
assert.equal(safeExternalHttpUrl('http://127.0.0.1/admin'), undefined, 'obviously local source URLs must be rejected in the browser before submission')
assert.equal(safeExternalHttpUrl('https://example.com:8443/data'), undefined, 'non-standard source ports must be rejected before submission')
assert.equal(normalizePublicHttpUrl('https://fcdomain.com/'), 'https://fcdomain.com/', 'ordinary hostnames beginning with IPv6-like letters must remain valid')
assert.equal(sourceHostname('https://Example.com/research'), 'example.com', 'source identity must expose the actual parsed hostname')
assert.equal(sourceUrlValidationMessage('file:///etc/passwd'), 'Only HTTP(S) source URLs are supported.', 'unsupported URL schemes need a precise validation message')

function includes(markup: string, fragment: string, message: string) {
  assert.ok(markup.includes(fragment), message + '\nRendered markup:\n' + markup)
}

function excludes(markup: string, fragment: string, message: string) {
  assert.ok(!markup.includes(fragment), message + '\nRendered markup:\n' + markup)
}

const emptyPrompt = renderToStaticMarkup(
  <PromptComposer
    prompt=""
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
includes(emptyPrompt, 'Start with a research question', 'untouched research must begin with neutral question-first guidance')
includes(emptyPrompt, 'Enter a question', 'untouched research must label the disabled primary action without scolding the user')
excludes(emptyPrompt, 'open=""', 'source configuration should not expand before the question is ready')
excludes(emptyPrompt, 'Research question needs more detail', 'untouched research must not present validation-like language')

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
includes(offlinePrompt, 'class="run needsSource" disabled=""', 'offline research submission must disable the primary research action')
includes(offlinePrompt, 'Service unavailable', 'offline composer must explain why the primary action cannot run')
includes(offlinePrompt, 'aria-busy="false"', 'idle submission must expose aria-busy=false')
includes(offlinePrompt, 'Ask NUMEN', 'composer must expose the primary research workbench identity without a redundant new-research eyebrow')
includes(offlinePrompt, 'Research brief', 'composer must use research-oriented language rather than generic chat framing')

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
includes(busyPrompt, 'class="run needsSource" disabled=""', 'busy submission must keep the primary research action disabled')
includes(busyPrompt, 'Starting research', 'busy composer must expose submission state')

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
includes(sourceLessPrompt, 'Required before live research can run', 'composer must explain the live source prerequisite')
includes(sourceLessPrompt, 'class="composerAdvanced needsSetup"', 'missing source setup must retain the needs-setup state')
includes(sourceLessPrompt, 'open=""', 'missing source setup must be open by default instead of hiding the prerequisite')
includes(sourceLessPrompt, 'Source scope required.', 'source details must explain that live research requires supplied public sources')
includes(sourceLessPrompt, 'class="run needsSource"', 'source-less research must turn the primary action into a source-setup action')
excludes(sourceLessPrompt, 'class="run needsSource" disabled=""', 'valid prompts without a source must keep the source-setup action clickable')
includes(sourceLessPrompt, 'Add source to run', 'the primary action must say what is required instead of looking broken')
includes(sourceLessPrompt, 'Use demo data', 'source-less research must expose an explicit labeled demo path')
includes(sourceLessPrompt, 'One more step: choose the source scope', 'readiness copy must explain why the run cannot submit yet')

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
includes(liveSourcePrompt, '1 public source configured', 'composer must confirm the explicit live source scope')
includes(liveSourcePrompt, '<bdi dir="ltr"', 'configured source identity must be isolated from bidirectional text spoofing')
includes(liveSourcePrompt, 'class="run"', 'valid explicit-source research must expose the normal Run research action')
excludes(liveSourcePrompt, 'class="run" disabled=""', 'valid explicit-source research must enable the Run research action when the service is online')
includes(liveSourcePrompt, 'Ready to run', 'configured live research must expose positive readiness state')

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
includes(explicitDemoPrompt, 'Demo data selected.', 'demo mode must clearly state that no public source will be contacted')
excludes(explicitDemoPrompt, 'class="run" disabled=""', 'explicit demo research may enable Run research without external URLs')
includes(explicitDemoPrompt, 'Ready to run', 'explicit demo mode must expose positive readiness state')

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
includes(populated, '95/100', 'record heuristic display should round the persisted score without presenting it as factual confidence')
includes(populated, 'target="_blank"', 'live provenance links should open separately')
includes(populated, 'rel="noreferrer"', 'external provenance links must suppress referrer leakage')
includes(populated, 'Record heuristic', 'the persisted score must be labelled as a heuristic rather than generic data quality')
includes(populated, 'not factual confidence', 'record heuristic must explicitly avoid factual-confidence semantics')
includes(populated, 'aria-haspopup="dialog"', 'record rows must announce that evidence opens in a dialog')
includes(populated, '<bdi class="sourceHost" dir="ltr">example.com</bdi>', 'record provenance must expose the parsed destination hostname with bidi isolation')

const hostNamedRecord = renderToStaticMarkup(
  <DatasetExplorer
    records={[{ ...record, sourceName: 'example.com' }]}
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
excludes(hostNamedRecord, '<span>example.com</span><bdi class="sourceHost" dir="ltr">example.com</bdi>', 'source actions must not repeat an identical source label and hostname')

const unsafeRecord: DatasetRecord = {
  ...record,
  id: 'record-unsafe-source',
  sourceUrl: 'javascript:alert(1)',
  sourceName: 'Open trusted source'
}
const unsafeDataset = renderToStaticMarkup(
  <DatasetExplorer
    records={[unsafeRecord]}
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
    sortKey="title"
    sortDirection="asc"
    onQueryChange={noop}
    onMinQualityChange={noop}
    onSort={noop}
    onPageChange={noop}
    onPageSizeChange={noop}
  />
)
excludes(unsafeDataset, 'href="javascript:', 'unsafe source URLs must never render as clickable provenance')
includes(unsafeDataset, 'External source URL unavailable', 'unsafe source URLs must degrade to a non-clickable source state without trusting a deceptive label')


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
excludes(demoDataset, '95/100', 'demo records must not display synthetic heuristic precision')

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

const composerAffordance = renderToStaticMarkup(
  <PromptComposer
    prompt=""
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
includes(composerAffordance, 'class="disclosureAction">Configure', 'source scope disclosure must expose an explicit action cue instead of a bare chevron')

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
includes(activeWorkflow, 'Run lifecycle', 'run details must distinguish persisted run lifecycle events from world-event timelines')
excludes(activeWorkflow, 'role="progressbar"', 'fixed engine milestones must not be presented as precise user progress')
excludes(activeWorkflow, '45%', 'primary active state must not expose decorative precision')


const sourceProgress: SourceSummary[] = [{
  name: 'Example Careers',
  url: 'https://example.com/',
  type: 'WEB',
  records: 0,
  evidence: 0,
  latestCollectedAt: null,
  lastSuccessfulObservationAt: '2026-09-30T00:00:12Z',
  collectionStatus: 'SUCCEEDED',
  errorCode: null,
  errorMessage: null,
  lastAttemptedAt: '2026-09-30T00:00:12Z',
  connectorId: 'http-page',
  capabilities: ['evidence-capture', 'partial-failure', 'public-http', 'read-records', 'retry-safe-read'],
  demo: false,
  configured: true
}]
const sourceAwareWorkflow = renderToStaticMarkup(
  <WorkflowPanel task={activeTask} timeline={timeline} sources={sourceProgress} sourcesState="ready" onCancel={noop} />
)
includes(sourceAwareWorkflow, '1 / 1 sources checked', 'active research must expose measurable source progress when source attempts exist')
excludes(sourceAwareWorkflow, '45%', 'source-aware progress must not reintroduce milestone percentages')

const failedTask: Task = {
  ...activeTask,
  id: 'task-failed',
  status: 'FAILED',
  stage: 'Failed',
  progress: 90,
  errorMessage: 'Workflow failed due to an internal processing error.',
  completedAt: '2026-09-30T00:00:45Z'
}

const failedWorkflow = renderToStaticMarkup(
  <WorkflowPanel task={failedTask} timeline={timeline} sources={sourceProgress} sourcesState="ready" onCancel={noop} />
)
includes(failedWorkflow, 'Needs attention', 'failed research must expose its terminal failure status')
includes(failedWorkflow, 'Research stopped', 'failed research must use terminal wording')
excludes(failedWorkflow, 'Research in progress', 'failed research must never be described as still in progress')
excludes(failedWorkflow, '>Cancel<', 'terminal failed research must not expose cancellation')

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
  attemptedSources: 1,
  successfulSources: 1,
  failedSources: 0,
  unavailableSources: 0,
  unauthorizedSources: 0,
  rejectedSources: 0,
  rateLimitedSources: 0,
  notAttemptedSources: 0,
  sourceCoverageState: 'COMPLETE',
  evidenceLinkedRecords: 1,
  evidenceHashedRecords: 1,
  matchingEvidenceSnapshotGroups: 0,
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
  lastSuccessfulObservationAt: record.collectedAt,
  collectionStatus: 'SUCCEEDED',
  errorCode: null,
  errorMessage: null,
  lastAttemptedAt: record.collectedAt,
  connectorId: 'http-page',
  capabilities: ['evidence-capture', 'partial-failure', 'public-http', 'read-records', 'retry-safe-read'],
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
includes(outcome, 'Last evidence collected', 'outcome must label dataset collection time explicitly instead of calling it a generic update')
includes(outcome, '1/1 evidence-content hashes available', 'outcome must distinguish snapshot-integrity coverage from factual confidence')
includes(outcome, 'do not prove source authenticity, independence or factual truth', 'hashes must never be presented as truth or source authentication')
excludes(outcome, '<span>Updated</span>', 'outcome must not collapse collection, completion and update semantics into one timestamp label')

const stableChangeOutcome = renderToStaticMarkup(
  <ResearchOutcome
    task={completedTask}
    summary={summary}
    summaryState="ready"
    changes={{
      status: 'AVAILABLE',
      baselineTaskId: 'task-baseline',
      baselineCompletedAt: '2026-09-29T00:01:00Z',
      expectedSources: 1,
      comparedSources: 1,
      changedSources: 0,
      unchangedSources: 1,
      newlyObservedSources: 0,
      unobservedCurrentSources: 0,
      unhashableSources: 0,
      completeObservation: true
    }}
    changesState="ready"
    exportUrl="/api/v1/tasks/task-completed/export.csv"
    onRefine={noop}
    onViewSources={noop}
  />
)
includes(stableChangeOutcome, 'No captured snapshot changes detected across 1 observed source', 'complete comparison may report no captured snapshot changes')
includes(stableChangeOutcome, 'not real-world facts or source independence', 'run comparison must keep snapshot-change semantics distinct from real-world truth')

const partialChangeOutcome = renderToStaticMarkup(
  <ResearchOutcome
    task={completedTask}
    summary={summary}
    summaryState="ready"
    changes={{
      status: 'PARTIAL',
      baselineTaskId: 'task-baseline',
      baselineCompletedAt: '2026-09-29T00:01:00Z',
      expectedSources: 2,
      comparedSources: 1,
      changedSources: 0,
      unchangedSources: 1,
      newlyObservedSources: 0,
      unobservedCurrentSources: 1,
      unhashableSources: 0,
      completeObservation: false
    }}
    changesState="ready"
    exportUrl="/api/v1/tasks/task-completed/export.csv"
    onRefine={noop}
    onViewSources={noop}
  />
)
includes(partialChangeOutcome, 'Partial previous-run comparison', 'incomplete source observation must produce a partial comparison state')
includes(partialChangeOutcome, '1 not successfully observed now', 'partial comparison must explain the missing observation')
includes(partialChangeOutcome, 'does not call the research unchanged', 'missing observations must block an overall unchanged claim')

const limitedOutcome = renderToStaticMarkup(
  <ResearchOutcome
    task={completedTask}
    summary={{
      ...summary,
      configuredSources: 2,
      attemptedSources: 2,
      successfulSources: 1,
      failedSources: 1,
      unavailableSources: 1,
      sourceCoverageState: 'PARTIAL'
    }}
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
excludes(zeroOutcome, '0/0', 'zero-result outcome must not show a meaningless 0/0 evidence ratio')

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
includes(sources, 'Last success', 'successful source collection must expose the last successful observation separately from attempts')
includes(sources, '<bdi class="sourceHost" dir="ltr">example.com</bdi>', 'source rows must show the parsed destination hostname')

const unsafeSourceSummary: SourceSummary = {
  ...sourceSummary,
  name: 'Trusted-looking label',
  url: 'javascript:alert(1)'
}
const unsafeSources = renderToStaticMarkup(<SourceExplorer sources={[unsafeSourceSummary]} totalRecords={1} state="ready" />)
excludes(unsafeSources, 'href="javascript:', 'unsafe source-summary URLs must never render as links')
includes(unsafeSources, 'No safe external URL', 'unsafe source-summary URLs must degrade without hiding the source record')

const accessBarrierSource: SourceSummary = {
  ...failedSourcePlaceholder(),
  name: 'Challenge page',
  url: 'https://challenge.example/',
  collectionStatus: 'REJECTED',
  errorCode: 'SOURCE_ACCESS_BARRIER',
  errorMessage: 'Source presented an access barrier instead of usable public evidence'
}
const accessBarrierSources = renderToStaticMarkup(<SourceExplorer sources={[accessBarrierSource]} totalRecords={0} state="ready" />)
includes(accessBarrierSources, 'Access barrier', 'HTTP-success access barriers must not be described as successful evidence collection')


function failedSourcePlaceholder(): SourceSummary {
  return {
    name: 'Unavailable Careers',
    url: 'https://unavailable.example/jobs',
    type: 'WEB',
    records: 0,
    evidence: 0,
    latestCollectedAt: null,
    lastSuccessfulObservationAt: null,
    collectionStatus: 'UNAVAILABLE',
    errorCode: 'SOURCE_UNREACHABLE',
    errorMessage: 'Source could not be reached after the configured retry policy',
    lastAttemptedAt: record.collectedAt,
    demo: false,
    configured: true
  }
}

const failedSource: SourceSummary = {
  name: 'Unavailable Careers',
  url: 'https://unavailable.example/jobs',
  type: 'WEB',
  records: 0,
  evidence: 0,
  latestCollectedAt: null,
  lastSuccessfulObservationAt: null,
  collectionStatus: 'UNAVAILABLE',
  errorCode: 'SOURCE_UNREACHABLE',
  errorMessage: 'Source could not be reached after the configured retry policy',
  lastAttemptedAt: record.collectedAt,
  demo: false,
  configured: true
}
const partialSources = renderToStaticMarkup(<SourceExplorer sources={[sourceSummary, failedSource]} totalRecords={1} state="ready" />)
includes(partialSources, '1</strong> limited', 'source workspace must count configured collection limitations')
includes(partialSources, 'Source unavailable', 'source workspace must distinguish source unavailability from a negative research result')
includes(partialSources, 'Source could not be reached', 'source workspace must explain collection failure without hiding partial success')
includes(partialSources, 'Last attempt', 'a failed source must label its recent timestamp as an attempt rather than a successful observation')

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
    onNewResearch={noop}
    onNavigate={noop}
    onSelect={noop}
  />
)
includes(sidebar, '>Research<', 'workspace navigation must use research terminology')
includes(sidebar, '>Sources<', 'source evidence must have a first-class workspace destination')
includes(sidebar, 'New research', 'sidebar must expose an explicit new-research action')
includes(sidebar, 'aria-current="page"', 'active workspace destination must expose current-page semantics')
excludes(sidebar, 'Appearance', 'light-only NUMEN must not expose an appearance/theme switcher')
excludes(sidebar, '>Dark<', 'light-only NUMEN must not expose a dark-theme action')
includes(sidebar, 'Evidence-first research', 'sidebar footer should reinforce the workspace purpose instead of theme controls')
includes(sidebar, 'class="brandGlyph"', 'NUMEN must expose a distinctive branded research-intelligence mark rather than a plain letter tile')
includes(sidebar, 'class="brandGlyphLetter"', 'NUMEN brand mark must keep a clearly legible N monogram')

const history = renderToStaticMarkup(
  <WorkflowHistory tasks={[completedTask]} onOpen={noop} onOpenDataset={noop} onOpenSources={noop} />
)
includes(history, 'Runs', 'history view must render persisted research runs')
includes(history, 'class="historyPrimary">Open run', 'run history must expose one clearly primary open action')
includes(history, '1 published record', 'run history must describe user outcomes instead of raw engine stages')
includes(history, 'Dataset', 'completed runs with data must expose their dataset action')
includes(history, 'Sources', 'completed runs with data must expose source coverage')
includes(history, 'Run time', 'run history must label lifecycle time instead of using an ambiguous updated timestamp')
excludes(history, '<small>Completed</small>', 'run history must not duplicate completion state inside the timestamp cell')

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
includes(datasetLibrary, '<span>Completed</span>', 'published datasets must show completion time rather than an ambiguous updated timestamp')
includes(datasetLibrary, 'class="datasetSecondaryAction"', 'dataset provenance action must be visually secondary to opening the dataset')

const sourceIndex = renderToStaticMarkup(
  <SourceResearchIndex tasks={[completedTask, failedSourceTask()]} onOpen={noop} onNewResearch={noop} />
)
includes(sourceIndex, 'Choose research to inspect its sources', 'Sources must provide a useful provenance index before a research set is selected')
includes(sourceIndex, 'Inspect', 'source index rows must offer a one-step path into provenance')
includes(sourceIndex, '1 configured source', 'source index must expose source scope rather than a giant empty selection panel')


function failedSourceTask(): Task {
  return {
    ...completedTask,
    id: 'task-source-failed',
    status: 'FAILED',
    recordCount: 0,
    completedAt: '2026-09-30T00:02:00Z'
  }
}

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
