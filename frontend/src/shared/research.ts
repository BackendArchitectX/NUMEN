import type { Task } from '../model/types'

export interface ResearchGroup {
  latest: Task
  runs: number
}

export function groupResearchTasks(tasks: Task[]): ResearchGroup[] {
  const ordered = [...tasks].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
  const groups = new Map<string, ResearchGroup>()

  for (const task of ordered) {
    const key = normalizeResearchQuestion(task.prompt)
    const existing = groups.get(key)
    if (existing) {
      existing.runs += 1
      continue
    }
    groups.set(key, { latest: task, runs: 1 })
  }

  return [...groups.values()]
}

function normalizeResearchQuestion(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}
