export interface Sprint {
  id: string;
  title: string;
  startDate: string; // ISO date
  goals: [Goal, Goal, Goal];
  weekNotes: Record<number, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  color: string;
  habit: Habit;
  tasks: Task[]; // should have 9 tasks
}

export interface Task {
  id: string;
  goalId: string;
  title: string;
  week: number; // 1..9
  day?: number; // 0..6 (Mon..Sun) optional until scheduled
  done: boolean;
  doneAt?: string;
  isMain: boolean;
  estimatedDays: number;
  carriedFrom?: number; // week number if carried over
}

export interface Habit {
  id: string;
  title: string;
  checks: Record<string, boolean>; // key = ISO date
}
