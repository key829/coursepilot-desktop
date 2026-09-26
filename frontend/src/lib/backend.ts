// window.go 桥接：桌面模式直调 Wails 绑定；浏览器预览模式自动落到 mock.ts
import { mockApi, mockEvents } from './mock'

type AppAPI = Record<string, (...args: unknown[]) => Promise<unknown>>
type EventsAPI = {
  EventsOn: (event: string, cb: (payload: unknown) => void) => () => void
}

declare global {
  interface Window {
    go?: { main: { App: AppAPI } }
    runtime?: EventsAPI
  }
}

export const isDesktop = typeof window !== 'undefined' && !!window.go

const impl: AppAPI = isDesktop ? window.go!.main.App : mockApi
const events: EventsAPI = isDesktop && window.runtime ? window.runtime : mockEvents

export function callMethod<T>(name: string, ...args: unknown[]): Promise<T> {
  const fn = impl[name]
  if (!fn) return Promise.reject(new Error('后端方法不存在: ' + name))
  return fn(...args) as Promise<T>
}

export function onEvent(event: string, cb: (payload: unknown) => void): () => void {
  return events.EventsOn(event, cb)
}
