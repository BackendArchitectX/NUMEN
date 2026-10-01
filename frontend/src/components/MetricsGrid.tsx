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
    <Metric icon={<Layers3/>} label="Runs" value={workflows.toString()} detail="persisted research runs"/>
    <Metric icon={<CheckCircle2/>} label="Completed" value={completed.toString()} detail="successful outcomes"/>
    <Metric icon={<Database/>} label="Records" value={records.toString()} detail="published records"/>
    <Metric icon={<Gauge/>} label="Avg. quality" value={`${averageQuality || '—'}${averageQuality ? '%' : ''}`} detail="completed-run average"/>
  </section>
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="metric"><div className="metricIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}
