// 浏览器预览模式的模拟后端：window.go 不存在时接管全部 API，
// 让页面在纯浏览器（vite dev / vite preview）里也能完整体验。
import type {
  AccountReq, AccountVO, AppConfig, CourseVO, Dashboard, PlatformInfo, ProviderPreset, TaskStatus,
} from './types'

type Listener = (payload: unknown) => void

class EventBus {
  private map = new Map<string, Set<Listener>>()
  on(event: string, cb: Listener): () => void {
    if (!this.map.has(event)) this.map.set(event, new Set())
    this.map.get(event)!.add(cb)
    return () => { this.map.get(event)?.delete(cb) }
  }
  emit(event: string, payload?: unknown) {
    this.map.get(event)?.forEach(cb => cb(payload))
  }
}

export const bus = new EventBus()

const PROVIDERS: ProviderPreset[] = [
  { code: 'deepseek', name: 'DeepSeek', baseURL: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner'], protocol: 'openai', note: '官方 OpenAI 兼容接口' },
  { code: 'openai', name: 'OpenAI', baseURL: 'https://api.openai.com/v1', models: ['gpt-4o-mini', 'gpt-4o'], protocol: 'openai', note: '需国际网络环境' },
  { code: 'qwen', name: '通义千问', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-plus', 'qwen-max', 'qwen-turbo'], protocol: 'openai', note: 'DashScope 兼容模式' },
  { code: 'moonshot', name: '月之暗面 Kimi', baseURL: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k', 'moonshot-v1-32k'], protocol: 'openai', note: '' },
  { code: 'zhipu', name: '智谱 GLM', baseURL: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4-flash', 'glm-4-plus'], protocol: 'openai', note: 'glm-4-flash 免费额度' },
  { code: 'doubao', name: '字节豆包（火山方舟）', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', models: ['doubao-pro-32k', 'doubao-lite-32k'], protocol: 'openai', note: '模型名需换成控制台创建的接入点 ID（ep-xxxx）' },
  { code: 'ernie', name: '百度文心（千帆 v2）', baseURL: 'https://qianfan.baidubce.com/v2', models: ['ernie-4.0-8k-latest', 'ernie-speed-128k'], protocol: 'openai', note: '使用千帆 v2 OpenAI 兼容接口，Key 为 API Key（非 AK/SK）' },
  { code: 'hunyuan', name: '腾讯混元', baseURL: 'https://api.hunyuan.cloud.tencent.com/v1', models: ['hunyuan-turbos-latest', 'hunyuan-lite'], protocol: 'openai', note: '' },
  { code: 'spark', name: '讯飞星火', baseURL: 'https://spark-api-open.xf-yun.com/v1', models: ['4.0Ultra', 'generalv3.5', 'lite'], protocol: 'openai', note: 'Key 填 HTTP 接口鉴权的 APIPassword' },
  { code: 'minimax', name: 'MiniMax', baseURL: 'https://api.minimax.chat/v1', models: ['abab6.5s-chat'], protocol: 'openai', note: '' },
  { code: 'siliconflow', name: '硅基流动', baseURL: 'https://api.siliconflow.cn/v1', models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'], protocol: 'openai', note: '聚合平台，一个 Key 调多家开源模型' },
  { code: 'openrouter', name: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', models: ['openai/gpt-4o-mini', 'deepseek/deepseek-chat'], protocol: 'openai', note: '国际聚合平台' },
  { code: 'groq', name: 'Groq', baseURL: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile'], protocol: 'openai', note: '极速推理' },
  { code: 'ollama', name: 'Ollama（本地）', baseURL: 'http://localhost:11434/v1', models: ['llama3.1', 'qwen2.5'], protocol: 'openai', note: '本地服务，无需 API Key' },
  { code: 'lmstudio', name: 'LM Studio（本地）', baseURL: 'http://localhost:1234/v1', models: ['本地已加载的模型'], protocol: 'openai', note: '本地服务，无需 API Key' },
  { code: 'gemini', name: 'Google Gemini', baseURL: 'https://generativelanguage.googleapis.com', models: ['gemini-2.0-flash', 'gemini-1.5-pro'], protocol: 'gemini', note: '原生 generateContent 协议，需国际网络环境' },
  { code: 'claude', name: 'Anthropic Claude', baseURL: 'https://api.anthropic.com', models: ['claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'], protocol: 'claude', note: '原生 messages 协议，需国际网络环境' },
  { code: 'custom', name: '自定义（OpenAI 兼容）', baseURL: '', models: [], protocol: 'openai', note: '任何 OpenAI 兼容服务：填地址、模型名与 Key 即可' },
]

const PLATFORMS: PlatformInfo[] = [
  { code: 'xxt', name: '超星学习通', guiSupport: 'full', note: '课程 / 章节任务点 / 测验（内置演示引擎）' },
  { code: 'yinghua', name: '英华学堂（及套壳平台）', guiSupport: 'full', note: '课程视频 / 作业（内置演示引擎）' },
  { code: 'icve', name: '智慧职教 · 学习公社', guiSupport: 'full', note: '课程 / 课件学习（内置演示引擎）' },
  { code: 'zhsd', name: '中大网校', guiSupport: 'config-only', note: '仅配置保存，任务引擎待接入' },
]

const COURSE_POOL: Record<string, string[]> = {
  xxt: ['高等数学（下）', '大学英语（四）', '马克思主义基本原理', '数据结构与算法', '大学生心理健康教育', 'Python 程序设计'],
  yinghua: ['管理学原理', '微观经济学', '概率论与数理统计', '市场营销学', '商务英语', '组织行为学'],
  icve: ['机械制图与 CAD', '电工电子技术', '汽车发动机构造与维修', 'web 前端开发技术', '会计基础实务'],
  zhsd: ['安全生产法律法规'],
}
const TEACHERS = ['王老师', '李老师', '张老师', '陈老师', '刘老师']

const platformName = (code: string) => PLATFORMS.find(p => p.code === code)?.name ?? code

const emptyCustom = () => ({
  shuffleSw: 0, videoModel: 0, autoExam: 0, examAutoSubmit: 0,
  excludeCourses: [], includeCourses: [],
})

const MOCK_KEY = 'coursepilot-mock-state-v1'

interface MockPersist {
  accounts: AccountReq[]
  config: AppConfig
  finish: Record<string, Record<string, number>> // uid → courseId → finishCount
}

function loadPersisted(): MockPersist | null {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    return raw ? (JSON.parse(raw) as MockPersist) : null
  } catch {
    return null
  }
}

const state = (() => {
  const saved = loadPersisted()
  return {
    accounts: saved?.accounts ?? [],
    config: saved?.config ?? {
      setting: {
        basicSetting: { completionTone: 1, colorLog: 1, logOutFileSw: 1, logLevel: 'info', logModel: 1, webModel: 1, theme: 'dark' },
        emailInform: { sw: 0, smtpHost: '', smtpPort: 465, userName: '', password: '' },
        aiSetting: { aiType: 'deepseek', aiUrl: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: '' },
        apiQueSetting: { url: '' },
      },
      users: [],
    } as AppConfig,
    tasks: new Map<string, { timer: number | null; logs: string[]; status: TaskStatus }>(),
    courses: new Map<string, CourseVO[]>(),
    finish: saved?.finish ?? {},
  }
})()

function persist() {
  try {
    const data: MockPersist = { accounts: state.accounts, config: state.config, finish: {} }
    for (const [uid, list] of state.courses) {
      data.finish[uid] = Object.fromEntries(list.map(c => [c.courseId, c.jobFinishCount]))
    }
    localStorage.setItem(MOCK_KEY, JSON.stringify(data))
  } catch { /* 隐私模式下忽略 */ }
}

const stamp = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const emitLog = (uid: string, msg: string) => {
  const line = `[${stamp()}] ${msg}`
  const t = state.tasks.get(uid)
  if (t) {
    t.logs.push(line)
    if (t.logs.length > 500) t.logs.shift()
    t.status.lastLog = line
  }
  bus.emit('log:' + uid, line)
  bus.emit('log:all', { uid, msg: line })
}

const statusOf = (uid: string): TaskStatus => {
  const acc = state.accounts.find(a => a.uid === uid)
  const t = state.tasks.get(uid)
  return t?.status ?? {
    uid, account: acc?.remarkName || acc?.account || uid,
    platform: platformName(acc?.accountType ?? ''), state: 'stopped',
  }
}

const genCourses = (uid: string): CourseVO[] => {
  const acc = state.accounts.find(a => a.uid === uid)
  const pool = COURSE_POOL[acc?.accountType ?? 'xxt'] ?? COURSE_POOL.xxt
  let hash = 0
  for (const ch of uid) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0
  const total0 = pool.length
  const n = 3 + (hash % 3)
  const list: CourseVO[] = []
  for (let i = 0; i < n; i++) {
    const total = 8 + ((hash >>> (i % 24)) % 12)
    const courseId = `${acc?.accountType ?? 'xxt'}-${i + 1}`
    const persisted = state.finish[uid]?.[courseId] ?? 0
    const auto = (hash >>> ((i + 2) % 24)) % Math.floor(total / 2)
    const live = state.courses.get(uid)?.[i]?.jobFinishCount
    const finish = Math.min(total, live ?? Math.max(persisted, auto))
    list.push({
      platform: acc?.accountType ?? 'xxt', key: `${uid}-${i}`, courseId,
      courseName: pool[i % total0], courseTeacher: TEACHERS[(hash + i) % TEACHERS.length],
      jobFinishCount: finish, jobCount: total,
      jobRate: Math.round((finish / total) * 1000) / 10,
      hasProgress: true, state: finish >= total ? 1 : 0, isStart: !!state.tasks.get(uid)?.status.state.startsWith('running'),
      rawStatusText: finish >= total ? '已完成' : finish > 0 ? '进行中' : '未开始',
    })
  }
  state.courses.set(uid, list)
  return list
}

const runTask = (uid: string) => {
  const acc = state.accounts.find(a => a.uid === uid)
  if (!acc) return
  const custom = acc.coursesCustom ?? emptyCustom()
  const courses = genCourses(uid)
    .filter(c => !custom.excludeCourses?.includes(c.courseName))
    .filter(c => (custom.includeCourses?.length ?? 0) === 0 || custom.includeCourses!.includes(c.courseName))
    .filter(c => c.jobFinishCount < c.jobCount)
    .sort((a, b) => a.jobFinishCount - b.jobFinishCount)

  emitLog(uid, `[INFO] 正在登录 ${platformName(acc.accountType)}（${acc.url || 'demo.local'}）…`)
  setTimeout(() => emitLog(uid, '[INFO] 登录成功，正在拉取课程列表…'), 500)
  setTimeout(() => emitLog(uid, `[INFO] 共 ${courses.length} 门课程待处理，视频模式=${['模拟', '极速', '混刷'][custom.videoModel] ?? '模拟'}，自动测验=${custom.autoExam === 1 ? '开' : '关'}`), 1100)

  let ci = 0
  const timer = window.setInterval(() => {
    const st = state.tasks.get(uid)
    if (!st || st.status.state !== 'running') { window.clearInterval(timer); return }
    if (ci >= courses.length) {
      window.clearInterval(timer)
      emitLog(uid, '[INFO] 全部课程学习完成，任务结束')
      st.status.state = 'stopped'
      if (st.timer) st.timer = null
      return
    }
    const c = courses[ci]
    if (c.jobFinishCount === 0) emitLog(uid, `[INFO] 开始学习《${c.courseName}》（${c.courseTeacher}，共 ${c.jobCount} 个任务点）`)
    c.jobFinishCount++
    c.jobRate = Math.round((c.jobFinishCount / c.jobCount) * 1000) / 10
    c.rawStatusText = c.jobFinishCount >= c.jobCount ? '已完成' : '进行中'
    emitLog(uid, `[INFO] 《${c.courseName}》任务点 ${c.jobFinishCount}/${c.jobCount} 完成（${Math.floor(c.jobRate)}%）`)
    if (Math.random() < 0.08) emitLog(uid, '[WARN] 检测到弹题验证，已自动作答（演示引擎）')
    if (c.jobFinishCount >= c.jobCount) emitLog(uid, `[INFO] 《${c.courseName}》全部任务点完成 ✔`)
    else ci++
    persist()
  }, 900)
  return timer
}

const delay = <T,>(v: T, ms = 120): Promise<T> => new Promise(res => setTimeout(() => res(v), ms))

export const mockApi: Record<string, (...args: unknown[]) => Promise<unknown>> = {
  GetVersion: () => delay('0.1.0 (browser-mock)'),
  GetConfig: () => delay({ ok: true, data: state.config }),
  SaveConfig: (cfg) => { state.config = cfg as AppConfig; persist(); return delay({ ok: true }) },
  GetDataDir: () => delay({ ok: true, data: '%APPDATA%\\CoursePilot（浏览器预览模式）' }),
  OpenDataDir: () => delay({ ok: true }),
  ImportConfig: () => delay({ ok: true, data: state.config }),
  ExportConfig: () => delay({ ok: true }),
  ListAccounts: () => delay({
    ok: true,
    data: state.accounts.map<AccountVO>(a => ({
      uid: a.uid, accountType: a.accountType, url: a.url, remarkName: a.remarkName,
      account: a.account, isProxy: a.isProxy, isRunning: state.tasks.get(a.uid)?.status.state === 'running',
      guiSupport: a.accountType === 'zhsd' ? 'config-only' : 'full',
      coursesCustom: a.coursesCustom ?? emptyCustom(), informEmails: a.informEmails ?? [],
    })),
  }),
  AddAccount: (req) => {
    const r = req as AccountReq
    if (!r.account || !r.password) return delay({ ok: false, error: '账号与密码不能为空' }, 40)
    state.accounts.push({ ...r, uid: Math.random().toString(16).slice(2, 10) })
    persist()
    return delay({ ok: true })
  },
  UpdateAccount: (req) => {
    const r = req as AccountReq
    const i = state.accounts.findIndex(a => a.uid === r.uid)
    if (i >= 0) state.accounts[i] = { ...state.accounts[i], ...r }
    persist()
    return delay({ ok: true })
  },
  DeleteAccount: (uid) => {
    state.accounts = state.accounts.filter(a => a.uid !== uid)
    persist()
    return delay({ ok: true })
  },
  StartTask: (uid) => {
    const s = uid as string
    if (state.tasks.get(s)?.status.state === 'running') return delay({ ok: false, error: '任务已在运行中' }, 40)
    state.tasks.set(s, { timer: null, logs: [], status: { ...statusOf(s), state: 'running', startTime: stamp() } })
    const t = runTask(s)
    if (state.tasks.get(s)) state.tasks.get(s)!.timer = (t as number) ?? null
    return delay({ ok: true })
  },
  StopTask: (uid) => {
    const st = state.tasks.get(uid as string)
    if (st) {
      if (st.timer) window.clearInterval(st.timer)
      st.status.state = 'stopped'
      st.status.lastLog = '任务已手动停止'
    }
    return delay({ ok: true })
  },
  GetTaskStatuses: () => delay({ ok: true, data: state.accounts.map(a => statusOf(a.uid)) }),
  GetDashboard: () => delay({
    ok: true,
    data: {
      totalAccounts: state.accounts.length,
      runningTasks: [...state.tasks.values()].filter(t => t.status.state === 'running').length,
      configPath: '%APPDATA%\\CoursePilot\\config.yaml',
      configOK: true,
      recentLogs: [...state.tasks.values()].flatMap(t => t.logs.slice(-3)).slice(-8),
    } as Dashboard,
  }),
  GetRecentLogs: () => delay({ ok: true, data: [...state.tasks.values()].flatMap(t => t.logs).slice(-200) }),
  TailLogFile: (n) => delay({ ok: true, data: [...state.tasks.values()].flatMap(t => t.logs).slice(-(n as number)) }),
  GetPlatformSupport: () => delay({ ok: true, data: PLATFORMS }),
  GetProviderPresets: () => delay({ ok: true, data: PROVIDERS }),
  TestAIConfig: () => delay({ ok: true, data: '未配置 API Key，已跳过真实请求（当前为演示模式）' }, 600),
  TestQuestionBankConfig: () => delay({ ok: true, data: '未配置题库地址，已跳过（当前为演示模式）' }, 400),
  GetCourses: (uid) => delay({ ok: true, data: genCourses(uid as string) }, 500),
  CheckForUpdates: (v) => delay({ ok: true, data: { hasUpdate: false, latestVersion: v, currentVersion: v, url: '' } }, 400),
  OpenURL: () => delay({ ok: true }),
}

export const mockEvents = {
  EventsOn(event: string, cb: Listener): () => void {
    return bus.on(event, cb)
  },
}
