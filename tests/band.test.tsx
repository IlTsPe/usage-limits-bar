import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'usage-limits',
  component: 'AbovePrompt',
  props: { hasSurvey: false },
  surface: 'terminal',
} as const

// Среда, 04.11.2026 10:00 UTC
const NOW = Date.parse('2026-11-04T10:00:00Z')
const RESET_5H = '2026-11-04T12:10:00Z'
const RESET_7D = '2026-11-07T14:00:00Z'

const RATE_LIMITS = [
  { kind: 'five_hour', percentUsed: 4, resetsAt: RESET_5H },
  { kind: 'seven_day', percentUsed: 36, resetsAt: RESET_7D },
]

// Ожидаемое время сброса — по часовому поясу машины, где идут тесты (плагин берёт его
// из той же среды), с теми же правилами, что в плагине
const WEEKDAYS = { ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
const padded = /^\D*0\d/.test(
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, 9, 5)),
)
const dayPartRu = (hour: number) => (hour < 4 ? 'ночи' : hour < 12 ? 'утра' : hour < 17 ? 'дня' : 'вечера')
const expected = (iso: string, lang: 'ru' | 'en', clock: '12' | '24') => {
  const d = new Date(iso)
  const hour = d.getHours()
  const minute = d.getMinutes()
  const mm = String(minute).padStart(2, '0')
  let time: string
  if (clock === '24') {
    time = `${padded ? String(hour).padStart(2, '0') : hour}:${mm}`
  } else {
    const h12 = String(hour % 12 || 12)
    const hh = padded ? h12.padStart(2, '0') : h12
    const tail = lang === 'ru' ? dayPartRu(hour) : hour < 12 ? 'am' : 'pm'
    time = `${minute === 0 ? hh : `${hh}:${mm}`} ${tail}`
  }
  const now = new Date(NOW)
  const dayOf = (x: Date) => Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 86_400_000)
  const days = dayOf(d) - dayOf(now)
  if (days <= 0) return time
  if (days === 1) return `${lang === 'ru' ? 'завтра' : 'tomorrow'} ${time}`
  return `${WEEKDAYS[lang][d.getDay()]} ${time}`
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const runtimeLang = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('ru') ? 'ru' : 'en'

// Язык и формат времени задаются явно через сохранённые настройки — тесты не зависят
// от региона машины
const setup = (
  on: Parameters<Parameters<typeof test>[1]>[1],
  clock: '12' | '24' = '24',
  lang: 'ru' | 'en' = 'ru',
  stored: Record<string, unknown> = {},
) => {
  const all: Record<string, unknown> = { clock, lang, ...stored }
  on('command.register', () => ({ value: { command: 'limits' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: {}, rateLimits: [] } }))
  on('store.get', (_, e) => ({ value: all[(e as { key: string }).key] }))
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: { cancel: () => {} } }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
}

const measure = ($: Parameters<Parameters<typeof test>[1]>[0]) =>
  $.session.measure({ context: {}, changed: ['rateLimits'], rateLimits: RATE_LIMITS } as never)

const START = { cwd: '/', surface: 'terminal', isInteractive: true } as const

test('24-часовой формат: проценты и время сброса', async ($, on) => {
  setup(on, '24')
  await $.session.start(START)

  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /первого ответа/ }))?.text).toBeTruthy()
  await ui.unmount()

  await measure($)
  ui = await $.ui.mount(BAND)
  const r5 = expected(RESET_5H, 'ru', '24')
  const r7 = expected(RESET_7D, 'ru', '24')
  expect((await ui.find({ type: 'Text', text: /4%/ }))?.text).toContain('4%')
  expect((await ui.find({ type: 'Text', text: new RegExp(`↕ ${esc(r5)}$`) }))?.text).toContain(`· ↕ ${r5}`)
  expect((await ui.find({ type: 'Text', text: /36%/ }))?.text).toContain('36%')
  expect((await ui.find({ type: 'Text', text: new RegExp(`↕ ${esc(r7)}$`) }))?.text).toContain(`↕ ${r7}`)
  await ui.unmount()
})

test('12-часовой формат по-русски: «дня», «вечера»', async ($, on) => {
  setup(on, '12')
  await $.session.start(START)
  await measure($)
  const ui = await $.ui.mount(BAND)
  for (const iso of [RESET_5H, RESET_7D]) {
    const r = expected(iso, 'ru', '12')
    expect((await ui.find({ type: 'Text', text: new RegExp(`↕ ${esc(r)}$`) }))?.text).toContain(r)
  }
  await ui.unmount()
})

test('/limits clock 12|24|auto', async ($, on) => {
  setup(on, '24')
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  await measure($)

  expect(JSON.stringify(await $.command.run({ command: 'limits', args: 'clock' } as never))).toContain('24 часа')
  expect(JSON.stringify(await $.command.run({ command: 'limits', args: 'clock 12' } as never))).toContain('12 часов')
  let ui = await $.ui.mount(BAND)
  const r12 = expected(RESET_5H, 'ru', '12')
  expect((await ui.find({ type: 'Text', text: new RegExp(`↕ ${esc(r12)}$`) }))?.text).toContain(r12)
  await ui.unmount()

  expect(JSON.stringify(await $.command.run({ command: 'limits', args: 'clock auto' } as never))).toContain('как в системе')
  expect(JSON.stringify(await $.command.run({ command: 'limits', args: 'clock 25' } as never))).toContain('12|24|auto')
  await $.command.run({ command: 'limits', args: 'clock 24' } as never)
  ui = await $.ui.mount(BAND)
  const r24 = expected(RESET_5H, 'ru', '24')
  expect((await ui.find({ type: 'Text', text: new RegExp(`↕ ${esc(r24)}$`) }))?.text).toContain(r24)
  await ui.unmount()
})

test('скины: список, выбор по номеру и имени, отрисовка', async ($, on) => {
  setup(on)
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  await measure($)

  const list = await $.command.run({ command: 'limits', args: 'skin' } as never)
  expect(JSON.stringify(list)).toContain('Скины полоски')
  expect(JSON.stringify(list)).toContain('dots')
  expect(JSON.stringify(list)).not.toContain('ascii')

  await $.command.run({ command: 'limits', args: 'skin 4' } as never)
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /░/ }))?.text).toContain('░')
  await ui.unmount()

  await $.command.run({ command: 'limits', args: 'skin dots' } as never)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /·/ }))?.text).toContain('·')
  await ui.unmount()

  const bad = await $.command.run({ command: 'limits', args: 'skin 7' } as never)
  expect(JSON.stringify(bad)).toContain('не найден')
})

test('иконки Nerd Font: включение и выключение', async ($, on) => {
  setup(on)
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  await measure($)
  const r5 = expected(RESET_5H, 'ru', '24')

  await $.command.run({ command: 'limits', args: 'icons nerd' } as never)
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: / 5ч/ }))?.text).toContain('5ч')
  expect((await ui.find({ type: 'Text', text: new RegExp(` ${esc(r5)}$`) }))?.text).toContain(r5)
  await ui.unmount()

  await $.command.run({ command: 'limits', args: 'icons off' } as never)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: new RegExp(`↕ ${esc(r5)}$`) }))?.text).toContain(`↕ ${r5}`)
  await ui.unmount()
})

test('английский язык: 5h / 7d, 12-часовой формат, am/pm', async ($, on) => {
  setup(on, '12', 'en')
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)

  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /first reply/ }))?.text).toBeTruthy()
  await ui.unmount()

  await measure($)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /5h/ }))?.text).toContain('5h')
  expect((await ui.find({ type: 'Text', text: /7d/ }))?.text).toContain('7d')
  for (const iso of [RESET_5H, RESET_7D]) {
    const r = expected(iso, 'en', '12')
    expect((await ui.find({ type: 'Text', text: new RegExp(`↕ ${esc(r)}$`) }))?.text).toContain(r)
  }
  await ui.unmount()

  const list = await $.command.run({ command: 'limits', args: 'skin' } as never)
  expect(JSON.stringify(list)).toContain('Bar skins')
  expect(JSON.stringify(list)).toContain('thick line')
})

test('язык вручную: /limits lang ru|en|auto', async ($, on) => {
  setup(on, '24', 'en')
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  await measure($)

  const ru = await $.command.run({ command: 'limits', args: 'lang ru' } as never)
  expect(JSON.stringify(ru)).toContain('русский')
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /5ч/ }))?.text).toContain('5ч')
  await ui.unmount()

  // auto — по региону системы, где идут тесты
  await $.command.run({ command: 'limits', args: 'lang auto' } as never)
  ui = await $.ui.mount(BAND)
  const label = runtimeLang === 'ru' ? /5ч/ : /5h/
  expect((await ui.find({ type: 'Text', text: label }))?.text).toBeTruthy()
  await ui.unmount()
})

test('разделитель │ между 5ч и 7д', async ($, on) => {
  setup(on)
  await $.session.start(START)
  await measure($)
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /│/ }))?.text).toBe(' │ ')
  await ui.unmount()
})

test('узкое окно: полная строка → без времени сброса → только 5ч', async ($, on) => {
  setup(on)
  await $.session.start(START)
  await measure($)

  const mountAt = (bodyColumns: number) =>
    $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns } } as never)

  let ui = await mountAt(70)
  expect((await ui.find({ type: 'Text', text: /↕/ }))?.text).toBeTruthy()
  await ui.unmount()

  ui = await mountAt(40)
  expect(await ui.find({ type: 'Text', text: /↕/ })).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /7д/ }))?.text).toBeTruthy()
  expect((await ui.find({ type: 'Text', text: /│/ }))?.text).toBeTruthy()
  await ui.unmount()

  ui = await mountAt(30)
  expect((await ui.find({ type: 'Text', text: /5ч/ }))?.text).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /7д/ })).toBeFalsy()
  expect(await ui.find({ type: 'Text', text: /│/ })).toBeFalsy()
  await ui.unmount()
})

test('скин squares: квадратики через пробел, второй в списке', async ($, on) => {
  setup(on)
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  await measure($)

  const list = await $.command.run({ command: 'limits', args: 'skin' } as never)
  expect(JSON.stringify(list)).toContain('2  ')
  expect(JSON.stringify(list)).toContain('squares — квадраты')
  expect(JSON.stringify(list)).toContain('solid — сплошные квадраты')
  expect(JSON.stringify(list)).not.toContain('segments')
  expect(JSON.stringify(list)).not.toContain('thin')

  await $.command.run({ command: 'limits', args: 'skin 2' } as never)
  const ui = await $.ui.mount(BAND)
  // 7д: 36% → 3 из 8 заполнены
  expect((await ui.find({ type: 'Text', text: /^■ ■ ■ $/ }))?.text).toBe('■ ■ ■ ')
  expect((await ui.find({ type: 'Text', text: /^■ ■ ■ ■ ■$/ }))?.text).toBe('■ ■ ■ ■ ■')
  await ui.unmount()
})

test('цифры обновляются при каждом замере, даже без отметки rateLimits', async ($, on) => {
  setup(on)
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  await $.session.measure({
    context: {}, changed: ['rateLimits'],
    rateLimits: [{ kind: 'five_hour', percentUsed: 19.4, resetsAt: RESET_5H }],
  } as never)
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /19%/ }))?.text).toContain('19%')
  await ui.unmount()

  // Сдвиг меньше пункта: движок отмечает только context, но проценты уже 19,6
  await $.session.measure({
    context: {}, changed: ['context'],
    rateLimits: [{ kind: 'five_hour', percentUsed: 19.6, resetsAt: RESET_5H }],
  } as never)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /20%/ }))?.text).toContain('20%')
  await ui.unmount()

  const dbg = await $.command.run({ command: 'limits', args: 'debug' } as never)
  expect(JSON.stringify(dbg)).toContain('19.6%')
  expect(JSON.stringify(dbg)).toContain('проверены')
})

test('перенос выбора со старых имён: segments → squares, старый squares → solid, alias', async ($, on) => {
  // В хранилище — выбор под старым именем segments, версии схемы ещё нет
  setup(on, '24', 'ru', { skin: 'segments' })
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  await measure($)
  let ui = await $.ui.mount(BAND)
  // Вид прежний — квадратики через пробел (7д 36% → 3 из 8)
  expect((await ui.find({ type: 'Text', text: /^■ ■ ■ $/ }))?.text).toBe('■ ■ ■ ')
  await ui.unmount()

  // Старое имя в команде ведёт на новый squares
  const r = await $.command.run({ command: 'limits', args: 'skin segments' } as never)
  expect(JSON.stringify(r)).toContain('squares — квадраты')
  // solid — слитные квадраты
  await $.command.run({ command: 'limits', args: 'skin solid' } as never)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /^■■■$/ }))?.text).toBe('■■■')
  await ui.unmount()
})

test('перенос выбора: старый squares (слитно) → solid, вид не меняется', async ($, on) => {
  setup(on, '24', 'ru', { skin: 'squares' })
  await $.session.start(START)
  await measure($)
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /^■■■$/ }))?.text).toBe('■■■')
  await ui.unmount()
})

test('настройки вида: длина, пороги цветов, какие окна, время сброса', async ($, on) => {
  setup(on)
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  await measure($)

  // Длина: 7д 36% при 5 делениях → 2 заполнены, 3 пустых
  expect(JSON.stringify(await $.command.run({ command: 'limits', args: 'width 20' } as never))).toContain('4…16')
  await $.command.run({ command: 'limits', args: 'width 5' } as never)
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /^━━━$/ }))?.text).toBe('━━━')
  await ui.unmount()
  await $.command.run({ command: 'limits', args: 'width 8' } as never)

  // Пороги: 30/35 — 36% у недели уже красный
  expect(JSON.stringify(await $.command.run({ command: 'limits', args: 'colors 90 50' } as never))).toContain('первое меньше')
  const set = await $.command.run({ command: 'limits', args: 'colors 30 35' } as never)
  expect(JSON.stringify(set)).toContain('зелёный до 30%, жёлтый до 35%')
  ui = await $.ui.mount(BAND)
  const weekBar = await ui.find({ type: 'Text', text: /^━━━$/ })
  expect(JSON.stringify(weekBar)).toContain('error')
  await ui.unmount()

  // Только 5ч: нет 7д и разделителя
  await $.command.run({ command: 'limits', args: 'show 5h' } as never)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /5ч/ }))?.text).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /7д/ })).toBeFalsy()
  expect(await ui.find({ type: 'Text', text: /│/ })).toBeFalsy()
  await ui.unmount()

  // Только 7д
  await $.command.run({ command: 'limits', args: 'show 7d' } as never)
  ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /5ч/ })).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /7д/ }))?.text).toBeTruthy()
  await ui.unmount()
  await $.command.run({ command: 'limits', args: 'show both' } as never)

  // Время сброса скрыто
  await $.command.run({ command: 'limits', args: 'time off' } as never)
  ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /↕/ })).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /│/ }))?.text).toBeTruthy()
  await ui.unmount()
})

test('повреждённые показания в хранилище не ломают полоску; склонение «деления»', async ($, on) => {
  setup(on, '24', 'ru', { 'last-limits': { five: { percent: 'abc' }, week: 5, at: 'x' } })
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start(START)
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /первого ответа/ }))?.text).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /NaN/ })).toBeFalsy()
  await ui.unmount()

  expect(JSON.stringify(await $.command.run({ command: 'limits', args: 'width 4' } as never))).toContain('4 деления')
  expect(JSON.stringify(await $.command.run({ command: 'limits', args: 'width 11' } as never))).toContain('11 делений')
  expect(JSON.stringify(await $.command.run({ command: 'limits', args: 'width 8' } as never))).toContain('8 делений')
})

test('плагин не запускает программ и не читает переменные окружения', async ($, on) => {
  setup(on)
  const calls: string[] = []
  on('process.run', () => {
    calls.push('process.run')
    return { value: { exitCode: 1, stdout: '', stderr: '' } }
  })
  on('env.get', () => {
    calls.push('env.get')
    return { value: undefined }
  })
  await $.session.start(START)
  await measure($)
  const ui = await $.ui.mount(BAND)
  await ui.unmount()
  expect(calls).toEqual([])
})
