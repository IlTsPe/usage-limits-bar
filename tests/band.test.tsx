import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'usage-limits',
  component: 'AbovePrompt',
  props: { hasSurvey: false },
  surface: 'terminal',
} as const

// Среда, 04.11.2026 13:00 по Москве
const NOW = Date.parse('2026-11-04T10:00:00Z')

const RATE_LIMITS = [
  // 15:10 по Москве, сегодня
  { kind: 'five_hour', percentUsed: 4, resetsAt: '2026-11-04T12:10:00Z' },
  // суббота 17:00 по Москве
  { kind: 'seven_day', percentUsed: 36, resetsAt: '2026-11-07T14:00:00Z' },
]

const setup = (
  on: Parameters<Parameters<typeof test>[1]>[1],
  pattern: string,
  ui = 'ru-RU',
  extra = '',
  stored: Record<string, unknown> = {},
) => {
  on('command.register', () => ({ value: { command: 'limits' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: {}, rateLimits: [] } }))
  on('store.get', (_, e) => ({ value: stored[(e as { key: string }).key] }))
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: { cancel: () => {} } }))
  on('process.run', () => ({
    value: { exitCode: 0, stdout: `${pattern}\r\n180\r\n${ui}\r\n${extra}`, stderr: '' },
  }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
}

const measure = ($: Parameters<Parameters<typeof test>[1]>[0]) =>
  $.session.measure({ context: {}, changed: ['rateLimits'], rateLimits: RATE_LIMITS } as never)

test('24-часовой формат: время сброса по Windows', async ($, on) => {
  setup(on, 'H:mm')
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /первого ответа/ }))?.text).toBeTruthy()
  await ui.unmount()

  await measure($)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /4%/ }))?.text).toContain('4%')
  expect((await ui.find({ type: 'Text', text: /↕ 15:10/ }))?.text).toContain('· ↕ 15:10')
  expect((await ui.find({ type: 'Text', text: /36%/ }))?.text).toContain('36%')
  expect((await ui.find({ type: 'Text', text: /↕ сб 17:00/ }))?.text).toContain('↕ сб 17:00')
  await ui.unmount()
})

test('12-часовой формат: «3:10 дня», «5 вечера»', async ($, on) => {
  setup(on, 'h:mm tt')
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await measure($)

  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /↕ 3:10 дня/ }))?.text).toContain('↕ 3:10 дня')
  expect((await ui.find({ type: 'Text', text: /↕ сб 5 вечера/ }))?.text).toContain('сб 5 вечера')
  await ui.unmount()
})

test('скины: список, выбор по номеру и имени, отрисовка', async ($, on) => {
  setup(on, 'H:mm')
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
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
  setup(on, 'H:mm')
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await measure($)

  await $.command.run({ command: 'limits', args: 'icons nerd' } as never)
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /\uF017 5ч/ }))?.text).toContain('5ч')
  expect((await ui.find({ type: 'Text', text: /\uF021 15:10/ }))?.text).toContain('15:10')
  await ui.unmount()

  await $.command.run({ command: 'limits', args: 'icons off' } as never)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /↕ 15:10/ }))?.text).toContain('↕ 15:10')
  await ui.unmount()
})

test('английская Windows: 5h / 7d, 12-часовой формат, Sat', async ($, on) => {
  setup(on, 'h:mm tt', 'en-US')
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /first reply/ }))?.text).toBeTruthy()
  await ui.unmount()

  await measure($)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /5h/ }))?.text).toContain('5h')
  expect((await ui.find({ type: 'Text', text: /7d/ }))?.text).toContain('7d')
  expect((await ui.find({ type: 'Text', text: /↕ 3:10 pm/ }))?.text).toContain('↕ 3:10 pm')
  expect((await ui.find({ type: 'Text', text: /↕ Sat 5 pm/ }))?.text).toContain('Sat 5 pm')
  await ui.unmount()

  const list = await $.command.run({ command: 'limits', args: 'skin' } as never)
  expect(JSON.stringify(list)).toContain('Bar skins')
  expect(JSON.stringify(list)).toContain('thick line')
})

test('язык вручную: /limits lang ru|en|auto', async ($, on) => {
  setup(on, 'H:mm', 'en-US')
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await measure($)

  const ru = await $.command.run({ command: 'limits', args: 'lang ru' } as never)
  expect(JSON.stringify(ru)).toContain('русский')
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /5ч/ }))?.text).toContain('5ч')
  expect((await ui.find({ type: 'Text', text: /↕ сб 17:00/ }))?.text).toContain('сб 17:00')
  await ui.unmount()

  await $.command.run({ command: 'limits', args: 'lang auto' } as never)
  ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /↕ Sat 17:00/ }))?.text).toContain('Sat 17:00')
  await ui.unmount()
})

test('разделитель │ между 5ч и 7д', async ($, on) => {
  setup(on, 'H:mm')
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await measure($)
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /│/ }))?.text).toBe(' │ ')
  await ui.unmount()
})

test('перевод часов: время сброса по смещению на момент сброса', async ($, on) => {
  // Таблица с начала текущего часа: 30 часов +3, дальше +2 (как будто перевели часы)
  const list = [...Array(30).fill(180), ...Array(163).fill(120)].join(',')
  setup(on, 'H:mm', 'ru-RU', `${NOW}\r\n${list}\r\n`)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await measure($)

  const ui = await $.ui.mount(BAND)
  // 5ч: сброс через 2 часа — ещё +3 → 15:10
  expect((await ui.find({ type: 'Text', text: /↕ 15:10/ }))?.text).toContain('15:10')
  // 7д: сброс через 76 часов — уже +2 → 16:00, а не 17:00
  expect((await ui.find({ type: 'Text', text: /↕ сб 16:00/ }))?.text).toContain('сб 16:00')
  await ui.unmount()
})

test('узкое окно: полная строка → без времени сброса → только 5ч', async ($, on) => {
  setup(on, 'H:mm')
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await measure($)

  const mountAt = (bodyColumns: number) =>
    $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns } } as never)

  let ui = await mountAt(60)
  expect((await ui.find({ type: 'Text', text: /↕ сб 17:00/ }))?.text).toBeTruthy()
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

// Вывод скрипта для macOS/Linux: PowerShell нет, отвечает sh
const unixSetup = (on: Parameters<Parameters<typeof test>[1]>[1], out: string) => {
  on('command.register', () => ({ value: { command: 'limits' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: {}, rateLimits: [] } }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: { cancel: () => {} } }))
  on('env.get', () => ({ value: undefined }))
  on('process.run', (_, e) =>
    (e as { argv: string[] }).argv[0] === 'powershell'
      ? { value: { exitCode: 127, stdout: '', stderr: 'not found' } }
      : { value: { exitCode: 0, stdout: out, stderr: '' } },
  )
  on('session.measure', (_, e) => ({ changed: e.changed }))
}

test('macOS, США: 12 часов по региону, перевод часов по таблице', async ($, on) => {
  // Нью-Йорк: первые 30 часов −4, дальше −5
  const zs = [...Array(30).fill('-0400'), ...Array(163).fill('-0500')].join(',')
  unixSetup(on, `os=Darwin\nbase=${NOW / 1000}\nloc=en_US\nf24=\nf12=\nzs=${zs},\n`)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await measure($)
  const ui = await $.ui.mount(BAND)
  // 5ч: 12:10Z при −4 → 8:10 am; 7д: сб 14:00Z при −5 → 9 am
  expect((await ui.find({ type: 'Text', text: /↕ 8:10 am/ }))?.text).toContain('8:10 am')
  expect((await ui.find({ type: 'Text', text: /↕ Sat 9 am/ }))?.text).toContain('Sat 9 am')
  await ui.unmount()
})

test('Linux, ru_RU: 24 часа с ведущим нулём по locale, русский язык', async ($, on) => {
  const zs = Array(193).fill('+0300').join(',')
  unixSetup(on, `os=Linux\nbase=${NOW / 1000}\nloc=ru_RU.UTF-8\ntfmt=%H:%M:%S\nzs=${zs},\n`)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await measure($)
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /5ч/ }))?.text).toContain('5ч')
  expect((await ui.find({ type: 'Text', text: /↕ 15:10/ }))?.text).toContain('15:10')
  expect((await ui.find({ type: 'Text', text: /↕ сб 17:00/ }))?.text).toContain('сб 17:00')
  await ui.unmount()
})

test('скин squares: квадратики через пробел, второй в списке', async ($, on) => {
  setup(on, 'H:mm')
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
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
  setup(on, 'H:mm')
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.session.measure({
    context: {}, changed: ['rateLimits'],
    rateLimits: [{ kind: 'five_hour', percentUsed: 19.4, resetsAt: '2026-11-04T12:10:00Z' }],
  } as never)
  let ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /19%/ }))?.text).toContain('19%')
  await ui.unmount()

  // Сдвиг меньше пункта: движок отмечает только context, но проценты уже 19,6
  await $.session.measure({
    context: {}, changed: ['context'],
    rateLimits: [{ kind: 'five_hour', percentUsed: 19.6, resetsAt: '2026-11-04T12:10:00Z' }],
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
  setup(on, 'H:mm', 'ru-RU', '', { skin: 'segments' })
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
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
  setup(on, 'H:mm', 'ru-RU', '', { skin: 'squares' })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await measure($)
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /^■■■$/ }))?.text).toBe('■■■')
  await ui.unmount()
})
