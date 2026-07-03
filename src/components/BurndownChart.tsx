import { useT } from '@/i18n';
import { currentWeek } from '@/model/logic';
import type { Sprint } from '@/model/types';

/**
 * Burndown спринта (SVG): сколько задач осталось по неделям.
 * План — равномерное сгорание от total до 0 за 9 недель.
 * Факт — остаток на конец каждой прошедшей недели (done задачи, приписанные к неделе ≤ w).
 */
export function BurndownChart({ sprint }: { sprint: Sprint }) {
  const { t } = useT();

  const tasks = sprint.goals.flatMap(g => g.tasks);
  const total = tasks.length;
  if (total === 0) return null;

  const nowWeek = currentWeek(sprint, new Date());

  // Остаток на конец недели w (w=0 — старт)
  const remainingAt = (w: number) =>
    total - tasks.filter(x => x.done && x.week <= w).length;

  const W = 320;
  const H = 170;
  const padL = 30;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const x = (w: number) => padL + (w / 9) * plotW;
  const y = (rem: number) => padT + (1 - rem / total) * plotH;

  const factPoints = Array.from({ length: nowWeek + 1 }, (_, w) => `${x(w)},${y(remainingAt(w))}`).join(' ');
  const remNow = remainingAt(nowWeek);

  return (
    <div className="card" data-testid="burndown-chart" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>📉 {t('burndownTitle')}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          {t('burndownLeft')}: <b style={{ color: 'var(--cyan, #3ee0ff)' }}>{remNow}</b>/{total}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Сетка + подписи недель */}
        {Array.from({ length: 10 }, (_, w) => (
          <g key={w}>
            <line x1={x(w)} y1={padT} x2={x(w)} y2={padT + plotH} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={x(w)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">
              {w === 0 ? '' : w}
            </text>
          </g>
        ))}
        {/* Ось Y: total и 0 */}
        <text x={padL - 6} y={y(total) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)">{total}</text>
        <text x={padL - 6} y={y(0) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)">0</text>
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        {/* Отметка текущей недели */}
        <line x1={x(nowWeek)} y1={padT} x2={x(nowWeek)} y2={padT + plotH} stroke="rgba(255,122,99,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* План (пунктир) */}
        <line x1={x(0)} y1={y(total)} x2={x(9)} y2={y(0)} stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="5 4" />

        {/* Факт */}
        <polyline
          points={factPoints}
          fill="none"
          stroke="#3ee0ff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(62,224,255,0.5))' }}
        />
        {/* Точка «сейчас» */}
        <circle cx={x(nowWeek)} cy={y(remNow)} r="4" fill="#3ee0ff" style={{ filter: 'drop-shadow(0 0 8px rgba(62,224,255,0.8))' }} />
      </svg>

      {/* Легенда */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, borderTop: '2px dashed rgba(255,255,255,0.4)' }} /> {t('burndownPlan')}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, borderTop: '2.5px solid #3ee0ff' }} /> {t('burndownFact')}
        </span>
      </div>
    </div>
  );
}
