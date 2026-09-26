import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, Play, BookOpen, ScrollText, Settings, Info, Bell, Palette, Check,
} from 'lucide-react'
import { api, APP_VERSION, RELEASES_URL } from '../lib/api'
import { applyTheme, currentTheme, subscribeTheme, THEME_LIST, type ThemeName } from '../lib/theme'
import type { UpdateInfo } from '../lib/types'

const links = [
  { to: '/', label: '仪表盘', Icon: LayoutDashboard },
  { to: '/accounts', label: '账号管理', Icon: Users },
  { to: '/tasks', label: '任务控制', Icon: Play },
  { to: '/courses', label: '课程进度', Icon: BookOpen },
  { to: '/logs', label: '日志中心', Icon: ScrollText },
  { to: '/settings', label: '全局设置', Icon: Settings },
  { to: '/about', label: '关于', Icon: Info },
]

function Logo() {
  return (
    <svg className="nav-logo-avatar" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="url(#lg)" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f8cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path d="M24 8 19 19l-3.5-3.5L24 8Zm-16 16 5-11 3.5 3.5L8 24Z" fill="#fff" />
    </svg>
  )
}

export default function Layout() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [theme, setTheme] = useState<ThemeName>(currentTheme())
  const [themePop, setThemePop] = useState(false)

  useEffect(() => {
    // 首次挂载先落一次 DOM 属性；之后由订阅保持与其他页面的主题切换同步
    applyTheme(currentTheme())
    return subscribeTheme(setTheme)
  }, [])

  useEffect(() => {
    api.checkForUpdates(APP_VERSION).then(r => {
      if (r.ok && r.data.hasUpdate) setUpdateInfo(r.data)
    }).catch(() => {})
  }, [])

  const themeName = THEME_LIST.find(t => t.id === theme)?.name ?? theme

  return (
    <div className="layout">
      <nav className="nav">
        <div className="nav-logo">
          <Logo />
          <div className="nav-logo-copy">
            <div className="nav-logo-title">CoursePilot</div>
            <small>课程领航助手</small>
          </div>
        </div>
        <div className="nav-links">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon"><Icon size={16} strokeWidth={1.75} aria-hidden="true" /></span>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="nav-footer">
          <div className="nav-theme-wrap">
            {themePop && (
              <div className="theme-pop" role="listbox" aria-label="选择主题">
                {THEME_LIST.map(t => (
                  <button
                    key={t.id}
                    role="option"
                    aria-selected={t.id === theme}
                    className={'theme-pop-item' + (t.id === theme ? ' active' : '')}
                    onClick={() => { applyTheme(t.id); setThemePop(false) }}
                  >
                    <span className="theme-dot" style={{ background: `linear-gradient(135deg, ${t.swatch[1]}, ${t.swatch[0]})` }} />
                    {t.name}
                    {t.id === theme && <Check size={13} strokeWidth={2.5} style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            )}
            <button
              className="icon-btn nav-theme-btn"
              onClick={() => setThemePop(o => !o)}
              aria-label="选择主题"
            >
              <Palette size={15} />
              {themeName}
            </button>
          </div>
          <div className="nav-version">v{APP_VERSION}</div>
          <small>仅用于本人授权账号<br />合规使用</small>
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>

      {updateInfo && (
        <div className="update-toast" role="dialog" aria-label="发现新版本">
          <div className="update-toast-title">
            <Bell size={13} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            发现新版本
          </div>
          <div className="update-toast-body">
            当前 v{updateInfo.currentVersion}，最新 v{updateInfo.latestVersion}
          </div>
          <div className="update-toast-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setUpdateInfo(null)}>稍后</button>
            <button className="btn btn-primary btn-sm" onClick={() => api.openURL(updateInfo.url || RELEASES_URL)}>去更新</button>
          </div>
        </div>
      )}
    </div>
  )
}
