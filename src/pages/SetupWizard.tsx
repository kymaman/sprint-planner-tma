import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import type { Sprint, Goal, Habit, Task } from '@/model/types';

const GOAL_COLORS = ['#4D9FFF', '#FF6B6B', '#3DDC97'];

export function SetupWizard() {
  const { t } = useT();
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

  return (
    <div style={{
      minHeight: '100vh',
      padding: '20px',
      paddingBottom: '100px',
      background: 'var(--bg-primary)'
    }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>{t('setupTitle')}</h1>

      {/* Step 1: Sprint Info */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            {t('sprintInfo')}
          </h2>

          <div className="card" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {t('sprintName')}
            </label>
            <input
              type="text"
              value={sprintName}
              onChange={e => setSprintName(e.target.value)}
              placeholder={t('sprintNamePlaceholder')}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '16px',
              }}
            />
          </div>

          <div className="card" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {t('startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '16px',
              }}
            />
          </div>

          <button onClick={() => setStep(2)} className="btn btn-primary" style={{ width: '100%' }}>
            {t('nextStep')}
          </button>
        </div>
      )}

      {/* Step 2: Goals */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            {t('goalsSetup')}
          </h2>

          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {t('goalTitle', { number: i + 1 })}
              </label>
              <input
                type="text"
                value={goalTitles[i]}
                onChange={e => {
                  const newTitles = [...goalTitles];
                  newTitles[i] = e.target.value;
                  setGoalTitles(newTitles);
                }}
                placeholder={t('goalPlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  marginBottom: '12px',
                }}
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                {GOAL_COLORS.map((color, colorIdx) => (
                  <button
                    key={colorIdx}
                    onClick={() => {
                      const newColors = [...selectedColors];
                      newColors[i] = colorIdx;
                      setSelectedColors(newColors);
                    }}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: color,
                      border: selectedColors[i] === colorIdx ? '3px solid white' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setStep(1)} className="btn" style={{ flex: 1, background: 'var(--bg-card)' }}>
              {t('prevStep')}
            </button>
            <button onClick={() => setStep(3)} className="btn btn-primary" style={{ flex: 1 }}>
              {t('nextStep')}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Tasks */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            {t('tasksSetup', { goal: goalTitles[0] || 'Goal 1' })}
          </h2>

          <div className="card" style={{ marginBottom: '24px' }}>
            {Array.from({ length: 9 }, (_, weekIdx) => (
              <div key={weekIdx} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {t('taskForWeek', { week: weekIdx + 1 })}
                </label>
                <input
                  type="text"
                  value={tasksByGoal[0][weekIdx]}
                  onChange={e => {
                    const newTasks = [...tasksByGoal];
                    newTasks[0][weekIdx] = e.target.value;
                    setTasksByGoal(newTasks);
                  }}
                  placeholder={t('taskPlaceholder', { week: weekIdx + 1 })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setStep(2)} className="btn" style={{ flex: 1, background: 'var(--bg-card)' }}>
              {t('prevStep')}
            </button>
            <button onClick={() => setStep(4)} className="btn btn-primary" style={{ flex: 1 }}>
              {t('nextStep')}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: More tasks */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            {t('tasksSetup', { goal: goalTitles[1] || 'Goal 2' })}
          </h2>

          <div className="card" style={{ marginBottom: '24px' }}>
            {Array.from({ length: 9 }, (_, weekIdx) => (
              <div key={weekIdx} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {t('taskForWeek', { week: weekIdx + 1 })}
                </label>
                <input
                  type="text"
                  value={tasksByGoal[1][weekIdx]}
                  onChange={e => {
                    const newTasks = [...tasksByGoal];
                    newTasks[1][weekIdx] = e.target.value;
                    setTasksByGoal(newTasks);
                  }}
                  placeholder={t('taskPlaceholder', { week: weekIdx + 1 })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setStep(3)} className="btn" style={{ flex: 1, background: 'var(--bg-card)' }}>
              {t('prevStep')}
            </button>
            <button onClick={() => setStep(5)} className="btn btn-primary" style={{ flex: 1 }}>
              {t('nextStep')}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: More tasks */}
      {step === 5 && (
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            {t('tasksSetup', { goal: goalTitles[2] || 'Goal 3' })}
          </h2>

          <div className="card" style={{ marginBottom: '24px' }}>
            {Array.from({ length: 9 }, (_, weekIdx) => (
              <div key={weekIdx} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {t('taskForWeek', { week: weekIdx + 1 })}
                </label>
                <input
                  type="text"
                  value={tasksByGoal[2][weekIdx]}
                  onChange={e => {
                    const newTasks = [...tasksByGoal];
                    newTasks[2][weekIdx] = e.target.value;
                    setTasksByGoal(newTasks);
                  }}
                  placeholder={t('taskPlaceholder', { week: weekIdx + 1 })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setStep(4)} className="btn" style={{ flex: 1, background: 'var(--bg-card)' }}>
              {t('prevStep')}
            </button>
            <button onClick={() => setStep(6)} className="btn btn-primary" style={{ flex: 1 }}>
              {t('nextStep')}
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Habits */}
      {step === 6 && (
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            {t('habitsSetup')}
          </h2>

          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {t('habitFor', { goal: goalTitles[i] || `Goal ${i + 1}` })}
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
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                }}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setStep(5)} className="btn" style={{ flex: 1, background: 'var(--bg-card)' }}>
              {t('prevStep')}
            </button>
            <button onClick={handleFinish} className="btn btn-primary" style={{ flex: 1 }}>
              {t('finish')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
