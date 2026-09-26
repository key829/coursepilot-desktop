package service

// CoursesCustom 每账号学习策略（与前端 types.ts 的 CoursesCustom 对齐）
type CoursesCustom struct {
	StudyTime        string   `json:"studyTime,omitempty" yaml:"studyTime,omitempty"`
	ShuffleSw        int      `json:"shuffleSw" yaml:"shuffleSw"`
	VideoModel       int      `json:"videoModel" yaml:"videoModel"` // 0 模拟 1 极速 2 混刷
	AutoExam         int      `json:"autoExam" yaml:"autoExam"`
	ExamAutoSubmit   int      `json:"examAutoSubmit" yaml:"examAutoSubmit"`
	ExcludeCourses   []string `json:"excludeCourses" yaml:"excludeCourses"`
	IncludeCourses   []string `json:"includeCourses" yaml:"includeCourses"`
}

// AccountPO 落盘的账号记录（密码混淆存储）
type AccountPO struct {
	UID           string        `json:"uid"`
	AccountType   string        `json:"accountType"`
	URL           string        `json:"url"`
	RemarkName    string        `json:"remarkName"`
	Account       string        `json:"account"`
	PasswordEnc   string        `json:"passwordEnc"`
	IsProxy       int           `json:"isProxy"`
	InformEmails  []string      `json:"informEmails"`
	CoursesCustom CoursesCustom `json:"coursesCustom"`
}

// AccountVO 返回给前端的账号（不含密码）
type AccountVO struct {
	UID           string        `json:"uid"`
	AccountType   string        `json:"accountType"`
	URL           string        `json:"url"`
	RemarkName    string        `json:"remarkName"`
	Account       string        `json:"account"`
	IsProxy       int           `json:"isProxy"`
	IsRunning     bool          `json:"isRunning"`
	GUISupport    string        `json:"guiSupport"`
	CoursesCustom CoursesCustom `json:"coursesCustom"`
	InformEmails  []string      `json:"informEmails"`
}

// AccountReq 前端提交的账号
type AccountReq struct {
	UID           string        `json:"uid"`
	AccountType   string        `json:"accountType"`
	URL           string        `json:"url"`
	RemarkName    string        `json:"remarkName"`
	Account       string        `json:"account"`
	Password      string        `json:"password"`
	IsProxy       int           `json:"isProxy"`
	InformEmails  []string      `json:"informEmails"`
	CoursesCustom CoursesCustom `json:"coursesCustom"`
}

// TaskStatus 单账号任务状态
type TaskStatus struct {
	UID       string `json:"uid"`
	Account   string `json:"account"`
	Platform  string `json:"platform"`
	State     string `json:"state"` // running | stopped | failed
	StartTime string `json:"startTime,omitempty"`
	LastLog   string `json:"lastLog,omitempty"`
	Error     string `json:"error,omitempty"`
}

// Dashboard 仪表盘聚合数据
type Dashboard struct {
	TotalAccounts int      `json:"totalAccounts"`
	RunningTasks  int      `json:"runningTasks"`
	ConfigPath    string   `json:"configPath"`
	ConfigOK      bool     `json:"configOK"`
	RecentLogs    []string `json:"recentLogs"`
}

// PlatformInfo 平台支持信息
type PlatformInfo struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	GUISupport string `json:"guiSupport"` // full | config-only | none
	Note       string `json:"note"`
}

// CourseVO 课程进度条目（结构与原版对齐，便于后续接入真实核心）
type CourseVO struct {
	Platform       string  `json:"platform"`
	Key            string  `json:"key"`
	CourseID       string  `json:"courseId"`
	CourseName     string  `json:"courseName"`
	CourseTeacher  string  `json:"courseTeacher"`
	JobFinishCount int     `json:"jobFinishCount"`
	JobCount       int     `json:"jobCount"`
	JobRate        float64 `json:"jobRate"`
	HasProgress    bool    `json:"hasProgress"`
	State          int     `json:"state"`
	IsStart        bool    `json:"isStart"`
	RawStatusText  string  `json:"rawStatusText"`
}

// --- 全局配置（config.yaml，键名与前端/原版对齐） ---

type BasicSetting struct {
	CompletionTone int    `json:"completionTone" yaml:"completionTone"`
	ColorLog       int    `json:"colorLog" yaml:"colorLog"`
	LogOutFileSw   int    `json:"logOutFileSw" yaml:"logOutFileSw"`
	LogLevel       string `json:"logLevel" yaml:"logLevel"`
	LogModel       int    `json:"logModel" yaml:"logModel"`
	WebModel       int    `json:"webModel" yaml:"webModel"`
	Theme          string `json:"theme" yaml:"theme"`
}

type EmailInform struct {
	Sw       int    `json:"sw" yaml:"sw"`
	SmtpHost string `json:"smtpHost" yaml:"smtpHost"`
	SmtpPort int    `json:"smtpPort" yaml:"smtpPort"`
	UserName string `json:"userName" yaml:"userName"`
	Password string `json:"password" yaml:"password"`
}

type AiSetting struct {
	AiType string `json:"aiType" yaml:"aiType"` // openai | deepseek | qwen
	AiUrl  string `json:"aiUrl" yaml:"aiUrl"`
	Model  string `json:"model" yaml:"model"`
	APIKey string `json:"apiKey" yaml:"apiKey"`
}

type ApiQueSetting struct {
	URL string `json:"url" yaml:"url"`
}

type Setting struct {
	BasicSetting  BasicSetting  `json:"basicSetting" yaml:"basicSetting"`
	EmailInform   EmailInform   `json:"emailInform" yaml:"emailInform"`
	AiSetting     AiSetting     `json:"aiSetting" yaml:"aiSetting"`
	ApiQueSetting ApiQueSetting `json:"apiQueSetting" yaml:"apiQueSetting"`
}

// AppConfig 注意：账号正文保存在 accounts.json，这里 users 仅作导入导出兼容
type AppConfig struct {
	Setting Setting  `json:"setting" yaml:"setting"`
	Users   []UserY  `json:"users" yaml:"users"`
}

type UserY struct {
	AccountType   string        `json:"accountType" yaml:"accountType"`
	URL           string        `json:"url" yaml:"url"`
	RemarkName    string        `json:"remarkName" yaml:"remarkName"`
	Account       string        `json:"account" yaml:"account"`
	Password      string        `json:"password" yaml:"password"`
	IsProxy       int           `json:"isProxy" yaml:"isProxy"`
	InformEmails  []string      `json:"informEmails" yaml:"informEmails"`
	CoursesCustom CoursesCustom `json:"coursesCustom" yaml:"coursesCustom"`
}
