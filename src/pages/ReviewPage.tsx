import { useState, useEffect } from 'react';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { currentWeek, weekStats, unfinishedTasks, carryOverTask } from '@/model/logic';
import { BurndownChart } from '@/components/BurndownChart';
import { useRawInitData } from '@tma.js/sdk-react';
import {
  getOAuthStatus,
  getOAuthUrl,
  submitOAuthCode,
  syncSprint,
  getEvents,
  CalendarAPIError,
  type CalendarEvent,
} from '@/api/calendar';

export function ReviewPage() {
  const { t, lang } = useT();
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
  const habitsDone = state.sprint.goals.reduce((acc, g) => acc + Object.values(g.habit.checks).filter(Boolean).length, 0);

  const handleCarryOver = (taskId: string) => {
    const updated = carryOverTask(state.sprint!, taskId);
    updateSprint(updated);
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div className="page-kicker">{lang === 'ru' ? 'Итоги и синк' : 'Results & sync'}</div>
        <h1 className="page-title">{t('reviewTitle')}</h1>
      </div>

      {/* Week selector */}
      <div className="chip-row" style={{ marginBottom: 6 }}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map(week => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            className={`chip ${selectedWeek === week ? 'active' : ''}`}
          >
            {week}
          </button>
        ))}
      </div>

      {/* Weekly performance */}
      <div className="section-label cyan">▮ {t('weekStats')}</div>

      <div className="card card-hero" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <div className="card-inset" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
              {lang === 'ru' ? 'Задачи' : 'Tasks'}
            </div>
            <div className="stat-big">
              <span style={{ color: 'var(--cyan)', textShadow: '0 0 16px rgba(62,224,255,0.5)' }}>{stats.done}</span>
              <span className="of">/{stats.total}</span>
            </div>
          </div>
          <div className="card-inset" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
              {lang === 'ru' ? 'Привычки' : 'Habits'}
            </div>
            <div className="stat-big">
              <span style={{ color: 'var(--green)', textShadow: '0 0 16px rgba(55,229,140,0.5)' }}>{habitsDone}</span>
            </div>
          </div>
        </div>

        {stats.perGoal.map(g => {
          const goal = state.sprint!.goals.find(goal => goal.id === g.goalId);
          const percent = g.total > 0 ? (g.done / g.total) * 100 : 0;

          return (
            <div key={g.goalId} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 13.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span className="habit-dot" style={{ background: goal?.color, color: goal?.color, width: 8, height: 8 }} />
                  <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.goalTitle}</span>
                </div>
                <span className="text-tertiary" style={{ fontWeight: 600 }}>{g.done}/{g.total}</span>
              </div>

              <div className="bar-track" style={{ height: 6 }}>
                <div
                  className="bar-fill"
                  style={{
                    width: `${percent}%`,
                    background: goal?.color,
                    boxShadow: `0 0 10px ${goal?.color}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Burndown спринта */}
      <BurndownChart sprint={state.sprint} />

      {/* Unfinished tasks */}
      {unfinished.length > 0 && (
        <>
          <div className="section-label coral">↻ {t('unfinishedTasks')}</div>

          {unfinished.map(task => {
            const goal = state.sprint!.goals.find(g => g.id === task.goalId);
            return (
              <div key={task.id} className="card task-row">
                <div className="goal-rail" style={{ background: goal?.color }} />
                <div className="task-title" style={{ flex: 1, minWidth: 0 }}>{task.title}</div>

                <button onClick={() => handleCarryOver(task.id)} className="btn btn-ghost" style={{ padding: '9px 14px', fontSize: 13.5, flexShrink: 0 }}>
                  {t('carryOver')}
                </button>
              </div>
            );
          })}
        </>
      )}

      {/* Week note */}
      <div className="section-label">✎ {t('weekNote')}</div>

      <div className="card" style={{ marginBottom: 12 }}>
        <textarea
          value={note}
          onChange={e => setWeekNote(selectedWeek, e.target.value)}
          placeholder={t('notePlaceholder')}
          className="input"
          style={{ minHeight: 110, resize: 'vertical', border: 'none', background: 'transparent', padding: 2 }}
        />
      </div>

      <CalendarSection />
    </div>
  );
}

function CalendarSection() {
  const { t, lang } = useT();
  const { state, updateTask } = useSprintStore();
  const initDataRaw = useRawInitData();

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [oauthCode, setOauthCode] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; deleted: number } | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      setLoading(true);
      setError('');
      const status = await getOAuthStatus(initDataRaw);
      setConnected(status.connected);
    } catch (err) {
      if (err instanceof CalendarAPIError) {
        setError(err.message);
      } else {
        setError(t('calendarError'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      setError('');
      const { url } = await getOAuthUrl(initDataRaw);
      window.open(url, '_blank');
    } catch (err) {
      if (err instanceof CalendarAPIError) {
        setError(err.message);
      } else {
        setError(t('calendarError'));
      }
    }
  }

  async function handleSubmitCode() {
    if (!oauthCode.trim()) return;

    try {
      setError('');
      setLoading(true);
      await submitOAuthCode(initDataRaw, oauthCode);
      setConnected(true);
      setOauthCode('');
    } catch (err) {
      if (err instanceof CalendarAPIError) {
        setError(err.message);
      } else {
        setError(t('calendarError'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!state.sprint) return;

    try {
      setError('');
      setSyncing(true);
      setSyncResult(null);

      const result = await syncSprint(initDataRaw, state.sprint);

      if (result.changedTasks.length > 0) {
        for (const change of result.changedTasks) {
          updateTask(change.taskId, { week: change.newWeek, day: change.newDay });
        }
      }

      setSyncResult({
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
      });

      await loadWeekEvents();
    } catch (err) {
      if (err instanceof CalendarAPIError) {
        setError(err.message);
      } else {
        setError(t('calendarError'));
      }
    } finally {
      setSyncing(false);
    }
  }

  async function loadWeekEvents() {
    if (!state.sprint) return;

    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay() + 1); // Monday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      const evts = await getEvents(
        initDataRaw,
        weekStart.toISOString(),
        weekEnd.toISOString()
      );
      setEvents(evts);
    } catch {
      // Silently ignore event loading errors
    }
  }

  const errorBox = error && (
    <div style={{
      marginTop: 14, padding: '11px 13px',
      background: 'rgba(255, 82, 82, 0.1)',
      border: '1px solid rgba(255, 82, 82, 0.28)',
      borderRadius: 12, fontSize: 13.5, color: 'var(--coral)',
    }}>
      {error}
    </div>
  );

  if (loading && !connected) {
    return (
      <>
        <div className="section-label green">⇄ {lang === 'ru' ? 'Календарь' : 'Calendar'}</div>
        <div className="card empty-state">{t('loading')}</div>
      </>
    );
  }

  if (!connected) {
    return (
      <>
        <div className="section-label green">⇄ {lang === 'ru' ? 'Календарь' : 'Calendar'}</div>
        <div className="card">
          <h2 style={{ fontSize: 16.5, fontWeight: 700, margin: '0 0 8px' }}>{t('calendarSync')}</h2>

          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.45 }}>
            {t('calendarSyncDesc')}
          </p>

          <button onClick={handleConnect} className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }}>
            {t('connectGoogleCalendar')}
          </button>

          <label className="input-label">{t('pasteAuthCode')}</label>
          <input
            type="text"
            value={oauthCode}
            onChange={(e) => setOauthCode(e.target.value)}
            placeholder="http://localhost/?code=..."
            className="input"
            style={{ fontFamily: 'monospace', fontSize: 13.5, marginBottom: 12 }}
          />

          <button
            onClick={handleSubmitCode}
            disabled={!oauthCode.trim() || loading}
            className={`btn ${oauthCode.trim() ? 'btn-green' : 'btn-ghost'}`}
            style={{ width: '100%' }}
          >
            {loading ? t('loading') : t('submitCode')}
          </button>

          {errorBox}
        </div>
      </>
    );
  }

  // Connected state
  return (
    <>
      <div className="section-label green">⇄ {lang === 'ru' ? 'Календарь' : 'Calendar'}</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16.5, fontWeight: 700, margin: 0 }}>{t('calendarSync')}</h2>
          <span className="badge badge-green">✓ {lang === 'ru' ? 'Подключён' : 'Connected'}</span>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing || !state.sprint}
          className={`btn ${syncing ? 'btn-ghost' : 'btn-primary'}`}
          style={{ width: '100%', marginBottom: 14 }}
        >
          {syncing ? t('syncing') : `⇄ ${t('syncNow')}`}
        </button>

        {syncResult && (
          <div className="card-inset" style={{ marginBottom: 14, display: 'flex', gap: 14, justifyContent: 'space-around', fontSize: 13.5 }}>
            <span style={{ color: 'var(--green)' }}>+{syncResult.created}</span>
            <span style={{ color: 'var(--cyan)' }}>↻ {syncResult.updated}</span>
            <span style={{ color: 'var(--coral)' }}>− {syncResult.deleted}</span>
          </div>
        )}

        {events.length > 0 && (
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '4px 0 10px' }}>
              {t('thisWeekEvents')}
            </div>
            {events.map((event) => (
              <div
                key={event.id}
                className="card-inset"
                style={{
                  marginBottom: 8,
                  borderLeft: event.fromSprint ? '3px solid var(--green)' : '3px solid var(--glass-border-strong)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{event.summary}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                  {new Date(event.start).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}
                  {event.fromSprint && ' · Sprint'}
                </div>
              </div>
            ))}
          </div>
        )}

        {errorBox}
      </div>
    </>
  );
}
