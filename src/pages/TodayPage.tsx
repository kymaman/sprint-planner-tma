import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { currentWeek, currentDayIndex, tasksForDay, sprintProgress, habitStreak, dayOfWeek } from '@/model/logic';
import { ProgressRing } from '@/components/ProgressRing';

export function TodayPage() {
  const { t, lang } = useT();
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
  const doneCount = todayTasks.filter(t => t.done).length;

  const dateStr = today.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="page">
      {/* Header: дата + кольцо прогресса спринта */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 22 }}>
        <div style={{ minWidth: 0 }}>
          <div className="page-kicker">{t('weekOf', { week })} · {t('dayOf', { day: dayIdx + 1 })}</div>
          <h1 className="page-title" style={{ textTransform: 'capitalize' }}>{dateStr}</h1>
          <div className="page-sub">{t('sprintProgress')}</div>
        </div>
        <div className="ring-glow">
          <ProgressRing progress={progress} size={72} stroke={6} label={`${Math.round(progress * 100)}%`} />
        </div>
      </div>

      {/* Today's focus */}
      <div className="section-label cyan">
        ⚡ {t('todayTasks')}
        <span style={{ marginLeft: 'auto', letterSpacing: 0, color: 'var(--text-tertiary)' }}>{doneCount}/{todayTasks.length}</span>
      </div>

      {todayTasks.length === 0 && (
        <div className="card empty-state">🎉 {lang === 'ru' ? 'На сегодня задач нет' : 'No tasks for today'}</div>
      )}

      {todayTasks.map((task, i) => {
        const goal = state.sprint!.goals.find(g => g.id === task.goalId);
        return (
          <div
            key={task.id}
            className={`card tappable task-row ${task.isMain ? 'card-coral' : ''}`}
            onClick={() => toggleTask(task.id)}
          >
            <div className="goal-rail" style={{ background: goal?.color }} />
            <div className={`checkbox ${task.done ? 'checked' : ''}`}>
              {task.done && (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M13 4L6 11L3 8" stroke="#03130a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={`task-title ${task.done ? 'done' : ''}`}>{task.title}</div>
              {task.isMain && (
                <div style={{ marginTop: 6 }}>
                  <span className="badge badge-coral">★ {lang === 'ru' ? 'Главная задача' : 'Main task'}</span>
                </div>
              )}
            </div>

            <div className="task-num">{i + 1}</div>
          </div>
        );
      })}

      {/* Daily habits */}
      <div className="section-label green">✦ {t('habits')}</div>

      {state.sprint.goals.map(goal => {
        const todayStr = today.toISOString().split('T')[0];
        const isChecked = !!goal.habit.checks[todayStr];
        const streak = habitStreak(goal.habit, today);

        return (
          <div
            key={goal.id}
            className={`card habit-card ${isChecked ? 'checked' : ''}`}
            onClick={() => toggleHabit(goal.id, todayStr)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span className="habit-dot" style={{ background: goal.color, color: goal.color }} />
              <span style={{ fontSize: 15.5, fontWeight: 500 }}>{goal.habit.title}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {streak > 0 && <span className="badge badge-green">🔥 {streak}</span>}
              <div className={`checkbox ${isChecked ? 'checked' : ''}`}>
                {isChecked && (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M13 4L6 11L3 8" stroke="#03130a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
