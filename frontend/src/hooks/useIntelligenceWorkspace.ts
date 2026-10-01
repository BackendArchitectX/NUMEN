import { useEffect, useMemo, useRef, useState } from 'react'
import type { DatasetRecord, DatasetSortKey, DatasetSummary, LoadState, SortDirection, SourceSummary, Task, TaskTimelineEvent } from '../model/types'
import { intelligenceApi } from '../services/intelligenceApi'

export function useIntelligenceWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [records, setRecords] = useState<DatasetRecord[]>([])
  const [recordsState, setRecordsState] = useState<LoadState>('idle')
  const [matchedRecords, setMatchedRecords] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSizeState] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState<DatasetSortKey>('qualityScore')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [timeline, setTimeline] = useState<TaskTimelineEvent[]>([])
  const [summary, setSummary] = useState<DatasetSummary>()
  const [sources, setSources] = useState<SourceSummary[]>([])
  const [summaryState, setSummaryState] = useState<LoadState>('idle')
  const [sourcesState, setSourcesState] = useState<LoadState>('idle')
  const [prompt, setPrompt] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [sourceUrls, setSourceUrls] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [minQuality, setMinQuality] = useState(0)
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const submitting = useRef(false)

  const selected = useMemo(() => tasks.find(task => task.id === selectedId), [tasks, selectedId])

  const refresh = async () => {
    const next = await intelligenceApi.listTasks()
    setTasks(next)
    setSelectedId(current => current && next.some(task => task.id === current) ? current : undefined)
  }

  const ping = async () => {
    try {
      const health = await intelligenceApi.health()
      setOnline(health.status === 'UP' && health.service === 'NUMEN')
    } catch {
      setOnline(false)
    }
  }

  useEffect(() => {
    void refresh().catch(cause => setError(cause instanceof Error ? cause.message : 'Failed to load research'))
    void ping()
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const poll = async () => {
      try {
        await Promise.all([refresh(), ping()])
      } catch {
        // SSE remains primary; polling converges state after stream or network interruption.
      } finally {
        if (!cancelled) timer = window.setTimeout(poll, 2500)
      }
    }

    timer = window.setTimeout(poll, 2500)
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!selectedId) {
      setRecords([])
      setMatchedRecords(0)
      setTotalPages(0)
      setRecordsState('idle')
      return
    }

    let active = true
    setRecordsState('loading')

    void intelligenceApi.getRecordPage(selectedId, debouncedQuery, minQuality, page, pageSize, sortBy, sortDirection)
      .then(result => {
        if (!active) return
        setRecords(result.records)
        setMatchedRecords(result.totalMatched)
        setTotalPages(result.totalPages)
        setRecordsState('ready')

        if (result.totalPages > 0 && result.page >= result.totalPages) {
          setPage(Math.max(0, result.totalPages - 1))
        }
      })
      .catch(() => {
        if (!active) return
        setRecords([])
        setMatchedRecords(0)
        setTotalPages(0)
        setRecordsState('error')
      })

    return () => { active = false }
  }, [selectedId, debouncedQuery, minQuality, page, pageSize, sortBy, sortDirection, selected?.status])

  useEffect(() => {
    if (!selectedId) {
      setTimeline([])
      return
    }

    let active = true
    void intelligenceApi.getTimeline(selectedId)
      .then(events => { if (active) setTimeline(events) })
      .catch(() => { if (active) setTimeline([]) })

    return () => { active = false }
  }, [selectedId, selected?.status, selected?.stage, selected?.progress])

  useEffect(() => {
    if (!selectedId || selected?.status !== 'COMPLETED') {
      setSummary(undefined)
      setSummaryState('idle')
      return
    }

    let active = true
    setSummary(undefined)
    setSummaryState('loading')

    void intelligenceApi.getSummary(selectedId)
      .then(nextSummary => {
        if (!active) return
        setSummary(nextSummary)
        setSummaryState('ready')
      })
      .catch(() => {
        if (!active) return
        setSummary(undefined)
        setSummaryState('error')
      })

    return () => { active = false }
  }, [selectedId, selected?.status])

  useEffect(() => {
    const terminal = selected?.status === 'COMPLETED' || selected?.status === 'FAILED' || selected?.status === 'CANCELLED'
    if (!selectedId || !terminal) {
      setSources([])
      setSourcesState('idle')
      return
    }

    let active = true
    setSources([])
    setSourcesState('loading')

    void intelligenceApi.getSources(selectedId)
      .then(nextSources => {
        if (!active) return
        setSources(nextSources)
        setSourcesState('ready')
      })
      .catch(() => {
        if (!active) return
        setSources([])
        setSourcesState('error')
      })

    return () => { active = false }
  }, [selectedId, selected?.status])

  useEffect(() => {
    if (!selectedId) return
    const stream = new EventSource(intelligenceApi.eventsUrl(selectedId))
    stream.addEventListener('progress', () => void refresh().catch(() => undefined))
    return () => stream.close()
  }, [selectedId])

  const selectTask = (id?: string) => {
    setSelectedId(id)
    setQuery('')
    setMinQuality(0)
    setPage(0)
    setSortBy('qualityScore')
    setSortDirection('desc')
    setError('')
  }

  const startNewResearch = () => {
    selectTask(undefined)
    setPrompt('')
    setDemoMode(false)
    setSourceUrls([])
  }

  const createTask = async () => {
    const normalized = prompt.trim()
    if (normalized.length < 10 || normalized.length > 4000 || submitting.current) return

    submitting.current = true
    setBusy(true)
    setError('')
    const idempotencyKey = crypto.randomUUID()

    try {
      const task = await intelligenceApi.createTask(normalized, demoMode, sourceUrls, idempotencyKey)
      setSelectedId(task.id)
      setQuery('')
      setMinQuality(0)
      setPage(0)
      setSortBy('qualityScore')
      setSortDirection('desc')
      setPrompt('')
      setDemoMode(false)
      setSourceUrls([])
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to start research')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  const changeQuery = (value: string) => {
    setQuery(value)
    setPage(0)
  }

  const changeMinQuality = (value: number) => {
    setMinQuality(value)
    setPage(0)
  }

  const changeSort = (key: DatasetSortKey) => {
    if (key === sortBy) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDirection(key === 'qualityScore' || key === 'collectedAt' ? 'desc' : 'asc')
    }
    setPage(0)
  }

  const changePageSize = (value: number) => {
    setPageSizeState(value)
    setPage(0)
  }

  const cancelTask = async (id: string) => {
    setError('')
    try {
      await intelligenceApi.cancelTask(id)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to cancel research')
    }
  }

  const completed = tasks.filter(task => task.status === 'COMPLETED').length
  const totalRecords = tasks.reduce((sum, task) => sum + (task.recordCount || 0), 0)
  const avgQuality = completed
    ? Math.round(tasks.filter(task => task.status === 'COMPLETED').reduce((sum, task) => sum + task.averageQuality, 0) / completed)
    : 0

  return {
    tasks,
    selected,
    selectedId,
    records,
    recordsState,
    matchedRecords,
    page,
    pageSize,
    totalPages,
    sortBy,
    sortDirection,
    timeline,
    summary,
    sources,
    summaryState,
    sourcesState,
    prompt,
    demoMode,
    sourceUrls,
    query,
    minQuality,
    busy,
    online,
    error,
    completed,
    totalRecords,
    avgQuality,
    selectTask,
    startNewResearch,
    setPrompt,
    setDemoMode,
    setSourceUrls,
    setQuery: changeQuery,
    setMinQuality: changeMinQuality,
    setPage,
    setPageSize: changePageSize,
    setSort: changeSort,
    createTask,
    cancelTask,
    exportUrl: selectedId ? intelligenceApi.exportUrl(selectedId) : '#'
  }
}
