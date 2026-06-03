package challenges

import (
	"backend/api/types/challenge"
	"backend/api/types/group"
	"backend/api/types/problem"
	"backend/api/types/submission"
	"encoding/json"
	"errors"
	"strings"

	"gorm.io/gorm"
)

// canonicalLanguage maps the frontend's lowercase language identifiers
// (the keys Monaco uses: "python", "cpp", "javascript", "java", …) to the
// PascalCase variants the Go and Rust enums expect ("Python", "Cpp",
// "Javascript", "Java", …). Anything already in canonical form is passed
// through unchanged.
func canonicalLanguage(s string) problem.Language {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "python":             return problem.Python
	case "javascript", "js":   return problem.Javascript
	case "typescript", "ts":   return problem.Typescript
	case "cpp", "c++":         return problem.Cpp
	case "c":                  return problem.C
	case "csharp", "c#":       return problem.Csharp
	case "java":               return problem.Java
	case "rust":               return problem.Rust
	case "go", "golang":       return problem.Go
	case "swift":              return problem.Swift
	}
	return problem.Language(s)
}

// ChallengeTestCase mirrors the JSON structure stored in challenges.test_cases.
// The validator is a complete program in the challenge's language; it calls
// the student's function and decides pass/fail itself.
type ChallengeTestCase struct {
	Title     string `json:"title"`
	Hidden    bool   `json:"hidden"`
	Position  int    `json:"position"`
	Validator string `json:"validator"`
}

type CreateChallengeRequest struct {
	Title       string            `json:"title" binding:"required,min=1,max=200"`
	Description string            `json:"description"`
	Difficulty  string            `json:"difficulty"`
	Category    string            `json:"category"`
	Language    string            `json:"language" binding:"required"`
	StarterCode string            `json:"starter_code"`
	TestCases   challenge.JSONText `json:"test_cases"`
	Visibility  string            `json:"visibility"`
	GroupIDs    []int64           `json:"group_ids"`
}

type UpdateChallengeRequest struct {
	Title       *string            `json:"title"`
	Description *string            `json:"description"`
	Difficulty  *string            `json:"difficulty"`
	Category    *string            `json:"category"`
	Language    *string            `json:"language"`
	StarterCode *string            `json:"starter_code"`
	TestCases   challenge.JSONText `json:"test_cases"`
	Visibility  *string            `json:"visibility"`
	GroupIDs    *[]int64           `json:"group_ids"`
}

// SubmitRequest carries only the student's source code — the language is
// forced to the challenge's language server-side, so a submission can't be
// run in a different language than the creator intended.
type SubmitRequest struct {
	SourceCode string `json:"source_code" binding:"required"`
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// studentGroupIDs returns the set of group IDs the given student (by email)
// belongs to.
func (s *Service) studentGroupIDs(email string) (map[int64]bool, error) {
	out := make(map[int64]bool)
	if email == "" {
		return out, nil
	}
	var groups []group.Group
	if err := s.db.Find(&groups).Error; err != nil {
		return nil, err
	}
	for _, g := range groups {
		for _, member := range g.Students {
			if strings.EqualFold(strings.TrimSpace(member), email) {
				out[g.ID] = true
				break
			}
		}
	}
	return out, nil
}

// studentCanAccess reports whether a student may access the challenge: public
// ("everyone"/unset) challenges are open to all; "groups" challenges require
// membership in one of the listed groups.
func studentCanAccess(c *challenge.Challenge, memberOf map[int64]bool) bool {
	if c.Visibility != "groups" {
		return true
	}
	for _, gid := range c.GroupIDs {
		if memberOf[gid] {
			return true
		}
	}
	return false
}

// parseTestCases extracts the test cases from the challenge's JSON blob.
func parseTestCases(raw challenge.JSONText) []ChallengeTestCase {
	if len(raw) == 0 {
		return nil
	}
	var tcs []ChallengeTestCase
	if err := json.Unmarshal(raw, &tcs); err != nil {
		return nil
	}
	return tcs
}

// Get returns the challenge. When hideTeacherFields is true (i.e. for Students),
// validator source code is stripped from every test case — students only see
// the title and visibility flag.
func (s *Service) Get(id int64, role, email string) (*challenge.Challenge, error) {
	var c challenge.Challenge
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, errors.New("challenge not found")
	}
	if role == "Student" {
		memberOf, err := s.studentGroupIDs(email)
		if err != nil {
			return nil, err
		}
		if !studentCanAccess(&c, memberOf) {
			// Don't reveal the existence of a restricted challenge.
			return nil, errors.New("challenge not found")
		}
		tcs := parseTestCases(c.TestCases)
		for i := range tcs {
			tcs[i].Validator = ""
		}
		// Re-encode the stripped list back into the model so the JSON response
		// keeps the same shape (an array, not a quoted string).
		if buf, err := json.Marshal(tcs); err == nil {
			c.TestCases = challenge.JSONText(buf)
		}
	}
	return &c, nil
}

func (s *Service) List(userID int64, userRole, userEmail string) ([]challenge.Challenge, error) {
	query := s.db.Model(&challenge.Challenge{})
	// Teachers see only their own; Admins and Students see all (Students are
	// then filtered by visibility below).
	if userRole == "Teacher" {
		query = query.Where("created_by = ?", userID)
	}
	var items []challenge.Challenge
	if err := query.Order("id DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	if userRole != "Student" {
		return items, nil
	}
	memberOf, err := s.studentGroupIDs(userEmail)
	if err != nil {
		return nil, err
	}
	visible := make([]challenge.Challenge, 0, len(items))
	for _, c := range items {
		if studentCanAccess(&c, memberOf) {
			visible = append(visible, c)
		}
	}
	return visible, nil
}

func (s *Service) Create(req CreateChallengeRequest, createdBy int64) (*challenge.Challenge, error) {
	difficulty := req.Difficulty
	if difficulty == "" {
		difficulty = "Easy"
	}
	visibility := req.Visibility
	if visibility != "groups" {
		visibility = "everyone"
	}
	groupIDs := req.GroupIDs
	if visibility != "groups" {
		groupIDs = []int64{}
	}
	c := challenge.Challenge{
		Title:       req.Title,
		Description: req.Description,
		Difficulty:  difficulty,
		Category:    req.Category,
		Language:    req.Language,
		StarterCode: req.StarterCode,
		TestCases:   req.TestCases,
		Visibility:  visibility,
		GroupIDs:    groupIDs,
		CreatedBy:   &createdBy,
	}
	if err := s.db.Create(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Service) Update(id int64, req UpdateChallengeRequest, userID int64, userRole string) (*challenge.Challenge, error) {
	var c challenge.Challenge
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, errors.New("challenge not found")
	}
	if (c.CreatedBy == nil || *c.CreatedBy != userID) && userRole != "Admin" {
		return nil, errors.New("not authorized")
	}

	updates := make(map[string]interface{})
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Difficulty != nil {
		updates["difficulty"] = *req.Difficulty
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.Language != nil {
		updates["language"] = *req.Language
	}
	if req.StarterCode != nil {
		updates["starter_code"] = *req.StarterCode
	}
	if len(req.TestCases) > 0 {
		// Pass raw JSON text so pgx encodes it as TEXT without trying to guess
		// a per-element encoder for the map values inside.
		updates["test_cases"] = string(req.TestCases)
	}
	if req.GroupIDs != nil {
		updates["group_ids"] = *req.GroupIDs
	}
	if req.Visibility != nil {
		vis := *req.Visibility
		if vis != "groups" {
			vis = "everyone"
			updates["group_ids"] = []int64{} // public challenges carry no group list
		}
		updates["visibility"] = vis
	}
	if err := s.db.Model(&c).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Service) Delete(id int64, userID int64, userRole string) error {
	var c challenge.Challenge
	if err := s.db.First(&c, id).Error; err != nil {
		return errors.New("challenge not found")
	}
	if (c.CreatedBy == nil || *c.CreatedBy != userID) && userRole != "Admin" {
		return errors.New("not authorized")
	}
	return s.db.Delete(&c).Error
}

// Submit creates a Pending submission for a challenge, embedding the test cases
// inline so the judge can validate without a separate DB query.
// Returns the created submission (caller must push it to Redis).
func (s *Service) Submit(challengeID int64, req SubmitRequest, userID int64, userRole, userEmail string) (*submission.Submission, error) {
	var c challenge.Challenge
	if err := s.db.First(&c, challengeID).Error; err != nil {
		return nil, errors.New("challenge not found")
	}
	if userRole == "Student" {
		memberOf, err := s.studentGroupIDs(userEmail)
		if err != nil {
			return nil, err
		}
		if !studentCanAccess(&c, memberOf) {
			return nil, errors.New("challenge not found")
		}
	}

	testCases := parseTestCases(c.TestCases)
	inlineTestCases := make([]submission.InlineTestCase, len(testCases))
	for i, tc := range testCases {
		pos := tc.Position
		if pos == 0 {
			pos = i
		}
		inlineTestCases[i] = submission.InlineTestCase{
			Title:     tc.Title,
			Hidden:    tc.Hidden,
			Position:  pos,
			Validator: tc.Validator,
		}
	}

	sub := submission.Submission{
		UserID:          userID,
		ProblemID:       0,
		ChallengeID:     &challengeID,
		Language:        canonicalLanguage(c.Language),
		SourceCode:      req.SourceCode,
		Verdict:         submission.VerdictPending,
		InlineTestCases: inlineTestCases,
	}

	if err := s.db.Create(&sub).Error; err != nil {
		return nil, err
	}
	return &sub, nil
}
