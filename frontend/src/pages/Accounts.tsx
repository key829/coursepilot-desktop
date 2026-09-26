import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Play, Square, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import type { AccountReq, AccountVO, CoursesCustom, PlatformInfo } from '../lib/types'
import { Modal, PageHeading, Spinner, Switch, TagInput, useToast } from '../components/shared'

const emptyCustom = (): CoursesCustom => ({
  shuffleSw: 0, videoModel: 0, autoExam: 0, examAutoSubmit: 0,
  excludeCourses: [], includeCourses: [],
})

const emptyReq = (platformCode: string): AccountReq => ({
  uid: '', accountType: platformCode, url: '', remarkName: '', account: '', password: '',
  isProxy: 0, informEmails: [], coursesCustom: emptyCustom(),
})

export default function AccountsPage() {
  const toast = useToast()
  const [accounts, setAccounts] = useState<AccountVO[]>([])
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AccountReq | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([api.listAccounts(), api.getPlatformSupport()])
      .then(([acc, pf]) => {
        if (acc.ok) setAccounts(acc.data ?? [])
        if (pf.ok) setPlatforms(pf.data ?? [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const guiPlatforms = useMemo(() => platforms.filter(p => p.guiSupport !== 'none'), [platforms])
  const platformName = (code: string) => platforms.find(p => p.code === code)?.name ?? code

  const save = async () => {
    if (!editing) return
    setBusy(true)
    const r = editing.uid ? await api.updateAccount(editing) : await api.addAccount(editing)
    setBusy(false)
    if (!r.ok) { toast.err(r.error ?? '保存失败'); return }
    toast.ok(editing.uid ? '账号已更新' : '账号已添加')
    setEditing(null)
    load()
  }

  const remove = async (acc: AccountVO) => {
    if (!window.confirm(`确定删除账号「${acc.remarkName || acc.account}」？运行中的任务会先停止。`)) return
    const r = await api.deleteAccount(acc.uid)
    if (!r.ok) { toast.err(r.error ?? '删除失败'); return }
    toast.ok('已删除')
    load()
  }

  const toggleRun = async (acc: AccountVO) => {
    const r = acc.isRunning ? await api.stopTask(acc.uid) : await api.startTask(acc.uid)
    if (!r.ok) { toast.err(r.error ?? '操作失败'); return }
    load()
  }

  const patch = (p: Partial<AccountReq>) => setEditing(e => (e ? { ...e, ...p } : e))
  const patchCustom = (p: Partial<CoursesCustom>) =>
    setEditing(e => (e ? { ...e, coursesCustom: { ...e.coursesCustom, ...p } } : e))

  return (
    <div className="page">
      <PageHeading
        title="账号管理"
        extra={
          <button className="btn btn-primary" onClick={() => setEditing(emptyReq(guiPlatforms[0]?.code ?? 'xxt'))}>
            <Plus size={14} /> 添加账号
          </button>
        }
      />

      {toast.node}

      <div className="card table-scroll">
        {loading && accounts.length === 0
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Spinner /></div>
          : accounts.length === 0
            ? <div className="text-muted" style={{ textAlign: 'center', padding: 26 }}>
                还没有账号。点击右上角「添加账号」开始使用。
              </div>
            : (
              <table className="table">
                <thead>
                  <tr>
                    <th>备注</th><th>平台</th><th>账号</th><th>代理</th>
                    <th>状态</th><th style={{ width: 190 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => (
                    <tr key={acc.uid}>
                      <td>{acc.remarkName || <span className="text-muted">—</span>}</td>
                      <td><span className="badge badge-config">{platformName(acc.accountType)}</span></td>
                      <td>{acc.account}</td>
                      <td>{acc.isProxy === 1 ? '是' : '否'}</td>
                      <td>
                        {acc.isRunning
                          ? <span className="badge badge-running">运行中</span>
                          : <span className="badge badge-stopped">空闲</span>}
                      </td>
                      <td>
                        <div className="row">
                          {acc.isRunning
                            ? <button className="btn btn-ghost btn-sm" onClick={() => toggleRun(acc)}><Square size={12} /> 停止</button>
                            : <button className="btn btn-success btn-sm" onClick={() => toggleRun(acc)}><Play size={12} /> 启动</button>}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditing({
                              uid: acc.uid, accountType: acc.accountType, url: acc.url,
                              remarkName: acc.remarkName ?? '', account: acc.account, password: '',
                              isProxy: acc.isProxy, informEmails: acc.informEmails,
                              coursesCustom: { ...emptyCustom(), ...acc.coursesCustom },
                            })}
                          >
                            <Pencil size={12} /> 编辑
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(acc)}><Trash2 size={12} /> 删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </div>

      {editing && (
        <Modal title={editing.uid ? '编辑账号' : '添加账号'} onClose={() => setEditing(null)} width={760}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">平台类型</label>
              <select className="form-select" value={editing.accountType}
                onChange={e => patch({ accountType: e.target.value })}>
                {guiPlatforms.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
              <span className="form-hint">{guiPlatforms.find(p => p.code === editing.accountType)?.note}</span>
            </div>
            <div className="form-group">
              <label className="form-label">平台地址（可选，套壳平台填专用域名）</label>
              <input className="form-input" value={editing.url} placeholder="留空使用默认地址"
                onChange={e => patch({ url: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">备注名</label>
              <input className="form-input" value={editing.remarkName} placeholder="如：小号-高数"
                onChange={e => patch({ remarkName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">登录账号</label>
              <input className="form-input" value={editing.account} autoComplete="off"
                onChange={e => patch({ account: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{editing.uid ? '密码（留空表示不修改）' : '密码'}</label>
              <input className="form-input" type="password" value={editing.password} autoComplete="new-password"
                onChange={e => patch({ password: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">使用代理</label>
              <div className="row" style={{ height: 35 }}>
                <Switch checked={editing.isProxy === 1} onChange={v => patch({ isProxy: v ? 1 : 0 })} />
                <span className="form-hint">开启后任务走系统代理</span>
              </div>
            </div>
            <div className="form-group span2">
              <label className="form-label">通知邮箱（回车添加）</label>
              <TagInput tags={editing.informEmails} placeholder="task-finish@example.com"
                onChange={v => patch({ informEmails: v })} />
            </div>
          </div>

          <div className="collapse" style={{ marginTop: 14 }}>
            <button className="collapse-head" type="button"
              onClick={e => {
                const body = e.currentTarget.nextElementSibling as HTMLElement | null
                if (body) body.style.display = body.style.display === 'none' ? '' : 'none'
              }}>
              <RefreshCw size={13} /> 学习策略（高级）
            </button>
            <div className="collapse-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">视频模式</label>
                  <select className="form-select" value={editing.coursesCustom.videoModel}
                    onChange={e => patchCustom({ videoModel: Number(e.target.value) })}>
                    <option value={0}>模拟（拟真节奏）</option>
                    <option value={1}>极速（最快速度）</option>
                    <option value={2}>混刷（多课程交替）</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">章节乱序</label>
                  <div className="row" style={{ height: 35 }}>
                    <Switch checked={editing.coursesCustom.shuffleSw === 1}
                      onChange={v => patchCustom({ shuffleSw: v ? 1 : 0 })} />
                    <span className="form-hint">随机顺序学习课程</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">自动完成测验</label>
                  <div className="row" style={{ height: 35 }}>
                    <Switch checked={editing.coursesCustom.autoExam === 1}
                      onChange={v => patchCustom({ autoExam: v ? 1 : 0 })} />
                    <span className="form-hint">随任务点一并完成章节测验</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">测验自动提交</label>
                  <div className="row" style={{ height: 35 }}>
                    <Switch checked={editing.coursesCustom.examAutoSubmit === 1}
                      onChange={v => patchCustom({ examAutoSubmit: v ? 1 : 0 })} />
                    <span className="form-hint">达到分数线后自动交卷</span>
                  </div>
                </div>
                <div className="form-group span2">
                  <label className="form-label">只学这些课程（留空 = 全部）</label>
                  <TagInput tags={editing.coursesCustom.includeCourses}
                    onChange={v => patchCustom({ includeCourses: v })} placeholder="输入课程名，回车添加" />
                </div>
                <div className="form-group span2">
                  <label className="form-label">排除课程</label>
                  <TagInput tags={editing.coursesCustom.excludeCourses}
                    onChange={v => patchCustom({ excludeCourses: v })} placeholder="输入课程名，回车添加" />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>取消</button>
            <button className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? <Spinner size={13} /> : null}
              {busy ? '保存中…' : '保存'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
