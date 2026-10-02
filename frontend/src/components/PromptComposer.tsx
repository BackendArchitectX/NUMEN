import { useMemo, useRef, useState } from 'react'
import { ChevronDown, FlaskConical, Link2, LoaderCircle, MessageSquareText, Play, Plus, Search, X } from 'lucide-react'
import { examplePrompts } from '../model/prompts'
import { clip } from '../shared/text'
import { extractPublicHttpUrls, normalizePublicHttpUrl, sourceDisplayLabel, sourceUrlValidationMessage } from '../shared/sourceUrl'

interface PromptComposerProps {
  prompt: string
  demoMode: boolean
  sourceUrls: string[]
  busy: boolean
  online: boolean
  onPromptChange: (value: string) => void
  onDemoModeChange: (enabled: boolean) => void
  onSourceUrlsChange: (urls: string[]) => void
  onRun: () => void
}

const MAX_SOURCES = 8

export function PromptComposer({
  prompt,
  demoMode,
  sourceUrls,
  busy,
  online,
  onPromptChange,
  onDemoModeChange,
  onSourceUrlsChange,
  onRun
}: PromptComposerProps) {
  const [sourceDraft, setSourceDraft] = useState('')
  const sourceDetailsRef = useRef<HTMLDetailsElement>(null)
  const sourceInputRef = useRef<HTMLInputElement>(null)
  const length = prompt.length
  const detectedPromptUrls = useMemo(
    () => extractPublicHttpUrls(prompt).filter(url => !sourceUrls.includes(url)),
    [prompt, sourceUrls]
  )
  const validDraft = normalizePublicHttpUrl(sourceDraft)
  const sourceDraftIssue = sourceUrlValidationMessage(sourceDraft)
  const hasCollectionMode = sourceUrls.length > 0 || demoMode
  const promptStarted = prompt.trim().length > 0
  const promptValid = prompt.trim().length >= 10 && length <= 4000
  const runnable = online && !busy && promptValid && hasCollectionMode
  const primaryDisabled = !online || busy || !promptValid

  const addSources = (values: string[]) => {
    if (demoMode) return
    const next = [...sourceUrls]
    for (const value of values) {
      const normalized = normalizePublicHttpUrl(value)
      if (!normalized || next.includes(normalized) || next.length >= MAX_SOURCES) continue
      next.push(normalized)
    }
    onSourceUrlsChange(next)
    setSourceDraft('')
  }

  const setDemo = (enabled: boolean) => {
    onDemoModeChange(enabled)
    if (enabled) {
      onSourceUrlsChange([])
      setSourceDraft('')
    }
  }

  const openSourceSetup = () => {
    if (sourceDetailsRef.current) sourceDetailsRef.current.open = true
    window.requestAnimationFrame(() => sourceInputRef.current?.focus())
  }

  const handlePrimaryAction = () => {
    if (runnable) {
      onRun()
      return
    }
    if (!hasCollectionMode && !primaryDisabled) openSourceSetup()
  }

  const primaryLabel = busy
    ? 'Starting research…'
    : !online
      ? 'Service unavailable'
      : !promptStarted
        ? 'Enter a question'
        : !promptValid
          ? 'Add more detail'
        : !hasCollectionMode
          ? 'Add source to run'
          : 'Run research'

  return <section className="composer panel" aria-labelledby="prompt-label">
    <div className="composerHeading">
      <div className="composerTitle">
        <span className="composerIcon"><Search size={16} aria-hidden="true"/></span>
        <div>
          <strong id="prompt-label">Ask NUMEN</strong>
          <small>Describe the outcome you need. NUMEN keeps the source scope and captured evidence attached to the resulting dataset.</small>
        </div>
      </div>
      <span className="composerHint"><MessageSquareText size={13} aria-hidden="true"/> Research brief</span>
    </div>

    <div className="composerInputShell">
      <textarea
        id="research-question"
        value={prompt}
        maxLength={4000}
        aria-describedby="prompt-help source-scope-summary"
        onChange={event => onPromptChange(event.target.value)}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            if (runnable) {
              event.preventDefault()
              onRun()
            } else if (!hasCollectionMode && !primaryDisabled) {
              event.preventDefault()
              openSourceSetup()
            }
          }
        }}
        placeholder="Ask a research question, then attach the public sources NUMEN should inspect…"
      />
      <button
        type="button"
        className={!hasCollectionMode && promptValid ? 'run needsSource' : 'run'}
        onClick={handlePrimaryAction}
        disabled={primaryDisabled}
        aria-busy={busy}
        aria-describedby="run-readiness"
      >
        {busy
          ? <LoaderCircle className="spin" size={16} aria-hidden="true"/>
          : !hasCollectionMode && promptValid
            ? <Link2 size={16} aria-hidden="true"/>
            : <Play size={16} aria-hidden="true"/>}
        {primaryLabel}
      </button>
    </div>

    <div id="run-readiness" className={`runReadiness ${!promptStarted ? 'idle' : runnable ? 'ready' : hasCollectionMode ? 'waiting' : 'needsSource'}`} role="status">
      <span className="runReadinessDot" aria-hidden="true"/>
      <strong>{runReadinessTitle({ online, busy, promptStarted, promptValid, hasCollectionMode })}</strong>
      <span>{runReadinessDetail({ online, busy, promptStarted, promptValid, demoMode, sourceCount: sourceUrls.length })}</span>
    </div>

    <details ref={sourceDetailsRef} open={!hasCollectionMode && promptValid ? true : undefined} className={`composerAdvanced ${hasCollectionMode ? 'configured' : 'needsSetup'}`}>
      <summary>
        <div className="advancedSummaryCopy">
          <Link2 size={14} aria-hidden="true"/>
          <div>
            <span>Source scope</span>
            <small id="source-scope-summary">{sourceScopeSummary(demoMode, sourceUrls.length)}</small>
          </div>
        </div>
        <ChevronDown size={15} aria-hidden="true"/>
      </summary>

      <div className="composerAdvancedBody">
        <div className="sourceScope" aria-labelledby="source-scope-label">
          <div className="sourceScopeHeading">
            <div>
              <span id="source-scope-label">Public sources</span>
              <small>NUMEN collects only explicitly configured public HTTP(S) URLs. Up to {MAX_SOURCES} sources per run.</small>
            </div>
            <span className="sourceCount">{sourceUrls.length}/{MAX_SOURCES}</span>
          </div>

          <div className="sourceEntry">
            <Link2 size={15} aria-hidden="true"/>
            <input
              ref={sourceInputRef}
              type="url"
              inputMode="url"
              value={sourceDraft}
              disabled={demoMode || sourceUrls.length >= MAX_SOURCES}
              aria-label="Public source URL"
              placeholder={demoMode ? 'Disable Demo mode to add live sources' : 'https://example.com/research-source'}
              onChange={event => setSourceDraft(event.target.value)}
              onKeyDown={event => {
                if (event.nativeEvent.isComposing) return
                if (event.key === 'Enter' && validDraft) {
                  event.preventDefault()
                  addSources([sourceDraft])
                }
              }}
            />
            <button type="button" onClick={() => addSources([sourceDraft])} disabled={demoMode || !validDraft || sourceUrls.length >= MAX_SOURCES}>
              <Plus size={14} aria-hidden="true"/> Add
            </button>
          </div>

          {sourceDraftIssue && !demoMode && <p className="sourceValidation" role="status">{sourceDraftIssue}</p>}

          {sourceUrls.length > 0 && <div className="sourceChips" aria-label="Configured public sources">
            {sourceUrls.map(url => <span key={url}>
              <Link2 size={12} aria-hidden="true"/>
              <bdi dir="ltr" title={url}>{sourceDisplayLabel(url)}</bdi>
              <button type="button" aria-label={`Remove source ${url}`} onClick={() => onSourceUrlsChange(sourceUrls.filter(item => item !== url))}><X size={12} aria-hidden="true"/></button>
            </span>)}
          </div>}

          {!demoMode && detectedPromptUrls.length > 0 && <button type="button" className="detectedSourceAction" onClick={() => addSources(detectedPromptUrls)}>
            <Link2 size={13} aria-hidden="true"/> Add {Math.min(detectedPromptUrls.length, Math.max(0, MAX_SOURCES - sourceUrls.length))} URL{detectedPromptUrls.length === 1 ? '' : 's'} detected in the question
          </button>}
        </div>

        <div className={`sourceModeNotice ${demoMode ? 'demo' : sourceUrls.length ? 'live' : 'missing'}`}>
          {demoMode
            ? <><FlaskConical size={13} aria-hidden="true"/><span><strong>Demo data selected.</strong> No public source will be contacted for this run.</span><button type="button" className="inlineDemoAction" onClick={() => setDemo(false)}>Use public sources</button></>
            : sourceUrls.length
              ? <><Link2 size={13} aria-hidden="true"/><span>Only the {sourceUrls.length} configured public {sourceUrls.length === 1 ? 'source' : 'sources'} will be collected.</span><button type="button" className="inlineDemoAction" onClick={() => setDemo(true)}>Use demo data</button></>
              : <><Search size={13} aria-hidden="true"/><span><strong>Source scope required.</strong> Add a public HTTP(S) URL, or use explicit demo data.</span><button type="button" className="inlineDemoAction" onClick={() => setDemo(true)}>Use demo data</button></>}
        </div>
      </div>
    </details>

    <div className="composerFooter">
      <div className="chips" aria-label="Example research prompts">
        {examplePrompts.slice(0, 3).map((example, index) => <button
          type="button"
          key={example}
          aria-label={`Use example prompt ${index + 1}`}
          title={example}
          onClick={() => onPromptChange(example)}
        >{clip(example, 34)}</button>)}
      </div>
      <div className="composerMeta">
        <kbd>Ctrl / ⌘ + Enter</kbd>
        <small id="prompt-help">{length}/4000</small>
      </div>
    </div>
  </section>
}

function runReadinessTitle({ online, busy, promptStarted, promptValid, hasCollectionMode }: {
  online: boolean
  busy: boolean
  promptStarted: boolean
  promptValid: boolean
  hasCollectionMode: boolean
}): string {
  if (!online) return 'NUMEN service is unavailable'
  if (busy) return 'Starting research'
  if (!promptStarted) return 'Start with a research question'
  if (!promptValid) return 'Add a little more detail'
  if (!hasCollectionMode) return 'One more step: choose the source scope'
  return 'Ready to run'
}

function runReadinessDetail({ online, busy, promptStarted, promptValid, demoMode, sourceCount }: {
  online: boolean
  busy: boolean
  promptStarted: boolean
  promptValid: boolean
  demoMode: boolean
  sourceCount: number
}): string {
  if (!online) return 'Wait for the Connected status before submitting.'
  if (busy) return 'Your request is being submitted once.'
  if (!promptStarted) return 'Describe the outcome you want to research; source scope comes next.'
  if (!promptValid) return 'Enter at least 10 characters so NUMEN has a clear research intent.'
  if (!demoMode && sourceCount === 0) return 'Add a public HTTP(S) URL below, or choose explicit demo data.'
  if (demoMode) return 'Demo mode is selected; the output will be clearly labeled sample data.'
  return `${sourceCount} public ${sourceCount === 1 ? 'source' : 'sources'} configured for this run.`
}

function sourceScopeSummary(demoMode: boolean, sourceCount: number): string {
  if (demoMode) return 'Demo mode · labeled sample data'
  if (sourceCount > 0) return `${sourceCount} public ${sourceCount === 1 ? 'source' : 'sources'} configured`
  return 'Required before live research can run'
}
