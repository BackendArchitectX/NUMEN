import type { Task } from '../model/types'

export interface TemporalReference {
  label: 'Created' | 'Started' | 'Completed'
  value: string
}

export function formatInstant(value?: string | null): string {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

export function formatRelativeInstant(value?: string | null, now = Date.now()): string {
  if (!value) return 'Unknown'
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 'Unknown'

  const deltaMinutes = Math.round((time - now) / 60_000)
  const future = deltaMinutes > 0
  const absoluteMinutes = Math.abs(deltaMinutes)

  if (absoluteMinutes < 1) return 'Now'
  if (absoluteMinutes < 60) return future ? `in ${absoluteMinutes}m` : `${absoluteMinutes}m ago`

  const hours = Math.round(absoluteMinutes / 60)
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`

  const days = Math.round(hours / 24)
  return future ? `in ${days}d` : `${days}d ago`
}

export function taskTemporalReference(task: Task): TemporalReference {
  if (task.completedAt) return { label: 'Completed', value: task.completedAt }
  if (task.startedAt) return { label: 'Started', value: task.startedAt }
  return { label: 'Created', value: task.createdAt }
}
