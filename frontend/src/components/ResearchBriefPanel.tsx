import { BookOpenText, ExternalLink, TriangleAlert } from 'lucide-react'
import type { LoadState, ResearchBrief, ResearchBriefFinding, ResearchCitation } from '../model/types'
import { safeExternalHttpUrl, sourceHostname, sourceProvenanceLabel } from '../shared/sourceUrl'

interface ResearchBriefPanelProps {
  brief?: ResearchBrief
  state: LoadState
}

function citationLinks(citations: ResearchCitation[], label: string, forceDetailed = false) {
  const sourceUrlsByLabel = new Map<string, Set<string>>()
  for (const citation of citations) {
    const base = (citation.sourceName?.trim() || sourceHostname(citation.sourceUrl) || 'source').toLowerCase()
    const urls = sourceUrlsByLabel.get(base) ?? new Set<string>()
    if (citation.sourceUrl) urls.add(citation.sourceUrl)
    sourceUrlsByLabel.set(base, urls)
  }

  return <div className="briefCitations" aria-label={label}>
    {citations.map((citation, citationIndex) => {
      const href = safeExternalHttpUrl(citation.sourceUrl)
      const base = (citation.sourceName?.trim() || sourceHostname(citation.sourceUrl) || 'source').toLowerCase()
      const sourceLabel = sourceProvenanceLabel(
        citation.sourceName,
        citation.sourceUrl,
        forceDetailed || (sourceUrlsByLabel.get(base)?.size ?? 0) > 1
      ) || 'Source ' + (citationIndex + 1)
      const recordRef = citation.recordId.slice(0, 8)
      return href
        ? <a key={citation.recordId} href={href} target="_blank" rel="noreferrer" title={'Evidence record ' + recordRef}>
            <span>[{citationIndex + 1}] {sourceLabel}</span><ExternalLink size={11} aria-hidden="true"/>
          </a>
        : <span className="briefCitationStatic" key={citation.recordId} title={'Evidence record ' + recordRef}>
            [{citationIndex + 1}] {citation.sourceType === 'DEMO' ? 'Demo source' : sourceLabel}
          </span>
    })}
  </div>
}

function disagreementReason(reason: string): string {
  switch (reason) {
    case 'NUMERIC_CONFLICT': return 'Different numeric facts'
    case 'POLARITY_CONFLICT': return 'Opposite support / negation'
    case 'REQUIREMENT_CONFLICT': return 'Required vs optional'
    default: return 'Materially conflicting evidence'
  }
}

function disagreementSide(finding: ResearchBriefFinding, side: string) {
  return <div className="briefDisagreementSide">
    <span>{side}</span>
    <p>{finding.text}</p>
    <div className="briefDisagreementMeta">
      <small>{finding.supportingSources} supporting {finding.supportingSources === 1 ? 'source' : 'sources'}</small>
      {citationLinks(finding.citations, side + ' sources', true)}
    </div>
  </div>
}

export function ResearchBriefPanel({ brief, state }: ResearchBriefPanelProps) {
  if (state === 'loading') {
    return <section className="researchBrief panel" aria-busy="true">
      <div className="briefHeader"><BookOpenText size={18} aria-hidden="true"/><div><span>Evidence-backed brief</span><h3>Organizing published evidence…</h3></div></div>
    </section>
  }

  if (state === 'error') {
    return <section className="researchBrief panel briefError" role="note">
      <div className="briefHeader"><BookOpenText size={18} aria-hidden="true"/><div><span>Evidence-backed brief</span><h3>Brief temporarily unavailable</h3><p>The published source-backed records remain available below.</p></div></div>
    </section>
  }

  if (!brief || brief.status === 'NOT_APPLICABLE' || brief.status === 'CURRENT_NOT_COMPLETED') return null

  return <section className="researchBrief panel" aria-labelledby={'brief-' + brief.taskId}>
    <div className="briefHeader">
      <BookOpenText size={18} aria-hidden="true"/>
      <div>
        <span>Evidence-backed brief</span>
        <h3 id={'brief-' + brief.taskId}>What the configured sources support</h3>
        <p>{brief.findingCount > 0
          ? brief.findingCount + ' ' + (brief.findingCount === 1 ? 'finding' : 'findings') + ' across ' + brief.contributingSources + ' contributing ' + (brief.contributingSources === 1 ? 'source.' : 'sources.')
          : 'No claim-level findings could be projected from the published evidence.'}</p>
      </div>
    </div>

    {brief.disagreementCount > 0 && <section className="briefDisagreements" aria-labelledby={'disagreements-' + brief.taskId}>
      <div className="briefDisagreementHeader">
        <TriangleAlert size={17} aria-hidden="true"/>
        <div>
          <span>Potential source {brief.disagreementCount === 1 ? 'disagreement' : 'disagreements'}</span>
          <h4 id={'disagreements-' + brief.taskId}>{brief.disagreementCount} materially conflicting evidence {brief.disagreementCount === 1 ? 'pair' : 'pairs'} detected</h4>
          <p>NUMEN keeps both source-backed claims separate and does not decide which source is correct. Differences may reflect version, time, scope or source error.</p>
        </div>
      </div>
      <div className="briefDisagreementList">
        {brief.disagreements.map((disagreement, index) => <article className="briefDisagreementCard" key={disagreement.sectionKey + '-' + disagreement.reason + '-' + index}>
          <div className="briefDisagreementTitle">
            <span>{disagreement.sectionLabel}</span>
            <strong>{disagreementReason(disagreement.reason)}</strong>
          </div>
          <div className="briefDisagreementSides">
            {disagreementSide(disagreement.left, 'Claim A')}
            {disagreementSide(disagreement.right, 'Claim B')}
          </div>
        </article>)}
      </div>
    </section>}

    {brief.sections.length > 0 && <div className="briefSections">
      {brief.sections.map(section => <article className="briefSection" key={section.key}>
        <h4>{section.label}</h4>
        <div className="briefFindings">
          {section.findings.map((finding, findingIndex) => <div className="briefFinding" key={section.key + '-' + findingIndex}>
            <p>{finding.text}</p>
            <div className="briefFindingMeta">
              <span>{finding.supportingSources} supporting {finding.supportingSources === 1 ? 'source' : 'sources'}</span>
              {citationLinks(finding.citations, 'Sources for ' + section.label + ' finding ' + (findingIndex + 1))}
            </div>
          </div>)}
        </div>
      </article>)}
    </div>}

    <div className="briefIntegrity" role="note">
      <span>Projection {brief.projectionVersion || 'unknown'}</span>
      <p>NUMEN groups conservatively equivalent captured claims using one source's wording and preserves every matched citation. Supporting-source counts show coverage, not factual verification or source independence. Potential disagreements are deterministic signals, not adjudications of truth.</p>
    </div>
  </section>
}
