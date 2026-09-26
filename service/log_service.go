package service

import (
	"fmt"
	"regexp"
	"sync"
	"time"
	"unicode/utf8"

	"golang.org/x/text/encoding/simplifiedchinese"
)

var ansiRe = regexp.MustCompile(`\x1b\[[0-9;]*[a-zA-Z]`)

// StripANSI 去掉终端颜色转义序列
func StripANSI(s string) string {
	return ansiRe.ReplaceAllString(s, "")
}

// ToUTF8 非法 UTF-8 时按 GBK 兜底转码（核心库日志常为 GBK）
func ToUTF8(s string) string {
	if utf8.ValidString(s) {
		return s
	}
	if out, err := simplifiedchinese.GBK.NewDecoder().String(s); err == nil {
		return out
	}
	return s
}

// LogHub 内存环形日志缓冲，供日志页与仪表盘拉取
type LogHub struct {
	mu     sync.Mutex
	ring   []string
	cap    int
	offset int
}

func NewLogHub() *LogHub {
	return &LogHub{cap: 1200}
}

func (h *LogHub) Push(line string) {
	if line == "" {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if len(h.ring) < h.cap {
		h.ring = append(h.ring, line)
	} else {
		h.ring[h.offset] = line
		h.offset = (h.offset + 1) % h.cap
	}
}

// Recent 返回最近 n 条（按时间正序）
func (h *LogHub) Recent(n int) []string {
	if n <= 0 {
		n = 100
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	all := make([]string, len(h.ring))
	copy(all, h.ring)
	if h.offset > 0 {
		all = append(append([]string{}, h.ring[h.offset:]...), h.ring[:h.offset]...)
	}
	if len(all) > n {
		all = all[len(all)-n:]
	}
	return all
}

func Timestamped(line string) string {
	return fmt.Sprintf("[%s] %s", time.Now().Format("2006-01-02 15:04:05"), line)
}
