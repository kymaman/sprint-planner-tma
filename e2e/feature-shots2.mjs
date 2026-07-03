// Скриншоты волны фич: подзадачи+заметки, burndown, архив, drag&drop.
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
      done: (w + 1) < CUR,
      isMain: (w + 1) === CUR,
      estimatedDays: 1,
      day: (w + 1) === CUR ? todayDow : undefined,
    }));
    const checks = {};
    for (let i = 0; i < 6; i++) { const d = new Date(); d.setDate(d.getDate() - i); checks[iso(d)] = true; }
    const sprint = {
      id: 'sprint-demo', title: 'Q3 2026', startDate: iso(start),
      goals: [
        { id: 'goal-0', color: '#3ee0ff', title: 'Запустить MVP',
          habit: { id: 'habit-0', title: 'Утренние страницы', checks },
          tasks: mkTasks(0, ['Пользовательский флоу','Прототип','Дизайн-система','Каркас API','Онбординг','Бета-тест','Фиксы','Полировка','Релиз']) },
        { id: 'goal-1', color: '#ff7a63', title: 'Собрать аудиторию',
          habit: { id: 'habit-1', title: 'Пост в канал', checks: {} },
          tasks: mkTasks(1, ['Контент-план','5 постов','Коллаборация','Reels-серия','Розыгрыш','Аналитика','Воронка','Партнёрства','10k подписчиков']) },
        { id: 'goal-2', color: '#37e58c', title: 'Инвестиции',
          habit: { id: 'habit-2', title: 'Читать 20 страниц', checks: {} },
          tasks: mkTasks(2, ['Питч-дек','Финмодель','Список фондов','Интро-письма','5 встреч','Follow-up','Due diligence','Term sheet','Закрыть раунд']) },
      ],
      weekNotes: {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    // подзадачи + заметка на главной задаче недели (goal-0)
    sprint.goals[0].tasks[CUR - 1].note = 'Согласовать палитру с дизайнером до среды';
    sprint.goals[0].tasks[CUR - 1].subtasks = [
      { id: 'sub-1', title: 'Цвета и типографика', done: true },
      { id: 'sub-2', title: 'Компоненты кнопок', done: true },
      { id: 'sub-3', title: 'Тёмная тема', done: false },
    ];
    // ещё пара задач текущей недели без дня — для секции «Без дня» на Неделе
    sprint.goals[1].tasks[CUR - 1].day = undefined;
    localStorage.setItem('sprint', JSON.stringify(sprint));

    // архив: завершённый прошлый спринт со статистикой
    const aChecks = {};
    for (let i = 30; i < 42; i++) { const d = new Date(); d.setDate(d.getDate() - i); aChecks[iso(d)] = true; }
    const arch = {
      id: 'sprint-q2', title: 'Q2 2026', startDate: '2026-04-01',
      goals: [0, 1, 2].map(i => ({
        id: 'aq2-g' + i, color: ['#3ee0ff', '#ff7a63', '#37e58c'][i], title: ['Запуск лендинга', 'Найм команды', 'Спорт 3×нед'][i],
        habit: { id: 'aq2-h' + i, title: 'Привычка', checks: i === 0 ? aChecks : {} },
        tasks: Array.from({ length: 9 }, (_, w) => ({
          id: `aq2-g${i}-t${w}`, goalId: 'aq2-g' + i, title: 'Задача ' + (w + 1), week: w + 1,
          done: w < (i === 0 ? 9 : i === 1 ? 7 : 5), isMain: false, estimatedDays: 1,
        })),
      })),
      weekNotes: {}, createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-06-30T00:00:00Z',
    };
    localStorage.setItem('sprintArchive', JSON.stringify([arch]));
  } catch (e) {}
};

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.addInitScript(initScript);
const tid = (id) => `[data-testid="${id}"]`;

// 1. Today с бейджем подзадач ☑ 2/3 + 📝
await page.goto(BASE + '#/?' + lpQs, { waitUntil: 'networkidle' });
await page.waitForSelector(tid('subtask-badge-goal-0-task-2'));
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/designshots/n-today-badges.png' });
console.log('SHOT n-today-badges');

// 2. TaskModal с заметкой и чек-листом подзадач
await page.click(tid('task-edit-goal-0-task-2'));
await page.waitForSelector(tid('task-modal'));
await page.waitForSelector(tid('task-note-input'));
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/designshots/n-task-subtasks.png' });
console.log('SHOT n-task-subtasks');
await page.click('.sheet-overlay', { position: { x: 10, y: 10 } }).catch(() => {});
await page.waitForSelector(tid('task-modal'), { state: 'detached' }).catch(() => {});

// 3. Week в момент drag: зоны дней подсвечены
await page.click('.tab-bar a:has-text("Неделя")');
await page.waitForSelector('[data-testid^="drag-"]');
const hb = await page.locator('[data-testid^="drag-"]').first().boundingBox();
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
await page.mouse.down();
await page.mouse.move(hb.x + hb.width / 2 + 16, hb.y + hb.height / 2 + 40, { steps: 8 });
await page.waitForSelector(tid('drop-day-2'));
const db = await page.locator(tid('drop-day-2')).boundingBox();
await page.mouse.move(db.x + db.width / 2, db.y + 30, { steps: 10 });
await page.waitForTimeout(350);
await page.screenshot({ path: '/tmp/designshots/n-week-drag.png' });
console.log('SHOT n-week-drag');
await page.mouse.up();
await page.waitForTimeout(300);

// 4. Review с burndown-графиком
await page.click('.tab-bar a:has-text("Обзор")');
await page.waitForSelector(tid('burndown-chart'));
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/designshots/n-review-burndown.png' });
console.log('SHOT n-review-burndown');

// 5. Settings с архивом спринтов
await page.click('.tab-bar a:has-text("Спринт")');
await page.waitForSelector(tid('open-settings'));
await page.click(tid('open-settings'));
await page.waitForSelector(tid('archive-item-sprint-q2'));
await page.locator(tid('archive-item-sprint-q2')).scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, 160));
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/designshots/n-settings-archive.png' });
console.log('SHOT n-settings-archive');

console.log('ERRORS', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
