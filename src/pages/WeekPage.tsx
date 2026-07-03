import { useState } from 'react';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { currentWeek, mainTasks, canMarkAsMain, needsSplit } from '@/model/logic';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function Check({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <div className={`checkbox ${done ? 'checked' : ''}`} onClick={e => { e.stopPropagation(); onClick(); }}>
      {done && (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M13 4L6 11L3 8" stroke="#03130a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

export function WeekPage() {
  const { t, lang } = useT();
  const { state, updateTask, toggleTask } = useSprintStore();
  // null = «следовать текущей неделе» (стор грузится асинхронно)
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);

  if (!state.sprint) {
    return null;
  }

  const nowWeek = currentWeek(state.sprint, new Date());
  const selectedWeek = pickedWeek ?? nowWeek;
  const setSelectedWeek = (w: number) => setPickedWeek(w);
  const weekMainTasks = mainTasks(state.sprint, selectedWeek);
  const canAddMain = canMarkAsMain(state.sprint, selectedWeek);

  const allTasks = state.sprint.goals.flatMap(g => g.tasks);
  const weekTasks = allTasks.filter(x => x.week === selectedWeek);
  const unscheduledTasks = weekTasks.filter(x => x.day === undefined && !x.isMain);
  const doneCount = weekTasks.filter(x => x.done).length;

  const tasksByDay: Record<number, typeof weekTasks> = {};
  for (let d = 0; d < 7; d++) {
    tasksByDay[d] = weekTasks.filter(x => x.day === d);
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
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div className="page-kicker">{lang === 'ru' ? 'Фокус и исполнение' : 'Focus & execution'}</div>
        <h1 className="page-title">{t('weekSelector', { week: selectedWeek })}</h1>
        <div className="page-sub">
          {lang === 'ru' ? `Выполнено ${doneCount}/${weekTasks.length}` : `Done ${doneCount}/${weekTasks.length}`}
        </div>
      </div>

      {/* Week selector */}
      <div className="chip-row" style={{ marginBottom: 6 }}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map(week => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            className={`chip ${selectedWeek === week ? 'active' : ''}`}
          >
            {week === nowWeek ? '● ' : ''}{week}
          </button>
        ))}
      </div>

      {/* Weekly focus — 3 главные задачи (коралл) */}
      <div className="section-label coral">
        ★ {t('mainTasks')}
        <span style={{ marginLeft: 'auto', letterSpacing: 0 }}>{weekMainTasks.length}/3</span>
      </div>

      {weekMainTasks.map(task => {
        const goal = state.sprint!.goals.find(g => g.id === task.goalId);
        return (
          <div key={task.id} className="card card-coral task-row">
            <div className="goal-rail" style={{ background: goal?.color }} />
            <Check done={task.done} onClick={() => toggleTask(task.id)} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={`task-title ${task.done ? 'done' : ''}`} style={{ fontWeight: 600 }}>{task.title}</div>
              {needsSplit(task) && (
                <div style={{ fontSize: 12, color: 'var(--coral)', marginTop: 5 }}>⚠️ {t('splitHint')}</div>
              )}
            </div>

            <button
              onClick={() => toggleMain(task.id, true)}
              className="badge badge-coral"
              style={{ background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ★
            </button>
          </div>
        );
      })}

      {weekMainTasks.length === 0 && (
        <div className="card empty-state">{t('maxMainTasks')} · 0/3</div>
      )}

      {/* Unscheduled */}
      {unscheduledTasks.length > 0 && (
        <>
          <div className="section-label">
            ◌ {lang === 'ru' ? 'Без дня' : 'Unscheduled'}
          </div>

          {unscheduledTasks.map(task => {
            const goal = state.sprint!.goals.find(g => g.id === task.goalId);
            return (
              <div key={task.id} className="card task-row" style={{ flexWrap: 'wrap' }}>
                <div className="goal-rail" style={{ background: goal?.color }} />
                <Check done={task.done} onClick={() => toggleTask(task.id)} />
                <div className={`task-title ${task.done ? 'done' : ''}`} style={{ flex: 1, minWidth: 0 }}>
                  {task.title}
                </div>
                {!task.isMain && canAddMain && (
                  <button
                    onClick={() => toggleMain(task.id, false)}
                    className="badge"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--glass-border-strong)',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    ☆ {lang === 'ru' ? 'в главные' : 'main'}
                  </button>
                )}

                <select
                  value=""
                  onChange={e => moveTaskToDay(task.id, e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input"
                  style={{ width: '100%', marginTop: 4, padding: '10px 12px', fontSize: 14 }}
                >
                  <option value="">{t('moveToDay')}…</option>
                  {DAYS.map((day, idx) => (
                    <option key={idx} value={idx}>{t(day)}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </>
      )}

      {/* Breakdown по дням */}
      {DAYS.map((dayKey, dayIdx) => {
        const dayTasks = tasksByDay[dayIdx] || [];
        if (dayTasks.length === 0) return null;

        return (
          <div key={dayIdx}>
            <div className="section-label cyan">{t(dayKey)}</div>

            {dayTasks.map(task => {
              const goal = state.sprint!.goals.find(g => g.id === task.goalId);
              return (
                <div
                  key={task.id}
                  className="card tappable task-row"
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="goal-rail" style={{ background: goal?.color }} />
                  <Check done={task.done} onClick={() => toggleTask(task.id)} />
                  <div className={`task-title ${task.done ? 'done' : ''}`} style={{ flex: 1 }}>
                    {task.title}
                  </div>
                  {task.isMain && <span style={{ color: 'var(--coral)', fontSize: 14 }}>★</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
