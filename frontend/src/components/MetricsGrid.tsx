import type { ReactNode } from 'react'
import { CheckCircle2, Database, Gauge, Layers3 } from 'lucide-react'

interface MetricsGridProps {
  workflows: number
  completed: number
  records: number
  averageQuality: number
}

export function MetricsGrid({ workflows, completed, records, averageQuality }: MetricsGridProps) {
  return <section className="metrics" aria-label="Persisted workspace metrics">
    <Metric icon={<Layers3/>} label="WORKFLOWS" value={workflows.toString()} detail="persisted runs"/>
    <Metric icon={<CheckCircle2/>} label="COMPLETED" value={completed.toString()} detail="terminal success"/>
    <Metric icon={<Database/>} label="RECORDS" value={records.toString()} detail="published records"/>
    <Metric icon={<Gauge/>} label="AVG QUALITY" value={`${averageQuality || '—'}${averageQuality ? '%' : ''}`} detail="completed-run average"/>
  </section>
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="metric panel"><div className="metricIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}
