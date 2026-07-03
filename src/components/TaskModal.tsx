import { useState } from 'react';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { mainTasks, tasksForDay } from '@/model/logic';
import type { Task } from '@/model/types';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export interface TaskModalTarget {
  /** id задачи — режим редактирования; undefined — создание */
  taskId?: string;
  /** дефолты для создания */
  defaults?: { week?: number; day?: number; goalId?: string };
}

interface Props {
  target: TaskModalTarget;
  onClose: () => void;
}

/**
 * Bottom sheet редактирования/создания задачи:
 * название, цель, неделя, день, «главная», удаление (с двойным тапом).
 */
export function TaskModal({ target, onClose }: Props) {
  const { t } = useT();
  const { state, updateTask, addTask, deleteTask } = useSprintStore();

  const sprint = state.sprint;
  const existing: Task | undefined = sprint?.goals
    .flatMap(g => g.tasks)
    .find(x => x.id === target.taskId);

  const isEdit = !!existing;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [goalId, setGoalId] = useState(existing?.goalId ?? target.defaults?.goalId ?? sprint?.goals[0]?.id ?? '');
  const [week, setWeek] = useState(existing?.week ?? target.defaults?.week ?? 1);
  const [day, setDay] = useState<number | undefined>(existing?.day ?? target.defaults?.day);
  const [isMain, setIsMain] = useState(existing?.isMain ?? false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!sprint) return null;

  const mainCount = mainTasks(sprint, week).filter(x => x.id !== existing?.id).length;
  const mainBlocked = !isMain && mainCount >= 3;

  const dayCount = day === undefined
    ? 0
    : tasksForDay(sprint, week, day).filter(x => x.id !== existing?.id).length;
  const dayBlocked = day !== undefined && dayCount >= 3;

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError(t('titleRequired'));
      return;
    }
    if (dayBlocked) {
      setError(t('maxTasksReached'));
      return;
    }

    if (isEdit && existing) {
      if (goalId === existing.goalId) {
        updateTask(existing.id, { title: trimmed, week, day, isMain });
      } else {
        // Перенос между целями: удалить и создать в новой цели
        deleteTask(existing.id);
        addTask(goalId, { ...existing, goalId, title: trimmed, week, day, isMain });
      }
    } else {
      addTask(goalId, {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        goalId,
        title: trimmed,
        week,
        day,
        done: false,
        isMain,
        estimatedDays: 1,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (existing) deleteTask(existing.id);
    onClose();
  };

  return (
    <div className="sheet-overlay" onClick={onClose} data-testid="task-modal">
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2 className="sheet-title">{isEdit ? `✏️ ${t('editTask')}` : `➕ ${t('newTask')}`}</h2>

        {/* Название */}
        <div className="input-label">{t('taskTitleLabel')}</div>
        <input
          className="input"
          data-testid="task-title-input"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(''); }}
          placeholder={t('taskPlaceholder', { week })}
          autoFocus={!isEdit}
        />

        {/* Цель */}
        <div className="input-label" style={{ marginTop: 14 }}>{t('goalLabel')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sprint.goals.map(g => (
            <button
              key={g.id}
              onClick={() => setGoalId(g.id)}
              className="chip"
              data-testid={`goal-pick-${g.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                textAlign: 'left', justifyContent: 'flex-start',
                borderColor: goalId === g.id ? g.color : undefined,
                background: goalId === g.id ? 'rgba(255,255,255,0.07)' : undefined,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 99, background: g.color, flex: 'none' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
            </button>
          ))}
        </div>

        {/* Неделя */}
        <div className="input-label" style={{ marginTop: 14 }}>{t('weekLabel')}</div>
        <div className="chip-row">
          {Array.from({ length: 9 }, (_, i) => i + 1).map(w => (
            <button key={w} className={`chip ${week === w ? 'active' : ''}`} onClick={() => setWeek(w)}>
              {w}
            </button>
          ))}
        </div>

        {/* День */}
        <div className="input-label" style={{ marginTop: 12 }}>{t('dayLabel')}</div>
        <div className="chip-row">
          <button
            className={`chip ${day === undefined ? 'active' : ''}`}
            onClick={() => { setDay(undefined); setError(''); }}
          >
            {t('noDay')}
          </button>
          {DAY_KEYS.map((k, i) => (
            <button
              key={k}
              className={`chip ${day === i ? 'active' : ''}`}
              onClick={() => { setDay(i); setError(''); }}
            >
              {t(k)}
            </button>
          ))}
        </div>

        {/* Главная задача */}
        <button
          onClick={() => !mainBlocked && setIsMain(!isMain)}
          className="card-inset"
          data-testid="main-toggle"
          style={{
            width: '100%', marginTop: 16, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', cursor: mainBlocked ? 'not-allowed' : 'pointer',
            border: isMain ? '1px solid rgba(255,122,99,0.5)' : '1px solid var(--glass-border)',
            fontFamily: 'inherit', color: 'inherit', fontSize: 14.5,
            opacity: mainBlocked ? 0.5 : 1,
          }}
        >
          <span>★ {t('mainTaskLabel')}</span>
          <span className={`checkbox ${isMain ? 'checked' : ''}`} style={{ width: 24, height: 24 }}>
            {isMain && (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M13 4L6 11L3 8" stroke="#03130a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </button>
        {mainBlocked && (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>{t('maxMainTasks')}</div>
        )}

        {error && (
          <div style={{ color: 'var(--coral)', fontSize: 13.5, marginTop: 12, fontWeight: 600 }} data-testid="task-modal-error">
            {error}
          </div>
        )}

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {isEdit && (
            <button
              onClick={handleDelete}
              className="btn-danger"
              data-testid="task-delete-btn"
              style={{ flex: 1, padding: '15px 8px', fontSize: 14 }}
            >
              {confirmDelete ? t('deleteConfirmTap') : `🗑 ${t('delete')}`}
            </button>
          )}
          <button onClick={handleSave} className="btn-primary" data-testid="task-save-btn" style={{ flex: 1.4 }}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
