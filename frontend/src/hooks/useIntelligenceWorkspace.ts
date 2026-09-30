import { useEffect, useMemo, useState } from 'react'
import { examplePrompts } from '../model/prompts'
import type { DatasetRecord, Task } from '../model/types'
import { intelligenceApi } from '../services/intelligenceApi'

export function useIntelligenceWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [records, setRecords] = useState<DatasetRecord[]>([])
  const [prompt, setPrompt] = useState<string>(examplePrompts[0])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [minQuality, setMinQuality] = useState(0)
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(() => tasks.find(task => task.id === selectedId), [tasks, selectedId])

  const refresh = async () => {
    const next = await intelligenceApi.listTasks()
    setTasks(next)
    setSelectedId(current => current && next.some(task => task.id === current) ? current : next[0]?.id)
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
    void refresh().catch(cause => setError(cause instanceof Error ? cause.message : 'Failed to load workflows'))
    void ping()
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const poll = async () => {
      try {
        await Promise.all([refresh(), ping()])
      } catch {
        // SSE remains the primary progress path; polling is best-effort resilience.
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
      return
    }

    let active = true
    void intelligenceApi.getRecords(selectedId, debouncedQuery, minQuality)
      .then(rows => { if (active) setRecords(rows) })
      .catch(() => { if (active) setRecords([]) })

    return () => { active = false }
  }, [selectedId, debouncedQuery, minQuality, selected?.status])

  useEffect(() => {
    if (!selectedId) return
    const stream = new EventSource(intelligenceApi.eventsUrl(selectedId))
    stream.addEventListener('progress', () => void refresh().catch(() => undefined))
    return () => stream.close()
  }, [selectedId])

  const createTask = async () => {
    const normalized = prompt.trim()
    if (normalized.length < 10 || normalized.length > 4000) return

    setBusy(true)
    setError('')
    try {
      const task = await intelligenceApi.createTask(normalized)
      setSelectedId(task.id)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to create workflow')
    } finally {
      setBusy(false)
    }
  }

  const cancelTask = async (id: string) => {
    setError('')
    try {
      await intelligenceApi.cancelTask(id)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to cancel workflow')
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
    prompt,
    query,
    minQuality,
    busy,
    online,
    error,
    completed,
    totalRecords,
    avgQuality,
    setSelectedId,
    setPrompt,
    setQuery,
    setMinQuality,
    createTask,
    cancelTask,
    exportUrl: selectedId ? intelligenceApi.exportUrl(selectedId) : '#'
  }
}
