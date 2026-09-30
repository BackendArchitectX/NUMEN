import type { RecordRow, Task } from './types'

const json = async <T>(res: Response): Promise<T> => {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Request failed: ${res.status}`)
  return res.json()
}

export const api = {
  listTasks: () => fetch('/api/tasks').then(json<Task[]>),
  getTask: (id: string) => fetch(`/api/tasks/${id}`).then(json<Task>),
  createTask: (prompt: string) => fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) }).then(json<Task>),
  cancelTask: (id: string) => fetch(`/api/tasks/${id}/cancel`, { method: 'POST' }).then(json<Task>),
  getRecords: (id: string, q = '', minQuality = 0) => fetch(`/api/tasks/${id}/records?q=${encodeURIComponent(q)}&minQuality=${minQuality}`).then(json<RecordRow[]>),
  exportUrl: (id: string) => `/api/tasks/${id}/export.csv`
}
