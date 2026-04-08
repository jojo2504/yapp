package challenges

import (
	"backend/api/types/challenge"
	"backend/api/types/problem"
	"backend/api/types/submission"
	"encoding/json"
	"errors"

	"gorm.io/gorm"
)

// ChallengeTestCase mirrors the JSON structure stored in challenges.test_cases.
type ChallengeTestCase struct {
	Input    string `json:"input"`
	Output   string `json:"output"`
	Hidden   bool   `json:"hidden"`
	Position int    `json:"position"`
}

type CreateChallengeRequest struct {
	Title       string      `json:"title" binding:"required,min=1,max=200"`
	Description string      `json:"description"`
	Difficulty  string      `json:"difficulty"`
	Category    string      `json:"category"`
	StarterCode interface{} `json:"starter_code"`
	TestCases   interface{} `json:"test_cases"`
}

type UpdateChallengeRequest struct {
	Title       *string     `json:"title"`
	Description *string     `json:"description"`
	Difficulty  *string     `json:"difficulty"`
	Category    *string     `json:"category"`
	StarterCode interface{} `json:"starter_code"`
	TestCases   interface{} `json:"test_cases"`
}

type SubmitRequest struct {
	Language   string `json:"language" binding:"required"`
	SourceCode string `json:"source_code" binding:"required"`
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// parseTestCases extracts the test cases from the challenge's JSON blob.
func parseTestCases(raw interface{}) []ChallengeTestCase {
	if raw == nil {
		return nil
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return nil
	}
	var tcs []ChallengeTestCase
	if err := json.Unmarshal(b, &tcs); err != nil {
		return nil
	}
	return tcs
}

// Get returns the challenge, hiding expected output for hidden test cases when
// hideExpected is true (i.e. for Students).
func (s *Service) Get(id int64, hideExpected bool) (*challenge.Challenge, error) {
	var c challenge.Challenge
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, errors.New("challenge not found")
	}
	if hideExpected {
		tcs := parseTestCases(c.TestCases)
		for i := range tcs {
			if tcs[i].Hidden {
				tcs[i].Output = ""
			}
		}
		c.TestCases = tcs
	}
	return &c, nil
}

func (s *Service) List(userID int64, userRole string) ([]challenge.Challenge, error) {
	query := s.db.Model(&challenge.Challenge{})
	// Teachers see only their own; Admins and Students see all
	if userRole == "Teacher" {
		query = query.Where("created_by = ?", userID)
	}
	var items []challenge.Challenge
	if err := query.Order("id DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *Service) Create(req CreateChallengeRequest, createdBy int64) (*challenge.Challenge, error) {
	difficulty := req.Difficulty
	if difficulty == "" {
		difficulty = "Easy"
	}
	c := challenge.Challenge{
		Title:       req.Title,
		Description: req.Description,
		Difficulty:  difficulty,
		Category:    req.Category,
		StarterCode: req.StarterCode,
		TestCases:   req.TestCases,
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
	if req.StarterCode != nil {
		updates["starter_code"] = req.StarterCode
	}
	if req.TestCases != nil {
		updates["test_cases"] = req.TestCases
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
func (s *Service) Submit(challengeID int64, req SubmitRequest, userID int64) (*submission.Submission, error) {
	var c challenge.Challenge
	if err := s.db.First(&c, challengeID).Error; err != nil {
		return nil, errors.New("challenge not found")
	}

	testCases := parseTestCases(c.TestCases)
	inlineTestCases := make([]submission.InlineTestCase, len(testCases))
	for i, tc := range testCases {
		pos := tc.Position
		if pos == 0 {
			pos = i
		}
		inlineTestCases[i] = submission.InlineTestCase{
			Input:    tc.Input,
			Expected: tc.Output,
			Hidden:   tc.Hidden,
			Position: pos,
		}
	}

	sub := submission.Submission{
		UserID:          userID,
		ProblemID:       0,
		ChallengeID:     &challengeID,
		Language:        problem.Language(req.Language),
		SourceCode:      req.SourceCode,
		Verdict:         submission.VerdictPending,
		InlineTestCases: inlineTestCases,
	}

	if err := s.db.Create(&sub).Error; err != nil {
		return nil, err
	}
	return &sub, nil
}
