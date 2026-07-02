import { useState } from 'react';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { currentWeek, weekStats, unfinishedTasks, carryOverTask } from '@/model/logic';

export function ReviewPage() {
  const { t } = useT();
  const { state, setWeekNote, updateSprint } = useSprintStore();
  const [selectedWeek, setSelectedWeek] = useState(
    state.sprint ? Math.max(1, currentWeek(state.sprint, new Date()) - 1) : 1
  );

  if (!state.sprint) {
    return null;
  }

  const stats = weekStats(state.sprint, selectedWeek);
  const unfinished = unfinishedTasks(state.sprint, selectedWeek);
  const note = state.sprint.weekNotes[selectedWeek] || '';

  const handleCarryOver = (taskId: string) => {
    const updated = carryOverTask(state.sprint!, taskId);
    updateSprint(updated);
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>{t('reviewTitle')}</h1>

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
              {week}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>{t('weekStats')}</h2>

        <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
          {t('completedTasks', { done: stats.done, total: stats.total })}
        </div>

        <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          By goal:
        </div>

        {stats.perGoal.map(g => {
          const goal = state.sprint!.goals.find(goal => goal.id === g.goalId);
          const percent = g.total > 0 ? (g.done / g.total) * 100 : 0;

          return (
            <div key={g.goalId} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: goal?.color,
                  }} />
                  <span>{g.goalTitle}</span>
                </div>
                <span className="text-secondary">{g.done}/{g.total}</span>
              </div>

              <div style={{
                width: '100%',
                height: '6px',
                background: 'var(--bg-primary)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: goal?.color,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Unfinished tasks */}
      {unfinished.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('unfinishedTasks')}</h2>

          {unfinished.map(task => {
            const goal = state.sprint!.goals.find(g => g.id === task.goalId);
            return (
              <div
                key={task.id}
                className="card"
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  borderLeft: `4px solid ${goal?.color || '#fff'}`,
                }}
              >
                <div style={{ flex: 1, fontSize: '16px' }}>{task.title}</div>

                <button
                  onClick={() => handleCarryOver(task.id)}
                  className="btn"
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    background: 'var(--accent-blue)',
                    color: 'white',
                  }}
                >
                  {t('carryOver')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Week note */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {t('weekNote')}
        </label>
        <textarea
          value={note}
          onChange={e => setWeekNote(selectedWeek, e.target.value)}
          placeholder={t('notePlaceholder')}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
            fontSize: '16px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Calendar sync placeholder */}
      <CalendarSection />
    </div>
  );
}

function CalendarSection() {
  const { t } = useT();

  return (
    <div className="card" style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-card)', opacity: 0.6 }}>
      <div style={{ fontSize: '18px', marginBottom: '8px' }}>{t('calendarSync')}</div>
      <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
        {t('comingSoon')}
      </div>
    </div>
  );
}
