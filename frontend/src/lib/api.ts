import { callMethod, onEvent } from './backend'
import type {
  AccountListResult, AccountReq, AppConfig, BoolResult, ConfigResult, CourseListResult,
  DashboardResult, PlatformListResult, ProviderListResult, StringListResult, StringResult,
  TaskStatusListResult, UpdateResult,
} from './types'

export const APP_VERSION = '0.1.0'
export const RELEASES_URL = 'https://github.com/key829/coursepilot-desktop/releases'

export const api = {
  getVersion:        (): Promise<string>            => callMethod<string>('GetVersion'),
  getConfig:         (): Promise<ConfigResult>      => callMethod('GetConfig'),
  saveConfig:        (v: AppConfig): Promise<BoolResult> => callMethod('SaveConfig', v),
  getDataDir:        (): Promise<StringResult>      => callMethod('GetDataDir'),
  openDataDir:       (): Promise<BoolResult>        => callMethod('OpenDataDir'),
  importConfig:      (): Promise<ConfigResult>      => callMethod('ImportConfig'),
  exportConfig:      (v: AppConfig): Promise<BoolResult> => callMethod('ExportConfig', v),
  listAccounts:      (): Promise<AccountListResult> => callMethod('ListAccounts'),
  addAccount:        (v: AccountReq): Promise<BoolResult> => callMethod('AddAccount', v),
  updateAccount:     (v: AccountReq): Promise<BoolResult> => callMethod('UpdateAccount', v),
  deleteAccount:     (uid: string): Promise<BoolResult>   => callMethod('DeleteAccount', uid),
  startTask:         (uid: string): Promise<BoolResult>   => callMethod('StartTask', uid),
  stopTask:          (uid: string): Promise<BoolResult>   => callMethod('StopTask', uid),
  getTaskStatuses:   (): Promise<TaskStatusListResult>    => callMethod('GetTaskStatuses'),
  getDashboard:      (): Promise<DashboardResult>   => callMethod('GetDashboard'),
  getRecentLogs:     (n: number): Promise<StringListResult> => callMethod('GetRecentLogs', n),
  tailLogFile:       (n: number): Promise<StringListResult> => callMethod('TailLogFile', n),
  getPlatformSupport:(): Promise<PlatformListResult> => callMethod('GetPlatformSupport'),
  getProviderPresets: (): Promise<ProviderListResult> => callMethod('GetProviderPresets'),
  testAIConfig:      (): Promise<StringResult>      => callMethod('TestAIConfig'),
  testQuestionBankConfig: (): Promise<StringResult> => callMethod('TestQuestionBankConfig'),
  getCourses:        (uid: string): Promise<CourseListResult> => callMethod('GetCourses', uid),
  checkForUpdates:   (v: string): Promise<UpdateResult> => callMethod('CheckForUpdates', v),
  openURL:           (url: string): Promise<BoolResult> => callMethod('OpenURL', url),
}

export function onTaskLog(uid: string, cb: (msg: string) => void): () => void {
  return onEvent('log:' + uid, payload => cb(String(payload)))
}

export function onAnyLog(cb: (item: { uid: string; msg: string }) => void): () => void {
  return onEvent('log:all', payload => cb(payload as { uid: string; msg: string }))
}
