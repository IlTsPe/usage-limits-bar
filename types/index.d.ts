// Одно окно лимита: процент расхода и время сброса (мс от эпохи)
export type Window = { percent: number; resetsAt: number | null }

// Последнее известное состояние лимитов
export type Limits = {
  five: Window | null
  week: Window | null
  // когда получены данные (мс от эпохи)
  at: number
  // true — данные из прошлой сессии, ещё не подтверждены ответом API
  isStale: boolean
}

// Системный формат времени пользователя
export type TimeFormat = {
  // true — 24-часовой формат (в шаблоне есть «H»)
  is24h: boolean
  // true — часы с ведущим нулём («HH:mm» / «hh:mm»)
  isPadded: boolean
  // смещение местного времени от UTC, минуты (на момент запуска)
  offsetMin: number
  // почасовая таблица смещений на 8 суток вперёд (Windows): base — начало, мс UTC
  offsets?: { base: number; list: number[] }
}

declare module 'claude-code' {
  interface PluginState {
    'usage-limits': {
      limits: Shaped<Limits | null>
      now: number
      isHidden: boolean
      timeFmt: TimeFormat | null
      skin: string
      isNerd: boolean
      sysLang: 'ru' | 'en'
      langSetting: 'auto' | 'ru' | 'en'
    }
  }
}
