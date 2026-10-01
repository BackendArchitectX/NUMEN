export type TaskStatus = 'QUEUED' | 'PLANNING' | 'COLLECTING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'FAILED'

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export type WorkspaceView = 'research' | 'datasets' | 'sources' | 'history'

export type DatasetSortKey = 'title' | 'organization' | 'location' | 'qualityScore' | 'sourceName' | 'collectedAt'
export type SortDirection = 'asc' | 'desc'

export type TaskTimelineEventType = 'CREATED' | 'STATE_CHANGED' | 'RECOVERED' | 'COMPLETED' | 'CANCELLED' | 'FAILED'

export interface Task {
  id: string
  prompt: string
  demoMode: boolean
  sourceUrls: string[]
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

export interface DatasetPage {
  records: DatasetRecord[]
  totalMatched: number
  page: number
  pageSize: number
  totalPages: number
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


export interface DatasetSummary {
  totalRecords: number
  uniqueOrganizations: number
  uniqueLocations: number
  uniqueSources: number
  configuredSources: number
  failedSources: number
  evidenceLinkedRecords: number
  demoRecords: number
  latestCollectedAt?: string | null
  topLocations: Array<{ value: string; count: number }>
}

export interface SourceSummary {
  name: string
  url: string
  type: string
  records: number
  evidence: number
  latestCollectedAt?: string | null
  collectionStatus: 'SUCCEEDED' | 'FAILED' | 'NOT_ATTEMPTED' | 'DEMO' | string
  errorCode?: string | null
  errorMessage?: string | null
  lastAttemptedAt?: string | null
  demo: boolean
  configured: boolean
}
