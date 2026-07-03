import { useState, type ReactNode } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { currentWeek, mainTasks, canMarkAsMain, needsSplit } from '@/model/logic';
import { TaskModal, type TaskModalTarget } from '@/components/TaskModal';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function Pencil({ onClick, testId }: { onClick: () => void; testId?: string }) {
  return (
    <button
      className="icon-btn"
      data-testid={testId}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M11.3 2.3a1.6 1.6 0 0 1 2.3 2.3l-7.8 7.8-3 .8.8-3 7.7-7.9Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function SubBadge({ task }: { task: { note?: string; subtasks?: { done: boolean }[] } }) {
  const n = task.subtasks?.length ?? 0;
  if (!n && !task.note) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flex: 'none' }}>
      {n > 0 && (
        <span className="badge" style={{ background: 'rgba(62,224,255,0.12)', color: '#3ee0ff' }}>
          ☑ {task.subtasks!.filter(s => s.done).length}/{n}
        </span>
      )}
      {task.note && <span style={{ fontSize: 12, opacity: 0.6 }}>📝</span>}
    </span>
  );
}

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

/** Перетаскиваемая карточка: drag — только за хэндл ⠿ (не мешает скроллу и кликам) */
function DraggableCard({
  id,
  className,
  onClick,
  children,
}: {
  id: string;
  className: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      className={className}
      onClick={onClick}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.9 : 1,
        zIndex: isDragging ? 40 : undefined,
        position: 'relative',
        boxShadow: isDragging ? '0 8px 28px rgba(0,0,0,0.5)' : undefined,
      }}
    >
      <button
        {...listeners}
        {...attributes}
        aria-label="drag"
        data-testid={`drag-${id}`}
        style={{
          background: 'none', border: 'none', color: 'var(--text-tertiary)',
          cursor: 'grab', touchAction: 'none', padding: '6px 4px 6px 0',
          fontSize: 15, lineHeight: 1, flex: 'none', fontFamily: 'inherit',
        }}
      >
        ⠿
      </button>
      {children}
    </div>
  );
}

/** Дроп-зона (день или «Без дня») */
function DropZone({
  id,
  highlight,
  children,
}: {
  id: string;
  highlight: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      data-testid={`drop-${id}`}
      style={{
        borderRadius: 16,
        outline: isOver ? '1.5px dashed #3ee0ff' : highlight ? '1px dashed rgba(255,255,255,0.15)' : 'none',
        outlineOffset: 3,
        background: isOver ? 'rgba(62,224,255,0.05)' : undefined,
        transition: 'background 0.15s',
      }}
    >
      {children}
    </div>
  );
}

export function WeekPage() {
  const { t, lang } = useT();
  const { state, updateTask, toggleTask } = useSprintStore();
  // null = «следовать текущей неделе» (стор грузится асинхронно)
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  const [modal, setModal] = useState<TaskModalTarget | null>(null);
  const [dragging, setDragging] = useState(false);

  // Drag начинается после 6px — клики/тапы работают как раньше
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(false);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const taskId = String(e.active.id);
    const task = weekTasks.find(x => x.id === taskId);
    if (!task) return;

    if (overId === 'unscheduled') {
      if (task.day !== undefined) moveTaskToDay(taskId, undefined);
      return;
    }
    const d = parseInt(overId.replace('day-', ''), 10);
    if (Number.isNaN(d) || task.day === d) return;
    if ((tasksByDay[d]?.length ?? 0) >= 3) return; // лимит 3 задачи в день
    moveTaskToDay(taskId, d);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={() => setDragging(true)}
      onDragCancel={() => setDragging(false)}
      onDragEnd={onDragEnd}
    >
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
            <Pencil testId={`week-edit-${task.id}`} onClick={() => setModal({ taskId: task.id })} />
          </div>
        );
      })}

      {weekMainTasks.length === 0 && (
        <div className="card empty-state">{t('maxMainTasks')} · 0/3</div>
      )}

      {/* Unscheduled (дроп-зона при перетаскивании — снять день) */}
      {(unscheduledTasks.length > 0 || dragging) && (
        <DropZone id="unscheduled" highlight={dragging}>
          <div className="section-label">
            ◌ {lang === 'ru' ? 'Без дня' : 'Unscheduled'}
          </div>

          {unscheduledTasks.map(task => {
            const goal = state.sprint!.goals.find(g => g.id === task.goalId);
            return (
              <DraggableCard key={task.id} id={task.id} className="card task-row" >
                <div className="goal-rail" style={{ background: goal?.color }} />
                <Check done={task.done} onClick={() => toggleTask(task.id)} />
                <div className={`task-title ${task.done ? 'done' : ''}`} style={{ flex: 1, minWidth: 0 }}>
                  {task.title}
                </div>
                <SubBadge task={task} />
                <Pencil testId={`week-edit-${task.id}`} onClick={() => setModal({ taskId: task.id })} />
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
              </DraggableCard>
            );
          })}
          {unscheduledTasks.length === 0 && dragging && (
            <div className="card empty-state" style={{ padding: 14, fontSize: 13 }}>◌</div>
          )}
        </DropZone>
      )}

      {/* Breakdown по дням (все 7 — дроп-зоны; пустые видны при перетаскивании) */}
      {DAYS.map((dayKey, dayIdx) => {
        const dayTasks = tasksByDay[dayIdx] || [];
        if (dayTasks.length === 0 && !dragging) return null;
        const full = dayTasks.length >= 3;

        return (
          <DropZone key={dayIdx} id={`day-${dayIdx}`} highlight={dragging && !full}>
            <div className="section-label cyan">
              {t(dayKey)}
              {dragging && full && (
                <span style={{ marginLeft: 'auto', letterSpacing: 0, color: 'var(--coral)' }}>3/3</span>
              )}
            </div>

            {dayTasks.map(task => {
              const goal = state.sprint!.goals.find(g => g.id === task.goalId);
              return (
                <DraggableCard
                  key={task.id}
                  id={task.id}
                  className="card tappable task-row"
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="goal-rail" style={{ background: goal?.color }} />
                  <Check done={task.done} onClick={() => toggleTask(task.id)} />
                  <div className={`task-title ${task.done ? 'done' : ''}`} style={{ flex: 1 }}>
                    {task.title}
                  </div>
                  <SubBadge task={task} />
                  {task.isMain && <span style={{ color: 'var(--coral)', fontSize: 14 }}>★</span>}
                  <Pencil testId={`week-edit-${task.id}`} onClick={() => setModal({ taskId: task.id })} />
                </DraggableCard>
              );
            })}
            {dayTasks.length === 0 && dragging && (
              <div className="card empty-state" style={{ padding: 12, fontSize: 12.5, opacity: 0.6 }}>＋</div>
            )}
          </DropZone>
        );
      })}

      {/* Добавить задачу в эту неделю */}
      <button
        className="btn-ghost"
        data-testid="week-add-task"
        onClick={() => setModal({ defaults: { week: selectedWeek } })}
        style={{ width: '100%', marginTop: 14 }}
      >
        ➕ {t('addTask')}
      </button>

      {modal && <TaskModal target={modal} onClose={() => setModal(null)} />}
    </div>
    </DndContext>
  );
}
