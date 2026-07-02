import { useState, useEffect } from 'react';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { currentWeek, weekStats, unfinishedTasks, carryOverTask } from '@/model/logic';
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
  const { t } = useT();
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

  const handleCarryOver = (taskId: string) => {
    const updated = carryOverTask(state.sprint!, taskId);
    updateSprint(updated);
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>{t('reviewTitle')}</h1>

      {/* Week selector */}
      <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '8px', minWidth: 'min-content' }}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map(week => (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              className={selectedWeek === week ? 'btn btn-primary' : 'btn'}
              style={{
                minWidth: '60px',
                background: selectedWeek === week ? 'var(--accent-blue)' : 'var(--bg-card)',
                color: selectedWeek === week ? 'white' : 'var(--text-primary)',
              }}
            >
              {week}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>{t('weekStats')}</h2>

        <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
          {t('completedTasks', { done: stats.done, total: stats.total })}
        </div>

        <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          By goal:
        </div>

        {stats.perGoal.map(g => {
          const goal = state.sprint!.goals.find(goal => goal.id === g.goalId);
          const percent = g.total > 0 ? (g.done / g.total) * 100 : 0;

          return (
            <div key={g.goalId} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: goal?.color,
                  }} />
                  <span>{g.goalTitle}</span>
                </div>
                <span className="text-secondary">{g.done}/{g.total}</span>
              </div>

              <div style={{
                width: '100%',
                height: '6px',
                background: 'var(--bg-primary)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: goal?.color,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Unfinished tasks */}
      {unfinished.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('unfinishedTasks')}</h2>

          {unfinished.map(task => {
            const goal = state.sprint!.goals.find(g => g.id === task.goalId);
            return (
              <div
                key={task.id}
                className="card"
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  borderLeft: `4px solid ${goal?.color || '#fff'}`,
                }}
              >
                <div style={{ flex: 1, fontSize: '16px' }}>{task.title}</div>

                <button
                  onClick={() => handleCarryOver(task.id)}
                  className="btn"
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    background: 'var(--accent-blue)',
                    color: 'white',
                  }}
                >
                  {t('carryOver')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Week note */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {t('weekNote')}
        </label>
        <textarea
          value={note}
          onChange={e => setWeekNote(selectedWeek, e.target.value)}
          placeholder={t('notePlaceholder')}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
            fontSize: '16px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Calendar sync placeholder */}
      <CalendarSection />
    </div>
  );
}

function CalendarSection() {
  const { t } = useT();
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

      // Apply two-way sync changes
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

      // Load this week's events
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

  if (loading && !connected) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
        <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
          {t('loading')}
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>{t('calendarSync')}</h2>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {t('calendarSyncDesc')}
        </p>

        <button
          onClick={handleConnect}
          className="btn"
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--accent-blue)',
            color: 'white',
            marginBottom: '16px',
          }}
        >
          {t('connectGoogleCalendar')}
        </button>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            {t('pasteAuthCode')}
          </label>
          <input
            type="text"
            value={oauthCode}
            onChange={(e) => setOauthCode(e.target.value)}
            placeholder="http://localhost/?code=..."
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'monospace',
            }}
          />
        </div>

        <button
          onClick={handleSubmitCode}
          disabled={!oauthCode.trim() || loading}
          className="btn"
          style={{
            width: '100%',
            padding: '12px',
            background: oauthCode.trim() ? 'var(--accent-green)' : 'var(--bg-card)',
            color: oauthCode.trim() ? 'white' : 'var(--text-tertiary)',
            cursor: oauthCode.trim() && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? t('loading') : t('submitCode')}
        </button>

        {error && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255, 0, 0, 0.1)', borderRadius: '8px', fontSize: '14px', color: '#ff6b6b' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // Connected state
  return (
    <div className="card" style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>{t('calendarSync')}</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px', color: 'var(--accent-green)' }}>
        <span style={{ fontSize: '20px' }}>✓</span>
        <span>{t('calendarConnected')}</span>
      </div>

      <button
        onClick={handleSync}
        disabled={syncing || !state.sprint}
        className="btn"
        style={{
          width: '100%',
          padding: '12px',
          background: syncing ? 'var(--bg-card)' : 'var(--accent-blue)',
          color: syncing ? 'var(--text-tertiary)' : 'white',
          marginBottom: '16px',
          cursor: syncing ? 'not-allowed' : 'pointer',
        }}
      >
        {syncing ? t('syncing') : t('syncNow')}
      </button>

      {syncResult && (
        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '14px' }}>
          <div>{t('syncResultCreated', { count: syncResult.created })}</div>
          <div>{t('syncResultUpdated', { count: syncResult.updated })}</div>
          <div>{t('syncResultDeleted', { count: syncResult.deleted })}</div>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>{t('thisWeekEvents')}</h3>
          {events.map((event) => (
            <div
              key={event.id}
              style={{
                marginBottom: '8px',
                padding: '8px 12px',
                background: event.fromSprint ? 'rgba(78, 205, 196, 0.1)' : 'var(--bg-primary)',
                borderRadius: '8px',
                borderLeft: event.fromSprint ? '3px solid var(--accent-green)' : '3px solid var(--border-subtle)',
                fontSize: '14px',
              }}
            >
              <div style={{ fontWeight: '500' }}>{event.summary}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {new Date(event.start).toLocaleDateString()}
                {event.fromSprint && ' · Sprint'}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255, 0, 0, 0.1)', borderRadius: '8px', fontSize: '14px', color: '#ff6b6b' }}>
          {error}
        </div>
      )}
    </div>
  );
}
