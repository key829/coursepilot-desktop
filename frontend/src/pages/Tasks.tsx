import { useEffect, useRef, useState } from 'react'
import { Play, Square, ChevronDown, ChevronUp } from 'lucide-react'
import { api, onTaskLog } from '../lib/api'
import type { TaskStatus } from '../lib/types'
import { PageHeading, useToast } from '../components/shared'

function TaskCard({ st, onToggle }: { st: TaskStatus; onToggle: (st: TaskStatus) => void }) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const boxRef = useRef<HTMLDivElement>(null)
  const running = st.state === 'running'

  useEffect(() => {
    if (!open) return
    setLogs([])
    return onTaskLog(st.uid, msg => {
      setLogs(prev => [...prev.slice(-300), msg])
    })
  }, [open, st.uid])

  useEffect(() => {
    if (open && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [logs, open])

  const stateBadge = running
    ? <span className="badge badge-running">运行中</span>
    : st.state === 'failed'
      ? <span className="badge badge-failed">失败</span>
      : <span className="badge badge-stopped">已停止</span>

  return (
    <div className="task-card">
      <div className="task-card-head">
        <div>
          <div className="task-name">{st.account}</div>
          <span className="badge badge-config" style={{ marginTop: 4 }}>{st.platform}</span>
        </div>
        {stateBadge}
      </div>

      <div className="task-meta">
        {st.startTime && <span>开始时间：{st.startTime}</span>}
        {st.error && <span style={{ color: 'var(--danger)' }}>错误：{st.error}</span>}
      </div>

      <div className="task-lastlog" title={st.lastLog}>{st.lastLog || '—'}</div>

      <div className="row">
        {running
          ? <button className="btn btn-ghost btn-sm" onClick={() => onToggle(st)}><Square size={12} /> 停止</button>
          : <button className="btn btn-success btn-sm" onClick={() => onToggle(st)}><Play size={12} /> 启动</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {open ? '收起日志' : '展开日志'}
        </button>
      </div>

      {open && (
        <div className="task-log-detail" ref={boxRef}>
          {logs.length === 0 ? <span className="text-muted">等待日志…</span> : logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const toast = useToast()
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.getTaskStatuses().then(r => {
      if (r.ok) setStatuses(r.data ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
  }, [])

  const toggle = async (st: TaskStatus) => {
    const r = st.state === 'running' ? await api.stopTask(st.uid) : await api.startTask(st.uid)
    if (!r.ok) { toast.err(r.error ?? '操作失败'); return }
    setTimeout(load, 150)
  }

  return (
    <div className="page">
      <PageHeading title="任务控制" extra={
        <span className="text-muted" style={{ fontSize: 12 }}>
          {statuses.filter(s => s.state === 'running').length} / {statuses.length} 运行中 · 每 2 秒自动刷新
        </span>
      } />
      {toast.node}

      {loading && statuses.length === 0
        ? <div className="text-muted">加载中…</div>
        : statuses.length === 0
          ? <div className="card text-muted" style={{ textAlign: 'center', padding: 26 }}>
              还没有账号，请先到「账号管理」添加账号。
            </div>
          : (
            <div className="task-grid">
              {statuses.map(st => <TaskCard key={st.uid} st={st} onToggle={toggle} />)}
            </div>
          )}
    </div>
  )
}
