import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { goalProgress, habitStreak, currentWeek } from '@/model/logic';

export function SprintPage() {
  const { t } = useT();
  const { state } = useSprintStore();

  if (!state.sprint) {
    return null;
  }

  const today = new Date();
  const week = currentWeek(state.sprint, today);
  const startDate = new Date(state.sprint.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 89);

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* Sprint header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>{state.sprint.title}</h1>
        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </div>
      </div>

      {/* Timeline */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
          {t('weekOf', { week })}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map(w => {
            const isComplete = w < week;
            const isCurrent = w === week;

            return (
              <div
                key={w}
                style={{
                  flex: 1,
                  height: '8px',
                  borderRadius: '4px',
                  background: isComplete
                    ? 'var(--accent-green)'
                    : isCurrent
                    ? 'var(--accent-blue)'
                    : 'var(--bg-primary)',
                  animation: isCurrent ? 'pulse 2s infinite' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Goals */}
      <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>{t('goals')}</h2>

      {state.sprint.goals.map(goal => {
        const progress = goalProgress(goal);
        const doneTasks = goal.tasks.filter(t => t.done).length;
        const streak = habitStreak(goal.habit, today);

        return (
          <div
            key={goal.id}
            className="card"
            style={{
              marginBottom: '16px',
              borderLeft: `4px solid ${goal.color}`,
            }}
          >
            {/* Goal title and progress */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
              {/* Progress ring */}
              <svg width="60" height="60" className="progress-ring">
                <circle
                  cx="30"
                  cy="30"
                  r="24"
                  fill="none"
                  stroke="var(--bg-primary)"
                  strokeWidth="4"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="24"
                  fill="none"
                  stroke={goal.color}
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 30 30)"
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
                <text
                  x="30"
                  y="30"
                  textAnchor="middle"
                  dy="6"
                  fontSize="14"
                  fontWeight="600"
                  fill="var(--text-primary)"
                >
                  {Math.round(progress * 100)}%
                </text>
              </svg>

              {/* Goal info */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{goal.title}</h3>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {t('goalProgress', { done: doneTasks })}
                </div>
              </div>
            </div>

            {/* Habit */}
            <div
              className="card"
              style={{
                background: 'var(--bg-primary)',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  Habit
                </div>
                <div style={{ fontSize: '16px' }}>{goal.habit.title}</div>
              </div>

              {streak > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    background: 'var(--accent-green)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  🔥 {streak}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
}
