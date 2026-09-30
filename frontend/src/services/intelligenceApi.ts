import type { DatasetRecord, HealthResponse, Task } from '../model/types'

const API = '/api/v1'

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string; error?: string }
    throw new Error(payload.message || payload.error || `Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const intelligenceApi = {
  health: () => fetch(`${API}/health`).then(json<HealthResponse>),
  listTasks: () => fetch(`${API}/tasks`).then(json<Task[]>),
  getTask: (id: string) => fetch(`${API}/tasks/${id}`).then(json<Task>),
  createTask: (prompt: string) => fetch(`${API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  }).then(json<Task>),
  cancelTask: (id: string) => fetch(`${API}/tasks/${id}/cancel`, { method: 'POST' }).then(json<Task>),
  getRecords: (id: string, q = '', minQuality = 0) =>
    fetch(`${API}/tasks/${id}/records?q=${encodeURIComponent(q)}&minQuality=${minQuality}`).then(json<DatasetRecord[]>),
  eventsUrl: (id: string) => `${API}/tasks/${id}/events`,
  exportUrl: (id: string) => `${API}/tasks/${id}/export.csv`
}
