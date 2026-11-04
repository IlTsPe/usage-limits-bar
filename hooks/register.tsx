import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Limits, TimeFormat, Window } from '../types'
import { DEFAULT_SKIN, barParts, findSkin, skinById, skinsList } from './skins'
import { STRINGS, langFromLocale } from './i18n'
import type { Lang, LangSetting } from './i18n'

const STORE_KEY = 'last-limits'
const HIDDEN_KEY = 'hidden'
const SKIN_KEY = 'skin'
const ICONS_KEY = 'icons'
const LANG_KEY = 'lang'
// Последний язык системы — чтобы при запуске сразу показать нужный язык
const SYS_LANG_KEY = 'sys-lang'

const limits = atom({ plugin: 'usage-limits', key: 'limits' } as const, null, {
  shape: 'limits-1',
})
// Текущее время — обновляется раз в минуту, чтобы пересчитывать сброс окна
const now = atom({ plugin: 'usage-limits', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'usage-limits', key: 'isHidden' } as const, false)
// Формат времени из настроек Windows (читается при запуске)
const timeFmt = atom({ plugin: 'usage-limits', key: 'timeFmt' } as const, null)
// Выбранный скин полоски (id из skins.ts)
const skin = atom({ plugin: 'usage-limits', key: 'skin' } as const, DEFAULT_SKIN)
// Иконки Nerd Fonts (нужен шрифт Nerd Font в терминале)
const isNerd = atom({ plugin: 'usage-limits', key: 'isNerd' } as const, false)
// Язык системы (Windows — региональные настройки, macOS/Linux — LANG)
const sysLang = atom({ plugin: 'usage-limits', key: 'sysLang' } as const, 'en')
// Выбор пользователя: auto — по языку системы
const langSetting = atom({ plugin: 'usage-limits', key: 'langSetting' } as const, 'auto')

// Иконки Font Awesome из Nerd Fonts: часы, календарь, обновление.
// Только из основной плоскости Unicode (U+E000–U+F8FF): значки выше U+FFFF
// терминал и Claude Code считают разной ширины, и строка съезжает
const NERD = { clock: '\uF017', calendar: '\uF133', refresh: '\uF021' }
// Значок перед временем сброса без Nerd Font — есть во всех стандартных шрифтах
const PLAIN_RESET = '↕'

const toWindow = (list: readonly SessionRateLimit[], kind: string): Window | null => {
  const one = list.find(w => w.kind === kind)
  if (!one) return null
  const resetsAt = one.resetsAt ? Date.parse(one.resetsAt) : NaN
  return { percent: one.percentUsed, resetsAt: Number.isNaN(resetsAt) ? null : resetsAt }
}

const fromRateLimits = (list: readonly SessionRateLimit[], at: number): Limits | null => {
  const five = toWindow(list, 'five_hour')
  const week = toWindow(list, 'seven_day')
  if (!five && !week) return null
  return { five, week, at, isStale: false }
}

const colorOf = (percent: number) =>
  percent >= 80 ? 'error' : percent >= 50 ? 'warning' : 'success'

// Итоговый язык: выбор пользователя или язык системы
const langOf = (setting: LangSetting, system: Lang): Lang => (setting === 'auto' ? system : setting)

const isLangSetting = (v: unknown): v is LangSetting => v === 'auto' || v === 'ru' || v === 'en'

const HOUR = 3_600_000

// Смещение от UTC (минуты), действующее в момент ts: по почасовой таблице из Windows,
// чтобы переход на летнее/зимнее время между «сейчас» и сбросом не сдвигал время на час.
// Вне таблицы (не Windows или сессия дольше 8 суток) — смещение на момент запуска
export const offsetAt = (fmt: TimeFormat, ts: number): number => {
  const tz = fmt.offsets
  if (!tz) return fmt.offsetMin
  const i = Math.floor((ts - tz.base) / HOUR)
  return i >= 0 && i < tz.list.length ? (tz.list[i] as number) : fmt.offsetMin
}

// Время сброса в формате пользователя: «5:00», «завтра 05:00», «сб 17:00», «5 утра» / «tomorrow 5 am»
export const resetText = (resetsAt: number, nowMs: number, fmt: TimeFormat, lang: Lang): string => {
  const t = STRINGS[lang]
  const at = new Date(resetsAt + offsetAt(fmt, resetsAt) * 60_000)
  const today = new Date(nowMs + offsetAt(fmt, nowMs) * 60_000)
  const h = at.getUTCHours()
  const m = at.getUTCMinutes()
  const mm = String(m).padStart(2, '0')

  let time: string
  if (fmt.is24h) {
    time = `${fmt.isPadded ? String(h).padStart(2, '0') : h}:${mm}`
  } else {
    const h12 = h % 12 || 12
    const hh = fmt.isPadded ? String(h12).padStart(2, '0') : String(h12)
    time = t.time12(hh, mm, m, h)
  }

  // Разница в календарных днях по местному времени
  const dayOf = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000)
  const days = dayOf(at) - dayOf(today)
  if (days <= 0) return time
  if (days === 1) return `${t.tomorrow} ${time}`
  return `${t.weekdays[at.getUTCDay()]} ${time}`
}

// Разбирает вывод PowerShell: шаблон короткого времени и смещение от UTC в минутах (строки 1–2)
export const parseTimeFormat = (stdout: string): TimeFormat | null => {
  const [pattern, offset] = stdout.split(/\r?\n/).map(s => s.trim())
  const offsetMin = Number(offset)
  if (!pattern || !Number.isFinite(offsetMin)) return null
  return {
    is24h: pattern.includes('H'),
    isPadded: /HH|hh/.test(pattern),
    offsetMin,
  }
}

// Почасовая таблица смещений — строки 4–5 вывода PowerShell: начало (мс UTC) и смещения через запятую
export const parseOffsets = (stdout: string): TimeFormat['offsets'] => {
  const lines = stdout.split(/\r?\n/).map(s => s.trim())
  const base = Number(lines[3])
  const list = (lines[4] ?? '').split(',').map(Number)
  if (!Number.isFinite(base) || list.length === 0 || list.some(n => !Number.isFinite(n))) return undefined
  return { base, list }
}

// Формат по умолчанию, если Windows ответить не смог: 24 часа, пояс среды
const fallbackFormat = (): TimeFormat => ({
  is24h: true,
  isPadded: false,
  offsetMin: -new Date().getTimezoneOffset(),
})

// Язык по региональным настройкам Windows (Get-Culture) — третья строка вывода PowerShell.
// Не язык интерфейса: многие ставят английскую Windows, но русский формат даты и времени
export const parseUiLang = (stdout: string): Lang | null => {
  const ui = stdout.split(/\r?\n/).map(s => s.trim())[2]
  return ui ? langFromLocale(ui) : null
}

// Читает формат времени, часовой пояс и язык из региональных настроек Windows;
// вне Windows — язык из LANG, формат по умолчанию
async function loadSystem($: EngineInterface): Promise<{ fmt: TimeFormat; lang: Lang }> {
  try {
    const { exitCode, stdout } = await $.process.run(
      [
        'powershell',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        // Строки: формат времени; смещение сейчас; регион; начало таблицы (мс UTC, ровный час);
        // смещения на каждый час ближайших 8 суток
        '(Get-Culture).DateTimeFormat.ShortTimePattern; ' +
          '[int][TimeZoneInfo]::Local.GetUtcOffset([DateTime]::UtcNow).TotalMinutes; ' +
          '(Get-Culture).Name; ' +
          '$b = [DateTime]::UtcNow; $b = $b.AddTicks(-($b.Ticks % 36000000000)); ' +
          '[long]($b - [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)).TotalMilliseconds; ' +
          "((0..192) | ForEach-Object { [int][TimeZoneInfo]::Local.GetUtcOffset($b.AddHours($_)).TotalMinutes }) -join ','",
      ],
      { timeoutMs: 10_000 },
    )
    if (exitCode === 0) {
      const parsed = parseTimeFormat(stdout)
      const lang = parseUiLang(stdout)
      const offsets = parseOffsets(stdout)
      if (parsed && lang) return { fmt: offsets ? { ...parsed, offsets } : parsed, lang }
    }
  } catch {
    // не Windows или PowerShell недоступен
  }
  return { fmt: fallbackFormat(), lang: langFromLocale(await $.env.get('LANG')) }
}

// Сохраняет показания и в состояние сессии, и в хранилище (для следующего запуска)
async function save($: EngineInterface, value: Limits) {
  await update($, limits, () => value)
  await $.store.set(STORE_KEY, value)
}

export const register: Register = on => {
  let timer: { cancel: () => void } | null = null

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'limits',
      description: 'Usage limits bar / Полоска лимитов: show/hide · skin · icons · lang',
      argumentHint: '[skin [n|name] | icons nerd|off | lang ru|en|auto]',
    })

    const at = await $.clock.now()
    await update($, now, () => at)
    await update($, isHidden, () => false)
    if ((await $.store.get(HIDDEN_KEY)) === true) {
      await update($, isHidden, () => true)
    }
    await update($, isNerd, () => false)
    if ((await $.store.get(ICONS_KEY)) === 'nerd') await update($, isNerd, () => true)
    const storedLang = await $.store.get(LANG_KEY)
    await update($, langSetting, () => (isLangSetting(storedLang) ? storedLang : 'auto'))
    const storedSys = await $.store.get(SYS_LANG_KEY)
    await update($, sysLang, () => (storedSys === 'ru' || storedSys === 'en' ? storedSys : 'en'))
    const storedSkin = await $.store.get(SKIN_KEY)
    await update($, skin, () => skinById(typeof storedSkin === 'string' ? storedSkin : undefined).id)

    // Формат времени и язык системы читаем в фоне, чтобы не задерживать запуск
    void loadSystem($).then(async ({ fmt, lang }) => {
      await update($, timeFmt, () => fmt)
      await update($, sysLang, () => lang)
      await $.store.set(SYS_LANG_KEY, lang)
    })

    // Сначала — свежие данные движка, если уже есть
    const usage = await $.session.usage()
    const fresh = fromRateLimits(usage.rateLimits, at)
    if (fresh) {
      await save($, fresh)
    } else {
      // Иначе — последнее показание из прошлой сессии, помеченное как устаревшее
      const stored = (await $.store.get(STORE_KEY)) as Limits | undefined
      if (stored && typeof stored === 'object' && 'at' in stored) {
        await update($, limits, () => ({ ...stored, isStale: true }))
      }
    }

    timer?.cancel()
    timer = $.clock.every(60_000, () => {
      void $.clock.now().then(t => update($, now, () => t))
    })

    return next(e)
  })

  // Движок присылает показания после каждого ответа и при сдвиге окна на 1%
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      const at = await $.clock.now()
      const fresh = fromRateLimits(e.rateLimits, at)
      if (fresh) await save($, fresh)
      await update($, now, () => at)
    }
    return next(e)
  })

  on('command.run', { command: 'limits' }, async ($, e) => {
    const [sub = '', ...rest] = e.args.trim().split(/\s+/)
    const lang = langOf(await read($, langSetting), await read($, sysLang))
    const t = STRINGS[lang]

    // /limits skin [номер|имя]
    if (sub.toLowerCase() === 'skin') {
      const current = await read($, skin)
      const sample = (await read($, limits))?.five?.percent ?? 40
      const query = rest.join(' ')
      if (!query) return { text: skinsList(current, sample, lang) }
      const chosen = findSkin(query)
      if (!chosen) return { text: `${t.skinNotFound(query)}\n\n${skinsList(current, sample, lang)}` }
      await update($, skin, () => chosen.id)
      await $.store.set(SKIN_KEY, chosen.id)
      return { text: t.skinChosen(chosen.id, chosen.title[lang]) }
    }
    // /limits icons nerd|off
    if (sub.toLowerCase() === 'icons') {
      const mode = (rest[0] ?? '').toLowerCase()
      if (mode !== 'nerd' && mode !== 'off') {
        const state = (await read($, isNerd)) ? 'nerd' : 'off'
        return { text: t.iconsState(state) }
      }
      await update($, isNerd, () => mode === 'nerd')
      await $.store.set(ICONS_KEY, mode)
      return {
        text: mode === 'nerd' ? t.iconsOn(`${NERD.clock} ${NERD.calendar} ${NERD.refresh}`) : t.iconsOff,
      }
    }
    // /limits lang ru|en|auto
    if (sub.toLowerCase() === 'lang') {
      const mode = (rest[0] ?? '').toLowerCase()
      if (!isLangSetting(mode)) return { text: t.langState(await read($, langSetting), lang) }
      await update($, langSetting, () => mode)
      await $.store.set(LANG_KEY, mode)
      const chosen = langOf(mode, await read($, sysLang))
      return { text: STRINGS[chosen].langChosen(mode, chosen) }
    }
    if (sub) return { text: t.help }

    const hidden = !(await read($, isHidden))
    await update($, isHidden, () => hidden)
    await $.store.set(HIDDEN_KEY, hidden)
    return { text: hidden ? t.hidden : t.shown }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const data = await read($, limits)
    const t = (await read($, now)) || (await $.clock.now())
    const fmt = (await read($, timeFmt)) ?? fallbackFormat()
    const look = skinById(await read($, skin))
    const nerd = await read($, isNerd)
    const lang = langOf(await read($, langSetting), await read($, sysLang))
    const tr = STRINGS[lang]

    if (!data) {
      return (
        <Box paddingLeft={2}>
          <Text dimColor>{tr.waiting}</Text>
        </Box>
      )
    }

    // Ячейка окна лимита: узел и его ширина в символах (все символы шириной в одну ячейку)
    const cell = (icon: string, label: string, w: Window | null, withTail: boolean) => {
      const headText = `${nerd ? `${icon} ` : ''}${label} `
      const head = (
        <Text color="warning" bold>
          {headText}
        </Text>
      )
      if (!w) {
        return {
          width: headText.length + 1,
          node: (
            <Text>
              {head}
              <Text dimColor>—</Text>
            </Text>
          ),
        }
      }
      // Окно уже сбросилось, а свежих данных ещё нет
      const isReset = w.resetsAt !== null && w.resetsAt <= t
      const percent = isReset ? 0 : w.percent
      const fullTail = isReset
        ? ` · ${tr.reset}`
        : w.resetsAt !== null
          ? ` · ${nerd ? NERD.refresh : PLAIN_RESET} ${resetText(w.resetsAt, t, fmt, lang)}`
          : ''
      const tail = withTail ? fullTail : ''
      const [filled, empty] = barParts(percent, look)
      const pct = ` ${Math.round(percent)}%`
      return {
        width: headText.length + filled.length + empty.length + pct.length + tail.length,
        node: (
          <Text>
            {head}
            <Text color={colorOf(percent)}>{filled}</Text>
            <Text color="inactive">{empty}</Text>
            <Text>{pct}</Text>
            <Text dimColor>{tail}</Text>
          </Text>
        ),
      }
    }

    // Узкое окно: полная строка → без времени сброса → только 5ч.
    // Ширина — колонки полосы минус отступ слева (2)
    const room = (e.props.bodyColumns ?? 200) - 2
    const SEP = ' │ '
    const STALE = `   ${tr.stale}`
    const layout = () => {
      for (const withTail of [true, false]) {
        const five = cell(NERD.clock, tr.five, data.five, withTail)
        const week = cell(NERD.calendar, tr.week, data.week, withTail)
        const width = five.width + SEP.length + week.width
        if (width <= room) {
          const stale = data.isStale && width + STALE.length <= room
          return { five, week: week as typeof week | null, stale }
        }
      }
      return { five: cell(NERD.clock, tr.five, data.five, false), week: null, stale: false }
    }
    const shown = layout()

    return (
      <Box paddingLeft={2}>
        {shown.five.node}
        {/* Разделитель блоков: «│» — псевдографика, есть во всех стандартных шрифтах */}
        {shown.week && <Text dimColor>{SEP}</Text>}
        {shown.week?.node}
        {shown.stale && <Text dimColor>{STALE}</Text>}
      </Box>
    )
  })
}
