import { LoaderCircle, Play, Search, Sparkles } from 'lucide-react'
import { examplePrompts } from '../model/prompts'
import { clip } from '../shared/text'

interface PromptComposerProps {
  prompt: string
  busy: boolean
  online: boolean
  onPromptChange: (value: string) => void
  onRun: () => void
}

export function PromptComposer({ prompt, busy, online, onPromptChange, onRun }: PromptComposerProps) {
  const length = prompt.length
  const runnable = online && !busy && prompt.trim().length >= 10 && length <= 4000

  return <section className="composer panel" aria-labelledby="prompt-label">
    <div className="composerHeading">
      <div className="composerTitle">
        <span className="composerIcon"><Search size={16} aria-hidden="true"/></span>
        <div>
          <span id="prompt-label">New research</span>
          <small>Describe the outcome you need. NUMEN will structure the request and keep source evidence attached.</small>
        </div>
      </div>
      <span className="composerHint"><Sparkles size={13} aria-hidden="true"/> Natural language</span>
    </div>

    <div className="composerInputShell">
      <textarea
        value={prompt}
        maxLength={4000}
        aria-describedby="prompt-help"
        onChange={event => onPromptChange(event.target.value)}
        onKeyDown={event => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && runnable) {
            event.preventDefault()
            onRun()
          }
        }}
        placeholder="Example: Find Java backend engineering roles in India and return company, title, location, experience, job URL and source."
      />
      <button type="button" className="run" onClick={onRun} disabled={!runnable} aria-busy={busy}>
        {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true"/> : <Play size={16} aria-hidden="true"/>}
        Run research
      </button>
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
      <div className="composerMeta">
        <kbd>Ctrl / ⌘ + Enter</kbd>
        <small id="prompt-help">{length}/4000</small>
      </div>
    </div>
  </section>
}
