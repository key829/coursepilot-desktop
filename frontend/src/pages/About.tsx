import { useEffect, useState } from 'react'
import { RefreshCw, ExternalLink, ShieldAlert } from 'lucide-react'
import { api, APP_VERSION } from '../lib/api'
import { PageHeading, Spinner, useToast } from '../components/shared'
import { isDesktop } from '../lib/backend'

function Logo() {
  return (
    <svg width="64" height="64" viewBox="0 0 32 32" aria-hidden="true" style={{ borderRadius: 14 }}>
      <rect width="32" height="32" rx="8" fill="url(#lg2)" />
      <defs>
        <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f8cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path d="M24 8 19 19l-3.5-3.5L24 8Zm-16 16 5-11 3.5 3.5L8 24Z" fill="#fff" />
    </svg>
  )
}

export default function AboutPage() {
  const toast = useToast()
  const [version, setVersion] = useState(APP_VERSION)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    api.getVersion().then(v => { if (v) setVersion(v) }).catch(() => {})
  }, [])

  const check = async () => {
    setChecking(true)
    const r = await api.checkForUpdates(APP_VERSION).catch(() => null)
    setChecking(false)
    if (!r) { toast.err('检查更新失败'); return }
    if (!r.ok) { toast.err(r.error ?? '检查更新失败'); return }
    if (r.data.hasUpdate) {
      toast.ok(`发现新版本 v${r.data.latestVersion}`)
      if (r.data.url) api.openURL(r.data.url)
    } else {
      toast.ok(`已是最新版本 v${r.data.currentVersion}`)
    }
  }

  return (
    <div className="page">
      <PageHeading title="关于" />
      {toast.node}

      <div className="card" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <Logo />
        <div className="grow">
          <div style={{ fontSize: 17, fontWeight: 800 }}>CoursePilot 课程领航</div>
          <div className="text-muted" style={{ marginTop: 4, lineHeight: 1.7 }}>
            多平台课程学习管理桌面工具（Wails + Go + React）。当前版本 v{version}
            {!isDesktop && '（浏览器预览模式）'}
          </div>
        </div>
        <button className="btn" onClick={check} disabled={checking}>
          {checking ? <Spinner size={12} /> : <RefreshCw size={13} />} 检查更新
        </button>
      </div>

      <div className="card section">
        <div className="card-title">项目链接</div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={() => api.openURL('https://wails.io/')}>
            <ExternalLink size={12} /> Wails 框架文档
          </button>
        </div>
      </div>

      <div className="card section">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} color="var(--warn)" /> 使用声明
        </div>
        <div className="text-muted" style={{ lineHeight: 1.9, fontSize: 12 }}>
          1. 本项目为学习<strong>桌面应用架构</strong>（Go 服务层 / Wails 绑定 / 事件流 / 前端状态管理）而构建的原创实现；<br />
          2. 当前内置<strong>演示引擎</strong>，所有平台交互均为本地模拟，不连接任何学习平台；<br />
          3. 请仅将本工具用于<strong>本人授权账号</strong>，并遵守所在学校与平台的服务条款；
          因违规使用产生的一切后果由使用者自行承担；<br />
          4. 本项目采用 MIT 协议开源。
        </div>
      </div>
    </div>
  )
}
