package service

import (
	"context"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"math/rand"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// LineEmitter 由 app.go 注入：把日志推到 LogHub + Wails 事件
var LineEmitter = func(uid, msg string) {}

// ---------- 课程进度（内存 + 落盘） ----------

type courseProgress struct {
	CourseID       string `json:"courseId"`
	Finish         int    `json:"finish"`
	Total          int    `json:"total"`
}

type progressFile struct {
	Courses []courseProgress `json:"courses"`
}

var (
	progMu    sync.Mutex
	progCache = map[string]*progressFile{}
)

func progressPath(uid string) (string, error) {
	dir, err := ProgressDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, uid+".json"), nil
}

func loadProgress(uid string) *progressFile {
	progMu.Lock()
	defer progMu.Unlock()
	if p, ok := progCache[uid]; ok {
		return p
	}
	p := &progressFile{}
	if path, err := progressPath(uid); err == nil {
		if data, err := os.ReadFile(path); err == nil {
			_ = json.Unmarshal(data, p)
		}
	}
	progCache[uid] = p
	return p
}

func saveProgress(uid string, p *progressFile) {
	progMu.Lock()
	defer progMu.Unlock()
	progCache[uid] = p
	if path, err := progressPath(uid); err == nil {
		if out, err := json.MarshalIndent(p, "", "  "); err == nil {
			_ = os.WriteFile(path, out, 0o644)
		}
	}
}

// ---------- 演示引擎：课程生成 ----------

var coursePool = map[string][]string{
	"xxt": {
		"高等数学（下）", "大学英语（四）", "马克思主义基本原理", "数据结构与算法",
		"大学生心理健康教育", "线性代数", "中国近现代史纲要", "Python 程序设计",
	},
	"yinghua": {
		"管理学原理", "微观经济学", "概率论与数理统计", "市场营销学",
		"人力资源开发与管理", "商务英语", "电子商务概论", "组织行为学",
	},
	"icve": {
		"机械制图与 CAD", "电工电子技术", "汽车发动机构造与维修", "护理学基础",
		"建筑工程测量", "会计基础实务", "物流管理概论", "web 前端开发技术",
	},
	"zhsd": {"安全生产法律法规", "职业卫生基础"},
}

var teacherSurnames = []string{"王", "李", "张", "刘", "陈", "杨", "赵", "周", "吴", "郑", "林", "何"}

func seedOf(uid string) int64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(uid))
	return int64(h.Sum64() & 0x7fffffff)
}

// buildCourses 依据账号 uid 确定性地生成课程列表
func buildCourses(po AccountPO) []CourseVO {
	r := rand.New(rand.NewSource(seedOf(po.UID)))
	pool := coursePool[po.AccountType]
	if pool == nil {
		pool = coursePool["xxt"]
	}
	names := append([]string{}, pool...)
	r.Shuffle(len(names), func(i, j int) { names[i], names[j] = names[j], names[i] })
	n := 3 + r.Intn(4) // 3~6 门
	if n > len(names) {
		n = len(names)
	}
	prog := loadProgress(po.UID)
	progMap := map[string]courseProgress{}
	for _, c := range prog.Courses {
		progMap[c.CourseID] = c
	}
	out := make([]CourseVO, 0, n)
	for i := 0; i < n; i++ {
		id := fmt.Sprintf("%s-%d", po.AccountType, i+1)
		total := 8 + r.Intn(18)
		finish := 0
		if p, ok := progMap[id]; ok {
			total = p.Total
			finish = p.Finish
		} else {
			finish = r.Intn(total / 2)
		}
		name := names[i]
		if po.CoursesCustom.IncludeCourses != nil && len(po.CoursesCustom.IncludeCourses) > 0 {
			name = name // 命名保持稳定；include 只影响运行范围
		}
		out = append(out, CourseVO{
			Platform:       po.AccountType,
			Key:            id,
			CourseID:       id,
			CourseName:     name,
			CourseTeacher:  teacherSurnames[r.Intn(len(teacherSurnames))]+"老师",
			JobFinishCount: finish,
			JobCount:       total,
			HasProgress:    true,
			RawStatusText:  statusText(total, finish),
		})
	}
	return out
}

func statusText(total, finish int) string {
	switch {
	case finish >= total:
		return "已完成"
	case finish > 0:
		return "进行中"
	default:
		return "未开始"
	}
}

func fillRates(courses []CourseVO, running bool) []CourseVO {
	for i := range courses {
		c := &courses[i]
		if c.JobCount > 0 {
			c.JobRate = float64(c.JobFinishCount) / float64(c.JobCount) * 100
		}
		c.State = map[bool]int{true: 1, false: 0}[c.JobFinishCount >= c.JobCount]
		c.IsStart = running
		c.RawStatusText = statusText(c.JobCount, c.JobFinishCount)
	}
	return courses
}

// RunningChecker 由 app.go 注入：判断某账号任务是否正在运行
var RunningChecker = func(uid string) bool { return false }

// GetCourses 拉取账号课程列表
func GetCourses(uid string) ([]CourseVO, error) {
	po, err := GetStore().Get(uid)
	if err != nil {
		return nil, err
	}
	return fillRates(buildCourses(po), RunningChecker(uid)), nil
}

// ---------- 演示引擎：学习循环 ----------

func ctxSleep(ctx context.Context, d time.Duration) error {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}

func filterCourses(courses []CourseVO, custom CoursesCustom) []CourseVO {
	include := map[string]bool{}
	for _, s := range custom.IncludeCourses {
		include[strings.TrimSpace(s)] = true
	}
	exclude := map[string]bool{}
	for _, s := range custom.ExcludeCourses {
		exclude[strings.TrimSpace(s)] = true
	}
	out := []CourseVO{}
	for _, c := range courses {
		if exclude[c.CourseName] || exclude[c.CourseID] {
			continue
		}
		if len(include) > 0 && !include[c.CourseName] && !include[c.CourseID] {
			continue
		}
		out = append(out, c)
	}
	return out
}

// RunAccountTask 单账号任务主循环（模拟真实平台交互节奏）
func RunAccountTask(po AccountPO, ctx context.Context, log func(uid, msg string)) error {
	custom := po.CoursesCustom
	emitter := func(msg string) { log(po.UID, Timestamped(msg)) }

	emitter(fmt.Sprintf("[INFO] 正在登录 %s（%s）…", PlatformName(po.AccountType), loginHost(po)))
	if err := ctxSleep(ctx, 600*time.Millisecond); err != nil {
		return err
	}
	emitter("[INFO] 登录成功，正在拉取课程列表…")
	if err := ctxSleep(ctx, 500*time.Millisecond); err != nil {
		return err
	}

	courses := filterCourses(buildCourses(po), custom)
	if custom.ShuffleSw == 1 {
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		r.Shuffle(len(courses), func(i, j int) { courses[i], courses[j] = courses[j], courses[i] })
	}
	sort.SliceStable(courses, func(i, j int) bool {
		return courses[i].JobFinishCount < courses[j].JobFinishCount
	})

	if len(courses) == 0 {
		emitter("[WARN] 没有符合范围条件的课程，任务结束")
		return nil
	}
	emitter(fmt.Sprintf("[INFO] 共 %d 门课程待处理，视频模式=%s，自动测验=%s",
		len(courses), videoModelName(custom.VideoModel), onOff(custom.AutoExam)))

	prog := loadProgress(po.UID)
	totalDone := 0
	for _, c := range courses {
		if err := ctxSleep(ctx, 400*time.Millisecond); err != nil {
			return err
		}
		if c.JobFinishCount >= c.JobCount {
			emitter(fmt.Sprintf("[INFO] 《%s》已完成，跳过", c.CourseName))
			continue
		}
		emitter(fmt.Sprintf("[INFO] 开始学习《%s》（%s，共 %d 个任务点）", c.CourseName, c.CourseTeacher, c.JobCount))
		for i := c.JobFinishCount; i < c.JobCount; i++ {
			// 单个任务点：数个小步骤模拟观看节奏
			steps := 2 + rand.Intn(3)
			for sIdx := 0; sIdx < steps; sIdx++ {
				if err := ctxSleep(ctx, time.Duration(300+rand.Intn(500))*time.Millisecond); err != nil {
					return err
				}
				if rand.Intn(14) == 0 {
					emitter("[WARN] 检测到弹题验证，已自动作答（演示引擎）")
				}
			}
			i2 := i + 1
			pct := i2 * 100 / c.JobCount
			emitter(fmt.Sprintf("[INFO] 《%s》任务点 %d/%d 完成（%d%%）", c.CourseName, i2, c.JobCount, pct))

			progMu.Lock()
			found := false
			for k := range prog.Courses {
				if prog.Courses[k].CourseID == c.CourseID {
					prog.Courses[k].Finish = i2
					prog.Courses[k].Total = c.JobCount
					found = true
					break
				}
			}
			if !found {
				prog.Courses = append(prog.Courses, courseProgress{CourseID: c.CourseID, Finish: i2, Total: c.JobCount})
			}
			progMu.Unlock()
			totalDone++
		}
		saveProgress(po.UID, prog)
		emitter(fmt.Sprintf("[INFO] 《%s》全部任务点完成 ✔", c.CourseName))
	}
	saveProgress(po.UID, prog)
	emitter(fmt.Sprintf("[INFO] 本轮共完成 %d 个任务点，全部课程已处理完毕", totalDone))
	if custom.AutoExam == 1 {
		emitter("[INFO] 自动测验已开启：章节测验将随任务点一并完成（演示引擎）")
	}
	return nil
}

func videoModelName(m int) string {
	switch m {
	case 1:
		return "极速"
	case 2:
		return "混刷"
	default:
		return "模拟"
	}
}

func onOff(v int) string {
	if v == 1 {
		return "开"
	}
	return "关"
}

func loginHost(po AccountPO) string {
	if po.URL != "" {
		return po.URL
	}
	switch po.AccountType {
	case "xxt":
		return "mooc.chaoxing.com"
	case "yinghua":
		return "yinghuaonline.com"
	case "icve":
		return "icve.com.cn"
	default:
		return "demo.local"
	}
}
