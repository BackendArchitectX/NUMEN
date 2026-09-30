import { LoaderCircle, Play, Sparkles } from 'lucide-react'
import { examplePrompts } from '../model/prompts'

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
    <div className="composerTop">
      <Sparkles size={18} aria-hidden="true"/>
      <span id="prompt-label">Describe your business requirement</span>
      <kbd>CTRL/⌘ + ENTER</kbd>
    </div>
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
      placeholder="Example: Find 50 backend roles from permitted career pages and return company, title, location, URL and source..."
    />
    <div className="composerFooter">
      <div className="chips" aria-label="Example prompts">
        {examplePrompts.map((example, index) => <button type="button" key={example} aria-label={`Use example prompt ${index + 1}`} onClick={() => onPromptChange(example)}>0{index + 1}</button>)}
      </div>
      <div className="composerRun">
        <small id="prompt-help">{length}/4000</small>
        <button type="button" className="run" onClick={onRun} disabled={!runnable} aria-busy={busy}>
          {busy ? <LoaderCircle className="spin" size={17} aria-hidden="true"/> : <Play size={17} aria-hidden="true"/>}
          Run intelligence workflow
        </button>
      </div>
    </div>
  </section>
}
