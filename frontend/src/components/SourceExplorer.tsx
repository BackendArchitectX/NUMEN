import { useMemo, useState } from 'react'
import { ArrowUpRight, Radio, Search } from 'lucide-react'
import type { SourceSummary } from '../model/types'

interface SourceExplorerProps {
  sources: SourceSummary[]
  totalRecords: number
}

export function SourceExplorer({ sources, totalRecords }: SourceExplorerProps) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sources
    return sources.filter(source => [source.name, source.url, source.type].some(value => value?.toLowerCase().includes(needle)))
  }, [sources, query])

  const liveSources = sources.filter(source => !source.demo).length
  const evidenceLinked = sources.reduce((sum, source) => sum + source.evidence, 0)

  return <section className="sourcesPanel panel" aria-labelledby="sources-heading">
    <div className="resultsHeader">
      <div className="resultsTitle">
        <Radio size={18} aria-hidden="true"/>
        <div><h3 id="sources-heading">Sources</h3><span>{sources.length} contributing sources · {evidenceLinked}/{totalRecords} records with captured evidence</span></div>
      </div>
      <label className="searchField">
        <span className="srOnly">Search sources</span>
        <Search size={15} aria-hidden="true"/>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search sources"/>
      </label>
    </div>

    {sources.length > 0 && <div className="sourceSummaryBar">
      <span><strong>{sources.length}</strong> total</span>
      <span><strong>{liveSources}</strong> live/public</span>
      <span><strong>{sources.length - liveSources}</strong> demo</span>
    </div>}

    {visible.length ? <div className="sourceList">
      {visible.map(source => <article className="sourceRow" key={source.url || `${source.type}:${source.name}`}>
        <div className="sourceIdentity">
          <span className={source.demo ? 'sourceDot demo' : 'sourceDot live'} aria-hidden="true"/>
          <div>
            <strong>{source.name}</strong>
            <small>{source.demo ? 'Demo source' : source.type || 'Public source'}</small>
          </div>
        </div>

        <div className="sourceMetric"><span>Records</span><strong>{source.records}</strong></div>
        <div className="sourceMetric"><span>Evidence</span><strong>{source.evidence}/{source.records}</strong></div>
        <div className="sourceMetric"><span>Latest</span><strong>{formatRelative(source.latestCollectedAt)}</strong></div>

        <div className="sourceAction">
          {source.url?.startsWith('http')
            ? <a href={source.url} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={13} aria-hidden="true"/></a>
            : <span className="sourceUnavailable">No external URL</span>}
        </div>
      </article>)}
    </div> : <div className="emptyState compact">
      <Radio aria-hidden="true"/>
      <h2>{sources.length ? 'No sources match your search' : 'No contributing sources yet'}</h2>
      <p>{sources.length ? 'Clear the source search to see the full source set.' : 'Published research sources will appear here with their record and evidence contribution.'}</p>
    </div>}
  </section>
}

function formatRelative(value?: string | null): string {
  if (!value) return '—'
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return '—'
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000))
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
