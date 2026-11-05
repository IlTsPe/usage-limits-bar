import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Limits, TimeFormat, Window } from '../types'
import { CELLS, DEFAULT_SKIN, MAX_CELLS, MIN_CELLS, SKIN_SCHEMA, barParts, findSkin, migrateSkinId, skinById, skinsList } from './skins'
import { STRINGS, langFromLocale } from './i18n'
import type { Lang, LangSetting } from './i18n'

const STORE_KEY = 'last-limits'
const HIDDEN_KEY = 'hidden'
const SKIN_KEY = 'skin'
// Версия имён скинов в хранилище: до 2 — старые имена (segments, squares)
const SKIN_SCHEMA_KEY = 'skin-schema'
const ICONS_KEY = 'icons'
const WIDTH_KEY = 'width'
const COLORS_KEY = 'colors'
const SHOW_KEY = 'show'
const TIME_KEY = 'time'
const LANG_KEY = 'lang'
const CLOCK_KEY = 'clock'

const limits = atom({ plugin: 'usage-limits', key: 'limits' } as const, null, {
  shape: 'limits-1',
})
// Текущее время — обновляется раз в минуту, чтобы пересчитывать сброс окна
const now = atom({ plugin: 'usage-limits', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'usage-limits', key: 'isHidden' } as const, false)
// Формат времени и часовой пояс системы (читаются при запуске, из Intl)
const timeFmt = atom({ plugin: 'usage-limits', key: 'timeFmt' } as const, null)
// Выбранный скин полоски (id из skins.ts)
const skin = atom({ plugin: 'usage-limits', key: 'skin' } as const, DEFAULT_SKIN)
// Иконки Nerd Fonts (нужен шрифт Nerd Font в терминале)
const isNerd = atom({ plugin: 'usage-limits', key: 'isNerd' } as const, false)
// Настройки вида: длина полоски, пороги цветов, какие окна показывать, время сброса
const barWidth = atom({ plugin: 'usage-limits', key: 'barWidth' } as const, CELLS)
const colorWarn = atom({ plugin: 'usage-limits', key: 'colorWarn' } as const, 50)
const colorErr = atom({ plugin: 'usage-limits', key: 'colorErr' } as const, 80)
const showWindows = atom({ plugin: 'usage-limits', key: 'showWindows' } as const, 'both')
const showTime = atom({ plugin: 'usage-limits', key: 'showTime' } as const, true)
// Ручной выбор 12/24 часов: auto — как в системе
const clockSetting = atom({ plugin: 'usage-limits', key: 'clockSetting' } as const, 'auto')
// Язык системы — по региону (локали) среды выполнения
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

// Проверка формата показаний из хранилища: от старой версии или повреждённые — отбрасываем
const isWindow = (v: unknown): v is Window =>
  !!v &&
  typeof v === 'object' &&
  Number.isFinite((v as Window).percent) &&
  ((v as Window).resetsAt === null || Number.isFinite((v as Window).resetsAt))
export const isLimits = (v: unknown): v is Limits => {
  if (!v || typeof v !== 'object') return false
  const l = v as Limits
  return (
    Number.isFinite(l.at) &&
    (l.five === null || isWindow(l.five)) &&
    (l.week === null || isWindow(l.week)) &&
    (l.five !== null || l.week !== null)
  )
}

const colorOf = (percent: number, warn = 50, err = 80) =>
  percent >= err ? 'error' : percent >= warn ? 'warning' : 'success'

type Show = 'both' | '5h' | '7d'
const isShow = (v: unknown): v is Show => v === 'both' || v === '5h' || v === '7d'
const isWidth = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= MIN_CELLS && n <= MAX_CELLS
const isColors = (v: unknown): v is { warn: number; err: number } => {
  if (!v || typeof v !== 'object') return false
  const { warn, err } = v as { warn: unknown; err: unknown }
  return Number.isInteger(warn) && Number.isInteger(err) && (warn as number) >= 1 && (err as number) <= 100 && (warn as number) < (err as number)
}

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
  // Не «h»: в .tsx это имя занято — в него компилируется разметка JSX
  const hour = at.getUTCHours()
  const minute = at.getUTCMinutes()
  const mm = String(minute).padStart(2, '0')

  let time: string
  if (fmt.is24h) {
    time = `${fmt.isPadded ? String(hour).padStart(2, '0') : hour}:${mm}`
  } else {
    const hour12 = hour % 12 || 12
    const hh = fmt.isPadded ? String(hour12).padStart(2, '0') : String(hour12)
    time = t.time12(hh, mm, minute, hour)
  }

  // Разница в календарных днях по местному времени
  const dayOf = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000)
  const days = dayOf(at) - dayOf(today)
  if (days <= 0) return time
  if (days === 1) return `${t.tomorrow} ${time}`
  return `${t.weekdays[at.getUTCDay()]} ${time}`
}

// Формат по умолчанию, если Intl недоступен: 24 часа, пояс среды
const fallbackFormat = (): TimeFormat => ({
  is24h: true,
  isPadded: false,
  offsetMin: -new Date().getTimezoneOffset(),
})

// Настройки системы — без запуска программ: регион, язык, 12/24 часа и часовой пояс
// берутся из Intl и Date среды выполнения (она читает их из системы).
// Таблица смещений на 8 суток вперёд — чтобы перевод часов между «сейчас» и сбросом
// не сдвигал время на час (getTimezoneOffset учитывает летнее время для каждого момента)
export const readSystem = (nowMs: number): { fmt: TimeFormat; lang: Lang } => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    const hc = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle
    const is24h = hc === 'h23' || hc === 'h24'
    // Ведущий ноль: как система пишет 9:05 — «09:05» или «9:05»
    const nine = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, 9, 5))
    const isPadded = /^\D*0\d/.test(nine)
    const base = nowMs - (nowMs % HOUR)
    const list = Array.from({ length: 193 }, (_, i) => -new Date(base + i * HOUR).getTimezoneOffset())
    return {
      fmt: { is24h, isPadded, offsetMin: -new Date(nowMs).getTimezoneOffset(), offsets: { base, list } },
      lang: langFromLocale(locale),
    }
  } catch {
    return { fmt: fallbackFormat(), lang: 'en' }
  }
}

// Ручной выбор 12/24 часов (/limits clock) поверх системного формата
type Clock = 'auto' | '12' | '24'
const isClock = (v: unknown): v is Clock => v === 'auto' || v === '12' || v === '24'
const withClock = (fmt: TimeFormat, clock: Clock): TimeFormat =>
  clock === 'auto' ? fmt : { ...fmt, is24h: clock === '24' }

// Те же цифры, что уже показаны: окна совпадают по проценту и времени сброса
const sameLimits = (a: Limits | null, b: Limits): boolean =>
  !!a && !a.isStale && JSON.stringify([a.five, a.week]) === JSON.stringify([b.five, b.week])

// Принимает свежие окна лимитов: сохраняет, только если что-то изменилось
async function refresh($: EngineInterface, list: readonly SessionRateLimit[]) {
  const at = await $.clock.now()
  await update($, now, () => at)
  const fresh = fromRateLimits(list, at)
  if (fresh && !sameLimits(await read($, limits), fresh)) await save($, fresh)
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
      description: 'Usage limits bar / Полоска лимитов: show/hide · skin · icons · lang · width · colors · show · time · clock · debug',
      argumentHint: '[skin [n|name] | icons nerd|off | lang ru|en|auto | width 4…16 | colors 50 80 | show both|5h|7d | time on|off | clock 12|24|auto | debug]',
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
    // Регион, язык, формат времени и часовой пояс — из системы, без запуска программ
    const system = readSystem(at)
    await update($, timeFmt, () => system.fmt)
    await update($, sysLang, () => system.lang)
    const storedClock = await $.store.get(CLOCK_KEY)
    await update($, clockSetting, () => (isClock(storedClock) ? storedClock : 'auto'))
    // Настройки вида: значение из хранилища, если оно корректное, иначе по умолчанию
    const storedWidth = await $.store.get(WIDTH_KEY)
    await update($, barWidth, () => (isWidth(storedWidth) ? storedWidth : CELLS))
    const storedColors = await $.store.get(COLORS_KEY)
    await update($, colorWarn, () => (isColors(storedColors) ? storedColors.warn : 50))
    await update($, colorErr, () => (isColors(storedColors) ? storedColors.err : 80))
    const storedShow = await $.store.get(SHOW_KEY)
    await update($, showWindows, () => (isShow(storedShow) ? storedShow : 'both'))
    const storedTime = await $.store.get(TIME_KEY)
    await update($, showTime, () => storedTime !== 'off')
    let storedSkin = await $.store.get(SKIN_KEY)
    // Выбор, сохранённый под старыми именами, переводим на новые один раз
    if ((await $.store.get(SKIN_SCHEMA_KEY)) !== SKIN_SCHEMA) {
      if (typeof storedSkin === 'string') {
        storedSkin = migrateSkinId(storedSkin)
        await $.store.set(SKIN_KEY, storedSkin)
      }
      await $.store.set(SKIN_SCHEMA_KEY, SKIN_SCHEMA)
    }
    await update($, skin, () => skinById(typeof storedSkin === 'string' ? storedSkin : undefined).id)

    // Сначала — свежие данные движка, если уже есть
    const usage = await $.session.usage()
    const fresh = fromRateLimits(usage.rateLimits, at)
    if (fresh) {
      await save($, fresh)
    } else {
      // Иначе — последнее показание из прошлой сессии, помеченное как устаревшее
      const stored = await $.store.get(STORE_KEY)
      if (isLimits(stored)) {
        await update($, limits, () => ({ five: stored.five, week: stored.week, at: stored.at, isStale: true }))
      }
    }

    timer?.cancel()
    // Раз в минуту: обновить «сегодня/завтра» у времени сброса и перечитать последние цифры
    // движка (бесплатный вызов) — подхватывает ответы фоновых агентов и сдвиги меньше пункта
    timer = $.clock.every(60_000, () => {
      void $.session
        .usage()
        .then(u => refresh($, u.rateLimits))
        .catch(() => {
          // сессия закрывается — следующий замер придёт со следующим ответом
        })
    })

    return next(e)
  })

  // Цифры берём при каждом замере (после каждого ответа), а не только когда движок
  // отметил «rateLimits»: он отмечает это лишь при сдвиге на целый пункт, и полоска
  // отставала (19% при 19,6% на сервере, а /usage уже показывал 20%)
  on('session.measure', async ($, e, next) => {
    await refresh($, e.rateLimits)
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
      const cells = await read($, barWidth)
      if (!query) return { text: skinsList(current, sample, lang, cells) }
      const chosen = findSkin(query)
      if (!chosen) return { text: `${t.skinNotFound(query)}\n\n${skinsList(current, sample, lang, cells)}` }
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
    // /limits width 4…16
    if (sub.toLowerCase() === 'width') {
      const n = Number(rest[0])
      if (!rest[0] || !isWidth(n)) return { text: t.widthState(await read($, barWidth)) }
      await update($, barWidth, () => n)
      await $.store.set(WIDTH_KEY, n)
      return { text: t.widthSet(n) }
    }
    // /limits colors <жёлтый> <красный>
    if (sub.toLowerCase() === 'colors') {
      if (rest.length === 0) return { text: t.colorsState(await read($, colorWarn), await read($, colorErr)) }
      const v = { warn: Number(rest[0]), err: Number(rest[1]) }
      if (!isColors(v)) return { text: t.colorsBad }
      await update($, colorWarn, () => v.warn)
      await update($, colorErr, () => v.err)
      await $.store.set(COLORS_KEY, v)
      return { text: t.colorsSet(v.warn, v.err) }
    }
    // /limits show both|5h|7d
    if (sub.toLowerCase() === 'show') {
      const mode = (rest[0] ?? '').toLowerCase()
      if (!isShow(mode)) return { text: t.showState(t.showNames[await read($, showWindows) as Show]) }
      await update($, showWindows, () => mode)
      await $.store.set(SHOW_KEY, mode)
      return { text: t.showSet(t.showNames[mode]) }
    }
    // /limits time on|off
    if (sub.toLowerCase() === 'time') {
      const mode = (rest[0] ?? '').toLowerCase()
      if (mode !== 'on' && mode !== 'off') return { text: t.timeState(await read($, showTime)) }
      await update($, showTime, () => mode === 'on')
      await $.store.set(TIME_KEY, mode)
      return { text: t.timeSet(mode === 'on') }
    }
    // /limits clock 12|24|auto
    if (sub.toLowerCase() === 'clock') {
      const mode = (rest[0] ?? '').toLowerCase()
      if (!isClock(mode)) return { text: t.clockState((await read($, clockSetting)) as Clock) }
      await update($, clockSetting, () => mode)
      await $.store.set(CLOCK_KEY, mode)
      return { text: t.clockSet(mode) }
    }
    // /limits debug — точные значения с десятыми и время получения
    if (sub.toLowerCase() === 'debug') {
      const data = await read($, limits)
      const fmt = withClock((await read($, timeFmt)) ?? fallbackFormat(), (await read($, clockSetting)) as Clock)
      const nowMs = await $.clock.now()
      const row = (label: string, w: Window | null) =>
        w
          ? `${label}: ${w.percent}%` + (w.resetsAt !== null ? ` · ${t.debugReset} ${resetText(w.resetsAt, nowMs, fmt, lang)}` : '')
          : `${label}: —`
      if (!data) return { text: t.waiting }
      // Менялись — когда пришли другие цифры; проверены — последний перечитанный замер
      const changed = Math.max(0, Math.round((nowMs - data.at) / 1000))
      const checked = Math.max(0, Math.round((nowMs - ((await read($, now)) || nowMs)) / 1000))
      return {
        text: [row(t.five, data.five), row(t.week, data.week), t.debugAge(changed, checked, data.isStale)].join('\n'),
      }
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
    const fmt = withClock((await read($, timeFmt)) ?? fallbackFormat(), (await read($, clockSetting)) as Clock)
    const look = skinById(await read($, skin))
    const nerd = await read($, isNerd)
    const lang = langOf(await read($, langSetting), await read($, sysLang))
    const tr = STRINGS[lang]
    const cells = await read($, barWidth)
    const warn = await read($, colorWarn)
    const err = await read($, colorErr)
    const show = (await read($, showWindows)) as Show
    const timeOn = await read($, showTime)

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
      const [filled, empty] = barParts(percent, look, cells)
      const pct = ` ${Math.round(percent)}%`
      return {
        width: headText.length + filled.length + empty.length + pct.length + tail.length,
        node: (
          <Text>
            {head}
            <Text color={colorOf(percent, warn, err)}>{filled}</Text>
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
    // Какие окна показывать (/limits show) и со временем сброса ли (/limits time)
    const windows = [
      ...(show !== '7d' ? [{ icon: NERD.clock, label: tr.five, w: data.five }] : []),
      ...(show !== '5h' ? [{ icon: NERD.calendar, label: tr.week, w: data.week }] : []),
    ]
    const layout = () => {
      for (const withTail of timeOn ? [true, false] : [false]) {
        const cells = windows.map(x => cell(x.icon, x.label, x.w, withTail))
        const width = cells.reduce((sum, c) => sum + c.width, 0) + SEP.length * (cells.length - 1)
        if (width <= room) {
          const stale = data.isStale && width + STALE.length <= room
          return { cells, stale }
        }
      }
      // Совсем узко — только первое окно без времени сброса
      const first = windows[0] as (typeof windows)[number]
      return { cells: [cell(first.icon, first.label, first.w, false)], stale: false }
    }
    const shown = layout()

    return (
      <Box paddingLeft={2}>
        {/* Разделитель блоков: «│» — псевдографика, есть во всех стандартных шрифтах */}
        {shown.cells.map((c, i) => (i === 0 ? c.node : [<Text dimColor>{SEP}</Text>, c.node]))}
        {shown.stale && <Text dimColor>{STALE}</Text>}
      </Box>
    )
  })
}
