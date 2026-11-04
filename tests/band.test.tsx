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

const setup = (on: Parameters<Parameters<typeof test>[1]>[1], pattern: string, ui = 'ru-RU', extra = '') => {
  on('command.register', () => ({ value: { command: 'limits' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: {}, rateLimits: [] } }))
  on('store.get', () => ({ value: undefined }))
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
