import { useState } from 'react';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import type { Goal } from '@/model/types';

const PALETTE = ['#3ee0ff', '#ff7a63', '#37e58c', '#c792ff', '#ffd166', '#ff5c8a'];

interface Props {
  goalId: string;
  onClose: () => void;
}

/** Bottom sheet редактирования цели: название, цвет, привычка */
export function GoalModal({ goalId, onClose }: Props) {
  const { t } = useT();
  const { state, updateSprint } = useSprintStore();

  const sprint = state.sprint;
  const goal = sprint?.goals.find(g => g.id === goalId);

  const [title, setTitle] = useState(goal?.title ?? '');
  const [color, setColor] = useState(goal?.color ?? PALETTE[0]);
  const [habitTitle, setHabitTitle] = useState(goal?.habit.title ?? '');
  const [error, setError] = useState('');

  if (!sprint || !goal) return null;

  const handleSave = () => {
    if (!title.trim()) {
      setError(t('titleRequired'));
      return;
    }

    const newGoals = sprint.goals.map(g =>
      g.id === goalId
        ? { ...g, title: title.trim(), color, habit: { ...g.habit, title: habitTitle.trim() || g.habit.title } }
        : g
    ) as [Goal, Goal, Goal];

    updateSprint({ ...sprint, goals: newGoals });
    onClose();
  };

  return (
    <div className="sheet-overlay" onClick={onClose} data-testid="goal-modal">
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2 className="sheet-title">✏️ {t('editGoal')}</h2>

        <div className="input-label">{t('goalNameLabel')}</div>
        <input
          className="input"
          data-testid="goal-title-input"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(''); }}
          placeholder={t('goalPlaceholder')}
        />

        <div className="input-label" style={{ marginTop: 14 }}>{t('colorLabel')}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PALETTE.map(c => (
            <button
              key={c}
              className={`color-dot ${color === c ? 'selected' : ''}`}
              style={{ background: c, boxShadow: color === c ? `0 0 14px ${c}88` : 'none' }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>

        <div className="input-label" style={{ marginTop: 14 }}>{t('habitNameLabel')}</div>
        <input
          className="input"
          data-testid="habit-title-input"
          value={habitTitle}
          onChange={e => setHabitTitle(e.target.value)}
          placeholder={t('habitPlaceholder')}
        />

        {error && (
          <div style={{ color: 'var(--coral)', fontSize: 13.5, marginTop: 12, fontWeight: 600 }}>{error}</div>
        )}

        <button onClick={handleSave} className="btn-primary" data-testid="goal-save-btn" style={{ marginTop: 18, width: '100%' }}>
          {t('save')}
        </button>
      </div>
    </div>
  );
}
