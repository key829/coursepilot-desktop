import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import type { AccountVO, CourseVO } from '../lib/types'
import { PageHeading, Progress, Spinner } from '../components/shared'

export default function CoursesPage() {
  const [accounts, setAccounts] = useState<AccountVO[]>([])
  const [uid, setUid] = useState('')
  const [courses, setCourses] = useState<CourseVO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listAccounts().then(r => {
      if (r.ok) {
        setAccounts(r.data ?? [])
        if (r.data?.length) setUid(r.data[0].uid)
      }
    })
  }, [])

  const load = () => {
    if (!uid) return
    setLoading(true)
    setError('')
    api.getCourses(uid).then(r => {
      if (r.ok) setCourses(r.data ?? [])
      else setError(r.error ?? '拉取失败')
    }).finally(() => setLoading(false))
  }

  useEffect(load, [uid])

  return (
    <div className="page">
      <PageHeading
        title="课程进度"
        extra={
          <div className="row">
            <select className="form-select" value={uid} onChange={e => setUid(e.target.value)}>
              {accounts.length === 0 && <option value="">（暂无账号）</option>}
              {accounts.map(a => (
                <option key={a.uid} value={a.uid}>{a.remarkName || a.account}（{a.accountType}）</option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={load} disabled={!uid || loading}>
              {loading ? <Spinner size={12} /> : <RefreshCw size={13} />} 刷新
            </button>
          </div>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}

      {accounts.length === 0
        ? <div className="card text-muted" style={{ textAlign: 'center', padding: 26 }}>
            还没有账号，请先到「账号管理」添加账号。
          </div>
        : (
          <div className="card table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>课程</th>
                  <th style={{ width: 80, whiteSpace: 'nowrap' }}>教师</th>
                  <th style={{ minWidth: 220 }}>进度</th>
                  <th style={{ width: 80 }}>完成度</th>
                  <th style={{ width: 90 }}>状态</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.key}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{c.courseName}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{c.courseId}</div>
                    </td>
                    <td>{c.courseTeacher}</td>
                    <td>
                      <div className="row">
                        <Progress value={c.jobRate} />
                        <span className="text-muted" style={{ fontSize: 11, flex: 'none' }}>
                          {c.jobFinishCount}/{c.jobCount}
                        </span>
                      </div>
                    </td>
                    <td>{Math.round(c.jobRate)}%</td>
                    <td>
                      {c.rawStatusText === '已完成'
                        ? <span className="badge badge-running">已完成</span>
                        : c.isStart
                          ? <span className="badge badge-config">学习中</span>
                          : <span className="badge badge-stopped">{c.rawStatusText}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
