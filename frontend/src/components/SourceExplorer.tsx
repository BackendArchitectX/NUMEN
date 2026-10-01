import { useMemo, useState } from 'react'
import { ArrowUpRight, Radio, Search } from 'lucide-react'
import type { LoadState, SourceSummary } from '../model/types'
import { formatInstant, formatRelativeInstant } from '../shared/time'

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
  const limited = sources.filter(isLimitedSource).length
  const pending = sources.filter(source => source.collectionStatus === 'NOT_ATTEMPTED').length
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
      <span><strong>{limited}</strong> limited</span>
      <span><strong>{pending}</strong> pending</span>
      <span><strong>{demoSources}</strong> demo</span>
    </div>}

    {visible.length ? <div className="sourceList">
      {visible.map(source => <article className={`sourceRow ${sourceRowState(source)}`} key={source.url || `${source.type}:${source.name}`}>
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
        <SourceTemporalMetric source={source}/>

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

function isLimitedSource(source: SourceSummary): boolean {
  return ['UNAVAILABLE', 'UNAUTHORIZED', 'REJECTED', 'RATE_LIMITED', 'FAILED'].includes(source.collectionStatus)
}

function sourceRowState(source: SourceSummary): string {
  if (source.demo) return 'demo'
  if (isLimitedSource(source)) return 'failed'
  if (source.collectionStatus === 'SUCCEEDED') return 'succeeded'
  return 'pending'
}

function sourceDotClass(source: SourceSummary): string {
  if (source.demo) return 'sourceDot demo'
  if (isLimitedSource(source)) return 'sourceDot failed'
  if (source.collectionStatus === 'SUCCEEDED') return 'sourceDot live'
  return 'sourceDot pending'
}

function sourceStatusText(source: SourceSummary): string {
  const sourceType = sourceTypeLabel(source.type)
  if (source.demo) return 'Demo source'
  if (source.collectionStatus === 'UNAVAILABLE') return `${sourceType} · Source unavailable`
  if (source.collectionStatus === 'UNAUTHORIZED') return `${sourceType} · Access denied`
  if (source.collectionStatus === 'REJECTED') return `${sourceType} · Rejected by source safety policy`
  if (source.collectionStatus === 'RATE_LIMITED') return `${sourceType} · Rate limited`
  if (source.collectionStatus === 'FAILED') return `${sourceType} · Collection failed`
  if (source.collectionStatus === 'NOT_ATTEMPTED') return `${sourceType} · Not attempted`
  if (source.configured) return `${sourceType} · Collection succeeded`
  return `${sourceType} · Contributing source`
}

function SourceTemporalMetric({ source }: { source: SourceSummary }) {
  const value = source.lastSuccessfulObservationAt || source.lastAttemptedAt
  const label = source.lastSuccessfulObservationAt
    ? 'Last success'
    : source.lastAttemptedAt
      ? 'Last attempt'
      : 'Observation'

  return <div className="sourceMetric">
    <span>{label}</span>
    <strong title={formatInstant(value)}>{formatRelativeInstant(value)}</strong>
  </div>
}

function sourceTypeLabel(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return 'Public source'
  if (normalized === 'WEB' || normalized === 'HTTP' || normalized === 'HTTPS') return 'Public web'
  return value.replaceAll('_', ' ').replaceAll('-', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase())
}
