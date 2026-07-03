// E2E-тесты спринт-планера на реальном билде (vite preview :4173).
// Запуск: node /tmp/pwtest/e2e.mjs
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

// Запускается в браузере перед каждой загрузкой страницы.
// ВАЖНО: сидим localStorage только если пусто — иначе reload затирал бы мутации.
const initScript = (opts) => {
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
  try { localStorage.setItem('lang', 'ru'); } catch (e) {}

  if (!opts.seed) return;
  try {
    if (localStorage.getItem('sprint')) return; // не перетирать мутации при reload

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
    const sprint = {
      id: 'sprint-e2e', title: 'Q3 2026', startDate: iso(start),
      goals: [
        { id: 'goal-0', color: '#3ee0ff', title: 'Запустить MVP',
          habit: { id: 'habit-0', title: 'Утренние страницы', checks },
          tasks: mkTasks(0, ['Пользовательский флоу','Прототип','Дизайн-система','Каркас API','Онбординг','Бета','Фиксы','Полировка','Релиз']) },
        { id: 'goal-1', color: '#ff7a63', title: 'Собрать аудиторию',
          habit: { id: 'habit-1', title: 'Пост в канал', checks: {} },
          tasks: mkTasks(1, ['Контент-план','5 постов','Коллаборация','Reels','Розыгрыш','Аналитика','Воронка','Партнёрства','10k подписчиков']) },
        { id: 'goal-2', color: '#37e58c', title: 'Инвестиции',
          habit: { id: 'habit-2', title: 'Читать 20 страниц', checks: {} },
          tasks: mkTasks(2, ['Питч-дек','Финмодель','Список фондов','Интро-письма','5 встреч','Follow-up','Due diligence','Term sheet','Закрыть раунд']) },
      ],
      weekNotes: {},
      createdAt: new Date().toISOString(), updatedAt: new Date(Date.now() - 3600e3).toISOString(),
    };
    if (opts.overdue) sprint.goals[2].tasks[0].done = false; // 1 незавершённая на неделе 1 → rollover
    localStorage.setItem('sprint', JSON.stringify(sprint));
  } catch (e) {}
};

// ---------- инфраструктура ----------
const browser = await chromium.launch({ executablePath: EXE });
let pass = 0, fail = 0;
const failures = [];
let curPage = null;
let shotN = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✅', name); }
  catch (e) {
    fail++; failures.push(name + ' — ' + e.message.split('\n')[0]);
    console.log('  ❌', name, '—', e.message.split('\n')[0]);
    try {
      if (curPage) {
        const p = `/tmp/pwtest/fail-${++shotN}.png`;
        await curPage.screenshot({ path: p });
        console.log('     shot:', p, 'hash:', await curPage.evaluate(() => location.hash.split('?')[0]));
      }
    } catch {}
  }
}
const tid = (id) => `[data-testid="${id}"]`;

// ================= КОНТЕКСТ 1: сид с данными =================
console.log('▶ Suite 1: seeded sprint (Today/Week/Sprint/Settings)');
const ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx1.newPage();
curPage = page;
page.setDefaultTimeout(12000);
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.addInitScript(initScript, { seed: true, overdue: true });
await page.goto(BASE + '#/?' + lpQs, { waitUntil: 'networkidle' });

await test('Today: рендер (заголовок, 3 задачи, 3 привычки)', async () => {
  await page.waitForSelector('.page-title');
  const tasks = await page.locator('.task-row').count();
  if (tasks !== 3) throw new Error('task-rows: ' + tasks);
  const habits = await page.locator('.habit-card').count();
  if (habits !== 3) throw new Error('habit-cards: ' + habits);
});

await test('Rollover: карточка незавершённых с прошлых недель видна', async () => {
  await page.waitForSelector(tid('rollover-card'));
  const txt = await page.locator(tid('rollover-card')).innerText();
  if (!txt.includes('1')) throw new Error('ожидал счётчик 1, текст: ' + txt);
});

await test('Rollover: кнопка переносит задачи и карточка исчезает', async () => {
  await page.click(tid('rollover-btn'));
  await page.waitForSelector(tid('rollover-card'), { state: 'detached' });
  const moved = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sprint'));
    return s.goals[2].tasks[0];
  });
  if (moved.week !== 3 || moved.done) throw new Error('задача не перенесена: ' + JSON.stringify(moved));
});

await test('Тогл задачи: клик по карточке ставит done', async () => {
  const row = page.locator('.task-row').nth(1); // goal-1, не done
  await row.click();
  await page.waitForTimeout(300);
  const checked = await row.locator('.checkbox.checked').count();
  if (!checked) throw new Error('чекбокс не отметился');
});

await test('Персистенс: done переживает reload (localStorage)', async () => {
  await page.waitForTimeout(600); // debounce сейва
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.task-row');
  const checked = await page.locator('.task-row').nth(1).locator('.checkbox.checked').count();
  if (!checked) throw new Error('done потерялся после reload');
});

await test('Тогл привычки: отметка + стрик', async () => {
  const habit = page.locator('.habit-card').nth(1);
  await habit.click();
  await page.waitForTimeout(300);
  if (!(await habit.locator('.checkbox.checked').count())) throw new Error('привычка не отметилась');
});

await test('Редактирование: переименование задачи через модалку', async () => {
  await page.click(tid('task-edit-goal-1-task-2'));
  await page.waitForSelector(tid('task-modal'));
  await page.fill(tid('task-title-input'), 'Переименовано E2E');
  await page.click(tid('task-save-btn'));
  await page.waitForSelector(tid('task-modal'), { state: 'detached' });
  await page.waitForSelector('text=Переименовано E2E');
});

await test('Редактирование: смена цели задачи (delete+add)', async () => {
  await page.click(tid('task-edit-goal-1-task-2'));
  await page.waitForSelector(tid('task-modal'));
  await page.click(tid('goal-pick-goal-0'));
  await page.click(tid('task-save-btn'));
  await page.waitForSelector(tid('task-modal'), { state: 'detached' });
  const ok = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sprint'));
    return s.goals[0].tasks.some(t => t.title === 'Переименовано E2E') &&
           !s.goals[1].tasks.some(t => t.title === 'Переименовано E2E');
  });
  if (!ok) throw new Error('задача не переехала в другую цель');
});

await test('Добавление: валидация «максимум 3 в день» + сохранение без дня', async () => {
  await page.click(tid('today-add-task'));
  await page.waitForSelector(tid('task-modal'));
  await page.fill(tid('task-title-input'), 'Новая задача E2E');
  await page.click(tid('task-save-btn'));
  await page.waitForSelector(tid('task-modal-error')); // на сегодня уже 3
  await page.click('.sheet .chip:has-text("Без дня")');
  await page.click(tid('task-save-btn'));
  await page.waitForSelector(tid('task-modal'), { state: 'detached' });
});

await test('Удаление с двойным тапом + undo-тост возвращает задачу', async () => {
  await page.click(tid('task-edit-goal-2-task-2'));
  await page.waitForSelector(tid('task-modal'));
  await page.click(tid('task-delete-btn'));
  const btnText = await page.locator(tid('task-delete-btn')).innerText();
  if (!btnText.includes('Точно')) throw new Error('нет подтверждения: ' + btnText);
  await page.click(tid('task-delete-btn'));
  await page.waitForSelector(tid('task-modal'), { state: 'detached' });
  await page.waitForSelector(tid('undo-toast'));
  await page.click(tid('undo-btn'));
  await page.waitForSelector(tid('undo-toast'), { state: 'detached' });
  await page.waitForSelector(tid('task-edit-goal-2-task-2')); // задача вернулась
});

await test('Week: новая задача в «Без дня», перенос на день через select', async () => {
  await page.click('.tab-bar a:has-text("Неделя")');
  await page.waitForSelector('h1:has-text("Неделя 3")');
  const card = page.locator('.card.task-row', { hasText: 'Новая задача E2E' });
  await card.waitFor();
  await card.locator('select').selectOption('0'); // Пн
  await page.waitForSelector('.section-label:has-text("Пн")');
});

await test('Week: кнопка добавления и карандаши на строках', async () => {
  await page.waitForSelector(tid('week-add-task'));
  const pencils = await page.locator('[data-testid^="week-edit-"]').count();
  if (pencils < 3) throw new Error('карандашей мало: ' + pencils);
});

await test('Sprint: редактирование цели (название + привычка)', async () => {
  await page.click('.tab-bar a:has-text("Спринт")');
  await page.waitForSelector(tid('goal-edit-0'));
  await page.click(tid('goal-edit-0'));
  await page.waitForSelector(tid('goal-modal'));
  await page.fill(tid('goal-title-input'), 'Цель E2E');
  await page.fill(tid('habit-title-input'), 'Привычка E2E');
  await page.click(tid('goal-save-btn'));
  await page.waitForSelector(tid('goal-modal'), { state: 'detached' });
  await page.waitForSelector('h3:has-text("Цель E2E")');
  await page.waitForSelector('text=Привычка E2E');
});

await test('Settings: переименование спринта + флеш «Сохранено»', async () => {
  await page.click(tid('open-settings'));
  await page.waitForSelector(tid('settings-page'));
  await page.fill(tid('sprint-title-input'), 'Sprint E2E');
  await page.click(tid('sprint-info-save'));
  await page.waitForSelector(tid('settings-flash'));
  const ok = await page.evaluate(() => JSON.parse(localStorage.getItem('sprint')).title === 'Sprint E2E');
  if (!ok) throw new Error('title не сохранился');
});

await test('Settings: переключение языка RU→EN→RU', async () => {
  await page.click(tid('lang-en'));
  await page.waitForSelector('h1:has-text("Settings")');
  await page.click(tid('lang-ru'));
  await page.waitForSelector('h1:has-text("Настройки")');
});

await test('Settings: импорт мусора отклоняется с ошибкой', async () => {
  await page.fill(tid('import-textarea'), '{"foo": 1}');
  await page.click(tid('import-btn'));
  await page.waitForSelector(tid('import-msg'));
  const msg = await page.locator(tid('import-msg')).innerText();
  if (!msg.includes('Не похоже')) throw new Error('неожиданное сообщение: ' + msg);
});

await test('Settings: экспорт бэкапа показывает «Скопировано»', async () => {
  await page.click(tid('export-btn'));
  await page.waitForSelector(tid('settings-flash'));
});

await test('Settings: сброс спринта — двойной тап → визард', async () => {
  await page.click(tid('reset-sprint-btn'));
  const txt = await page.locator(tid('reset-sprint-btn')).innerText();
  if (!txt.includes('Точно')) throw new Error('нет подтверждения: ' + txt);
  await page.click(tid('reset-sprint-btn'));
  await page.waitForSelector('h1:has-text("Новый спринт")');
  const cleared = await page.evaluate(() => localStorage.getItem('sprint') === null);
  if (!cleared) throw new Error('sprint не удалён из localStorage');
});

await ctx1.close();

// ================= КОНТЕКСТ 2: чистый — визард =================
console.log('▶ Suite 2: fresh install (setup wizard)');
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page2 = await ctx2.newPage();
curPage = page2;
page2.setDefaultTimeout(12000);
page2.on('pageerror', e => errors.push('pageerror2: ' + e.message));
await page2.addInitScript(initScript, { seed: false });
await page2.goto(BASE + '#/?' + lpQs, { waitUntil: 'networkidle' });

await test('Визард: редирект на /setup без спринта', async () => {
  await page2.waitForSelector('h1:has-text("Новый спринт")');
  await page2.waitForSelector('text=Шаг 1 из 6');
});

await test('Визард: полное прохождение 6 шагов → Today', async () => {
  await page2.fill('input[placeholder="Q1 2024"]', 'E2E Sprint');
  await page2.click('button:has-text("Далее")');
  await page2.waitForSelector('text=Шаг 2 из 6');
  const goalInputs = page2.locator('input[placeholder="Например: Запустить продукт"]');
  for (let i = 0; i < 3; i++) await goalInputs.nth(i).fill(`Цель ${i + 1} E2E`);
  await page2.click('button:has-text("Далее")');
  for (const s of [3, 4, 5]) {
    await page2.waitForSelector(`text=Шаг ${s} из 6`);
    await page2.locator('input[placeholder="Задача на неделю 1"]').fill(`Задача недели 1 (шаг ${s})`);
    await page2.click('button:has-text("Далее")');
  }
  await page2.waitForSelector('text=Шаг 6 из 6');
  const habitInputs = page2.locator('input[placeholder="Например: Медитация 10 минут"]');
  for (let i = 0; i < 3; i++) await habitInputs.nth(i).fill(`Привычка ${i + 1}`);
  await page2.click('button:has-text("Завершить")');
  await page2.waitForSelector('.page-title'); // TodayPage
  const s = await page2.evaluate(() => JSON.parse(localStorage.getItem('sprint')));
  if (s.title !== 'E2E Sprint') throw new Error('title: ' + s.title);
  if (s.goals.length !== 3 || s.goals[0].title !== 'Цель 1 E2E') throw new Error('goals кривые');
  if (s.goals[0].tasks.length !== 9) throw new Error('tasks: ' + s.goals[0].tasks.length);
});

await test('Визард: после создания спринта Today показывает контент', async () => {
  await page2.waitForSelector('.habit-card'); // привычки отрисованы
  const habits = await page2.locator('.habit-card').count();
  if (habits !== 3) throw new Error('habit-cards: ' + habits);
});

await ctx2.close();
await browser.close();

console.log('\n══════════════════════════════');
console.log(`ИТОГ: ${pass} passed, ${fail} failed`);
if (errors.length) console.log('JS-ошибки страницы:', errors.slice(0, 5));
if (failures.length) { console.log('Провалы:'); failures.forEach(f => console.log(' -', f)); process.exit(1); }
process.exit(0);
