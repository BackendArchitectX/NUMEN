import type { ReactNode } from 'react'
import { Database, Gauge, Layers3, Link2 } from 'lucide-react'

interface MetricsGridProps {
  workflows: number
  completed: number
  records: number
  averageQuality: number
}

export function MetricsGrid({ workflows, completed, records, averageQuality }: MetricsGridProps) {
  return <section className="metrics">
    <Metric icon={<Layers3/>} label="WORKFLOWS" value={workflows.toString()} detail={`${completed} completed`}/>
    <Metric icon={<Database/>} label="RECORDS" value={records.toString()} detail="deduplicated"/>
    <Metric icon={<Gauge/>} label="AVG QUALITY" value={`${averageQuality || '—'}${averageQuality ? '%' : ''}`} detail="field completeness"/>
    <Metric icon={<Link2/>} label="PROVENANCE" value={records ? '100%' : '—'} detail="source-backed"/>
  </section>
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="metric panel"><div className="metricIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}
