import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { cloudStorage } from '@tma.js/sdk-react';
import type { Sprint, Goal, Task } from '@/model/types';

type Action =
  | { type: 'SET_SPRINT'; sprint: Sprint | null }
  | { type: 'UPDATE_SPRINT'; sprint: Sprint }
  | { type: 'TOGGLE_TASK'; taskId: string }
  | { type: 'TOGGLE_HABIT'; goalId: string; date: string }
  | { type: 'UPDATE_TASK'; taskId: string; updates: Partial<Task> }
  | { type: 'SET_WEEK_NOTE'; week: number; note: string }
  | { type: 'ADD_TASK'; goalId: string; task: Task }
  | { type: 'DELETE_TASK'; taskId: string };

interface State {
  sprint: Sprint | null;
  loading: boolean;
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

      const newGoals = state.sprint.goals.map(goal => ({
        ...goal,
        tasks: goal.tasks.filter(task => task.id !== action.taskId),
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

async function loadFromStorage(): Promise<Sprint | null> {
  try {
    // Load from localStorage first (instant)
    const localData = localStorage.getItem(STORAGE_KEY);
    let localSprint: Sprint | null = null;

    if (localData) {
      localSprint = JSON.parse(localData);
    }

    // Try to load from cloud if supported
    if (cloudStorage.isSupported()) {
      try {
        const cloudData = await cloudStorage.getItem(STORAGE_KEY);
        if (cloudData) {
          const cloudSprint: Sprint = JSON.parse(cloudData);

          // Use cloud data if newer
          if (!localSprint || new Date(cloudSprint.updatedAt) > new Date(localSprint.updatedAt)) {
            return cloudSprint;
          }
        }
      } catch (e) {
        console.error('Failed to load from cloud storage:', e);
      }
    }

    return localSprint;
  } catch (e) {
    console.error('Failed to load from storage:', e);
    return null;
  }
}

export function SprintStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    sprint: null,
    loading: true,
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
