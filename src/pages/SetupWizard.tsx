import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import type { Sprint, Goal, Habit, Task } from '@/model/types';

const GOAL_COLORS = ['#3ee0ff', '#ff7a63', '#37e58c'];
const TOTAL_STEPS = 6;

export function SetupWizard() {
  const { t, lang } = useT();
  const { setSprint } = useSprintStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const [goalTitles, setGoalTitles] = useState(['', '', '']);
  const [selectedColors, setSelectedColors] = useState([0, 1, 2]);

  const [tasksByGoal, setTasksByGoal] = useState<string[][]>([
    Array(9).fill(''),
    Array(9).fill(''),
    Array(9).fill(''),
  ]);

  const [habitTitles, setHabitTitles] = useState(['', '', '']);

  const handleFinish = () => {
    const goals: [Goal, Goal, Goal] = [0, 1, 2].map(i => {
      const habit: Habit = {
        id: `habit-${i}`,
        title: habitTitles[i] || `Habit ${i + 1}`,
        checks: {},
      };

      const tasks: Task[] = Array.from({ length: 9 }, (_, weekIdx) => ({
        id: `goal-${i}-task-${weekIdx}`,
        goalId: `goal-${i}`,
        title: tasksByGoal[i][weekIdx] || `Task for week ${weekIdx + 1}`,
        week: weekIdx + 1,
        done: false,
        isMain: false,
        estimatedDays: 1,
      }));

      return {
        id: `goal-${i}`,
        title: goalTitles[i] || `Goal ${i + 1}`,
        color: GOAL_COLORS[selectedColors[i]],
        habit,
        tasks,
      };
    }) as [Goal, Goal, Goal];

    const sprint: Sprint = {
      id: 'sprint-' + Date.now(),
      title: sprintName || 'My Sprint',
      startDate,
      goals,
      weekNotes: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSprint(sprint);
    navigate('/');
  };

  const navBtns = (onBack: (() => void) | null, onNext: () => void, nextLabel?: string) => (
    <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
      {onBack && (
        <button onClick={onBack} className="btn btn-ghost" style={{ flex: 1 }}>
          {t('prevStep')}
        </button>
      )}
      <button onClick={onNext} className="btn btn-primary" style={{ flex: 2 }}>
        {nextLabel || t('nextStep')}
      </button>
    </div>
  );

  // Шаги 3–5: задачи для целей 0–2
  const goalIdx = step - 3;

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div className="page-kicker">{lang === 'ru' ? '90-дневный спринт' : '90-day sprint'}</div>
        <h1 className="page-title">{t('setupTitle')}</h1>
        <div className="page-sub">{lang === 'ru' ? `Шаг ${step} из ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`}</div>
      </div>

      {/* Progress dots */}
      <div className="steps">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} className={`step-dot ${i < step ? 'done' : ''}`} />
        ))}
      </div>

      {/* Step 1: Sprint Info */}
      {step === 1 && (
        <div>
          <div className="section-label cyan">✦ {t('sprintInfo')}</div>

          <div className="card card-hero" style={{ marginBottom: 12 }}>
            <label className="input-label">{t('sprintName')}</label>
            <input
              type="text"
              value={sprintName}
              onChange={e => setSprintName(e.target.value)}
              placeholder={t('sprintNamePlaceholder')}
              className="input"
              style={{ marginBottom: 16 }}
            />

            <label className="input-label">{t('startDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="input"
            />
          </div>

          {navBtns(null, () => setStep(2))}
        </div>
      )}

      {/* Step 2: Goals */}
      {step === 2 && (
        <div>
          <div className="section-label cyan">◎ {t('goalsSetup')}</div>

          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ marginBottom: 12 }}>
              <div className="goal-rail" style={{ background: GOAL_COLORS[selectedColors[i]] }} />
              <label className="input-label">{t('goalTitle', { number: i + 1 })}</label>
              <input
                type="text"
                value={goalTitles[i]}
                onChange={e => {
                  const newTitles = [...goalTitles];
                  newTitles[i] = e.target.value;
                  setGoalTitles(newTitles);
                }}
                placeholder={t('goalPlaceholder')}
                className="input"
                style={{ marginBottom: 14 }}
              />

              <div style={{ display: 'flex', gap: 10 }}>
                {GOAL_COLORS.map((color, colorIdx) => (
                  <button
                    key={colorIdx}
                    onClick={() => {
                      const newColors = [...selectedColors];
                      newColors[i] = colorIdx;
                      setSelectedColors(newColors);
                    }}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: color,
                      border: selectedColors[i] === colorIdx ? '2.5px solid #fff' : '2.5px solid transparent',
                      boxShadow: selectedColors[i] === colorIdx ? `0 0 14px ${color}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          {navBtns(() => setStep(1), () => setStep(3))}
        </div>
      )}

      {/* Steps 3–5: Tasks per goal */}
      {step >= 3 && step <= 5 && (
        <div>
          <div className="section-label" style={{ color: GOAL_COLORS[selectedColors[goalIdx]] }}>
            ▸ {t('tasksSetup', { goal: goalTitles[goalIdx] || `${lang === 'ru' ? 'Цель' : 'Goal'} ${goalIdx + 1}` })}
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="goal-rail" style={{ background: GOAL_COLORS[selectedColors[goalIdx]] }} />
            {Array.from({ length: 9 }, (_, weekIdx) => (
              <div key={weekIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div className="task-num" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)', borderColor: 'var(--glass-border)' }}>
                  {weekIdx + 1}
                </div>
                <input
                  type="text"
                  value={tasksByGoal[goalIdx][weekIdx]}
                  onChange={e => {
                    const newTasks = tasksByGoal.map(arr => [...arr]);
                    newTasks[goalIdx][weekIdx] = e.target.value;
                    setTasksByGoal(newTasks);
                  }}
                  placeholder={t('taskPlaceholder', { week: weekIdx + 1 })}
                  className="input"
                  style={{ padding: '10px 12px', fontSize: 14.5 }}
                />
              </div>
            ))}
          </div>

          {navBtns(() => setStep(step - 1), () => setStep(step + 1))}
        </div>
      )}

      {/* Step 6: Habits */}
      {step === 6 && (
        <div>
          <div className="section-label green">✦ {t('habitsSetup')}</div>

          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ marginBottom: 12 }}>
              <div className="goal-rail" style={{ background: GOAL_COLORS[selectedColors[i]] }} />
              <label className="input-label">
                {t('habitFor', { goal: goalTitles[i] || `${lang === 'ru' ? 'Цель' : 'Goal'} ${i + 1}` })}
              </label>
              <input
                type="text"
                value={habitTitles[i]}
                onChange={e => {
                  const newHabits = [...habitTitles];
                  newHabits[i] = e.target.value;
                  setHabitTitles(newHabits);
                }}
                placeholder={t('habitPlaceholder')}
                className="input"
              />
            </div>
          ))}

          {navBtns(() => setStep(5), handleFinish, `🚀 ${t('finish')}`)}
        </div>
      )}
    </div>
  );
}
