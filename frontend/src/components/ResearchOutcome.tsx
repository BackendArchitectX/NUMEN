import { Building2, CheckCircle2, Clock3, Database, Download, MapPin, Radio } from 'lucide-react'
import type { DatasetRecord, Task } from '../model/types'
import { clip } from '../shared/text'

interface ResearchOutcomeProps {
  task: Task
  records: DatasetRecord[]
  exportUrl: string
}

export function ResearchOutcome({ task, records, exportUrl }: ResearchOutcomeProps) {
  const organizations = uniqueCount(records.map(record => record.organization))
  const locations = uniqueCount(records.map(record => record.location))
  const sources = uniqueCount(records.map(record => record.sourceName || record.sourceUrl))
  const evidenceLinked = records.filter(record => Boolean(record.sourceUrl && record.excerpt?.trim())).length
  const demo = records.some(record => record.sourceType === 'DEMO')
  const updatedAt = newestDate(records.map(record => record.collectedAt)) || task.completedAt || task.createdAt
  const topLocations = topValues(records.map(record => record.location), 3)

  return <section className="researchOutcome panel" aria-labelledby={`outcome-${task.id}`}>
    <div className="outcomeHeader">
      <div className="outcomeTitle">
        <span className={`outcomeState ${demo ? 'demo' : 'ready'}`}>
          {demo ? <Database size={14} aria-hidden="true"/> : <CheckCircle2 size={14} aria-hidden="true"/>}
          {demo ? 'Demo dataset' : 'Research ready'}
        </span>
        <h2 id={`outcome-${task.id}`}>{clip(task.prompt, 120)}</h2>
        <p>{summary(records.length, organizations, sources, demo)}</p>
      </div>
      {records.length > 0 && <a className="primaryAction" href={exportUrl}><Download size={15} aria-hidden="true"/> Export CSV</a>}
    </div>

    <div className="outcomeStats" aria-label="Research outcome summary">
      <OutcomeStat icon={<Database/>} label="Results" value={records.length.toString()} detail={demo ? 'sample records' : 'published records'}/>
      <OutcomeStat icon={<Building2/>} label="Organizations" value={organizations.toString()} detail="unique values"/>
      <OutcomeStat icon={<Radio/>} label="Sources" value={sources.toString()} detail="contributing sources"/>
      <OutcomeStat icon={<MapPin/>} label="Locations" value={locations.toString()} detail="unique values"/>
      <OutcomeStat icon={<CheckCircle2/>} label="Evidence linked" value={`${evidenceLinked}/${records.length}`} detail="records with captured evidence"/>
      <OutcomeStat icon={<Clock3/>} label="Updated" value={formatRelative(updatedAt)} detail={formatDate(updatedAt)}/>
    </div>

    {topLocations.length > 0 && <div className="outcomeContext">
      <span>Top locations</span>
      <div>{topLocations.map(item => <span key={item.value}>{item.value} <b>{item.count}</b></span>)}</div>
    </div>}
  </section>
}

function OutcomeStat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="outcomeStat">
    <span className="outcomeStatIcon" aria-hidden="true">{icon}</span>
    <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
  </div>
}

function uniqueCount(values: string[]): number {
  return new Set(values.map(value => value.trim()).filter(Boolean)).size
}

function topValues(values: string[], limit: number): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>()
  for (const raw of values) {
    const value = raw.trim()
    if (!value) continue
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }))
}

function newestDate(values: string[]): string | undefined {
  return values
    .map(value => ({ value, time: Date.parse(value) }))
    .filter(item => Number.isFinite(item.time))
    .sort((left, right) => right.time - left.time)[0]?.value
}

function summary(records: number, organizations: number, sources: number, demo: boolean): string {
  if (records === 0) return 'No publishable results were produced for this run.'
  if (demo) return `${records} sample records across ${organizations} organizations from ${sources} demo sources. Demo content is clearly separated from live intelligence.`
  return `${records} published results across ${organizations} organizations from ${sources} contributing sources. Open any row to inspect its captured evidence.`
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatRelative(value: string): string {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 'Recently'
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000))
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}
