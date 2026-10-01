export type TaskStatus = 'QUEUED' | 'PLANNING' | 'COLLECTING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'FAILED'

export type WorkspaceView = 'research' | 'datasets' | 'sources' | 'history'

export type TaskTimelineEventType = 'CREATED' | 'STATE_CHANGED' | 'RECOVERED' | 'COMPLETED' | 'CANCELLED' | 'FAILED'

export interface Task {
  id: string
  prompt: string
  status: TaskStatus
  stage: string
  progress: number
  planJson?: string
  recordCount: number
  averageQuality: number
  errorMessage?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface TaskTimelineEvent {
  id: string
  taskId: string
  eventType: TaskTimelineEventType
  status: TaskStatus
  stage: string
  progress: number
  detail?: string
  occurredAt: string
}

export interface DatasetRecord {
  id: string
  taskId: string
  title: string
  organization: string
  location: string
  website: string
  sourceUrl: string
  sourceName: string
  sourceType: string
  excerpt: string
  qualityScore: number
  fingerprint: string
  collectedAt: string
}

export interface HealthResponse {
  status: string
  service: string
  version: string
  time: string
}
