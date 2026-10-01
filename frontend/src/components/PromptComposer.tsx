import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, FlaskConical, Link2, LoaderCircle, MessageSquareText, Play, Plus, Search, X } from 'lucide-react'
import { examplePrompts } from '../model/prompts'
import { clip } from '../shared/text'

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
    () => extractHttpUrls(prompt).filter(url => !sourceUrls.includes(url)),
    [prompt, sourceUrls]
  )
  const validDraft = normalizeUrl(sourceDraft)
  const hasCollectionMode = sourceUrls.length > 0 || demoMode
  const promptValid = prompt.trim().length >= 10 && length <= 4000
  const runnable = online && !busy && promptValid && hasCollectionMode
  const primaryDisabled = !online || busy || !promptValid

  useEffect(() => {
    if (!hasCollectionMode && sourceDetailsRef.current) sourceDetailsRef.current.open = true
  }, [hasCollectionMode])

  const addSources = (values: string[]) => {
    if (demoMode) return
    const next = [...sourceUrls]
    for (const value of values) {
      const normalized = normalizeUrl(value)
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
          <span className="composerEyebrow">New research</span>
          <strong id="prompt-label">Ask NUMEN</strong>
          <small>Describe the outcome you need. NUMEN keeps the source scope and captured evidence attached to the resulting dataset.</small>
        </div>
      </div>
      <span className="composerHint"><MessageSquareText size={13} aria-hidden="true"/> Natural language</span>
    </div>

    <div className="composerInputShell">
      <textarea
        id="research-question"
        value={prompt}
        maxLength={4000}
        aria-describedby="prompt-help source-scope-summary"
        onChange={event => onPromptChange(event.target.value)}
        onKeyDown={event => {
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

    <div id="run-readiness" className={`runReadiness ${runnable ? 'ready' : hasCollectionMode ? 'waiting' : 'needsSource'}`} role="status">
      <span className="runReadinessDot" aria-hidden="true"/>
      <strong>{runReadinessTitle({ online, busy, promptValid, hasCollectionMode })}</strong>
      <span>{runReadinessDetail({ online, busy, promptValid, demoMode, sourceCount: sourceUrls.length })}</span>
    </div>

    <details ref={sourceDetailsRef} defaultOpen={!hasCollectionMode} className={`composerAdvanced ${hasCollectionMode ? 'configured' : 'needsSetup'}`}>
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

          {sourceDraft.trim() && !validDraft && !demoMode && <p className="sourceValidation" role="status">Use a complete public HTTP(S) URL.</p>}

          {sourceUrls.length > 0 && <div className="sourceChips" aria-label="Configured public sources">
            {sourceUrls.map(url => <span key={url}>
              <Link2 size={12} aria-hidden="true"/>
              <span title={url}>{sourceLabel(url)}</span>
              <button type="button" aria-label={`Remove source ${url}`} onClick={() => onSourceUrlsChange(sourceUrls.filter(item => item !== url))}><X size={12} aria-hidden="true"/></button>
            </span>)}
          </div>}

          {!demoMode && detectedPromptUrls.length > 0 && <button type="button" className="detectedSourceAction" onClick={() => addSources(detectedPromptUrls)}>
            <Link2 size={13} aria-hidden="true"/> Add {Math.min(detectedPromptUrls.length, Math.max(0, MAX_SOURCES - sourceUrls.length))} URL{detectedPromptUrls.length === 1 ? '' : 's'} detected in the question
          </button>}
        </div>

        <div className={`sourceModeNotice ${demoMode ? 'demo' : sourceUrls.length ? 'live' : 'missing'}`}>
          {demoMode
            ? <><FlaskConical size={13} aria-hidden="true"/><span><strong>Demo mode</strong> uses clearly labeled sample records and does not perform live public-source collection.</span></>
            : sourceUrls.length
              ? <><Link2 size={13} aria-hidden="true"/><span><strong>{sourceUrls.length} public {sourceUrls.length === 1 ? 'source' : 'sources'} configured.</strong> NUMEN will collect only this explicit source scope.</span></>
              : <><Search size={13} aria-hidden="true"/><span><strong>Source scope required.</strong> Add at least one public HTTP(S) source, or explicitly use Demo mode for labeled sample data.</span><button type="button" className="inlineDemoAction" onClick={() => setDemo(true)}>Use demo data</button></>}
        </div>

        <label className="demoToggle">
          <input type="checkbox" checked={demoMode} onChange={event => setDemo(event.target.checked)}/>
          <FlaskConical size={13} aria-hidden="true"/>
          <span>Demo mode</span>
          <small>Use labeled sample records instead of live source collection.</small>
        </label>
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

function runReadinessTitle({ online, busy, promptValid, hasCollectionMode }: {
  online: boolean
  busy: boolean
  promptValid: boolean
  hasCollectionMode: boolean
}): string {
  if (!online) return 'NUMEN service is unavailable'
  if (busy) return 'Starting research'
  if (!promptValid) return 'Research question needs more detail'
  if (!hasCollectionMode) return 'One more step: choose the source scope'
  return 'Ready to run'
}

function runReadinessDetail({ online, busy, promptValid, demoMode, sourceCount }: {
  online: boolean
  busy: boolean
  promptValid: boolean
  demoMode: boolean
  sourceCount: number
}): string {
  if (!online) return 'Wait for the Connected status before submitting.'
  if (busy) return 'Your request is being submitted once.'
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

function normalizeUrl(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined
    return parsed.toString()
  } catch {
    return undefined
  }
}

function extractHttpUrls(value: string): string[] {
  const matches = value.match(/https?:\/\/[^\s,;]+/gi) ?? []
  const unique: string[] = []
  for (const match of matches) {
    const normalized = normalizeUrl(match.replace(/[.)]+$/, ''))
    if (normalized && !unique.includes(normalized)) unique.push(normalized)
  }
  return unique
}

function sourceLabel(value: string): string {
  try {
    const url = new URL(value)
    const path = url.pathname === '/' ? '' : url.pathname
    return `${url.hostname}${clip(path, 28)}`
  } catch {
    return clip(value, 40)
  }
}
