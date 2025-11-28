package problems

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// Problem model
type Problem struct {
	ID            int64          `json:"id" gorm:"primaryKey"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	Language      string         `json:"language"`
	Difficulty    string         `json:"difficulty"`
	TimeLimitMs   int            `json:"time_limit_ms" gorm:"default:2000"`
	MemoryLimitMb int            `json:"memory_limit_mb" gorm:"default:256"`
	AuthorID      int64          `json:"author_id"`
	Points        *int32         `json:"points"`
	StarterCode   *string        `json:"starter_code"`
	SolutionCode  *string        `json:"solution_code,omitempty"`
	TestCases     []TestCase     `json:"test_cases,omitempty" gorm:"foreignKey:ProblemID"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

// TestCase model
type TestCase struct {
	ID        int64          `json:"id" gorm:"primaryKey"`
	ProblemID int64          `json:"problem_id"`
	Input     string         `json:"input"`
	Expected  string         `json:"expected"`
	Hidden    bool           `json:"hidden" gorm:"default:false"`
	Position  int            `json:"position" gorm:"default:0"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// Request DTOs
type CreateProblemRequest struct {
	Title         string                  `json:"title" binding:"required,min=1,max=200"`
	Description   string                  `json:"description" binding:"required"`
	Language      string                  `json:"language" binding:"required"`
	Difficulty    string                  `json:"difficulty" binding:"required,oneof=easy medium hard"`
	TimeLimitMs   *int                    `json:"time_limit_ms"`
	MemoryLimitMb *int                    `json:"memory_limit_mb"`
	Points        *int32                  `json:"points"`
	StarterCode   *string                 `json:"starter_code"`
	SolutionCode  *string                 `json:"solution_code"`
	TestCases     []CreateTestCaseRequest `json:"test_cases"`
}

type UpdateProblemRequest struct {
	Title         *string `json:"title"`
	Description   *string `json:"description"`
	Language      *string `json:"language"`
	Difficulty    *string `json:"difficulty"`
	TimeLimitMs   *int    `json:"time_limit_ms"`
	MemoryLimitMb *int    `json:"memory_limit_mb"`
	Points        *int32  `json:"points"`
	StarterCode   *string `json:"starter_code"`
	SolutionCode  *string `json:"solution_code"`
}

type CreateTestCaseRequest struct {
	Input    string `json:"input" binding:"required"`
	Expected string `json:"expected" binding:"required"`
	Hidden   bool   `json:"hidden"`
	Position int    `json:"position"`
}

type ListProblemsParams struct {
	Page       int    `form:"page"`
	Limit      int    `form:"limit"`
	Language   string `form:"language"`
	Difficulty string `form:"difficulty"`
	Search     string `form:"search"`
}

// Response DTOs
type ProblemListItem struct {
	ID         int64  `json:"id"`
	Title      string `json:"title"`
	Language   string `json:"language"`
	Difficulty string `json:"difficulty"`
	Points     int32  `json:"points"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
}

type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// Service
type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// List returns paginated problems
func (s *Service) List(params ListProblemsParams) (*PaginatedResponse, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 100 {
		params.Limit = 20
	}

	query := s.db.Model(&Problem{})

	if params.Language != "" {
		query = query.Where("language = ?", params.Language)
	}
	if params.Difficulty != "" {
		query = query.Where("difficulty = ?", params.Difficulty)
	}
	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ?", search, search)
	}

	var total int64
	query.Count(&total)

	var problems []Problem
	offset := (params.Page - 1) * params.Limit
	if err := query.Offset(offset).Limit(params.Limit).Order("id DESC").Find(&problems).Error; err != nil {
		return nil, err
	}

	// Convert to list items
	items := make([]ProblemListItem, len(problems))
	for i, p := range problems {
		points := int32(100)
		if p.Points != nil {
			points = *p.Points
		}
		items[i] = ProblemListItem{
			ID:         p.ID,
			Title:      p.Title,
			Language:   p.Language,
			Difficulty: p.Difficulty,
			Points:     points,
		}
	}

	totalPages := int(total) / params.Limit
	if int(total)%params.Limit > 0 {
		totalPages++
	}

	return &PaginatedResponse{
		Data: items,
		Pagination: Pagination{
			Page:       params.Page,
			Limit:      params.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

// GetByID returns a single problem with test cases
func (s *Service) GetByID(id int64, includeHidden bool) (*Problem, error) {
	var problem Problem
	query := s.db.Preload("TestCases", func(db *gorm.DB) *gorm.DB {
		return db.Order("position ASC")
	})

	if err := query.First(&problem, id).Error; err != nil {
		return nil, errors.New("problem not found")
	}

	// Hide test case content for students
	if !includeHidden {
		for i := range problem.TestCases {
			if problem.TestCases[i].Hidden {
				problem.TestCases[i].Input = "[hidden]"
				problem.TestCases[i].Expected = "[hidden]"
			}
		}
		problem.SolutionCode = nil
	}

	return &problem, nil
}

// Create creates a new problem
func (s *Service) Create(req CreateProblemRequest, authorID int64) (*Problem, error) {
	// Default values
	timeLimitMs := 2000
	memoryLimitMb := 256
	if req.TimeLimitMs != nil {
		timeLimitMs = *req.TimeLimitMs
	}
	if req.MemoryLimitMb != nil {
		memoryLimitMb = *req.MemoryLimitMb
	}

	// Default points based on difficulty
	var points int32 = 100
	if req.Points != nil {
		points = *req.Points
	} else {
		switch req.Difficulty {
		case "medium":
			points = 200
		case "hard":
			points = 300
		}
	}

	problem := Problem{
		Title:         req.Title,
		Description:   req.Description,
		Language:      req.Language,
		Difficulty:    req.Difficulty,
		TimeLimitMs:   timeLimitMs,
		MemoryLimitMb: memoryLimitMb,
		AuthorID:      authorID,
		Points:        &points,
		StarterCode:   req.StarterCode,
		SolutionCode:  req.SolutionCode,
	}

	// Use transaction
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&problem).Error; err != nil {
			return err
		}

		// Create test cases
		for i, tc := range req.TestCases {
			testCase := TestCase{
				ProblemID: problem.ID,
				Input:     tc.Input,
				Expected:  tc.Expected,
				Hidden:    tc.Hidden,
				Position:  i + 1,
			}
			if err := tx.Create(&testCase).Error; err != nil {
				return err
			}
			problem.TestCases = append(problem.TestCases, testCase)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &problem, nil
}

// Update updates a problem
func (s *Service) Update(id int64, req UpdateProblemRequest, userID int64, userRole string) (*Problem, error) {
	var problem Problem
	if err := s.db.First(&problem, id).Error; err != nil {
		return nil, errors.New("problem not found")
	}

	// Check permissions
	if problem.AuthorID != userID && userRole != "Admin" {
		return nil, errors.New("not authorized to update this problem")
	}

	updates := make(map[string]interface{})
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Language != nil {
		updates["language"] = *req.Language
	}
	if req.Difficulty != nil {
		updates["difficulty"] = *req.Difficulty
	}
	if req.TimeLimitMs != nil {
		updates["time_limit_ms"] = *req.TimeLimitMs
	}
	if req.MemoryLimitMb != nil {
		updates["memory_limit_mb"] = *req.MemoryLimitMb
	}
	if req.Points != nil {
		updates["points"] = *req.Points
	}
	if req.StarterCode != nil {
		updates["starter_code"] = *req.StarterCode
	}
	if req.SolutionCode != nil {
		updates["solution_code"] = *req.SolutionCode
	}

	if err := s.db.Model(&problem).Updates(updates).Error; err != nil {
		return nil, err
	}

	return s.GetByID(id, true)
}

// Delete soft deletes a problem
func (s *Service) Delete(id int64, userID int64, userRole string) error {
	var problem Problem
	if err := s.db.First(&problem, id).Error; err != nil {
		return errors.New("problem not found")
	}

	if problem.AuthorID != userID && userRole != "Admin" {
		return errors.New("not authorized to delete this problem")
	}

	return s.db.Delete(&problem).Error
}
