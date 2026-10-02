import { useEffect, useMemo, useRef, useState } from 'react'
import type { DatasetRecord, DatasetSortKey, DatasetSummary, LoadState, RunChangeSummary, SortDirection, SourceSummary, Task, TaskTimelineEvent } from '../model/types'
import { intelligenceApi } from '../services/intelligenceApi'

export function useIntelligenceWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [selectedSnapshot, setSelectedSnapshot] = useState<Task>()
  const [records, setRecords] = useState<DatasetRecord[]>([])
  const [recordsState, setRecordsState] = useState<LoadState>('idle')
  const [matchedRecords, setMatchedRecords] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSizeState] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState<DatasetSortKey>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [timeline, setTimeline] = useState<TaskTimelineEvent[]>([])
  const [summary, setSummary] = useState<DatasetSummary>()
  const [sources, setSources] = useState<SourceSummary[]>([])
  const [changes, setChanges] = useState<RunChangeSummary>()
  const [summaryState, setSummaryState] = useState<LoadState>('idle')
  const [sourcesState, setSourcesState] = useState<LoadState>('idle')
  const [changesState, setChangesState] = useState<LoadState>('idle')
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
  const intentEpoch = useRef(0)
  const refreshSequence = useRef(0)

  const selected = useMemo(() => tasks.find(task => task.id === selectedId) ?? (selectedSnapshot?.id === selectedId ? selectedSnapshot : undefined), [tasks, selectedId, selectedSnapshot])

  const refresh = async (signal?: AbortSignal) => {
    const sequence = ++refreshSequence.current
    const next = await intelligenceApi.listTasks(signal)
    if (sequence !== refreshSequence.current || signal?.aborted) return
    setTasks(next)
    if (selectedId && next.some(task => task.id === selectedId)) setSelectedSnapshot(undefined)
  }

  const ping = async (signal?: AbortSignal) => {
    try {
      const health = await intelligenceApi.health(signal)
      if (signal?.aborted) return
      setOnline(health.status === 'UP' && health.service === 'NUMEN')
    } catch {
      if (signal?.aborted) return
      setOnline(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Failed to load research')
    })
    void ping(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedId || tasks.some(task => task.id === selectedId)) {
      setSelectedSnapshot(undefined)
      return
    }

    let active = true
    const controller = new AbortController()
    void intelligenceApi.getTask(selectedId, controller.signal)
      .then(task => {
        if (!active) return
        setSelectedSnapshot(task)
      })
      .catch(cause => {
        if (!active || controller.signal.aborted) return
        setSelectedSnapshot(undefined)
        setError(cause instanceof Error ? cause.message : 'Selected research could not be loaded')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedId, tasks])

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
    const onResume = () => {
      if (document.visibilityState !== 'visible') return
      void refresh().catch(() => undefined)
      void ping()
    }
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('pageshow', onResume)
    return () => {
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('pageshow', onResume)
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
    const controller = new AbortController()
    setRecordsState('loading')

    void intelligenceApi.getRecordPage(selectedId, debouncedQuery, minQuality, page, pageSize, sortBy, sortDirection, controller.signal)
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

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedId, debouncedQuery, minQuality, page, pageSize, sortBy, sortDirection, selected?.status])

  useEffect(() => {
    if (!selectedId) {
      setTimeline([])
      return
    }

    let active = true
    const controller = new AbortController()
    void intelligenceApi.getTimeline(selectedId, controller.signal)
      .then(events => { if (active) setTimeline(events) })
      .catch(() => { if (active) setTimeline([]) })

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedId, selected?.status, selected?.stage, selected?.progress])

  useEffect(() => {
    if (!selectedId || selected?.status !== 'COMPLETED') {
      setSummary(undefined)
      setSummaryState('idle')
      return
    }

    let active = true
    const controller = new AbortController()
    setSummary(undefined)
    setSummaryState('loading')

    void intelligenceApi.getSummary(selectedId, controller.signal)
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

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedId, selected?.status])

  useEffect(() => {
    if (!selectedId || selected?.status !== 'COMPLETED') {
      setChanges(undefined)
      setChangesState('idle')
      return
    }

    let active = true
    const controller = new AbortController()
    setChanges(undefined)
    setChangesState('loading')

    void intelligenceApi.getChanges(selectedId, controller.signal)
      .then(nextChanges => {
        if (!active) return
        setChanges(nextChanges)
        setChangesState('ready')
      })
      .catch(() => {
        if (!active) return
        setChanges(undefined)
        setChangesState('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedId, selected?.status])

  useEffect(() => {
    if (!selectedId) {
      setSources([])
      setSourcesState('idle')
      return
    }

    let active = true
    let timer: number | undefined
    let controller = new AbortController()
    let sequence = 0
    const terminal = selected?.status === 'COMPLETED' || selected?.status === 'FAILED' || selected?.status === 'CANCELLED'

    const loadSources = async (initial: boolean) => {
      if (initial) {
        setSources([])
        setSourcesState('loading')
      }

      controller.abort()
      const requestController = new AbortController()
      controller = requestController
      const requestSequence = ++sequence

      try {
        const nextSources = await intelligenceApi.getSources(selectedId, requestController.signal)
        if (!active || requestSequence !== sequence) return
        setSources(nextSources)
        setSourcesState('ready')
      } catch {
        if (!active || requestController.signal.aborted || requestSequence !== sequence) return
        if (initial) setSources([])
        setSourcesState('error')
      } finally {
        if (active && requestSequence === sequence && !terminal) {
          timer = window.setTimeout(() => void loadSources(false), 1500)
        }
      }
    }

    void loadSources(true)

    return () => {
      active = false
      sequence++
      controller.abort()
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [selectedId, selected?.status])

  useEffect(() => {
    if (!selectedId || !selected || ['COMPLETED', 'FAILED', 'CANCELLED'].includes(selected.status)) return
    const stream = new EventSource(intelligenceApi.eventsUrl(selectedId))
    stream.addEventListener('progress', () => void refresh().catch(() => undefined))
    return () => stream.close()
  }, [selectedId, selected?.status])

  const selectTask = (id?: string) => {
    intentEpoch.current += 1
    setSelectedSnapshot(undefined)
    setSelectedId(id)
    setQuery('')
    setMinQuality(0)
    setPage(0)
    setSortBy('title')
    setSortDirection('asc')
    setError('')
  }

  const startNewResearch = () => {
    selectTask(undefined)
    setPrompt('')
    setDemoMode(false)
    setSourceUrls([])
  }

  const refineTask = (task: Task) => {
    selectTask(undefined)
    setPrompt(task.prompt)
    setDemoMode(task.demoMode)
    setSourceUrls(task.demoMode ? [] : task.sourceUrls)
  }

  const changePrompt = (value: string) => {
    intentEpoch.current += 1
    setPrompt(value)
  }

  const changeDemoMode = (enabled: boolean) => {
    intentEpoch.current += 1
    setDemoMode(enabled)
  }

  const changeSourceUrls = (urls: string[]) => {
    intentEpoch.current += 1
    setSourceUrls(urls)
  }

  const createTask = async () => {
    const normalized = prompt.trim()
    if (normalized.length < 10 || normalized.length > 4000 || submitting.current) return
    if (!demoMode && sourceUrls.length === 0) {
      setError('Add at least one public source URL or explicitly enable Demo mode before starting research.')
      return
    }

    const creationEpoch = intentEpoch.current
    submitting.current = true
    setBusy(true)
    setError('')
    const idempotencyKey = crypto.randomUUID()
    const submittedSources = [...sourceUrls]

    try {
      const task = await intelligenceApi.createTask(normalized, demoMode, submittedSources, idempotencyKey)
      await refresh()
      if (creationEpoch !== intentEpoch.current) return
      setSelectedId(task.id)
      setQuery('')
      setMinQuality(0)
      setPage(0)
      setSortBy('qualityScore')
      setSortDirection('desc')
      setPrompt('')
      setDemoMode(false)
      setSourceUrls([])
    } catch (cause) {
      if (creationEpoch === intentEpoch.current) {
        setError(cause instanceof Error ? cause.message : 'Failed to start research')
      }
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
    changes,
    summaryState,
    sourcesState,
    changesState,
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
    refineTask,
    setPrompt: changePrompt,
    setDemoMode: changeDemoMode,
    setSourceUrls: changeSourceUrls,
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
