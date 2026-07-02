export const ru = {
  // Tab bar
  tabToday: 'Сегодня',
  tabWeek: 'Неделя',
  tabSprint: 'Спринт',
  tabReview: 'Обзор',

  // Today page
  weekOf: 'Неделя {{week}}/9',
  dayOf: 'День {{day}}/90',
  todayTasks: 'Задачи на сегодня',
  habits: 'Привычки',
  sprintProgress: 'Прогресс спринта',
  addTask: 'Добавить задачу',
  maxTasksReached: 'Максимум 3 задачи в день',
  streak: '{{count}} дней',

  // Week page
  weekSelector: 'Неделя {{week}}',
  mainTasks: 'Главные задачи недели',
  markAsMain: 'Отметить главной',
  unmarkAsMain: 'Убрать из главных',
  maxMainTasks: 'Максимум 3 главные задачи',
  needsSplit: 'Разделить',
  splitHint: 'Задача займёт >3 дней — разделите на части',
  moveToDay: 'Переместить на день',
  monday: 'Пн',
  tuesday: 'Вт',
  wednesday: 'Ср',
  thursday: 'Чт',
  friday: 'Пт',
  saturday: 'Сб',
  sunday: 'Вс',

  // Sprint page
  sprintTitle: 'Спринт',
  goals: 'Цели',
  goalProgress: '{{done}}/9 задач',
  habitStreak: '{{streak}} дней подряд',

  // Review page
  reviewTitle: 'Обзор недели',
  selectWeek: 'Выбрать неделю',
  weekStats: 'Статистика',
  completedTasks: 'Выполнено {{done}}/{{total}}',
  unfinishedTasks: 'Незавершённые задачи',
  carryOver: 'Перенести →',
  weekNote: 'Заметка о неделе',
  notePlaceholder: 'Что сработало? Что нужно улучшить?',
  calendarSync: 'Синхронизация с Google Calendar',
  comingSoon: 'Скоро',

  // Setup wizard
  setupTitle: 'Новый спринт',
  sprintInfo: 'Информация о спринте',
  sprintName: 'Название спринта',
  sprintNamePlaceholder: 'Q1 2024',
  startDate: 'Дата начала',
  nextStep: 'Далее',
  prevStep: 'Назад',
  finish: 'Завершить',

  goalsSetup: 'Три главные цели',
  goalTitle: 'Цель {{number}}',
  goalPlaceholder: 'Например: Запустить продукт',
  pickColor: 'Выбрать цвет',

  tasksSetup: 'Задачи для цели "{{goal}}"',
  taskForWeek: 'Неделя {{week}}',
  taskPlaceholder: 'Задача на неделю {{week}}',

  habitsSetup: 'Ежедневные привычки',
  habitFor: 'Привычка для цели "{{goal}}"',
  habitPlaceholder: 'Например: Медитация 10 минут',

  // Settings
  settings: 'Настройки',
  language: 'Язык',
  resetSprint: 'Сбросить спринт',
  resetConfirm: 'Удалить текущий спринт и все данные?',
  cancel: 'Отмена',
  confirm: 'Подтвердить',

  // Common
  done: 'Готово',
  notDone: 'Не готово',
  save: 'Сохранить',
  delete: 'Удалить',
  edit: 'Редактировать',
  loading: 'Загрузка...',
};

export type TranslationKeys = keyof typeof ru;
