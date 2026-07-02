import { useState } from 'react';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { currentWeek, mainTasks, canMarkAsMain, needsSplit } from '@/model/logic';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export function WeekPage() {
  const { t } = useT();
  const { state, updateTask, toggleTask } = useSprintStore();
  const [selectedWeek, setSelectedWeek] = useState(
    state.sprint ? currentWeek(state.sprint, new Date()) : 1
  );

  if (!state.sprint) {
    return null;
  }

  const weekMainTasks = mainTasks(state.sprint, selectedWeek);
  const canAddMain = canMarkAsMain(state.sprint, selectedWeek);

  // Get all tasks for this week
  const allTasks = state.sprint.goals.flatMap(g => g.tasks);
  const weekTasks = allTasks.filter(t => t.week === selectedWeek);
  const unscheduledTasks = weekTasks.filter(t => t.day === undefined);

  // Group tasks by day
  const tasksByDay: Record<number, typeof weekTasks> = {};
  for (let d = 0; d < 7; d++) {
    tasksByDay[d] = weekTasks.filter(t => t.day === d);
  }

  const toggleMain = (taskId: string, currentIsMain: boolean) => {
    if (currentIsMain) {
      updateTask(taskId, { isMain: false });
    } else if (canAddMain) {
      updateTask(taskId, { isMain: true });
    }
  };

  const moveTaskToDay = (taskId: string, day: number | undefined) => {
    updateTask(taskId, { day });
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* Week selector */}
      <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '8px', minWidth: 'min-content' }}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map(week => (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              className={selectedWeek === week ? 'btn btn-primary' : 'btn'}
              style={{
                minWidth: '60px',
                background: selectedWeek === week ? 'var(--accent-blue)' : 'var(--bg-card)',
                color: selectedWeek === week ? 'white' : 'var(--text-primary)',
              }}
            >
              {t('weekSelector', { week })}
            </button>
          ))}
        </div>
      </div>

      {/* Main tasks */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--accent-coral)' }}>
          ⭐ {t('mainTasks')}
        </h2>

        {weekMainTasks.map(task => {
          const goal = state.sprint!.goals.find(g => g.id === task.goalId);
          return (
            <div
              key={task.id}
              className="card glow-coral"
              style={{
                marginBottom: '12px',
                borderLeft: `4px solid ${goal?.color || '#fff'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div
                  className={`checkbox ${task.done ? 'checked' : ''}`}
                  onClick={() => toggleTask(task.id)}
                />
                <div style={{ flex: 1, fontSize: '16px' }}>{task.title}</div>
                <button
                  onClick={() => toggleMain(task.id, true)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: 'transparent',
                    border: '1px solid var(--accent-coral)',
                    borderRadius: '6px',
                    color: 'var(--accent-coral)',
                    cursor: 'pointer',
                  }}
                >
                  {t('unmarkAsMain')}
                </button>
              </div>

              {needsSplit(task) && (
                <div style={{ fontSize: '12px', color: 'var(--accent-coral)' }}>
                  ⚠️ {t('splitHint')}
                </div>
              )}
            </div>
          );
        })}

        {weekMainTasks.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
            {t('maxMainTasks')} (0/3)
          </div>
        )}
      </div>

      {/* Unscheduled tasks */}
      {unscheduledTasks.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            Unscheduled tasks
          </h3>

          {unscheduledTasks.map(task => {
            const goal = state.sprint!.goals.find(g => g.id === task.goalId);
            return (
              <div
                key={task.id}
                className="card"
                style={{
                  marginBottom: '12px',
                  borderLeft: `4px solid ${goal?.color || '#fff'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div
                    className={`checkbox ${task.done ? 'checked' : ''}`}
                    onClick={() => toggleTask(task.id)}
                  />
                  <div style={{ flex: 1, fontSize: '16px' }}>{task.title}</div>
                  {!task.isMain && canAddMain && (
                    <button
                      onClick={() => toggleMain(task.id, false)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {t('markAsMain')}
                    </button>
                  )}
                </div>

                <select
                  value=""
                  onChange={e => moveTaskToDay(task.id, e.target.value ? parseInt(e.target.value) : undefined)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">{t('moveToDay')}</option>
                  {DAYS.map((day, idx) => (
                    <option key={idx} value={idx}>
                      {t(day)}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks by day */}
      {DAYS.map((dayKey, dayIdx) => {
        const dayTasks = tasksByDay[dayIdx] || [];
        if (dayTasks.length === 0) return null;

        return (
          <div key={dayIdx} style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              {t(dayKey)}
            </h3>

            {dayTasks.map(task => {
              const goal = state.sprint!.goals.find(g => g.id === task.goalId);
              return (
                <div
                  key={task.id}
                  className="card"
                  style={{
                    marginBottom: '12px',
                    borderLeft: `4px solid ${goal?.color || '#fff'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className={`checkbox ${task.done ? 'checked' : ''}`}
                      onClick={() => toggleTask(task.id)}
                    />
                    <div style={{ flex: 1, fontSize: '16px' }}>{task.title}</div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
