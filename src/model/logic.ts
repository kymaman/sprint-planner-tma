import type { Sprint, Goal, Task, Habit } from './types';

/**
 * Get current week number (1..9) based on sprint start date and today
 */
export function currentWeek(sprint: Sprint, today: Date): number {
  const start = new Date(sprint.startDate);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 1;
  if (diffDays >= 90) return 9;

  // 0-9 days = week 1, 10-19 = week 2, etc.
  return Math.floor(diffDays / 10) + 1;
}

/**
 * Get current day index within the sprint (0..89)
 */
export function currentDayIndex(sprint: Sprint, today: Date): number {
  const start = new Date(sprint.startDate);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 0;
  if (diffDays >= 90) return 89;

  return diffDays;
}

/**
 * Get day of week (0=Mon, 6=Sun)
 */
export function dayOfWeek(date: Date): number {
  const day = date.getDay();
  // Convert Sunday=0 to Sunday=6, Monday=1 to Monday=0
  return day === 0 ? 6 : day - 1;
}

/**
 * Calculate sprint progress (0..1) based on completed tasks
 */
export function sprintProgress(sprint: Sprint): number {
  const allTasks = sprint.goals.flatMap(g => g.tasks);
  if (allTasks.length === 0) return 0;

  const doneTasks = allTasks.filter(t => t.done).length;
  return doneTasks / allTasks.length;
}

/**
 * Calculate goal progress (0..1) based on completed tasks
 */
export function goalProgress(goal: Goal): number {
  if (goal.tasks.length === 0) return 0;

  const doneTasks = goal.tasks.filter(t => t.done).length;
  return doneTasks / goal.tasks.length;
}

/**
 * Calculate habit streak (consecutive days including today or yesterday)
 */
export function habitStreak(habit: Habit, today: Date): number {
  const checks = habit.checks;
  let streak = 0;
  let currentDate = new Date(today);

  // If today is not checked, start from yesterday
  const todayStr = currentDate.toISOString().split('T')[0];
  if (!checks[todayStr]) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Count backwards
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (checks[dateStr]) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get tasks for a specific day
 */
export function tasksForDay(sprint: Sprint, week: number, day: number): Task[] {
  const allTasks = sprint.goals.flatMap(g => g.tasks);
  return allTasks.filter(t => t.week === week && t.day === day);
}

/**
 * Check if we can add another task to a specific day (max 3)
 */
export function canAddTaskToDay(sprint: Sprint, week: number, day: number): boolean {
  const tasks = tasksForDay(sprint, week, day);
  return tasks.length < 3;
}

/**
 * Get the 3 main tasks for a specific week
 */
export function mainTasks(sprint: Sprint, week: number): Task[] {
  const allTasks = sprint.goals.flatMap(g => g.tasks);
  return allTasks.filter(t => t.week === week && t.isMain);
}

/**
 * Check if there's room to mark another task as main (max 3 per week)
 */
export function canMarkAsMain(sprint: Sprint, week: number): boolean {
  const mains = mainTasks(sprint, week);
  return mains.length < 3;
}

/**
 * Check if a task needs to be split (estimated days > 3)
 */
export function needsSplit(task: Task): boolean {
  return task.estimatedDays > 3;
}

/**
 * Carry over a task to the next week
 */
export function carryOverTask(sprint: Sprint, taskId: string): Sprint {
  const newGoals = sprint.goals.map(goal => ({
    ...goal,
    tasks: goal.tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          week: Math.min(task.week + 1, 9),
          day: undefined,
          done: false,
          doneAt: undefined,
          carriedFrom: task.carriedFrom || task.week,
        };
      }
      return task;
    }),
  })) as [Goal, Goal, Goal];

  return {
    ...sprint,
    goals: newGoals,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get statistics for a specific week
 */
export function weekStats(sprint: Sprint, week: number): {
  total: number;
  done: number;
  perGoal: Array<{ goalId: string; goalTitle: string; done: number; total: number }>;
} {
  const allTasks = sprint.goals.flatMap(g => g.tasks);
  const weekTasks = allTasks.filter(t => t.week === week);
  const doneTasks = weekTasks.filter(t => t.done);

  const perGoal = sprint.goals.map(goal => {
    const goalWeekTasks = goal.tasks.filter(t => t.week === week);
    const goalDoneTasks = goalWeekTasks.filter(t => t.done);

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      done: goalDoneTasks.length,
      total: goalWeekTasks.length,
    };
  });

  return {
    total: weekTasks.length,
    done: doneTasks.length,
    perGoal,
  };
}

/**
 * Get unfinished tasks for a specific week
 */
export function unfinishedTasks(sprint: Sprint, week: number): Task[] {
  const allTasks = sprint.goals.flatMap(g => g.tasks);
  return allTasks.filter(t => t.week === week && !t.done);
}
