import { useEffect } from 'react';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';

/** Тост «Задача удалена — Отменить», авто-скрытие через 6 секунд */
export function UndoToast() {
  const { t } = useT();
  const { state, undoDelete, clearLastDeleted } = useSprintStore();
  const deleted = state.lastDeleted;

  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => clearLastDeleted(), 6000);
    return () => clearTimeout(timer);
  }, [deleted, clearLastDeleted]);

  if (!deleted) return null;

  return (
    <div className="toast" data-testid="undo-toast">
      <span>🗑 {t('taskDeleted')}</span>
      <button className="toast-action" onClick={undoDelete} data-testid="undo-btn">
        {t('undo')}
      </button>
    </div>
  );
}
