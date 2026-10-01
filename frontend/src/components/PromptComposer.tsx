import { useMemo, useState } from 'react'
import { FlaskConical, Link2, LoaderCircle, MessageSquareText, Play, Plus, Search, X } from 'lucide-react'
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
  const length = prompt.length
  const detectedPromptUrls = useMemo(
    () => extractHttpUrls(prompt).filter(url => !sourceUrls.includes(url)),
    [prompt, sourceUrls]
  )
  const validDraft = normalizeUrl(sourceDraft)
  const hasCollectionMode = sourceUrls.length > 0 || demoMode
  const runnable = online && !busy && prompt.trim().length >= 10 && length <= 4000 && hasCollectionMode

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

  return <section className="composer panel" aria-labelledby="prompt-label">
    <div className="composerHeading">
      <div className="composerTitle">
        <span className="composerIcon"><Search size={16} aria-hidden="true"/></span>
        <div>
          <span id="prompt-label">New research</span>
          <small>Describe the outcome first. Configure the exact public sources separately so research intent and collection scope stay clear.</small>
        </div>
      </div>
      <span className="composerHint"><MessageSquareText size={13} aria-hidden="true"/> Natural language</span>
    </div>

    <div className="composerInputShell">
      <textarea
        id="research-question"
        value={prompt}
        maxLength={4000}
        aria-describedby="prompt-help source-mode-help"
        onChange={event => onPromptChange(event.target.value)}
        onKeyDown={event => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && runnable) {
            event.preventDefault()
            onRun()
          }
        }}
        placeholder="Example: Find Java backend engineering roles in India and return role, company, location, experience and source evidence."
      />
      <button type="button" className="run" onClick={onRun} disabled={!runnable} aria-busy={busy}>
        {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true"/> : <Play size={16} aria-hidden="true"/>}
        Run research
      </button>
    </div>

    <div className="sourceScope" aria-labelledby="source-scope-label">
      <div className="sourceScopeHeading">
        <div>
          <span id="source-scope-label">Public sources</span>
          <small>Only explicitly configured HTTP(S) URLs are collected. Up to {MAX_SOURCES} sources per run.</small>
        </div>
        <span className="sourceCount">{sourceUrls.length}/{MAX_SOURCES}</span>
      </div>

      <div className="sourceEntry">
        <Link2 size={15} aria-hidden="true"/>
        <input
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

    <div className={`sourceModeNotice ${demoMode ? 'demo' : sourceUrls.length ? 'live' : 'missing'}`} id="source-mode-help">
      {demoMode
        ? <><FlaskConical size={13} aria-hidden="true"/><span><strong>Demo mode</strong> uses clearly labeled sample records and does not perform live public-source collection.</span></>
        : sourceUrls.length
          ? <><Link2 size={13} aria-hidden="true"/><span><strong>{sourceUrls.length} public {sourceUrls.length === 1 ? 'source' : 'sources'} configured.</strong> NUMEN will collect only this explicit source scope.</span></>
          : <><Search size={13} aria-hidden="true"/><span><strong>Source scope required.</strong> Add at least one public HTTP(S) source, or explicitly enable Demo mode for sample data.</span></>}
    </div>

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
      <div className="composerControls">
        <label className="demoToggle">
          <input type="checkbox" checked={demoMode} onChange={event => setDemo(event.target.checked)}/>
          <FlaskConical size={13} aria-hidden="true"/>
          <span>Demo mode</span>
        </label>
        <div className="composerMeta">
          <kbd>Ctrl / ⌘ + Enter</kbd>
          <small id="prompt-help">{length}/4000</small>
        </div>
      </div>
    </div>
  </section>
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
