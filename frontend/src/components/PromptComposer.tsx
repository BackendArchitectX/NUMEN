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
  return <section className="composer panel">
    <div className="composerTop"><Sparkles size={18}/><span>Describe your business requirement</span><kbd>NATURAL LANGUAGE</kbd></div>
    <textarea value={prompt} onChange={event => onPromptChange(event.target.value)} placeholder="Example: Find 50 backend roles from permitted career pages and return company, title, location, URL and source..." />
    <div className="composerFooter">
      <div className="chips">{examplePrompts.map((example, index) => <button key={example} onClick={() => onPromptChange(example)}>0{index + 1}</button>)}</div>
      <button className="run" onClick={onRun} disabled={busy || !online}>
        {busy ? <LoaderCircle className="spin" size={17}/> : <Play size={17}/>} Run intelligence workflow
      </button>
    </div>
  </section>
}
