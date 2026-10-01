import { FlaskConical, LoaderCircle, Play, Search, Sparkles } from 'lucide-react'
import { examplePrompts } from '../model/prompts'
import { clip } from '../shared/text'

interface PromptComposerProps {
  prompt: string
  demoMode: boolean
  busy: boolean
  online: boolean
  onPromptChange: (value: string) => void
  onDemoModeChange: (enabled: boolean) => void
  onRun: () => void
}

export function PromptComposer({ prompt, demoMode, busy, online, onPromptChange, onDemoModeChange, onRun }: PromptComposerProps) {
  const length = prompt.length
  const hasPublicUrl = /https?:\/\/[^\s,;]+/i.test(prompt)
  const hasCollectionMode = hasPublicUrl || demoMode
  const runnable = online && !busy && prompt.trim().length >= 10 && length <= 4000 && hasCollectionMode

  return <section className="composer panel" aria-labelledby="prompt-label">
    <div className="composerHeading">
      <div className="composerTitle">
        <span className="composerIcon"><Search size={16} aria-hidden="true"/></span>
        <div>
          <span id="prompt-label">New research</span>
          <small>Describe the outcome and include permitted public HTTP(S) sources. NUMEN preserves the evidence behind published records.</small>
        </div>
      </div>
      <span className="composerHint"><Sparkles size={13} aria-hidden="true"/> Natural language</span>
    </div>

    <div className="composerInputShell">
      <textarea
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
        placeholder="Example: Research https://example.com and structure the useful public information with source evidence."
      />
      <button type="button" className="run" onClick={onRun} disabled={!runnable} aria-busy={busy}>
        {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true"/> : <Play size={16} aria-hidden="true"/>}
        Run research
      </button>
    </div>

    <div className={`sourceModeNotice ${demoMode ? 'demo' : hasPublicUrl ? 'live' : 'missing'}`} id="source-mode-help">
      {demoMode
        ? <><FlaskConical size={13} aria-hidden="true"/><span><strong>Demo mode</strong> uses clearly labeled sample records. It does not perform live public-source collection.</span></>
        : hasPublicUrl
          ? <><Search size={13} aria-hidden="true"/><span><strong>Public source detected.</strong> NUMEN will collect only the permitted HTTP(S) URLs supplied in this request.</span></>
          : <><Search size={13} aria-hidden="true"/><span><strong>Source required.</strong> Add at least one public HTTP(S) URL, or explicitly enable Demo mode for sample data.</span></>}
    </div>

    <div className="composerFooter">
      <div className="chips" aria-label="Example research prompts">
        {examplePrompts.slice(0, 3).map((example, index) => <button
          type="button"
          key={example}
          aria-label={`Use example prompt ${index + 1}`}
          title={example}
          onClick={() => {
            onDemoModeChange(false)
            onPromptChange(example)
          }}
        >{clip(example, 34)}</button>)}
      </div>
      <div className="composerControls">
        <label className="demoToggle">
          <input type="checkbox" checked={demoMode} onChange={event => onDemoModeChange(event.target.checked)}/>
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
