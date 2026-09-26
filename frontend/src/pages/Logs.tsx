import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api, onAnyLog } from '../lib/api'
import { PageHeading } from '../components/shared'

const LEVELS = ['ALL', 'INFO', 'WARN', 'ERROR'] as const

function levelOf(line: string): 'INFO' | 'WARN' | 'ERROR' {
  if (line.includes('[WARN]')) return 'WARN'
  if (line.includes('[ERROR]')) return 'ERROR'
  return 'INFO'
}

export default function LogsPage() {
  const [lines, setLines] = useState<string[]>([])
  const [filter, setFilter] = useState<(typeof LEVELS)[number]>('ALL')
  const [autoScroll, setAutoScroll] = useState(true)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.getRecentLogs(400).then(r => {
      if (r.ok) setLines(r.data ?? [])
    })
    return onAnyLog(({ msg }) => {
      setLines(prev => {
        const next = prev.length > 2400 ? prev.slice(-2000) : prev
        return [...next, msg]
      })
    })
  }, [])

  const shown = useMemo(
    () => (filter === 'ALL' ? lines : lines.filter(l => levelOf(l) === filter)),
    [lines, filter],
  )

  useEffect(() => {
    if (autoScroll && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [shown, autoScroll])

  const counts = useMemo(() => {
    const c = { INFO: 0, WARN: 0, ERROR: 0 }
    for (const l of lines) c[levelOf(l)]++
    return c
  }, [lines])

  return (
    <div className="page">
      <PageHeading
        title="日志中心"
        extra={
          <div className="row">
            {LEVELS.map(lv => (
              <button
                key={lv}
                className={'btn btn-sm' + (filter === lv ? ' btn-primary' : ' btn-ghost')}
                onClick={() => setFilter(lv)}
              >
                {lv === 'ALL' ? '全部' : lv}
                {lv !== 'ALL' && ` (${counts[lv]})`}
              </button>
            ))}
            <label className="check-row">
              <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
              自动滚动
            </label>
            <button className="btn btn-ghost btn-sm" onClick={() => setLines([])}><Trash2 size={12} /> 清空</button>
          </div>
        }
      />

      <div className="card" style={{ flex: 1 }}>
        <div className="log-area" ref={boxRef} style={{ maxHeight: 'calc(100vh - 220px)', minHeight: 320 }}>
          {shown.length === 0
            ? <span className="text-muted">暂无日志。启动任务后这里会实时滚动输出。</span>
            : shown.map((l, i) => (
              <div key={i} className={'log-line log-' + levelOf(l)}>{l}</div>
            ))}
        </div>
      </div>
    </div>
  )
}
