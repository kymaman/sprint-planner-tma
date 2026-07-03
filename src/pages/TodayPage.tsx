import { useState } from 'react';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { currentWeek, currentDayIndex, tasksForDay, sprintProgress, habitStreak, dayOfWeek } from '@/model/logic';
import { ProgressRing } from '@/components/ProgressRing';
import { TaskModal, type TaskModalTarget } from '@/components/TaskModal';

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M11.3 2.3a1.6 1.6 0 0 1 2.3 2.3l-7.8 7.8-3 .8.8-3 7.7-7.9Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TodayPage() {
  const { t, lang } = useT();
  const { state, toggleTask, toggleHabit, updateTask } = useSprintStore();
  const [modal, setModal] = useState<TaskModalTarget | null>(null);

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

  // Незавершённые задачи с прошлых недель (боль №1 планировщиков — ручной rollover)
  const overdue = state.sprint.goals
    .flatMap(g => g.tasks)
    .filter(x => !x.done && x.week < week);

  const rolloverAll = () => {
    overdue.forEach(x =>
      updateTask(x.id, { week, day: undefined, carriedFrom: x.carriedFrom ?? x.week })
    );
  };

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

      {/* Rollover незавершённых с прошлых недель */}
      {overdue.length > 0 && (
        <div className="card" data-testid="rollover-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⏮</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t('overdueTasks')}: {overdue.length}</div>
          </div>
          <button
            className="btn-ghost"
            data-testid="rollover-btn"
            onClick={rolloverAll}
            style={{ padding: '10px 12px', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            {t('moveAllToWeek', { week })}
          </button>
        </div>
      )}

      {/* Today's focus */}
      <div className="section-label cyan">
        ⚡ {t('todayTasks')}
        <span style={{ marginLeft: 'auto', letterSpacing: 0, color: 'var(--text-tertiary)' }}>{doneCount}/{todayTasks.length}</span>
        <button
          className="icon-btn"
          data-testid="today-add-task"
          aria-label={t('addTask')}
          onClick={() => setModal({ defaults: { week, day } })}
          style={{ width: 26, height: 26 }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
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
              {(task.isMain || task.note || (task.subtasks?.length ?? 0) > 0) && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {task.isMain && (
                    <span className="badge badge-coral">★ {lang === 'ru' ? 'Главная задача' : 'Main task'}</span>
                  )}
                  {(task.subtasks?.length ?? 0) > 0 && (
                    <span className="badge" data-testid={`subtask-badge-${task.id}`} style={{ background: 'rgba(62,224,255,0.12)', color: 'var(--cyan, #3ee0ff)' }}>
                      ☑ {task.subtasks!.filter(s => s.done).length}/{task.subtasks!.length}
                    </span>
                  )}
                  {task.note && <span className="badge" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-tertiary)' }}>📝</span>}
                </div>
              )}
            </div>

            <button
              className="icon-btn"
              data-testid={`task-edit-${task.id}`}
              aria-label={t('edit')}
              onClick={e => { e.stopPropagation(); setModal({ taskId: task.id }); }}
            >
              <PencilIcon />
            </button>
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

      {modal && <TaskModal target={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
