import { STRINGS } from './i18n'
import type { Lang } from './i18n'

// Скины полоски: символы заполненной и пустой части, название на двух языках
export type Skin = {
  id: string
  title: Record<Lang, string>
  filled: string
  empty: string
}

export const SKINS: readonly Skin[] = [
  { id: 'line', title: { ru: 'толстая линия', en: 'thick line' }, filled: '━', empty: '━' },
  { id: 'thin', title: { ru: 'тонкая линия', en: 'thin line' }, filled: '─', empty: '─' },
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
  return [skin.filled.repeat(filled), skin.empty.repeat(CELLS - filled)]
}

// Список скинов с превью для ответа команды
export const skinsList = (currentId: string, percent: number, lang: Lang): string => {
  const t = STRINGS[lang]
  const rows = SKINS.map((s, i) => {
    const [f, e] = barParts(percent, s)
    const mark = s.id === currentId ? '●' : ' '
    return `${mark} ${i + 1}  ${f}${e}  ${s.id} — ${s.title[lang]}`
  })
  return [t.skinsTitle, ...rows, '', t.skinsHint].join('\n')
}
