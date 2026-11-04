import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Limits, TimeFormat, Window } from '../types'
import { DEFAULT_SKIN, barParts, findSkin, skinById, skinsList } from './skins'

const STORE_KEY = 'last-limits'
const HIDDEN_KEY = 'hidden'
const SKIN_KEY = 'skin'
const ICONS_KEY = 'icons'

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

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

// Часть суток для 12-часового формата: «5 утра», «3 дня»
const dayPart = (h: number): string =>
  h < 4 ? 'ночи' : h < 12 ? 'утра' : h < 17 ? 'дня' : 'вечера'

// Время сброса в формате пользователя: «5:00», «завтра 05:00», «сб 17:00», «5 утра»
export const resetText = (resetsAt: number, nowMs: number, fmt: TimeFormat): string => {
  const shift = fmt.offsetMin * 60_000
  const at = new Date(resetsAt + shift)
  const today = new Date(nowMs + shift)
  const h = at.getUTCHours()
  const m = at.getUTCMinutes()
  const mm = String(m).padStart(2, '0')

  let time: string
  if (fmt.is24h) {
    time = `${fmt.isPadded ? String(h).padStart(2, '0') : h}:${mm}`
  } else {
    const h12 = h % 12 || 12
    const hh = fmt.isPadded ? String(h12).padStart(2, '0') : String(h12)
    time = `${m === 0 ? hh : `${hh}:${mm}`} ${dayPart(h)}`
  }

  // Разница в календарных днях по местному времени
  const dayOf = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000)
  const days = dayOf(at) - dayOf(today)
  if (days <= 0) return time
  if (days === 1) return `завтра ${time}`
  return `${WEEKDAYS[at.getUTCDay()]} ${time}`
}

// Разбирает вывод PowerShell: шаблон короткого времени и смещение от UTC в минутах
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

// Формат по умолчанию, если Windows ответить не смог: 24 часа, пояс среды
const fallbackFormat = (): TimeFormat => ({
  is24h: true,
  isPadded: false,
  offsetMin: -new Date().getTimezoneOffset(),
})

// Читает формат времени и часовой пояс из настроек пользователя Windows
async function loadTimeFormat($: EngineInterface): Promise<TimeFormat> {
  try {
    const { exitCode, stdout } = await $.process.run(
      [
        'powershell',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(Get-Culture).DateTimeFormat.ShortTimePattern; [int][TimeZoneInfo]::Local.GetUtcOffset([DateTime]::UtcNow).TotalMinutes',
      ],
      { timeoutMs: 10_000 },
    )
    if (exitCode === 0) return parseTimeFormat(stdout) ?? fallbackFormat()
  } catch {
    // не Windows или PowerShell недоступен
  }
  return fallbackFormat()
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
      description: 'Полоска лимитов: без аргументов — показать/скрыть; skin — скин; icons — иконки Nerd Font',
      argumentHint: '[skin [номер|имя] | icons nerd|off]',
    })

    const at = await $.clock.now()
    await update($, now, () => at)
    await update($, isHidden, () => false)
    if ((await $.store.get(HIDDEN_KEY)) === true) {
      await update($, isHidden, () => true)
    }
    await update($, isNerd, () => false)
    if ((await $.store.get(ICONS_KEY)) === 'nerd') await update($, isNerd, () => true)
    const storedSkin = await $.store.get(SKIN_KEY)
    await update($, skin, () => skinById(typeof storedSkin === 'string' ? storedSkin : undefined).id)

    // Формат времени читаем в фоне, чтобы не задерживать запуск
    void loadTimeFormat($).then(fmt => update($, timeFmt, () => fmt))

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

    // /limits skin [номер|имя]
    if (sub.toLowerCase() === 'skin') {
      const current = await read($, skin)
      const sample = (await read($, limits))?.five?.percent ?? 40
      const query = rest.join(' ')
      if (!query) return { text: skinsList(current, sample) }
      const chosen = findSkin(query)
      if (!chosen) return { text: `Скин «${query}» не найден.

${skinsList(current, sample)}` }
      await update($, skin, () => chosen.id)
      await $.store.set(SKIN_KEY, chosen.id)
      return { text: `Скин: ${chosen.id} — ${chosen.title}.` }
    }
    // /limits icons nerd|off
    if (sub.toLowerCase() === 'icons') {
      const mode = (rest[0] ?? '').toLowerCase()
      if (mode !== 'nerd' && mode !== 'off') {
        const state = (await read($, isNerd)) ? 'nerd' : 'off'
        return { text: `Иконки: ${state}. Включить: /limits icons nerd (нужен шрифт Nerd Font в терминале), выключить: /limits icons off.` }
      }
      await update($, isNerd, () => mode === 'nerd')
      await $.store.set(ICONS_KEY, mode)
      return {
        text: mode === 'nerd'
          ? `Иконки Nerd Font включены: ${NERD.clock} ${NERD.calendar} ${NERD.refresh}. Если видны квадратики — в терминале не Nerd Font, выключите: /limits icons off.`
          : 'Иконки выключены.',
      }
    }
    if (sub) {
      return { text: 'Команды: /limits — показать/скрыть полоску; /limits skin [номер|имя] — скины; /limits icons nerd|off — иконки Nerd Font.' }
    }

    const hidden = !(await read($, isHidden))
    await update($, isHidden, () => hidden)
    await $.store.set(HIDDEN_KEY, hidden)
    return { text: hidden ? 'Полоска лимитов скрыта.' : 'Полоска лимитов показана.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const data = await read($, limits)
    const t = (await read($, now)) || (await $.clock.now())
    const fmt = (await read($, timeFmt)) ?? fallbackFormat()
    const look = skinById(await read($, skin))
    const nerd = await read($, isNerd)

    if (!data) {
      return (
        <Box paddingLeft={2}>
          <Text dimColor>Лимиты: появятся после первого ответа Claude</Text>
        </Box>
      )
    }

    const cell = (icon: string, label: string, w: Window | null) => {
      const head = (
        <Text color="warning" bold>
          {nerd ? `${icon} ` : ''}{label}{' '}
        </Text>
      )
      if (!w) {
        return (
          <Text>
            {head}
            <Text dimColor>—{'   '}</Text>
          </Text>
        )
      }
      // Окно уже сбросилось, а свежих данных ещё нет
      const isReset = w.resetsAt !== null && w.resetsAt <= t
      const percent = isReset ? 0 : w.percent
      const tail = isReset
        ? ' · сброшено'
        : w.resetsAt !== null
          ? ` · ${nerd ? NERD.refresh : PLAIN_RESET} ${resetText(w.resetsAt, t, fmt)}`
          : ''
      const [filled, empty] = barParts(percent, look)
      return (
        <Text>
          {head}
          <Text color={colorOf(percent)}>{filled}</Text>
          <Text color="inactive">{empty}</Text>
          <Text> {Math.round(percent)}%</Text>
          <Text dimColor>{tail}{'   '}</Text>
        </Text>
      )
    }

    return (
      <Box paddingLeft={2}>
        {cell(NERD.clock, '5ч', data.five)}
        {cell(NERD.calendar, '7д', data.week)}
        {data.isStale && <Text dimColor>(из прошлой сессии)</Text>}
      </Box>
    )
  })
}
