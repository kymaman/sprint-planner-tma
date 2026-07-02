import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { currentWeek, currentDayIndex, tasksForDay, sprintProgress, habitStreak, dayOfWeek } from '@/model/logic';

export function TodayPage() {
  const { t } = useT();
  const { state, toggleTask, toggleHabit } = useSprintStore();

  if (!state.sprint) {
    return null;
  }

  const today = new Date();
  const week = currentWeek(state.sprint, today);
  const dayIdx = currentDayIndex(state.sprint, today);
  const day = dayOfWeek(today);
  const progress = sprintProgress(state.sprint);

  const todayTasks = tasksForDay(state.sprint, week, day);

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
          {t('weekOf', { week })} · {t('dayOf', { day: dayIdx + 1 })}
        </div>
        <h1 style={{ fontSize: '32px', margin: 0 }}>
          {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </h1>
      </div>

      {/* Sprint progress */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          {t('sprintProgress')}
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: 'var(--bg-primary)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {Math.round(progress * 100)}%
        </div>
      </div>

      {/* Today's tasks */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('todayTasks')}</h2>

        {todayTasks.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
            No tasks for today
          </div>
        )}

        {todayTasks.map(task => {
          const goal = state.sprint!.goals.find(g => g.id === task.goalId);
          return (
            <div
              key={task.id}
              className="card"
              style={{
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                borderLeft: `4px solid ${goal?.color || '#fff'}`,
              }}
              onClick={() => toggleTask(task.id)}
            >
              <div className={`checkbox ${task.done ? 'checked' : ''}`}>
                {task.done && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13 4L6 11L3 8"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', color: task.done ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                  {task.title}
                </div>
                {task.isMain && (
                  <div style={{ fontSize: '12px', color: 'var(--accent-coral)', marginTop: '4px' }}>
                    ⭐ Main task
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Habits */}
      <div>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('habits')}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {state.sprint.goals.map(goal => {
            const todayStr = today.toISOString().split('T')[0];
            const isChecked = goal.habit.checks[todayStr];
            const streak = habitStreak(goal.habit, today);

            return (
              <div
                key={goal.id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isChecked ? 'var(--accent-green)' : 'var(--bg-card)',
                  borderColor: isChecked ? 'var(--accent-green)' : 'var(--border-subtle)',
                }}
                onClick={() => toggleHabit(goal.id, todayStr)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: goal.color,
                  }} />
                  <span style={{ fontSize: '16px' }}>{goal.habit.title}</span>
                </div>

                {streak > 0 && (
                  <div style={{ fontSize: '14px', color: isChecked ? '#fff' : 'var(--text-secondary)' }}>
                    🔥 {streak}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
