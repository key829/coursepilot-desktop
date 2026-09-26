import { useEffect, useState } from 'react'
import { FolderOpen, Import, Save, PlugZap, Database, Check } from 'lucide-react'
import { api } from '../lib/api'
import { applyTheme, currentTheme, subscribeTheme, THEME_LIST, type ThemeName } from '../lib/theme'
import type { AppConfig, ProviderPreset } from '../lib/types'
import { PageHeading, Spinner, Switch, useToast } from '../components/shared'

const protocolName = (p: string) =>
  p === 'gemini' ? 'Gemini 原生' : p === 'claude' ? 'Claude 原生' : 'OpenAI 兼容'

export default function SettingsPage() {
  const toast = useToast()
  const [cfg, setCfg] = useState<AppConfig | null>(null)
  const [presets, setPresets] = useState<ProviderPreset[]>([])
  const [runtimeTheme, setRuntimeTheme] = useState<ThemeName>(currentTheme())
  const [testingAI, setTestingAI] = useState(false)
  const [testingQue, setTestingQue] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [queResult, setQueResult] = useState('')

  useEffect(() => {
    api.getConfig().then(r => { if (r.ok) setCfg(r.data) })
    api.getProviderPresets().then(r => { if (r.ok) setPresets(r.data ?? []) })
    return subscribeTheme(setRuntimeTheme)
  }, [])

  if (!cfg) return <div className="page"><Spinner /></div>

  const patch = (fn: (c: AppConfig) => void) => {
    setCfg(c => {
      if (!c) return c
      const next: AppConfig = JSON.parse(JSON.stringify(c))
      fn(next)
      return next
    })
  }

  const ai = cfg.setting.aiSetting
  const activePreset = presets.find(p => p.code === ai.aiType)

  const onProviderChange = (code: string) => {
    patch(c => {
      const p = presets.find(x => x.code === code)
      if (!p) return
      const next = c.setting.aiSetting
      const prev = presets.find(x => x.code === next.aiType)
      // 地址与模型：从空值或旧预设值平滑迁移到新预设
      if (!next.aiUrl || (prev && next.aiUrl === prev.baseURL)) next.aiUrl = p.baseURL
      if (!next.model || (prev && prev.models.includes(next.model))) {
        next.model = p.models[0] ?? ''
      }
      next.aiType = code
    })
    setAiResult('')
  }

  const save = async () => {
    const r = await api.saveConfig(cfg)
    r.ok ? toast.ok('设置已保存') : toast.err(r.error ?? '保存失败')
  }

  const basic = cfg.setting.basicSetting
  const email = cfg.setting.emailInform

  return (
    <div className="page">
      <PageHeading title="全局设置" extra={
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            const r = await api.importConfig()
            if (r.ok) { setCfg(r.data); toast.ok('导入成功，记得保存') }
            else toast.err(r.error ?? '导入失败')
          }}>
            <Import size={12} /> 导入 config.yaml
          </button>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            const r = await api.exportConfig(cfg)
            r.ok ? toast.ok('已导出') : toast.err(r.error ?? '导出失败')
          }}>
            <Save size={12} /> 导出
          </button>
          <button className="btn btn-primary btn-sm" onClick={save}>保存全部</button>
        </div>
      } />
      {toast.node}

      <div className="card section">
        <div className="card-title" style={{ marginBottom: 0 }}>基础设置</div>
        <div className="section-row">
          <span className="form-label">日志等级</span>
          <select className="form-select" style={{ maxWidth: 220 }} value={basic.logLevel}
            onChange={e => patch(c => { c.setting.basicSetting.logLevel = e.target.value })}>
            <option value="debug">debug</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>
        </div>
        <div className="section-row">
          <span className="form-label">日志写入文件</span>
          <Switch checked={basic.logOutFileSw === 1}
            onChange={v => patch(c => { c.setting.basicSetting.logOutFileSw = v ? 1 : 0 })} />
        </div>
        <div className="section-row">
          <span className="form-label">界面主题</span>
          <div className="theme-picker">
            {THEME_LIST.map(t => (
              <button
                key={t.id}
                className={'theme-option' + (runtimeTheme === t.id ? ' active' : '')}
                onClick={() => {
                  applyTheme(t.id)
                  patch(c => { c.setting.basicSetting.theme = t.id })
                }}
              >
                <span
                  className="theme-swatch"
                  style={{ background: `linear-gradient(135deg, ${t.swatch[1]} 0 38%, transparent 38%), ${t.swatch[0]}` }}
                />
                <span className="theme-option-title">
                  {t.name}
                  {runtimeTheme === t.id && <Check size={13} strokeWidth={2.5} />}
                </span>
                <small>{t.hint}</small>
              </button>
            ))}
            <span className="form-hint" style={{ alignSelf: 'center' }}>点击立即生效，无需保存</span>
          </div>
        </div>
        <div className="section-row">
          <span className="form-label">数据目录</span>
          <div className="row">
            <button className="btn btn-sm" onClick={async () => {
              const r = await api.openDataDir()
              if (!r.ok) toast.err(r.error ?? '打开失败')
            }}>
              <FolderOpen size={12} /> 打开数据目录
            </button>
            <DataDirText />
          </div>
        </div>
      </div>

      <div className="card section">
        <div className="card-title" style={{ marginBottom: 0 }}>
          AI 答题接口
          {activePreset && (
            <span className="badge badge-config" style={{ marginLeft: 8 }}>
              {protocolName(activePreset.protocol)}
            </span>
          )}
          <span className="text-muted" style={{ marginLeft: 8, fontSize: 11, fontWeight: 400 }}>
            共 {presets.length} 个服务商预设
          </span>
        </div>
        <div className="section-row">
          <span className="form-label">服务商</span>
          <div className="section" style={{ gap: 6 }}>
            <select className="form-select" style={{ maxWidth: 320 }} value={ai.aiType}
              onChange={e => onProviderChange(e.target.value)}>
              {presets.length === 0 && <option value={ai.aiType}>{ai.aiType || 'deepseek'}</option>}
              {presets.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
            {activePreset?.note && <span className="form-hint">{activePreset.note}</span>}
          </div>
        </div>
        <div className="section-row">
          <span className="form-label">接口地址</span>
          <input className="form-input" value={ai.aiUrl}
            placeholder={activePreset?.baseURL || 'https://your-openai-compatible-api.example.com/v1'}
            onChange={e => patch(c => { c.setting.aiSetting.aiUrl = e.target.value })} />
        </div>
        <div className="section-row">
          <span className="form-label">模型</span>
          <div className="section" style={{ gap: 6 }}>
            <input className="form-input" list="ai-model-options" value={ai.model}
              placeholder="选择或输入模型名"
              onChange={e => patch(c => { c.setting.aiSetting.model = e.target.value })} />
            <datalist id="ai-model-options">
              {(activePreset?.models ?? []).map(m => <option key={m} value={m} />)}
            </datalist>
            {(activePreset?.models.length ?? 0) > 0 && (
              <div className="row" style={{ flexWrap: 'wrap' }}>
                {activePreset!.models.map(m => (
                  <button key={m} className={'tag' + (ai.model === m ? ' active' : '')}
                    style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                    onClick={() => patch(c => { c.setting.aiSetting.model = m })}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="section-row">
          <span className="form-label">API Key</span>
          <input className="form-input" type="password" value={ai.apiKey}
            placeholder={activePreset && (activePreset.code === 'ollama' || activePreset.code === 'lmstudio')
              ? '本地服务无需填写' : 'sk-…'}
            onChange={e => patch(c => { c.setting.aiSetting.apiKey = e.target.value })} />
        </div>
        <div className="section-row">
          <span className="form-label">连通性</span>
          <div className="section" style={{ gap: 8 }}>
            <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} disabled={testingAI}
              onClick={async () => {
                setTestingAI(true); setAiResult('')
                const r = await api.testAIConfig()
                setTestingAI(false)
                setAiResult(r.ok ? r.data : '失败：' + (r.error ?? '未知错误'))
              }}>
              {testingAI ? <Spinner size={12} /> : <PlugZap size={12} />} 测试 AI 配置
            </button>
            {aiResult && <div className={'alert ' + (aiResult.startsWith('失败') ? 'alert-error' : 'alert-success')}>{aiResult}</div>}
          </div>
        </div>
      </div>

      <div className="card section">
        <div className="card-title" style={{ marginBottom: 0 }}>题库接口</div>
        <div className="section-row">
          <span className="form-label">题库地址</span>
          <input className="form-input" value={cfg.setting.apiQueSetting.url}
            placeholder="https://example.com/api/search（留空关闭）"
            onChange={e => patch(c => { c.setting.apiQueSetting.url = e.target.value })} />
        </div>
        <div className="section-row">
          <span className="form-label">连通性</span>
          <div className="section" style={{ gap: 8 }}>
            <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} disabled={testingQue}
              onClick={async () => {
                setTestingQue(true); setQueResult('')
                const r = await api.testQuestionBankConfig()
                setTestingQue(false)
                setQueResult(r.ok ? r.data : '失败：' + (r.error ?? '未知错误'))
              }}>
              {testingQue ? <Spinner size={12} /> : <Database size={12} />} 测试题库配置
            </button>
            {queResult && <div className={'alert ' + (queResult.startsWith('失败') ? 'alert-error' : 'alert-success')}>{queResult}</div>}
          </div>
        </div>
      </div>

      <div className="card section">
        <div className="card-title" style={{ marginBottom: 0 }}>邮件通知</div>
        <div className="section-row">
          <span className="form-label">启用邮件通知</span>
          <Switch checked={email.sw === 1}
            onChange={v => patch(c => { c.setting.emailInform.sw = v ? 1 : 0 })} />
        </div>
        {email.sw === 1 && (
          <>
            <div className="section-row">
              <span className="form-label">SMTP 服务器</span>
              <input className="form-input" value={email.smtpHost} placeholder="smtp.example.com"
                onChange={e => patch(c => { c.setting.emailInform.smtpHost = e.target.value })} />
            </div>
            <div className="section-row">
              <span className="form-label">SMTP 端口</span>
              <input className="form-input" type="number" value={email.smtpPort}
                onChange={e => patch(c => { c.setting.emailInform.smtpPort = Number(e.target.value) || 0 })} />
            </div>
            <div className="section-row">
              <span className="form-label">发件账号 / 授权码</span>
              <div className="form-grid">
                <input className="form-input" value={email.userName} placeholder="user@example.com"
                  onChange={e => patch(c => { c.setting.emailInform.userName = e.target.value })} />
                <input className="form-input" type="password" value={email.password} placeholder="SMTP 授权码"
                  onChange={e => patch(c => { c.setting.emailInform.password = e.target.value })} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DataDirText() {
  const [dir, setDir] = useState('')
  useEffect(() => {
    api.getDataDir().then(r => { if (r.ok) setDir(r.data) })
  }, [])
  return <span className="text-muted" style={{ fontSize: 11, wordBreak: 'break-all' }}>{dir}</span>
}
