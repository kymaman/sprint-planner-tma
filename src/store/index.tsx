import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { cloudStorage, retrieveLaunchParams } from '@tma.js/sdk-react';
import { saveSprintSnapshot, loadSprintSnapshot } from '@/api/calendar';
import type { Sprint, Goal, Task } from '@/model/types';

/** raw initData для авторизации на нашем API (undefined вне Telegram) */
function getInitDataRaw(): string | undefined {
  try {
    const raw = retrieveLaunchParams().initDataRaw;
    return typeof raw === 'string' ? raw : undefined;
  } catch {
    return undefined;
  }
}

type Action =
  | { type: 'SET_SPRINT'; sprint: Sprint | null }
  | { type: 'UPDATE_SPRINT'; sprint: Sprint }
  | { type: 'TOGGLE_TASK'; taskId: string }
  | { type: 'TOGGLE_HABIT'; goalId: string; date: string }
  | { type: 'UPDATE_TASK'; taskId: string; updates: Partial<Task> }
  | { type: 'SET_WEEK_NOTE'; week: number; note: string }
  | { type: 'ADD_TASK'; goalId: string; task: Task }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'UNDO_DELETE' }
  | { type: 'CLEAR_LAST_DELETED' };

interface State {
  sprint: Sprint | null;
  loading: boolean;
  /** последняя удалённая задача — для «Отменить» */
  lastDeleted: { goalId: string; task: Task; at: number } | null;
}

interface SprintStoreContextValue {
  state: State;
  setSprint: (sprint: Sprint | null) => void;
  updateSprint: (sprint: Sprint) => void;
  toggleTask: (taskId: string) => void;
  toggleHabit: (goalId: string, date: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setWeekNote: (week: number, note: string) => void;
  addTask: (goalId: string, task: Task) => void;
  deleteTask: (taskId: string) => void;
  undoDelete: () => void;
  clearLastDeleted: () => void;
}

const SprintStoreContext = createContext<SprintStoreContextValue | null>(null);

const STORAGE_KEY = 'sprint';
const DEBOUNCE_MS = 500;

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SPRINT':
      return { ...state, sprint: action.sprint, loading: false };

    case 'UPDATE_SPRINT':
      return { ...state, sprint: { ...action.sprint, updatedAt: new Date().toISOString() } };

    case 'TOGGLE_TASK': {
      if (!state.sprint) return state;

      const newGoals = state.sprint.goals.map(goal => ({
        ...goal,
        tasks: goal.tasks.map(task =>
          task.id === action.taskId
            ? {
                ...task,
                done: !task.done,
                doneAt: !task.done ? new Date().toISOString() : undefined,
              }
            : task
        ),
      })) as [Goal, Goal, Goal];

      return {
        ...state,
        sprint: {
          ...state.sprint,
          goals: newGoals,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    case 'TOGGLE_HABIT': {
      if (!state.sprint) return state;

      const newGoals = state.sprint.goals.map(goal => {
        if (goal.id === action.goalId) {
          const currentValue = goal.habit.checks[action.date];
          const newChecks = { ...goal.habit.checks };

          if (currentValue) {
            delete newChecks[action.date];
          } else {
            newChecks[action.date] = true;
          }

          return {
            ...goal,
            habit: {
              ...goal.habit,
              checks: newChecks,
            },
          };
        }
        return goal;
      }) as [Goal, Goal, Goal];

      return {
        ...state,
        sprint: {
          ...state.sprint,
          goals: newGoals,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    case 'UPDATE_TASK': {
      if (!state.sprint) return state;

      const newGoals = state.sprint.goals.map(goal => ({
        ...goal,
        tasks: goal.tasks.map(task =>
          task.id === action.taskId ? { ...task, ...action.updates } : task
        ),
      })) as [Goal, Goal, Goal];

      return {
        ...state,
        sprint: {
          ...state.sprint,
          goals: newGoals,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    case 'SET_WEEK_NOTE': {
      if (!state.sprint) return state;

      return {
        ...state,
        sprint: {
          ...state.sprint,
          weekNotes: {
            ...state.sprint.weekNotes,
            [action.week]: action.note,
          },
          updatedAt: new Date().toISOString(),
        },
      };
    }

    case 'ADD_TASK': {
      if (!state.sprint) return state;

      const newGoals = state.sprint.goals.map(goal => {
        if (goal.id === action.goalId) {
          return {
            ...goal,
            tasks: [...goal.tasks, action.task],
          };
        }
        return goal;
      }) as [Goal, Goal, Goal];

      return {
        ...state,
        sprint: {
          ...state.sprint,
          goals: newGoals,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    case 'DELETE_TASK': {
      if (!state.sprint) return state;

      let deleted: { goalId: string; task: Task; at: number } | null = null;
      const newGoals = state.sprint.goals.map(goal => ({
        ...goal,
        tasks: goal.tasks.filter(task => {
          if (task.id === action.taskId) {
            deleted = { goalId: goal.id, task, at: Date.now() };
            return false;
          }
          return true;
        }),
      })) as [Goal, Goal, Goal];

      return {
        ...state,
        lastDeleted: deleted,
        sprint: {
          ...state.sprint,
          goals: newGoals,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    case 'UNDO_DELETE': {
      if (!state.sprint || !state.lastDeleted) return state;
      const { goalId, task } = state.lastDeleted;

      const newGoals = state.sprint.goals.map(goal =>
        goal.id === goalId ? { ...goal, tasks: [...goal.tasks, task] } : goal
      ) as [Goal, Goal, Goal];

      return {
        ...state,
        lastDeleted: null,
        sprint: {
          ...state.sprint,
          goals: newGoals,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    case 'CLEAR_LAST_DELETED':
      return state.lastDeleted ? { ...state, lastDeleted: null } : state;

    default:
      return state;
  }
}

async function saveToCloud(sprint: Sprint | null) {
  if (!sprint) return;

  try {
    if (cloudStorage.isSupported()) {
      await cloudStorage.setItem(STORAGE_KEY, JSON.stringify(sprint));
    }
  } catch (e) {
    console.error('Failed to save to cloud storage:', e);
  }

  // Серверный снапшот — fire-and-forget (вне TG / без сети просто молча не сохранится)
  try {
    await saveSprintSnapshot(getInitDataRaw(), sprint);
  } catch {
    // не критично: localStorage/CloudStorage — основное хранилище
  }
}

function saveToLocalStorage(sprint: Sprint | null) {
  try {
    if (sprint) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sprint));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

/** Выбирает более свежий спринт по updatedAt */
function newer(a: Sprint | null, b: Sprint | null): Sprint | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(b.updatedAt) > new Date(a.updatedAt) ? b : a;
}

async function loadFromStorage(): Promise<Sprint | null> {
  try {
    // Load from localStorage first (instant)
    const localData = localStorage.getItem(STORAGE_KEY);
    let localSprint: Sprint | null = null;

    if (localData) {
      localSprint = JSON.parse(localData);
    }

    // Параллельно: CloudStorage TG + серверный снапшот (бот мог добавить задачи голосом).
    // Оба с таймаутом, чтобы UI никогда не завис.
    const cloudPromise: Promise<Sprint | null> = cloudStorage.isSupported()
      ? Promise.race([
          cloudStorage.getItem(STORAGE_KEY).then(d => (d ? (JSON.parse(d) as Sprint) : null)),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 2000)),
        ]).catch(() => null)
      : Promise.resolve(null);

    const serverPromise: Promise<Sprint | null> = Promise.race([
      loadSprintSnapshot(getInitDataRaw()).then(r => r.sprint),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 2500)),
    ]).catch(() => null);

    const [cloudSprint, serverSprint] = await Promise.all([cloudPromise, serverPromise]);

    return newer(newer(localSprint, cloudSprint), serverSprint);
  } catch (e) {
    console.error('Failed to load from storage:', e);
    return null;
  }
}

export function SprintStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    sprint: null,
    loading: true,
    lastDeleted: null,
  });

  // Load on mount
  useEffect(() => {
    loadFromStorage().then(sprint => {
      dispatch({ type: 'SET_SPRINT', sprint });
    });
  }, []);

  // Save to storage whenever sprint changes
  useEffect(() => {
    if (!state.loading && state.sprint) {
      // Immediately save to localStorage
      saveToLocalStorage(state.sprint);

      // Debounce cloud save
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      saveTimeout = setTimeout(() => {
        saveToCloud(state.sprint);
      }, DEBOUNCE_MS);
    }
  }, [state.sprint, state.loading]);

  const setSprint = useCallback((sprint: Sprint | null) => {
    dispatch({ type: 'SET_SPRINT', sprint });
    saveToLocalStorage(sprint);
    saveToCloud(sprint);
  }, []);

  const updateSprint = useCallback((sprint: Sprint) => {
    dispatch({ type: 'UPDATE_SPRINT', sprint });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    dispatch({ type: 'TOGGLE_TASK', taskId });
  }, []);

  const toggleHabit = useCallback((goalId: string, date: string) => {
    dispatch({ type: 'TOGGLE_HABIT', goalId, date });
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', taskId, updates });
  }, []);

  const setWeekNote = useCallback((week: number, note: string) => {
    dispatch({ type: 'SET_WEEK_NOTE', week, note });
  }, []);

  const addTask = useCallback((goalId: string, task: Task) => {
    dispatch({ type: 'ADD_TASK', goalId, task });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    dispatch({ type: 'DELETE_TASK', taskId });
  }, []);

  const undoDelete = useCallback(() => {
    dispatch({ type: 'UNDO_DELETE' });
  }, []);

  const clearLastDeleted = useCallback(() => {
    dispatch({ type: 'CLEAR_LAST_DELETED' });
  }, []);

  return (
    <SprintStoreContext.Provider
      value={{
        state,
        setSprint,
        updateSprint,
        toggleTask,
        toggleHabit,
        updateTask,
        setWeekNote,
        addTask,
        deleteTask,
        undoDelete,
        clearLastDeleted,
      }}
    >
      {children}
    </SprintStoreContext.Provider>
  );
}

export function useSprintStore() {
  const context = useContext(SprintStoreContext);
  if (!context) {
    throw new Error('useSprintStore must be used within SprintStoreProvider');
  }
  return context;
}
