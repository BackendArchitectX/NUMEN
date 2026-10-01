import { useMemo, useState } from 'react'
import { ArrowUpRight, Radio, Search } from 'lucide-react'
import type { LoadState, SourceSummary } from '../model/types'

interface SourceExplorerProps {
  sources: SourceSummary[]
  totalRecords: number
  state: LoadState
}

export function SourceExplorer({ sources, totalRecords, state }: SourceExplorerProps) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sources
    return sources.filter(source => [source.name, source.url, source.type, source.collectionStatus, source.errorMessage]
      .some(value => value?.toLowerCase().includes(needle)))
  }, [sources, query])

  const successful = sources.filter(source => source.collectionStatus === 'SUCCEEDED').length
  const failed = sources.filter(source => source.collectionStatus === 'FAILED').length
  const demoSources = sources.filter(source => source.demo).length
  const evidenceLinked = sources.reduce((sum, source) => sum + source.evidence, 0)

  if (state === 'loading' || state === 'idle') {
    return <section className="sourcesPanel panel" aria-labelledby="sources-heading">
      <div className="resultsHeader">
        <div className="resultsTitle"><Radio size={18} aria-hidden="true"/><div><h3 id="sources-heading">Sources</h3><span>Loading exact source contribution…</span></div></div>
      </div>
      <div className="sourceStateNotice" role="status">Loading configured sources and collection outcomes…</div>
    </section>
  }

  if (state === 'error') {
    return <section className="sourcesPanel panel" aria-labelledby="sources-heading">
      <div className="resultsHeader">
        <div className="resultsTitle"><Radio size={18} aria-hidden="true"/><div><h3 id="sources-heading">Sources</h3><span>Source coverage is temporarily unavailable</span></div></div>
      </div>
      <div className="sourceStateNotice errorState" role="alert">NUMEN could not load the exact source summary. The published dataset remains available.</div>
    </section>
  }

  return <section className="sourcesPanel panel" aria-labelledby="sources-heading">
    <div className="resultsHeader">
      <div className="resultsTitle">
        <Radio size={18} aria-hidden="true"/>
        <div><h3 id="sources-heading">Sources</h3><span>{sources.length} tracked sources · {totalRecords > 0 ? `${evidenceLinked}/${totalRecords} records with captured evidence` : 'no published records'}</span></div>
      </div>
      <label className="searchField">
        <span className="srOnly">Search sources</span>
        <Search size={15} aria-hidden="true"/>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search sources"/>
      </label>
    </div>

    {sources.length > 0 && <div className="sourceSummaryBar">
      <span><strong>{sources.length}</strong> tracked</span>
      <span><strong>{successful}</strong> collected</span>
      <span><strong>{failed}</strong> unavailable</span>
      <span><strong>{demoSources}</strong> demo</span>
    </div>}

    {visible.length ? <div className="sourceList">
      {visible.map(source => <article className={`sourceRow ${source.collectionStatus.toLowerCase()}`} key={source.url || `${source.type}:${source.name}`}>
        <div className="sourceIdentity">
          <span className={sourceDotClass(source)} aria-hidden="true"/>
          <div>
            <strong>{source.name}</strong>
            <small>{sourceStatusText(source)}</small>
            {source.errorMessage && <p className="sourceError">{source.errorMessage}</p>}
          </div>
        </div>

        <div className="sourceMetric"><span>Records</span><strong>{source.records}</strong></div>
        <div className="sourceMetric"><span>Evidence</span><strong>{source.records > 0 ? `${source.evidence}/${source.records}` : '—'}</strong></div>
        <div className="sourceMetric"><span>{source.latestCollectedAt ? 'Collected' : 'Attempted'}</span><strong>{formatRelative(source.latestCollectedAt || source.lastAttemptedAt)}</strong></div>

        <div className="sourceAction">
          {source.url?.startsWith('http')
            ? <a href={source.url} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={13} aria-hidden="true"/></a>
            : <span className="sourceUnavailable">No external URL</span>}
        </div>
      </article>)}
    </div> : <div className="emptyState compact">
      <Radio aria-hidden="true"/>
      <h2>{sources.length ? 'No sources match your search' : 'No sources are associated with this research'}</h2>
      <p>{sources.length ? 'Clear the source search to see the full source set.' : 'Configured and contributing sources will appear here with their collection and evidence status.'}</p>
    </div>}
  </section>
}

function sourceDotClass(source: SourceSummary): string {
  if (source.demo) return 'sourceDot demo'
  if (source.collectionStatus === 'FAILED') return 'sourceDot failed'
  if (source.collectionStatus === 'SUCCEEDED') return 'sourceDot live'
  return 'sourceDot pending'
}

function sourceStatusText(source: SourceSummary): string {
  if (source.demo) return 'Demo source'
  if (source.collectionStatus === 'FAILED') return `${sourceTypeLabel(source.type)} · Collection unavailable`
  if (source.collectionStatus === 'NOT_ATTEMPTED') return `${sourceTypeLabel(source.type)} · Not attempted`
  if (source.configured) return `${sourceTypeLabel(source.type)} · Collected`
  return `${sourceTypeLabel(source.type)} · Contributing source`
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

function sourceTypeLabel(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return 'Public source'
  if (normalized === 'WEB' || normalized === 'HTTP' || normalized === 'HTTPS') return 'Public web'
  return value.replaceAll('_', ' ').replaceAll('-', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase())
}
