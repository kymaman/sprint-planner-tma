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

  // ---- Демо-спринт ----
  const iso = (d) => d.toISOString().split('T')[0];
  const start = new Date(); start.setDate(start.getDate() - 25); // неделя 4
  const CUR = 3; // currentWeek при старте 25 дней назад
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
        tasks: mkTasks(0, ['Пользовательский флоу','Прототип','Дизайн-система','Завершить user flow','Каркас API','Онбординг','Бета-тест','Фиксы','Релиз']) },
      { id: 'goal-1', color: '#ff7a63', title: 'Собрать аудиторию',
        habit: { id: 'habit-1', title: 'Пост в канал', checks: checks2 },
        tasks: mkTasks(1, ['Контент-план','5 постов','Коллаборация','Черновик контента','Reels-серия','Розыгрыш','Аналитика','Воронка','10k подписчиков']) },
      { id: 'goal-2', color: '#37e58c', title: 'Инвестиции',
        habit: { id: 'habit-2', title: 'Читать 20 страниц', checks: {} },
        tasks: mkTasks(2, ['Питч-дек','Финмодель','Список фондов','Питч-дек: черновик','Интро-письма','5 встреч','Follow-up','Term sheet','Закрыть раунд']) },
    ],
    weekNotes: { 3: 'Хорошая неделя: MVP почти готов, аудитория растёт. Улучшить: меньше распыляться.' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  try { localStorage.setItem('sprint', JSON.stringify(sprint)); localStorage.setItem('lang', 'ru'); } catch (e) {}
};

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.addInitScript(initScript);

const shots = [
  ['', 'today'],
  ['week', 'week'],
  ['sprint', 'sprint'],
  ['review', 'review'],
  ['setup', 'setup'],
];

for (const [route, name] of shots) {
  await page.goto(BASE + '#/' + route + '?' + lpQs, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `/tmp/designshots/${name}.png` });
  console.log('SHOT', name, 'hash=', await page.evaluate(() => location.hash.split('?')[0]));
}

console.log('ERRORS', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
