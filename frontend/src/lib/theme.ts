export type ThemeName = 'dark' | 'light' | 'midnight' | 'ocean' | 'forest' | 'nord' | 'sakura' | 'sepia'

export interface ThemeMeta {
  id: ThemeName
  name: string
  hint: string
  swatch: [string, string] // [底色, 强调色]，用于预览色卡
}

// 全部内置主题（顺序即展示顺序）
export const THEME_LIST: ThemeMeta[] = [
  { id: 'dark', name: '深色', hint: '默认 · 夜间舒适', swatch: ['#1a2032', '#4f8cff'] },
  { id: 'light', name: '浅色', hint: '日间高对比', swatch: ['#ffffff', '#4f8cff'] },
  { id: 'midnight', name: '星夜', hint: '深邃紫罗兰', swatch: ['#161232', '#a78bfa'] },
  { id: 'ocean', name: '海洋', hint: '沉静深青', swatch: ['#0c2530', '#2dd4bf'] },
  { id: 'forest', name: '森林', hint: '墨绿护眼', swatch: ['#121e18', '#4ade80'] },
  { id: 'nord', name: '青灰', hint: '冷调北欧', swatch: ['#2b313d', '#88c0d0'] },
  { id: 'sakura', name: '樱花', hint: '柔和浅粉', swatch: ['#ffffff', '#ec6a9c'] },
  { id: 'sepia', name: '暖纸', hint: '米色纸质', swatch: ['#fffdf7', '#b45309'] },
]

const KEY = 'coursepilot-theme'

let current: ThemeName = pickValid(typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null)

const subs = new Set<(t: ThemeName) => void>()

function pickValid(v: string | null): ThemeName {
  return THEME_LIST.some(t => t.id === v) ? (v as ThemeName) : 'dark'
}

// applyTheme 切换主题并通知所有订阅者（Layout 与设置页保持同步）
export function applyTheme(t: ThemeName) {
  current = t
  document.documentElement.dataset.theme = t
  localStorage.setItem(KEY, t)
  subs.forEach(cb => cb(t))
}

export function currentTheme(): ThemeName {
  return current
}

export function subscribeTheme(cb: (t: ThemeName) => void): () => void {
  subs.add(cb)
  return () => { subs.delete(cb) }
}
