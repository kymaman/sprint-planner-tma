// Скриншоты новых фич: rollover, TaskModal, GoalModal, Settings.
import { chromium } from 'playwright-core';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell';
const BASE = process.env.BASE_URL || 'http://localhost:4173/sprint-planner-tma/';

const lpQs = new URLSearchParams([
  ['tgWebAppData', new URLSearchParams([
    ['auth_date', String(Math.floor(Date.now() / 1000))],
    ['hash', 'aaaa'],
    ['signature', 'bbbb'],
    ['user', JSON.stringify({ id: 1, first_name: 'Mark', language_code: 'ru' })],
  ]).toString()],
  ['tgWebAppVersion', '8.0'],
  ['tgWebAppPlatform', 'tdesktop'],
  ['tgWebAppThemeParams', JSON.stringify({ bg_color: '#06090e', text_color: '#ffffff', button_color: '#3ee0ff', button_text_color: '#04121c', hint_color: '#8a8f98', link_color: '#3ee0ff', secondary_bg_color: '#0b0f16' })],
]).toString();

const initScript = () => {
  const lp = new URLSearchParams([
    ['tgWebAppData', new URLSearchParams([
      ['auth_date', String(Math.floor(Date.now() / 1000))],
      ['hash', 'aaaa'],
      ['signature', 'bbbb'],
      ['user', JSON.stringify({ id: 1, first_name: 'Mark', language_code: 'ru' })],
    ]).toString()],
    ['tgWebAppVersion', '8.0'],
    ['tgWebAppPlatform', 'tdesktop'],
    ['tgWebAppThemeParams', JSON.stringify({ bg_color: '#06090e', text_color: '#ffffff', button_color: '#3ee0ff', button_text_color: '#04121c', hint_color: '#8a8f98', link_color: '#3ee0ff', secondary_bg_color: '#0b0f16' })],
  ]);
  try { sessionStorage.setItem('tapps/launchParams', lp.toString()); } catch (e) {}
  window.TelegramWebviewProxy = {
    postEvent(name) {
      const reply = (evName, evData) => window.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify({ eventType: evName, eventData: evData }), source: window.parent,
      }));
      if (name === 'web_app_request_theme') reply('theme_changed', { theme_params: { bg_color: '#06090e', text_color: '#ffffff', button_color: '#3ee0ff', button_text_color: '#04121c', hint_color: '#8a8f98', link_color: '#3ee0ff', secondary_bg_color: '#0b0f16' } });
      if (name === 'web_app_request_viewport') reply('viewport_changed', { height: 844, width: 390, is_expanded: true, is_state_stable: true });
      if (name === 'web_app_request_safe_area') reply('safe_area_changed', { left: 0, top: 0, right: 0, bottom: 0 });
      if (name === 'web_app_request_content_safe_area') reply('content_safe_area_changed', { left: 0, top: 0, right: 0, bottom: 0 });
    },
  };
  try {
    localStorage.setItem('lang', 'ru');
    const iso = (d) => d.toISOString().split('T')[0];
    const start = new Date(); start.setDate(start.getDate() - 25);
    const CUR = 3;
    const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const mkTasks = (gi, titles) => titles.map((title, w) => ({
      id: `goal-${gi}-task-${w}`, goalId: `goal-${gi}`, title, week: w + 1,
      done: (w + 1) < CUR || ((w + 1) === CUR && gi === 0),
      isMain: (w + 1) === CUR,
      estimatedDays: 1,
      day: (w + 1) === CUR ? todayDow : undefined,
    }));
    const checks = {};
    for (let i = 0; i < 6; i++) { const d = new Date(); d.setDate(d.getDate() - i); checks[iso(d)] = true; }
    const checks2 = {};
    for (let i = 1; i < 4; i++) { const d = new Date(); d.setDate(d.getDate() - i); checks2[iso(d)] = true; }
    const sprint = {
      id: 'sprint-demo', title: 'Q3 2026', startDate: iso(start),
      goals: [
        { id: 'goal-0', color: '#3ee0ff', title: 'Запустить MVP',
          habit: { id: 'habit-0', title: 'Утренние страницы', checks },
          tasks: mkTasks(0, ['Пользовательский флоу','Прототип','Дизайн-система','Каркас API','Онбординг','Бета-тест','Фиксы','Полировка','Релиз']) },
        { id: 'goal-1', color: '#ff7a63', title: 'Собрать аудиторию',
          habit: { id: 'habit-1', title: 'Пост в канал', checks: checks2 },
          tasks: mkTasks(1, ['Контент-план','5 постов','Коллаборация','Reels-серия','Розыгрыш','Аналитика','Воронка','Партнёрства','10k подписчиков']) },
        { id: 'goal-2', color: '#37e58c', title: 'Инвестиции',
          habit: { id: 'habit-2', title: 'Читать 20 страниц', checks: {} },
          tasks: mkTasks(2, ['Питч-дек','Финмодель','Список фондов','Интро-письма','5 встреч','Follow-up','Due diligence','Term sheet','Закрыть раунд']) },
      ],
      weekNotes: {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    // одна незавершённая на неделе 1 → карточка rollover
    sprint.goals[2].tasks[0].done = false;
    localStorage.setItem('sprint', JSON.stringify(sprint));
  } catch (e) {}
};

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.addInitScript(initScript);
const tid = (id) => `[data-testid="${id}"]`;

// 1. Today с rollover-карточкой
await page.goto(BASE + '#/?' + lpQs, { waitUntil: 'networkidle' });
await page.waitForSelector(tid('rollover-card'));
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/designshots/f-today-rollover.png' });
console.log('SHOT f-today-rollover');

// 2. TaskModal (редактирование задачи)
await page.click(tid('task-edit-goal-1-task-2'));
await page.waitForSelector(tid('task-modal'));
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/designshots/f-task-modal.png' });
console.log('SHOT f-task-modal');
await page.keyboard.press('Escape');
await page.click('.sheet-overlay', { position: { x: 10, y: 10 } }).catch(() => {});
await page.waitForSelector(tid('task-modal'), { state: 'detached' }).catch(() => {});

// 3. GoalModal (Спринт → карандаш цели)
await page.click('.tab-bar a:has-text("Спринт")');
await page.waitForSelector(tid('goal-edit-0'));
await page.click(tid('goal-edit-0'));
await page.waitForSelector(tid('goal-modal'));
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/designshots/f-goal-modal.png' });
console.log('SHOT f-goal-modal');
await page.click('.sheet-overlay', { position: { x: 10, y: 10 } }).catch(() => {});
await page.waitForSelector(tid('goal-modal'), { state: 'detached' }).catch(() => {});

// 4. Settings
await page.click(tid('open-settings'));
await page.waitForSelector(tid('settings-page'));
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/designshots/f-settings.png' });
console.log('SHOT f-settings');

console.log('ERRORS', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
