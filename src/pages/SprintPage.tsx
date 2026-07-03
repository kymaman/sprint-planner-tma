import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { goalProgress, habitStreak, currentWeek, sprintProgress } from '@/model/logic';
import { ProgressRing } from '@/components/ProgressRing';

export function SprintPage() {
  const { t, lang } = useT();
  const { state } = useSprintStore();

  if (!state.sprint) {
    return null;
  }

  const today = new Date();
  const week = currentWeek(state.sprint, today);
  const progress = sprintProgress(state.sprint);
  const weeksLeft = Math.max(0, 9 - week);
  const startDate = new Date(state.sprint.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 89);

  const fmt = (d: Date) =>
    d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div className="page-kicker">{lang === 'ru' ? '90-дневный путь' : '90-day journey'}</div>
        <h1 className="page-title">{state.sprint.title}</h1>
        <div className="page-sub">{fmt(startDate)} — {fmt(endDate)}</div>
      </div>

      {/* Hero: общий прогресс + таймлайн 9 недель */}
      <div className="card card-hero" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <ProgressRing
            progress={progress}
            size={92}
            stroke={7}
            label={`${Math.round(progress * 100)}%`}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 3 }}>
              {t('sprintProgress')}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              {lang === 'ru'
                ? `Осталось недель: ${weeksLeft}`
                : `${weeksLeft} weeks remaining`}
            </div>
            <span className="badge badge-cyan">{t('weekOf', { week })}</span>
          </div>
        </div>

        <div className="timeline" style={{ marginTop: 18 }}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map(w => (
            <div
              key={w}
              className={`timeline-seg ${w < week ? 'past' : w === week ? 'now' : ''}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>
          <span>W1</span><span>W5</span><span>W9</span>
        </div>
      </div>

      {/* 3 big goals */}
      <div className="section-label cyan">◎ {t('goals')}</div>

      {state.sprint.goals.map((goal, gi) => {
        const gp = goalProgress(goal);
        const doneTasks = goal.tasks.filter(x => x.done).length;
        const streak = habitStreak(goal.habit, today);

        return (
          <div key={goal.id} className="card" style={{ marginBottom: 12 }}>
            <div className="goal-rail" style={{ background: goal.color }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ProgressRing
                progress={gp}
                size={64}
                stroke={5}
                color={goal.color}
                label={`${Math.round(gp * 100)}%`}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 3 }}>
                  {lang === 'ru' ? `Цель ${gi + 1}` : `Goal ${gi + 1}`}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.25 }}>{goal.title}</h3>
                <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                  {t('goalProgress', { done: doneTasks })}
                </div>
              </div>
            </div>

            {/* Habit strip */}
            <div className="card-inset" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span className="habit-dot" style={{ background: goal.color, color: goal.color }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                    {lang === 'ru' ? 'Привычка' : 'Habit'}
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {goal.habit.title}
                  </div>
                </div>
              </div>

              {streak > 0 && <span className="badge badge-green">🔥 {streak}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
