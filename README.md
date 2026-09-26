# CoursePilot 课程领航

多平台课程学习管理桌面工具。本项目是参照开源项目 [yatori-go-desktop](https://github.com/yuanycr/yatori-go-desktop)（基于 [yatori-dev/yatori-go-console](https://github.com/yatori-dev/yatori-go-console)）的**从零实现的原创复刻**，用于学习 Wails 桌面应用的完整架构。当前内置**演示引擎**，所有平台交互均为本地模拟，不连接任何学习平台。

![tech](https://img.shields.io/badge/Wails-v2-blue) ![go](https://img.shields.io/badge/Go-1.24-00ADD8) ![react](https://img.shields.io/badge/React-18-61DAFB) ![license](https://img.shields.io/badge/License-MIT-green)

## 功能一览

| 页面 | 功能 |
| --- | --- |
| 仪表盘 | 账号总数 / 运行任务 / 配置状态 / 数据目录，最近日志速览（5s 自动刷新） |
| 账号管理 | 多平台账号增删改查、代理开关、通知邮箱、每账号学习策略（视频模式 / 乱序 / 自动测验 / 包含排除课程） |
| 任务控制 | 每账号任务卡片，启动 / 停止 / 失败原因，实时滚动日志（Wails 事件流） |
| 课程进度 | 按账号查看课程列表与任务点完成度进度条，进度落盘、重启可续 |
| 日志中心 | 全局日志实时流，按级别过滤、自动滚动、清空 |
| 全局设置 | 日志等级 / 主题、AI 接口配置与连通性测试（**18 个服务商预设**）、题库接口测试、SMTP 邮件通知、config.yaml 导入导出 |
| 关于 | 版本 / 检查更新（GitHub Release）、使用声明 |

其他工程能力：深浅色主题切换、单实例语义、窗口自适应布局、GBK 日志兼容转码、并发任务池（默认 5）。

## 技术栈与架构

```
coursepilot-desktop/
├── main.go                  # Wails 启动、窗口与资源服务
├── app.go                   # 绑定层：前端可调用的全部方法（DTO 结果封装）
├── service/                 # 服务层（与 UI 解耦）
│   ├── models.go            #   DTO：账号/任务/课程/配置
│   ├── paths.go             #   数据目录 %APPDATA%/CoursePilot
│   ├── config_service.go    #   config.yaml 读写校验（yaml.v3）
│   ├── account_service.go   #   accounts.json 账号仓库（CRUD）
│   ├── task_manager.go      #   任务管理器：goroutine 池 + 状态机
│   ├── engine.go            #   学习引擎（当前为演示实现，可替换真实核心）
│   ├── log_service.go       #   LogHub 环形缓冲 + ANSI 清洗 + GBK 转码
│   ├── platform.go          #   平台注册表
│   ├── ai_service.go        # AI 多服务商适配（18 预设：OpenAI 兼容 / Gemini / Claude 原生协议）+ 题库连通性测试
│   └── update_service.go    #   GitHub Release 更新检查
├── frontend/                # React 18 + TypeScript + Vite
│   └── src/
│       ├── components/      # Layout（侧边栏/主题/更新浮窗）+ 通用组件
│       ├── pages/           # 七个页面
│       └── lib/             # api 封装、类型、mock（浏览器预览模式）
└── build/                   # 图标与 Windows 版本信息
```

数据流：`前端 api.*()` → Wails 绑定 → `service` 层；任务日志经 `service.LineEmitter` → Wails `EventsEmit("log:<uid>" / "log:all")` → 前端订阅实时渲染。

## 开发

```bash
# 前置：Go >= 1.24、Node >= 18、Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0

# 热重载开发（自动打开桌面窗口）
wails dev

# 纯浏览器调试（无需 Go 后端，自动使用 mock 数据）
cd frontend && npm install && npm run dev

# 打包 Windows exe
wails build        # 产物：build/bin/coursepilot-desktop.exe
```

## 接入真实平台核心

演示引擎集中在 `service/engine.go`，接口面刻意与原版对齐，替换点：

1. `RunAccountTask(po, ctx, log)` —— 替换为真实平台 runner（如引入 `yatori-go-core`：登录、拉课程、刷任务点、答题）；
2. `GetCourses(uid)` —— 替换为真实课程列表查询，`CourseVO` 结构已与原版一致；
3. `service/ai_service.go` —— 已实现多服务商 AI 调用，真实答题直接复用 `chatOnce()`：
   - **OpenAI 兼容协议**：DeepSeek、OpenAI、通义千问、Kimi、智谱 GLM、豆包（火山方舟）、百度文心（千帆 v2）、腾讯混元、讯飞星火、MiniMax、硅基流动、OpenRouter、Groq、Ollama、LM Studio；
   - **原生协议**：Google Gemini（generateContent）、Anthropic Claude（messages）；
   - **自定义**：任何 OpenAI 兼容服务（填地址 + 模型名 + Key）；
4. 账号密码目前为 base64 混淆存储，正式使用建议改用 Windows DPAPI 加密。

## 使用声明

仅用于**本人授权账号**的学习管理，请遵守所在学校与平台服务条款；因违规使用产生的后果由使用者自行承担。本项目 MIT 协议。
