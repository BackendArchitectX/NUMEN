import type { DatasetPage, DatasetRecord, DatasetSortKey, DatasetSummary, HealthResponse, SortDirection, SourceSummary, Task, TaskTimelineEvent } from '../model/types'

const API = '/api/v1'
const DEFAULT_TIMEOUT_MS = 10_000

interface ApiErrorPayload {
  message?: string
  error?: string
  code?: string
  correlationId?: string
}

async function request<T>(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers,
      signal: controller.signal
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as ApiErrorPayload
      const code = payload.code ? `[${payload.code}] ` : ''
      const suffix = payload.correlationId ? ` (ref: ${payload.correlationId})` : ''
      throw new Error(code + (payload.message || payload.error || `Request failed: ${response.status}`) + suffix)
    }

    return response.json() as Promise<T>
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Request timed out. Check that NUMEN is healthy and retry.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export const intelligenceApi = {
  health: () => request<HealthResponse>(`${API}/health`, {}, 4_000),
  listTasks: () => request<Task[]>(`${API}/tasks?limit=50`),
  getTask: (id: string) => request<Task>(`${API}/tasks/${id}`),
  getTimeline: (id: string) => request<TaskTimelineEvent[]>(`${API}/tasks/${id}/timeline`),
  getSummary: (id: string) => request<DatasetSummary>(`${API}/tasks/${id}/summary`),
  getSources: (id: string) => request<SourceSummary[]>(`${API}/tasks/${id}/sources`),
  createTask: (prompt: string, demoMode: boolean, sourceUrls: string[], idempotencyKey: string) => request<Task>(`${API}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ prompt, demoMode, sourceUrls })
  }),
  cancelTask: (id: string) => request<Task>(`${API}/tasks/${id}/cancel`, { method: 'POST' }),
  getRecords: (id: string, q = '', minQuality = 0) => {
    const params = new URLSearchParams({ q, minQuality: String(minQuality), limit: '500' })
    return request<DatasetRecord[]>(`${API}/tasks/${id}/records?${params.toString()}`)
  },
  getRecordPage: (
    id: string,
    q = '',
    minQuality = 0,
    page = 0,
    pageSize = 50,
    sortBy: DatasetSortKey = 'qualityScore',
    direction: SortDirection = 'desc'
  ) => {
    const params = new URLSearchParams({
      q,
      minQuality: String(minQuality),
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
      direction
    })
    return request<DatasetPage>(`${API}/tasks/${id}/records/page?${params.toString()}`)
  },
  eventsUrl: (id: string) => `${API}/tasks/${id}/events`,
  exportUrl: (id: string) => `${API}/tasks/${id}/export.csv`
}
