package service

// PlatformSupportList 当前接入的平台。演示引擎覆盖全部列表；
// 接入真实核心时按 code 分发到对应 runner 即可。
func PlatformSupportList() []PlatformInfo {
	return []PlatformInfo{
		{Code: "xxt", Name: "超星学习通", GUISupport: "full", Note: "课程 / 章节任务点 / 测验（内置演示引擎）"},
		{Code: "yinghua", Name: "英华学堂（及套壳平台）", GUISupport: "full", Note: "课程视频 / 作业（内置演示引擎）"},
		{Code: "icve", Name: "智慧职教 · 学习公社", GUISupport: "full", Note: "课程 / 课件学习（内置演示引擎）"},
		{Code: "zhsd", Name: "中大网校", GUISupport: "config-only", Note: "仅配置保存，任务引擎待接入"},
	}
}

func PlatformName(code string) string {
	for _, p := range PlatformSupportList() {
		if p.Code == code {
			return p.Name
		}
	}
	return code
}

func PlatformGUISupport(code string) string {
	for _, p := range PlatformSupportList() {
		if p.Code == code {
			return p.GUISupport
		}
	}
	return "none"
}
