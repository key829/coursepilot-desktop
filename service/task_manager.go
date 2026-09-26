package service

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type taskHandle struct {
	uid      string
	cancel   context.CancelFunc
	done     chan struct{}
	status   TaskStatus
	startAt  time.Time
	finished bool
}

// TaskManager 管理每账号一个学习协程，带最大并发限制
type TaskManager struct {
	mu         sync.Mutex
	tasks      map[string]*taskHandle
	sem        chan struct{}
	maxWorkers int
}

func NewTaskManager() *TaskManager {
	tm := &TaskManager{
		tasks:      map[string]*taskHandle{},
		maxWorkers: 5,
	}
	tm.sem = make(chan struct{}, tm.maxWorkers)
	return tm
}

func (tm *TaskManager) logf(uid, msg string) {
	h, ok := tm.tasks[uid]
	if ok && !h.finished {
		h.status.LastLog = msg
	}
	LineEmitter(uid, msg)
}

// Start 启动账号任务；已在运行则报错
func (tm *TaskManager) Start(uid string) error {
	po, err := GetStore().Get(uid)
	if err != nil {
		return err
	}
	tm.mu.Lock()
	if h, ok := tm.tasks[uid]; ok && !h.finished {
		tm.mu.Unlock()
		return fmt.Errorf("任务已在运行中")
	}
	ctx, cancel := context.WithCancel(context.Background())
	h := &taskHandle{
		uid:    uid,
		cancel: cancel,
		done:   make(chan struct{}),
		status: TaskStatus{
			UID:       uid,
			Account:   displayName(po),
			Platform:  PlatformName(po.AccountType),
			State:     "running",
			StartTime: time.Now().Format("2006-01-02 15:04:05"),
		},
		startAt: time.Now(),
	}
	tm.tasks[uid] = h
	tm.mu.Unlock()

	go func() {
		tm.sem <- struct{}{}
		defer func() { <-tm.sem }()
		defer close(h.done)

		var runErr error
		func() {
			defer func() {
				if r := recover(); r != nil {
					runErr = fmt.Errorf("任务异常退出: %v", r)
				}
			}()
			runErr = RunAccountTask(po, ctx, tm.logf)
		}()

		tm.mu.Lock()
		h.finished = true
		if ctx.Err() != nil {
			h.status.State = "stopped"
			h.status.LastLog = "任务已手动停止"
		} else if runErr != nil {
			h.status.State = "failed"
			h.status.Error = runErr.Error()
			h.status.LastLog = "任务失败: " + runErr.Error()
			LineEmitter(uid, "[ERROR] "+runErr.Error())
		} else {
			h.status.State = "stopped"
			h.status.LastLog = "全部课程学习完成，任务结束"
			LineEmitter(uid, "[INFO] 全部课程学习完成，任务结束")
		}
		tm.mu.Unlock()
	}()
	return nil
}

func (tm *TaskManager) Stop(uid string) {
	tm.mu.Lock()
	h, ok := tm.tasks[uid]
	running := ok && !h.finished
	tm.mu.Unlock()
	if !running {
		return
	}
	h.cancel()
	select {
	case <-h.done:
	case <-time.After(3 * time.Second):
	}
}

func (tm *TaskManager) StopAll() {
	tm.mu.Lock()
	uids := make([]string, 0, len(tm.tasks))
	for uid, h := range tm.tasks {
		if !h.finished {
			uids = append(uids, uid)
		}
	}
	tm.mu.Unlock()
	for _, uid := range uids {
		tm.Stop(uid)
	}
}

func (tm *TaskManager) RunningSet() map[string]bool {
	tm.mu.Lock()
	defer tm.mu.Unlock()
	out := map[string]bool{}
	for uid, h := range tm.tasks {
		if !h.finished {
			out[uid] = true
		}
	}
	return out
}

// Statuses 返回所有账号的任务状态（未运行过的为 stopped）
func (tm *TaskManager) Statuses() []TaskStatus {
	out := []TaskStatus{}
	for _, po := range GetStore().List() {
		st := TaskStatus{
			UID:      po.UID,
			Account:  displayName(po),
			Platform: PlatformName(po.AccountType),
			State:    "stopped",
		}
		tm.mu.Lock()
		if h, ok := tm.tasks[po.UID]; ok {
			st = h.status
			if st.State == "running" {
				st.LastLog = fmt.Sprintf("已运行 %s", fmtDuration(time.Since(h.startAt)))
			}
		}
		tm.mu.Unlock()
		out = append(out, st)
	}
	return out
}

func displayName(po AccountPO) string {
	if po.RemarkName != "" {
		return po.RemarkName
	}
	return po.Account
}

func fmtDuration(d time.Duration) string {
	d = d.Truncate(time.Second)
	m := int(d.Minutes())
	s := int(d.Seconds()) % 60
	if m >= 60 {
		return fmt.Sprintf("%dh%02dm%02ds", m/60, m%60, s)
	}
	return fmt.Sprintf("%dm%02ds", m, s)
}
