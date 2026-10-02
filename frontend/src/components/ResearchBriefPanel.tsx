import { BookOpenText, ExternalLink } from 'lucide-react'
import type { LoadState, ResearchBrief } from '../model/types'
import { safeExternalHttpUrl, sourceHostname } from '../shared/sourceUrl'

interface ResearchBriefPanelProps {
  brief?: ResearchBrief
  state: LoadState
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

    {brief.sections.length > 0 && <div className="briefSections">
      {brief.sections.map(section => <article className="briefSection" key={section.key}>
        <h4>{section.label}</h4>
        <div className="briefFindings">
          {section.findings.map((finding, findingIndex) => <div className="briefFinding" key={section.key + '-' + findingIndex}>
            <p>{finding.text}</p>
            <div className="briefFindingMeta">
              <span>{finding.supportingSources} supporting {finding.supportingSources === 1 ? 'source' : 'sources'}</span>
              <div className="briefCitations" aria-label={'Sources for ' + section.label + ' finding ' + (findingIndex + 1)}>
                {finding.citations.map((citation, citationIndex) => {
                  const href = safeExternalHttpUrl(citation.sourceUrl)
                  const label = citation.sourceName?.trim() || sourceHostname(citation.sourceUrl) || 'Source ' + (citationIndex + 1)
                  const recordRef = citation.recordId.slice(0, 8)
                  return href
                    ? <a key={citation.recordId} href={href} target="_blank" rel="noreferrer" title={'Evidence record ' + recordRef}>
                        <span>[{citationIndex + 1}] {label}</span><ExternalLink size={11} aria-hidden="true"/>
                      </a>
                    : <span className="briefCitationStatic" key={citation.recordId} title={'Evidence record ' + recordRef}>
                        [{citationIndex + 1}] {citation.sourceType === 'DEMO' ? 'Demo source' : label}
                      </span>
                })}
              </div>
            </div>
          </div>)}
        </div>
      </article>)}
    </div>}

    <div className="briefIntegrity" role="note">
      NUMEN groups conservatively equivalent captured claims using one source's wording and preserves every matched citation. Supporting-source counts show coverage, not factual verification or source independence.
    </div>
  </section>
}
