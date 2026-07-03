import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@/i18n';
import { useSprintStore } from '@/store';
import { loadArchive, pushToArchive, removeFromArchive, sprintStats } from '@/model/archive';
import type { Sprint } from '@/model/types';

function looksLikeSprint(obj: unknown): obj is Sprint {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.title === 'string' &&
    typeof s.startDate === 'string' &&
    Array.isArray(s.goals) &&
    s.goals.length === 3
  );
}

export function SettingsPage() {
  const { t, lang, setLang } = useT();
  const { state, updateSprint, setSprint } = useSprintStore();
  const navigate = useNavigate();

  const sprint = state.sprint;

  const [title, setTitle] = useState(sprint?.title ?? '');
  const [startDate, setStartDate] = useState(sprint?.startDate ?? '');
  const [flash, setFlash] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [archive, setArchive] = useState<Sprint[]>(() => loadArchive());
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2500);
  };

  const saveSprintInfo = () => {
    if (!sprint || !title.trim() || !startDate) return;
    updateSprint({ ...sprint, title: title.trim(), startDate });
    showFlash(t('saved'));
  };

  const exportBackup = async () => {
    if (!sprint) return;
    const json = JSON.stringify(sprint, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      showFlash(t('copied'));
    } catch {
      // Фолбэк для вебвью без clipboard API
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showFlash(t('copied'));
    }
  };

  const importBackup = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!looksLikeSprint(parsed)) {
        setImportMsg(t('importErr'));
        return;
      }
      setSprint({ ...parsed, updatedAt: new Date().toISOString() });
      setTitle(parsed.title);
      setStartDate(parsed.startDate);
      setImportText('');
      setImportMsg(t('importOk'));
      setTimeout(() => setImportMsg(''), 3000);
    } catch {
      setImportMsg(t('importErr'));
    }
  };

  const resetSprint = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    if (sprint) setArchive(pushToArchive(sprint));
    setSprint(null);
    navigate('/setup');
  };

  const restoreFromArchive = (id: string) => {
    if (confirmRestore !== id) {
      setConfirmRestore(id);
      setTimeout(() => setConfirmRestore(null), 4000);
      return;
    }
    const target = archive.find(s => s.id === id);
    if (!target) return;
    // Текущий (если есть) — в архив, выбранный — из архива в работу
    let next = removeFromArchive(id);
    if (sprint) {
      pushToArchive(sprint);
      next = loadArchive();
    }
    setArchive(next);
    setConfirmRestore(null);
    setSprint({ ...target, updatedAt: new Date().toISOString() });
    setTitle(target.title);
    setStartDate(target.startDate);
    showFlash(t('importOk'));
  };

  return (
    <div className="page" data-testid="settings-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t('back')} data-testid="settings-back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <div className="page-kicker">{sprint?.title ?? ''}</div>
          <h1 className="page-title" style={{ fontSize: 24 }}>⚙️ {t('settings')}</h1>
        </div>
      </div>

      {/* Название и дата */}
      {sprint && (
        <>
          <div className="section-label cyan">✎ {t('editSprintInfo')}</div>
          <div className="card">
            <div className="input-label">{t('sprintName')}</div>
            <input
              className="input"
              data-testid="sprint-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <div className="input-label" style={{ marginTop: 12 }}>{t('startDate')}</div>
            <input
              className="input"
              type="date"
              data-testid="sprint-date-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <button className="btn-primary" onClick={saveSprintInfo} data-testid="sprint-info-save" style={{ marginTop: 14, width: '100%' }}>
              {t('save')}
            </button>
          </div>
        </>
      )}

      {/* Язык */}
      <div className="section-label">🌐 {t('language')}</div>
      <div className="card" style={{ display: 'flex', gap: 10 }}>
        <button
          className={`chip ${lang === 'ru' ? 'active' : ''}`}
          onClick={() => setLang('ru')}
          data-testid="lang-ru"
          style={{ flex: 1 }}
        >
          🇷🇺 Русский
        </button>
        <button
          className={`chip ${lang === 'en' ? 'active' : ''}`}
          onClick={() => setLang('en')}
          data-testid="lang-en"
          style={{ flex: 1 }}
        >
          🇬🇧 English
        </button>
      </div>

      {/* Данные: бэкап/восстановление */}
      <div className="section-label green">⛃ {t('dataSection')}</div>
      <div className="card">
        {sprint && (
          <button className="btn-ghost" onClick={exportBackup} data-testid="export-btn" style={{ width: '100%' }}>
            📋 {t('exportData')}
          </button>
        )}
        <div className="input-label" style={{ marginTop: 14 }}>{t('importData')}</div>
        <textarea
          className="input"
          data-testid="import-textarea"
          value={importText}
          onChange={e => { setImportText(e.target.value); setImportMsg(''); }}
          placeholder={t('importPlaceholder')}
          rows={3}
          style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12.5 }}
        />
        {importText.trim() && (
          <button className="btn-ghost" onClick={importBackup} data-testid="import-btn" style={{ width: '100%', marginTop: 10 }}>
            {t('importData')}
          </button>
        )}
        {importMsg && (
          <div data-testid="import-msg" style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600, color: importMsg === t('importOk') ? 'var(--green)' : 'var(--coral)' }}>
            {importMsg}
          </div>
        )}
      </div>

      {/* Архив спринтов */}
      {archive.length > 0 && (
        <>
          <div className="section-label">🗂 {t('archiveSection')}</div>
          <div className="card" data-testid="archive-section" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {archive.map(s => {
              const st = sprintStats(s);
              return (
                <div key={s.id} className="card-inset" data-testid={`archive-item-${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                      {s.startDate} · ✓ {st.tasksDone}/{st.tasksTotal} {t('tasksDoneStat')}
                      {st.bestStreak > 0 ? ` · 🔥 ${st.bestStreak} ${t('daysStat')} ${t('bestStreakStat')}` : ''}
                    </div>
                  </div>
                  <button
                    className="btn-ghost"
                    data-testid={`archive-restore-${s.id}`}
                    onClick={() => restoreFromArchive(s.id)}
                    style={{ padding: '9px 12px', fontSize: 12.5, whiteSpace: 'nowrap', flex: 'none' }}
                  >
                    {confirmRestore === s.id ? t('restoreConfirmTap') : `↩ ${t('restoreSprint')}`}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Опасная зона */}
      {sprint && (
        <>
          <div className="section-label coral">⚠ {t('dangerZone')}</div>
          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              {t('newSprintHint')}
            </div>
            <button className="btn-danger" onClick={resetSprint} data-testid="reset-sprint-btn">
              {confirmReset ? t('deleteConfirmTap') : `🔄 ${t('newSprint')}`}
            </button>
          </div>
        </>
      )}

      {flash && <div className="toast" data-testid="settings-flash">{flash}</div>}
    </div>
  );
}
