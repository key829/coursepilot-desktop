package service

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"sync"
)

var (
	storeOnce sync.Once
	store     *AccountStore
)

// AccountStore 账号仓库：accounts.json 持久化 + 内存缓存。
// 生产化提示：密码目前仅 base64 混淆，正式版建议改用 Windows DPAPI。
type AccountStore struct {
	mu   sync.Mutex
	path string
	list []AccountPO
}

func GetStore() *AccountStore {
	storeOnce.Do(func() {
		path, err := AccountsPath()
		if err != nil {
			path = "accounts.json"
		}
		store = &AccountStore{path: path}
		_ = store.load()
	})
	return store
}

func (s *AccountStore) load() error {
	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	var list []AccountPO
	if err := json.Unmarshal(data, &list); err != nil {
		return err
	}
	s.list = list
	return nil
}

func (s *AccountStore) save() error {
	out, err := json.MarshalIndent(s.list, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, out, 0o600)
}

func newUID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func encodePassword(p string) string {
	if p == "" {
		return ""
	}
	return base64.StdEncoding.EncodeToString([]byte(p))
}

func decodePassword(e string) string {
	if e == "" {
		return ""
	}
	out, err := base64.StdEncoding.DecodeString(e)
	if err != nil {
		return ""
	}
	return string(out)
}

func validatePlatform(code string) error {
	for _, p := range PlatformSupportList() {
		if p.Code == code {
			return nil
		}
	}
	return fmt.Errorf("不支持的平台类型: %s", code)
}

func (s *AccountStore) Add(req AccountReq) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := validatePlatform(req.AccountType); err != nil {
		return err
	}
	if req.Account == "" {
		return fmt.Errorf("账号不能为空")
	}
	if req.Password == "" {
		return fmt.Errorf("密码不能为空")
	}
	for _, it := range s.list {
		if it.AccountType == req.AccountType && it.Account == req.Account && it.URL == req.URL {
			return fmt.Errorf("该账号已存在（相同平台与地址）")
		}
	}
	s.list = append(s.list, AccountPO{
		UID:           newUID(),
		AccountType:   req.AccountType,
		URL:           req.URL,
		RemarkName:    req.RemarkName,
		Account:       req.Account,
		PasswordEnc:   encodePassword(req.Password),
		IsProxy:       req.IsProxy,
		InformEmails:  req.InformEmails,
		CoursesCustom: normalizeCustom(req.CoursesCustom),
	})
	sort.Slice(s.list, func(i, j int) bool { return s.list[i].UID < s.list[j].UID })
	return s.save()
}

func normalizeCustom(c CoursesCustom) CoursesCustom {
	if c.ExcludeCourses == nil {
		c.ExcludeCourses = []string{}
	}
	if c.IncludeCourses == nil {
		c.IncludeCourses = []string{}
	}
	return c
}

func (s *AccountStore) Update(req AccountReq) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.list {
		if s.list[i].UID == req.UID {
			if err := validatePlatform(req.AccountType); err != nil {
				return err
			}
			po := &s.list[i]
			po.AccountType = req.AccountType
			po.URL = req.URL
			po.RemarkName = req.RemarkName
			po.Account = req.Account
			po.IsProxy = req.IsProxy
			po.InformEmails = req.InformEmails
			po.CoursesCustom = normalizeCustom(req.CoursesCustom)
			if req.Password != "" {
				po.PasswordEnc = encodePassword(req.Password)
			}
			return s.save()
		}
	}
	return fmt.Errorf("账号不存在: %s", req.UID)
}

func (s *AccountStore) Delete(uid string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.list {
		if s.list[i].UID == uid {
			s.list = append(s.list[:i], s.list[i+1:]...)
			return s.save()
		}
	}
	return fmt.Errorf("账号不存在: %s", uid)
}

func (s *AccountStore) Get(uid string) (AccountPO, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, it := range s.list {
		if it.UID == uid {
			return it, nil
		}
	}
	return AccountPO{}, fmt.Errorf("账号不存在: %s", uid)
}

func (s *AccountStore) PasswordOf(uid string) string {
	po, err := s.Get(uid)
	if err != nil {
		return ""
	}
	return decodePassword(po.PasswordEnc)
}

func (s *AccountStore) List() []AccountPO {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]AccountPO, len(s.list))
	copy(out, s.list)
	return out
}

// ListAccounts 组装 VO（附加运行状态与 GUI 支持标记）
func ListAccounts(running func() map[string]bool) ([]AccountVO, error) {
	list := GetStore().List()
	out := make([]AccountVO, 0, len(list))
	var runSet map[string]bool
	if running != nil {
		runSet = running()
	}
	for _, po := range list {
		isRun := false
		if runSet != nil {
			isRun = runSet[po.UID]
		}
		vo := AccountVO{
			UID:           po.UID,
			AccountType:   po.AccountType,
			URL:           po.URL,
			RemarkName:    po.RemarkName,
			Account:       po.Account,
			IsProxy:       po.IsProxy,
			IsRunning:     isRun,
			GUISupport:    PlatformGUISupport(po.AccountType),
			CoursesCustom: normalizeCustom(po.CoursesCustom),
			InformEmails:  po.InformEmails,
		}
		if vo.InformEmails == nil {
			vo.InformEmails = []string{}
		}
		out = append(out, vo)
	}
	return out, nil
}
