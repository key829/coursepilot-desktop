import { ReactNode, useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-label="加载中" />
}

export function PageHeading({ title, extra }: { title: string; extra?: ReactNode }) {
  return (
    <div className="flex-between page-heading-row">
      <div className="page-title">{title}</div>
      {extra}
    </div>
  )
}

export function Alert({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'error' | 'success'; children: ReactNode }) {
  return <div className={`alert alert-${kind}`}>{children}</div>
}

export function Modal({
  title, onClose, children, width,
}: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={width ? { maxWidth: width } : undefined}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function useToast() {
  const [msg, setMsg] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 3200)
    return () => clearTimeout(t)
  }, [msg])
  const node = msg ? (
    <div className={`toast toast-${msg.kind}`}>{msg.text}</div>
  ) : null
  return {
    node,
    ok: (text: string) => setMsg({ text, kind: 'ok' }),
    err: (text: string) => setMsg({ text, kind: 'err' }),
  }
}

export function TagInput({ tags, onChange, placeholder }: {
  tags: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const commit = () => {
    const v = draft.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setDraft('')
  }
  return (
    <div className="tag-input">
      {tags.map(t => (
        <span key={t} className="tag">
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))} aria-label={`移除 ${t}`}>×</button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
        onBlur={commit}
      />
    </div>
  )
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={'switch' + (checked ? ' on' : '')}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  )
}

export function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="progress">
      <div className={'progress-bar' + (v >= 100 ? ' done' : '')} style={{ width: `${v}%` }} />
    </div>
  )
}
