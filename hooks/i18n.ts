// Тексты плагина на русском и английском
export type Lang = 'ru' | 'en'
// Настройка языка: авто — по языку системы
export type LangSetting = 'auto' | Lang

export const LANGS: readonly Lang[] = ['ru', 'en']

// Язык по коду культуры или локали: «ru-RU», «ru_RU.UTF-8» → ru, остальное → en
export const langFromLocale = (locale: string | undefined | null): Lang =>
  locale && /^ru([-_.]|$)/i.test(locale.trim()) ? 'ru' : 'en'

type Strings = {
  five: string
  week: string
  weekdays: readonly string[]
  tomorrow: string
  // Время в 12-часовом формате: часы (уже с ведущим нулём, если нужно), минуты, час 0–23
  time12: (hh: string, mm: string, m: number, h: number) => string
  reset: string
  waiting: string
  stale: string
  hidden: string
  shown: string
  help: string
  skinsTitle: string
  skinsHint: string
  skinNotFound: (q: string) => string
  skinChosen: (id: string, title: string) => string
  iconsState: (state: string) => string
  iconsOn: (icons: string) => string
  iconsOff: string
  langState: (setting: LangSetting, lang: Lang) => string
  langChosen: (setting: LangSetting, lang: Lang) => string
}

// Часть суток по-русски: «5 утра», «3 дня»
const dayPartRu = (h: number): string =>
  h < 4 ? 'ночи' : h < 12 ? 'утра' : h < 17 ? 'дня' : 'вечера'

export const STRINGS: Record<Lang, Strings> = {
  ru: {
    five: '5ч',
    week: '7д',
    weekdays: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
    tomorrow: 'завтра',
    time12: (hh, mm, m, h) => `${m === 0 ? hh : `${hh}:${mm}`} ${dayPartRu(h)}`,
    reset: 'сброшено',
    waiting: 'Лимиты: появятся после первого ответа Claude',
    stale: '(из прошлой сессии)',
    hidden: 'Полоска лимитов скрыта.',
    shown: 'Полоска лимитов показана.',
    help:
      'Команды: /limits — показать/скрыть полоску; /limits skin [номер|имя] — скины; ' +
      '/limits icons nerd|off — иконки Nerd Font; /limits lang ru|en|auto — язык.',
    skinsTitle: 'Скины полоски:',
    skinsHint: 'Выбрать: /limits skin <номер или имя>, например /limits skin 4',
    skinNotFound: q => `Скин «${q}» не найден.`,
    skinChosen: (id, title) => `Скин: ${id} — ${title}.`,
    iconsState: state =>
      `Иконки: ${state}. Включить: /limits icons nerd (нужен шрифт Nerd Font в терминале), выключить: /limits icons off.`,
    iconsOn: icons =>
      `Иконки Nerd Font включены: ${icons}. Если видны квадратики — в терминале не Nerd Font, выключите: /limits icons off.`,
    iconsOff: 'Иконки выключены.',
    langState: (setting, lang) =>
      `Язык: ${setting === 'auto' ? `авто (${lang})` : lang}. Сменить: /limits lang ru|en|auto.`,
    langChosen: (setting, lang) =>
      setting === 'auto' ? `Язык: авто, по языку системы (${lang}).` : 'Язык: русский.',
  },
  en: {
    five: '5h',
    week: '7d',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    tomorrow: 'tomorrow',
    time12: (hh, mm, m, h) => `${m === 0 ? hh : `${hh}:${mm}`} ${h < 12 ? 'am' : 'pm'}`,
    reset: 'reset',
    waiting: "Limits: will appear after Claude's first reply",
    stale: '(last session)',
    hidden: 'Limits bar hidden.',
    shown: 'Limits bar shown.',
    help:
      'Commands: /limits — show/hide the bar; /limits skin [number|name] — skins; ' +
      '/limits icons nerd|off — Nerd Font icons; /limits lang ru|en|auto — language.',
    skinsTitle: 'Bar skins:',
    skinsHint: 'Choose: /limits skin <number or name>, e.g. /limits skin 4',
    skinNotFound: q => `Skin "${q}" not found.`,
    skinChosen: (id, title) => `Skin: ${id} — ${title}.`,
    iconsState: state =>
      `Icons: ${state}. Turn on: /limits icons nerd (needs a Nerd Font in the terminal), turn off: /limits icons off.`,
    iconsOn: icons =>
      `Nerd Font icons on: ${icons}. If you see boxes, the terminal font is not a Nerd Font — turn them off: /limits icons off.`,
    iconsOff: 'Icons off.',
    langState: (setting, lang) =>
      `Language: ${setting === 'auto' ? `auto (${lang})` : lang}. Change: /limits lang ru|en|auto.`,
    langChosen: (setting, lang) =>
      setting === 'auto' ? `Language: auto, from the system language (${lang}).` : 'Language: English.',
  },
}
