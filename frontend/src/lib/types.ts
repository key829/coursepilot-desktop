// 与后端 service 包的 DTO 保持一致
export interface CoursesCustom {
  studyTime?: string
  shuffleSw: number
  videoModel: number
  autoExam: number
  examAutoSubmit: number
  excludeCourses: string[]
  includeCourses: string[]
}

export interface AccountVO {
  uid: string
  accountType: string
  url: string
  remarkName?: string
  account: string
  isProxy: number
  isRunning: boolean
  guiSupport: 'full' | 'config-only' | 'none'
  coursesCustom: CoursesCustom
  informEmails: string[]
}

export type AccountReq = Omit<AccountVO, 'isRunning' | 'guiSupport'> & { password: string }

export interface TaskStatus {
  uid: string
  account: string
  platform: string
  state: 'running' | 'stopped' | 'failed'
  startTime?: string
  lastLog?: string
  error?: string
}

export interface Dashboard {
  totalAccounts: number
  runningTasks: number
  configPath: string
  configOK: boolean
  recentLogs: string[]
}

export interface PlatformInfo {
  code: string
  name: string
  guiSupport: string
  note: string
}

export interface ProviderPreset {
  code: string
  name: string
  baseURL: string
  models: string[]
  protocol: 'openai' | 'gemini' | 'claude'
  note: string
}

export interface CourseVO {
  platform: string
  key: string
  courseId: string
  courseName: string
  courseTeacher: string
  jobFinishCount: number
  jobCount: number
  jobRate: number
  hasProgress: boolean
  state: number
  isStart: boolean
  rawStatusText: string
}

export interface BasicSetting {
  completionTone: number
  colorLog: number
  logOutFileSw: number
  logLevel: string
  logModel: number
  webModel: number
  theme?: string
}

export interface EmailInform {
  sw: number
  smtpHost: string
  smtpPort: number
  userName: string
  password: string
}

export interface AiSetting {
  aiType: string
  aiUrl: string
  model: string
  apiKey: string
}

export interface AppConfig {
  setting: {
    basicSetting: BasicSetting
    emailInform: EmailInform
    aiSetting: AiSetting
    apiQueSetting: { url: string }
  }
  users: unknown[]
}

export interface UpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  url: string
}

export interface BoolResult { ok: boolean; error?: string }
export interface StringResult { ok: boolean; data: string; error?: string }
export interface ConfigResult { ok: boolean; data: AppConfig; error?: string }
export interface AccountListResult { ok: boolean; data: AccountVO[]; error?: string }
export interface TaskStatusListResult { ok: boolean; data: TaskStatus[]; error?: string }
export interface DashboardResult { ok: boolean; data: Dashboard; error?: string }
export interface StringListResult { ok: boolean; data: string[]; error?: string }
export interface PlatformListResult { ok: boolean; data: PlatformInfo[]; error?: string }
export interface ProviderListResult { ok: boolean; data: ProviderPreset[]; error?: string }
export interface CourseListResult { ok: boolean; data: CourseVO[]; error?: string }
export interface UpdateResult { ok: boolean; data: UpdateInfo; error?: string }
