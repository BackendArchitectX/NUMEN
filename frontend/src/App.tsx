import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Activity, ArrowUpRight, CheckCircle2, Database, Download, FileSearch, Gauge, Layers3, Link2, LoaderCircle, Play, Search, ShieldCheck, Sparkles, XCircle } from 'lucide-react'
import { api } from './api'
import type { RecordRow, Task } from './types'

const examples = [
  'Find Java backend engineering roles in India and structure title, company, location, URL and source',
  'Collect sponsor opportunities for an AI developer event and structure company, location and source',
  'Build a market-intelligence dataset for cloud data platforms with source provenance'
]

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [records, setRecords] = useState<RecordRow[]>([])
  const [prompt, setPrompt] = useState(examples[0])
  const [query, setQuery] = useState('')
  const [minQuality, setMinQuality] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(() => tasks.find(t => t.id === selectedId), [tasks, selectedId])

  const refresh = async () => {
    const next = await api.listTasks()
    setTasks(next)
    setSelectedId(current => current || next[0]?.id)
  }

  useEffect(() => { refresh().catch(e => setError(e.message)) }, [])
  useEffect(() => {
    const timer = window.setInterval(() => refresh().catch(() => {}), 2500)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    api.getRecords(selectedId, query, minQuality).then(setRecords).catch(() => setRecords([]))
  }, [selectedId, query, minQuality, selected?.status])

  useEffect(() => {
    if (!selectedId) return
    const stream = new EventSource(`/api/tasks/${selectedId}/events`)
    stream.addEventListener('progress', () => refresh().catch(() => {}))
    return () => stream.close()
  }, [selectedId])

  const create = async () => {
    if (prompt.trim().length < 10) return
    setBusy(true); setError('')
    try {
      const task = await api.createTask(prompt.trim())
      setSelectedId(task.id)
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create task') }
    finally { setBusy(false) }
  }

  const completed = tasks.filter(t => t.status === 'COMPLETED').length
  const totalRecords = tasks.reduce((sum, t) => sum + (t.recordCount || 0), 0)
  const avgQuality = completed ? Math.round(tasks.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + t.averageQuality, 0) / completed) : 0

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brandMark">N</div><div><b>NUMEN</b><span>DATA INTELLIGENCE</span></div></div>
      <div className="navLabel">WORKSPACE</div>
      <button className="nav active"><Activity size={16}/> Intelligence Console</button>
      <button className="nav"><Database size={16}/> Datasets <span>{totalRecords}</span></button>
      <button className="nav"><Layers3 size={16}/> Workflow History <span>{tasks.length}</span></button>
      <div className="navLabel">RECENT RUNS</div>
      <div className="recentList">
        {tasks.slice(0, 7).map(t => <button key={t.id} className={`recent ${t.id === selectedId ? 'selected' : ''}`} onClick={() => setSelectedId(t.id)}>
          <span className={`dot ${t.status.toLowerCase()}`}/><div><strong>{clip(t.prompt, 34)}</strong><small>{t.stage}</small></div>
        </button>)}
      </div>
      <div className="trust"><ShieldCheck size={18}/><div><b>Guarded collection</b><span>Public HTTP(S) only · SSRF protection · provenance</span></div></div>
    </aside>

    <main>
      <header><div><span className="eyebrow">AI-POWERED DATA INTELLIGENCE PLATFORM</span><h1>From intent to <em>traceable data.</em></h1><p>Describe what you need. NUMEN designs the workflow, collects permitted sources, validates evidence and returns a clean dataset.</p></div><div className="livePill"><span/> ENGINE ONLINE</div></header>

      <section className="composer panel">
        <div className="composerTop"><Sparkles size={18}/><span>Describe your business requirement</span><kbd>NATURAL LANGUAGE</kbd></div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Example: Find 50 backend roles from permitted career pages and return company, title, location, URL and source..." />
        <div className="composerFooter">
          <div className="chips">{examples.map((x,i)=><button key={i} onClick={()=>setPrompt(x)}>0{i+1}</button>)}</div>
          <button className="run" onClick={create} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Play size={17}/>} Run intelligence workflow</button>
        </div>
      </section>

      {error && <div className="error"><XCircle size={16}/>{error}</div>}

      <section className="metrics">
        <Metric icon={<Layers3/>} label="WORKFLOWS" value={tasks.length.toString()} detail={`${completed} completed`}/>
        <Metric icon={<Database/>} label="RECORDS" value={totalRecords.toString()} detail="deduplicated"/>
        <Metric icon={<Gauge/>} label="AVG QUALITY" value={`${avgQuality || '—'}${avgQuality ? '%' : ''}`} detail="field completeness"/>
        <Metric icon={<Link2/>} label="PROVENANCE" value={totalRecords ? '100%' : '—'} detail="source-backed"/>
      </section>

      {selected ? <>
        <section className="runPanel panel">
          <div className="runHeader"><div><span className={`status ${selected.status.toLowerCase()}`}>{selected.status}</span><h2>{clip(selected.prompt, 90)}</h2></div><div className="runActions">{!['COMPLETED','FAILED','CANCELLED'].includes(selected.status) && <button onClick={()=>api.cancelTask(selected.id).then(refresh)}>Cancel</button>}<a className="export" href={api.exportUrl(selected.id)}><Download size={15}/> Export CSV</a></div></div>
          <div className="progressTrack"><div style={{width:`${selected.progress}%`}}/></div>
          <div className="progressMeta"><span>{selected.stage}</span><b>{selected.progress}%</b></div>
          <div className="pipeline">
            {['Interpret','Discover','Collect','Normalize','Validate','Deduplicate','Publish'].map((s,i)=><div className={selected.progress >= [10,25,45,60,72,82,100][i] ? 'done' : ''} key={s}><CheckCircle2 size={15}/><span>{s}</span></div>)}
          </div>
        </section>

        <section className="results panel">
          <div className="resultsHeader"><div><FileSearch size={18}/><h3>Dataset explorer</h3><span>{records.length} rows</span></div><div className="filters"><label><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search records"/></label><select value={minQuality} onChange={e=>setMinQuality(Number(e.target.value))}><option value={0}>All quality</option><option value={80}>80%+</option><option value={90}>90%+</option></select></div></div>
          <div className="tableWrap"><table><thead><tr><th>INTELLIGENCE</th><th>ORGANIZATION</th><th>LOCATION</th><th>QUALITY</th><th>SOURCE</th></tr></thead><tbody>
            {records.map(r=><tr key={r.id}><td><strong>{r.title}</strong><small>{clip(r.excerpt, 78)}</small></td><td>{r.organization}</td><td>{r.location}</td><td><span className="quality">{Math.round(r.qualityScore)}%</span></td><td>{r.sourceUrl.startsWith('http') ? <a href={r.sourceUrl} target="_blank" rel="noreferrer">{r.sourceName}<ArrowUpRight size={13}/></a> : <span className="demoSource">{r.sourceName}</span>}</td></tr>)}
            {!records.length && <tr><td colSpan={5} className="empty">{selected.status === 'COMPLETED' ? 'No records match the current filters.' : 'Records will appear here as the workflow completes.'}</td></tr>}
          </tbody></table></div>
        </section>
      </> : <section className="emptyState panel"><Sparkles/><h2>Start your first intelligence run</h2><p>Use the prompt above to create a managed data-collection workflow.</p></section>}
    </main>
  </div>
}

function Metric({icon,label,value,detail}:{icon:ReactNode,label:string,value:string,detail:string}) { return <div className="metric panel"><div className="metricIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div> }
function clip(value:string, max:number){ return value.length > max ? value.slice(0,max) + '…' : value }
