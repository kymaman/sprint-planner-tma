import type { Sprint } from './types';

const ARCHIVE_KEY = 'sprintArchive';

/** Архив завершённых спринтов в localStorage (новые — в начале) */
export function loadArchive(): Sprint[] {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushToArchive(sprint: Sprint): Sprint[] {
  const arch = loadArchive().filter(s => s.id !== sprint.id);
  const next = [sprint, ...arch].slice(0, 20); // не раздуваем localStorage
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to save archive:', e);
  }
  return next;
}

export function removeFromArchive(id: string): Sprint[] {
  const next = loadArchive().filter(s => s.id !== id);
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to save archive:', e);
  }
  return next;
}

export interface SprintStats {
  tasksDone: number;
  tasksTotal: number;
  bestStreak: number;
}

/** Статистика по спринту: задачи + лучший стрик привычек за всё время */
export function sprintStats(sprint: Sprint): SprintStats {
  const tasks = sprint.goals.flatMap(g => g.tasks);
  const tasksDone = tasks.filter(t => t.done).length;

  let bestStreak = 0;
  for (const goal of sprint.goals) {
    const dates = Object.keys(goal.habit.checks)
      .filter(d => goal.habit.checks[d])
      .sort();
    let streak = 0;
    let prev: number | null = null;
    for (const d of dates) {
      const ts = new Date(d + 'T00:00:00Z').getTime();
      streak = prev !== null && ts - prev === 86400000 ? streak + 1 : 1;
      prev = ts;
      if (streak > bestStreak) bestStreak = streak;
    }
  }

  return { tasksDone, tasksTotal: tasks.length, bestStreak };
}
