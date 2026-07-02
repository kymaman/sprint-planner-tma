import { describe, it, expect } from 'vitest';
import {
  currentWeek,
  currentDayIndex,
  sprintProgress,
  goalProgress,
  habitStreak,
  canAddTaskToDay,
  mainTasks,
  canMarkAsMain,
  needsSplit,
  carryOverTask,
  weekStats,
} from './logic';
import type { Sprint, Goal, Task, Habit } from './types';

// Helper to create test sprint
function createTestSprint(startDate: string): Sprint {
  const habit1: Habit = {
    id: 'h1',
    title: 'Meditate',
    checks: {},
  };

  const habit2: Habit = {
    id: 'h2',
    title: 'Exercise',
    checks: {},
  };

  const habit3: Habit = {
    id: 'h3',
    title: 'Read',
    checks: {},
  };

  const goal1: Goal = {
    id: 'g1',
    title: 'Goal 1',
    color: '#4D9FFF',
    habit: habit1,
    tasks: Array.from({ length: 9 }, (_, i) => ({
      id: `g1-t${i + 1}`,
      goalId: 'g1',
      title: `Task ${i + 1}`,
      week: i + 1,
      done: false,
      isMain: false,
      estimatedDays: 1,
    })),
  };

  const goal2: Goal = {
    id: 'g2',
    title: 'Goal 2',
    color: '#FF6B6B',
    habit: habit2,
    tasks: Array.from({ length: 9 }, (_, i) => ({
      id: `g2-t${i + 1}`,
      goalId: 'g2',
      title: `Task ${i + 1}`,
      week: i + 1,
      done: false,
      isMain: false,
      estimatedDays: 1,
    })),
  };

  const goal3: Goal = {
    id: 'g3',
    title: 'Goal 3',
    color: '#3DDC97',
    habit: habit3,
    tasks: Array.from({ length: 9 }, (_, i) => ({
      id: `g3-t${i + 1}`,
      goalId: 'g3',
      title: `Task ${i + 1}`,
      week: i + 1,
      done: false,
      isMain: false,
      estimatedDays: 1,
    })),
  };

  return {
    id: 's1',
    title: 'Test Sprint',
    startDate,
    goals: [goal1, goal2, goal3],
    weekNotes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('currentWeek', () => {
  it('should return week 1 on day 0', () => {
    const sprint = createTestSprint('2024-01-01');
    const today = new Date('2024-01-01');
    expect(currentWeek(sprint, today)).toBe(1);
  });

  it('should return week 1 on day 9', () => {
    const sprint = createTestSprint('2024-01-01');
    const today = new Date('2024-01-10'); // day 9 (0-indexed)
    expect(currentWeek(sprint, today)).toBe(1);
  });

  it('should return week 2 on day 10', () => {
    const sprint = createTestSprint('2024-01-01');
    const today = new Date('2024-01-11'); // day 10 (0-indexed)
    expect(currentWeek(sprint, today)).toBe(2);
  });

  it('should return week 9 on day 89', () => {
    const sprint = createTestSprint('2024-01-01');
    const today = new Date('2024-03-31'); // 89 days later (90 total, 0-indexed)
    expect(currentWeek(sprint, today)).toBe(9);
  });

  it('should return week 9 after sprint end', () => {
    const sprint = createTestSprint('2024-01-01');
    const today = new Date('2024-04-15');
    expect(currentWeek(sprint, today)).toBe(9);
  });

  it('should return week 1 before sprint start', () => {
    const sprint = createTestSprint('2024-01-01');
    const today = new Date('2023-12-31');
    expect(currentWeek(sprint, today)).toBe(1);
  });
});

describe('currentDayIndex', () => {
  it('should return 0 on sprint start', () => {
    const sprint = createTestSprint('2024-01-01');
    const today = new Date('2024-01-01');
    expect(currentDayIndex(sprint, today)).toBe(0);
  });

  it('should return 89 on last day', () => {
    const sprint = createTestSprint('2024-01-01');
    const today = new Date('2024-03-31');
    expect(currentDayIndex(sprint, today)).toBe(89);
  });
});

describe('sprintProgress', () => {
  it('should return 0 with no completed tasks', () => {
    const sprint = createTestSprint('2024-01-01');
    expect(sprintProgress(sprint)).toBe(0);
  });

  it('should return 1 with all tasks completed', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals.forEach(goal => {
      goal.tasks.forEach(task => {
        task.done = true;
      });
    });
    expect(sprintProgress(sprint)).toBe(1);
  });

  it('should return 0.5 with half tasks completed', () => {
    const sprint = createTestSprint('2024-01-01');
    const allTasks = sprint.goals.flatMap(g => g.tasks);
    allTasks.slice(0, Math.floor(allTasks.length / 2)).forEach(task => {
      task.done = true;
    });
    expect(sprintProgress(sprint)).toBeCloseTo(0.5, 1);
  });
});

describe('goalProgress', () => {
  it('should return correct progress for goal', () => {
    const sprint = createTestSprint('2024-01-01');
    const goal = sprint.goals[0];
    goal.tasks[0].done = true;
    goal.tasks[1].done = true;
    goal.tasks[2].done = true;
    expect(goalProgress(goal)).toBeCloseTo(3 / 9, 2);
  });
});

describe('habitStreak', () => {
  it('should return 0 with no checks', () => {
    const habit: Habit = {
      id: 'h1',
      title: 'Test',
      checks: {},
    };
    expect(habitStreak(habit, new Date('2024-01-15'))).toBe(0);
  });

  it('should return 1 if only today is checked', () => {
    const habit: Habit = {
      id: 'h1',
      title: 'Test',
      checks: {
        '2024-01-15': true,
      },
    };
    expect(habitStreak(habit, new Date('2024-01-15'))).toBe(1);
  });

  it('should count consecutive days including today', () => {
    const habit: Habit = {
      id: 'h1',
      title: 'Test',
      checks: {
        '2024-01-13': true,
        '2024-01-14': true,
        '2024-01-15': true,
      },
    };
    expect(habitStreak(habit, new Date('2024-01-15'))).toBe(3);
  });

  it('should count streak from yesterday if today not checked', () => {
    const habit: Habit = {
      id: 'h1',
      title: 'Test',
      checks: {
        '2024-01-13': true,
        '2024-01-14': true,
      },
    };
    expect(habitStreak(habit, new Date('2024-01-15'))).toBe(2);
  });

  it('should stop at first gap', () => {
    const habit: Habit = {
      id: 'h1',
      title: 'Test',
      checks: {
        '2024-01-10': true,
        '2024-01-11': true,
        // gap
        '2024-01-13': true,
        '2024-01-14': true,
        '2024-01-15': true,
      },
    };
    expect(habitStreak(habit, new Date('2024-01-15'))).toBe(3);
  });
});

describe('canAddTaskToDay', () => {
  it('should allow adding when less than 3 tasks', () => {
    const sprint = createTestSprint('2024-01-01');
    expect(canAddTaskToDay(sprint, 1, 0)).toBe(true);
  });

  it('should not allow adding when 3 tasks exist', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals[0].tasks[0].day = 0;
    sprint.goals[1].tasks[0].day = 0;
    sprint.goals[2].tasks[0].day = 0;
    expect(canAddTaskToDay(sprint, 1, 0)).toBe(false);
  });
});

describe('mainTasks', () => {
  it('should return only main tasks for week', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals[0].tasks[0].isMain = true;
    sprint.goals[1].tasks[0].isMain = true;
    const mains = mainTasks(sprint, 1);
    expect(mains.length).toBe(2);
    expect(mains.every(t => t.isMain)).toBe(true);
  });

  it('should enforce max 3 main tasks', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals[0].tasks[0].isMain = true;
    sprint.goals[1].tasks[0].isMain = true;
    sprint.goals[2].tasks[0].isMain = true;
    const mains = mainTasks(sprint, 1);
    expect(mains.length).toBe(3);
  });
});

describe('canMarkAsMain', () => {
  it('should allow marking when less than 3 main tasks', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals[0].tasks[0].isMain = true;
    expect(canMarkAsMain(sprint, 1)).toBe(true);
  });

  it('should not allow when 3 main tasks exist', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals[0].tasks[0].isMain = true;
    sprint.goals[1].tasks[0].isMain = true;
    sprint.goals[2].tasks[0].isMain = true;
    expect(canMarkAsMain(sprint, 1)).toBe(false);
  });
});

describe('needsSplit', () => {
  it('should return false for tasks <= 3 days', () => {
    const task: Task = {
      id: 't1',
      goalId: 'g1',
      title: 'Test',
      week: 1,
      done: false,
      isMain: false,
      estimatedDays: 3,
    };
    expect(needsSplit(task)).toBe(false);
  });

  it('should return true for tasks > 3 days', () => {
    const task: Task = {
      id: 't1',
      goalId: 'g1',
      title: 'Test',
      week: 1,
      done: false,
      isMain: false,
      estimatedDays: 4,
    };
    expect(needsSplit(task)).toBe(true);
  });
});

describe('carryOverTask', () => {
  it('should move task to next week and reset done status', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals[0].tasks[0].done = true;
    sprint.goals[0].tasks[0].doneAt = '2024-01-15';
    sprint.goals[0].tasks[0].day = 3;

    const updated = carryOverTask(sprint, 'g1-t1');
    const task = updated.goals[0].tasks[0];

    expect(task.week).toBe(2);
    expect(task.done).toBe(false);
    expect(task.doneAt).toBeUndefined();
    expect(task.day).toBeUndefined();
    expect(task.carriedFrom).toBe(1);
  });

  it('should not exceed week 9', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals[0].tasks[8].week = 9;

    const updated = carryOverTask(sprint, 'g1-t9');
    const task = updated.goals[0].tasks[8];

    expect(task.week).toBe(9);
  });

  it('should preserve carriedFrom if already set', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals[0].tasks[1].carriedFrom = 1;
    sprint.goals[0].tasks[1].week = 2;

    const updated = carryOverTask(sprint, 'g1-t2');
    const task = updated.goals[0].tasks[1];

    expect(task.carriedFrom).toBe(1);
  });
});

describe('weekStats', () => {
  it('should calculate correct stats', () => {
    const sprint = createTestSprint('2024-01-01');
    sprint.goals[0].tasks[0].done = true;
    sprint.goals[1].tasks[0].done = true;

    const stats = weekStats(sprint, 1);
    expect(stats.total).toBe(3); // 3 goals × 1 task per goal for week 1
    expect(stats.done).toBe(2);
    expect(stats.perGoal.length).toBe(3);
    expect(stats.perGoal[0].done).toBe(1);
    expect(stats.perGoal[1].done).toBe(1);
    expect(stats.perGoal[2].done).toBe(0);
  });
});
