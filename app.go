package main

import (
	"context"
	"os/exec"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"coursepilot-desktop/service"
)

// AppVersion 应用版本号
const AppVersion = "0.1.0"

// --- 非泛型 DTO（Wails bindgen 友好） ---

type BoolResult struct {
	Ok    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

type StringResult struct {
	Ok    bool   `json:"ok"`
	Data  string `json:"data"`
	Error string `json:"error,omitempty"`
}

type ConfigResult struct {
	Ok    bool              `json:"ok"`
	Data  service.AppConfig `json:"data"`
	Error string            `json:"error,omitempty"`
}

type AccountListResult struct {
	Ok    bool                `json:"ok"`
	Data  []service.AccountVO `json:"data"`
	Error string              `json:"error,omitempty"`
}

type TaskStatusListResult struct {
	Ok    bool                 `json:"ok"`
	Data  []service.TaskStatus `json:"data"`
	Error string               `json:"error,omitempty"`
}

type DashboardResult struct {
	Ok    bool             `json:"ok"`
	Data  service.Dashboard `json:"data"`
	Error string           `json:"error,omitempty"`
}

type StringListResult struct {
	Ok    bool     `json:"ok"`
	Data  []string `json:"data"`
	Error string   `json:"error,omitempty"`
}

type PlatformListResult struct {
	Ok    bool                   `json:"ok"`
	Data  []service.PlatformInfo `json:"data"`
	Error string                 `json:"error,omitempty"`
}

type ProviderListResult struct {
	Ok    bool                    `json:"ok"`
	Data  []service.ProviderPreset `json:"data"`
	Error string                  `json:"error,omitempty"`
}

type CourseListResult struct {
	Ok    bool               `json:"ok"`
	Data  []service.CourseVO `json:"data"`
	Error string             `json:"error,omitempty"`
}

type UpdateResult struct {
	Ok    bool              `json:"ok"`
	Data  service.UpdateInfo `json:"data"`
	Error string            `json:"error,omitempty"`
}

// --- App ---

type App struct {
	ctx        context.Context
	taskMgr    *service.TaskManager
	logHub     *service.LogHub
	configPath string
}

func NewApp() *App { return &App{} }

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.logHub = service.NewLogHub()
	a.taskMgr = service.NewTaskManager()

	service.LineEmitter = func(uid, msg string) {
		clean := service.ToUTF8(service.StripANSI(msg))
		a.logHub.Push(clean)
		runtime.EventsEmit(a.ctx, "log:"+uid, clean)
		runtime.EventsEmit(a.ctx, "log:all", map[string]string{"uid": uid, "msg": clean})
	}
	service.RunningChecker = func(uid string) bool {
		return a.taskMgr.RunningSet()[uid]
	}

	if path, err := service.DefaultConfigPath(); err == nil {
		a.configPath = path
		if cfg, e := service.LoadConfig(path); e == nil {
			_ = service.SaveConfig(path, cfg)
		}
	}
}

func (a *App) shutdown(_ context.Context) {
	a.taskMgr.StopAll()
}

// --- 通用 ---

func (a *App) GetVersion() string { return AppVersion }

func (a *App) OpenURL(url string) BoolResult {
	if len(url) < 9 || !(strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://")) {
		return BoolResult{Error: "仅允许 http:// 或 https:// 链接"}
	}
	runtime.BrowserOpenURL(a.ctx, url)
	return BoolResult{Ok: true}
}

// --- 配置 ---

func (a *App) GetConfig() ConfigResult {
	cfg, err := service.LoadConfig(a.configPath)
	if err != nil {
		return ConfigResult{Error: err.Error()}
	}
	return ConfigResult{Ok: true, Data: cfg}
}

func (a *App) SaveConfig(cfg service.AppConfig) BoolResult {
	if a.configPath == "" {
		return BoolResult{Error: "配置路径未初始化，请检查 AppData 权限"}
	}
	if errs := service.ValidateConfig(cfg); len(errs) > 0 {
		return BoolResult{Error: errs[0]}
	}
	if err := service.SaveConfig(a.configPath, cfg); err != nil {
		return BoolResult{Error: err.Error()}
	}
	return BoolResult{Ok: true}
}

func (a *App) GetDataDir() StringResult {
	dir, err := service.DataDir()
	if err != nil {
		return StringResult{Error: err.Error()}
	}
	return StringResult{Ok: true, Data: dir}
}

func (a *App) OpenDataDir() BoolResult {
	dir, err := service.DataDir()
	if err != nil {
		return BoolResult{Error: err.Error()}
	}
	if err := exec.Command("explorer.exe", dir).Start(); err != nil {
		return BoolResult{Error: err.Error()}
	}
	return BoolResult{Ok: true}
}

func (a *App) ImportConfig() ConfigResult {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "选择 config.yaml",
		Filters: []runtime.FileFilter{{DisplayName: "YAML 文件", Pattern: "*.yaml;*.yml"}},
	})
	if err != nil || path == "" {
		return ConfigResult{Error: "用户取消"}
	}
	cfg, err := service.LoadConfig(path)
	if err != nil {
		return ConfigResult{Error: err.Error()}
	}
	return ConfigResult{Ok: true, Data: cfg}
}

func (a *App) ExportConfig(cfg service.AppConfig) BoolResult {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "导出 config.yaml",
		DefaultFilename: "config.yaml",
		Filters:         []runtime.FileFilter{{DisplayName: "YAML 文件", Pattern: "*.yaml"}},
	})
	if err != nil || path == "" {
		return BoolResult{Error: "用户取消"}
	}
	if err := service.SaveConfig(path, cfg); err != nil {
		return BoolResult{Error: err.Error()}
	}
	return BoolResult{Ok: true}
}

// --- 账号 ---

func (a *App) ListAccounts() AccountListResult {
	list, err := service.ListAccounts(a.taskMgr.RunningSet)
	if err != nil {
		return AccountListResult{Error: err.Error()}
	}
	return AccountListResult{Ok: true, Data: list}
}

func (a *App) AddAccount(req service.AccountReq) BoolResult {
	if err := service.GetStore().Add(req); err != nil {
		return BoolResult{Error: err.Error()}
	}
	return BoolResult{Ok: true}
}

func (a *App) UpdateAccount(req service.AccountReq) BoolResult {
	if err := service.GetStore().Update(req); err != nil {
		return BoolResult{Error: err.Error()}
	}
	return BoolResult{Ok: true}
}

func (a *App) DeleteAccount(uid string) BoolResult {
	a.taskMgr.Stop(uid)
	if err := service.GetStore().Delete(uid); err != nil {
		return BoolResult{Error: err.Error()}
	}
	return BoolResult{Ok: true}
}

// --- 任务 ---

func (a *App) StartTask(uid string) BoolResult {
	if err := a.taskMgr.Start(uid); err != nil {
		return BoolResult{Error: err.Error()}
	}
	return BoolResult{Ok: true}
}

func (a *App) StopTask(uid string) BoolResult {
	a.taskMgr.Stop(uid)
	return BoolResult{Ok: true}
}

func (a *App) GetTaskStatuses() TaskStatusListResult {
	return TaskStatusListResult{Ok: true, Data: a.taskMgr.Statuses()}
}

// --- 仪表盘 ---

func (a *App) GetDashboard() DashboardResult {
	accounts := service.GetStore().List()
	d := service.Dashboard{
		TotalAccounts: len(accounts),
		RunningTasks:  len(a.taskMgr.RunningSet()),
		ConfigPath:    a.configPath,
		ConfigOK:      a.configPath != "",
		RecentLogs:    a.logHub.Recent(8),
	}
	if d.RecentLogs == nil {
		d.RecentLogs = []string{}
	}
	return DashboardResult{Ok: true, Data: d}
}

// --- 日志 ---

func (a *App) GetRecentLogs(n int) StringListResult {
	logs := a.logHub.Recent(n)
	if logs == nil {
		logs = []string{}
	}
	return StringListResult{Ok: true, Data: logs}
}

func (a *App) TailLogFile(n int) StringListResult {
	return a.GetRecentLogs(n)
}

// --- 平台 ---

func (a *App) GetPlatformSupport() PlatformListResult {
	return PlatformListResult{Ok: true, Data: service.PlatformSupportList()}
}

// --- 课程 ---

func (a *App) GetCourses(uid string) CourseListResult {
	courses, err := service.GetCourses(uid)
	if err != nil {
		return CourseListResult{Error: err.Error()}
	}
	return CourseListResult{Ok: true, Data: courses}
}

// --- AI / 题库连通性测试 ---

func (a *App) GetProviderPresets() ProviderListResult {
	return ProviderListResult{Ok: true, Data: service.ProviderPresets()}
}

func (a *App) TestAIConfig() StringResult {
	cfg, err := service.LoadConfig(a.configPath)
	if err != nil {
		return StringResult{Error: "读取配置失败: " + err.Error()}
	}
	result, testErr := service.TestAI(cfg.Setting.AiSetting)
	if testErr != nil {
		return StringResult{Error: testErr.Error()}
	}
	return StringResult{Ok: true, Data: result}
}

func (a *App) TestQuestionBankConfig() StringResult {
	cfg, err := service.LoadConfig(a.configPath)
	if err != nil {
		return StringResult{Error: "读取配置失败: " + err.Error()}
	}
	result, testErr := service.TestQuestionBank(cfg.Setting.ApiQueSetting)
	if testErr != nil {
		return StringResult{Error: testErr.Error()}
	}
	return StringResult{Ok: true, Data: result}
}

// --- 更新 ---

func (a *App) CheckForUpdates(currentVersion string) UpdateResult {
	info, err := service.CheckUpdate(currentVersion)
	if err != nil {
		return UpdateResult{Error: err.Error()}
	}
	return UpdateResult{Ok: true, Data: info}
}
