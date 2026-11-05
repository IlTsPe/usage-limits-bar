import { STRINGS } from './i18n'
import type { Lang } from './i18n'

// Скины полоски: символы заполненной и пустой части, название на двух языках
export type Skin = {
  id: string
  title: Record<Lang, string>
  filled: string
  empty: string
  // Промежуток между ячейками (для сегментов), по умолчанию нет
  gap?: string
}

export const SKINS: readonly Skin[] = [
  { id: 'line', title: { ru: 'толстая линия', en: 'thick line' }, filled: '━', empty: '━' },
  { id: 'segments', title: { ru: 'сегменты', en: 'segments' }, filled: '■', empty: '■', gap: ' ' },
  { id: 'double', title: { ru: 'двойная линия', en: 'double line' }, filled: '═', empty: '═' },
  { id: 'blocks', title: { ru: 'блоки', en: 'blocks' }, filled: '█', empty: '░' },
  { id: 'squares', title: { ru: 'квадраты', en: 'squares' }, filled: '■', empty: '■' },
  { id: 'dots', title: { ru: 'точки', en: 'dots' }, filled: '•', empty: '·' },
]

export const DEFAULT_SKIN = 'line'

const CELLS = 8

// Ищет скин по номеру (с 1) или по id; неизвестный — null
export const findSkin = (query: string): Skin | null => {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const n = Number(q)
  if (Number.isInteger(n)) return SKINS[n - 1] ?? null
  return SKINS.find(s => s.id === q) ?? null
}

export const skinById = (id: string | undefined): Skin =>
  SKINS.find(s => s.id === id) ?? (SKINS[0] as Skin)

// Делит полоску на заполненную и пустую части
export const barParts = (percent: number, skin: Skin): [string, string] => {
  const filled = Math.max(0, Math.min(CELLS, Math.round((percent / 100) * CELLS)))
  const gap = skin.gap ?? ''
  const on = Array(filled).fill(skin.filled).join(gap)
  const off = Array(CELLS - filled).fill(skin.empty).join(gap)
  // Промежуток между заполненной и пустой частью относится к заполненной
  return [on + (on && off ? gap : ''), off]
}

// Список скинов с превью для ответа команды
export const skinsList = (currentId: string, percent: number, lang: Lang): string => {
  const t = STRINGS[lang]
  // Полоски разной ширины (у сегментов есть промежутки) — выравниваем по самой широкой
  const bars = SKINS.map(s => barParts(percent, s).join(''))
  const width = Math.max(...bars.map(b => b.length))
  const rows = SKINS.map((s, i) => {
    const mark = s.id === currentId ? '●' : ' '
    return `${mark} ${i + 1}  ${(bars[i] as string).padEnd(width)}  ${s.id} — ${s.title[lang]}`
  })
  return [t.skinsTitle, ...rows, '', t.skinsHint].join('\n')
}
