package problems

import (
	"backend/api/types/problem"
	"errors"

	"gorm.io/gorm"
)

// ============================================================================
// REQUEST DTOs (ces DTOs sont spécifiques à l'API, pas des modèles DB)
// ============================================================================

type CreateProblemRequest struct {
	Title         string                  `json:"title" binding:"required,min=1,max=200"`
	Description   string                  `json:"description" binding:"required"`
	Language      problem.Language        `json:"language" binding:"required"`
	Difficulty    problem.Difficulty      `json:"difficulty" binding:"required"`
	TimeLimitMs   *int                    `json:"time_limit_ms"`
	MemoryLimitMb *int                    `json:"memory_limit_mb"`
	Points        *int32                  `json:"points"`
	StarterCode   *string                 `json:"starter_code"`
	SolutionCode  *string                 `json:"solution_code"`
	TestCases     []CreateTestCaseRequest `json:"test_cases"`
}

type UpdateProblemRequest struct {
	Title         *string             `json:"title"`
	Description   *string             `json:"description"`
	Language      *problem.Language   `json:"language"`
	Difficulty    *problem.Difficulty `json:"difficulty"`
	TimeLimitMs   *int                `json:"time_limit_ms"`
	MemoryLimitMb *int                `json:"memory_limit_mb"`
	Points        *int32              `json:"points"`
	StarterCode   *string             `json:"starter_code"`
	SolutionCode  *string             `json:"solution_code"`
}

type CreateTestCaseRequest struct {
	Input    string `json:"input" binding:"required"`
	Expected string `json:"expected" binding:"required"`
	Hidden   bool   `json:"hidden"`
	Position int    `json:"position"`
}

type ListProblemsParams struct {
	Page       int                `form:"page"`
	Limit      int                `form:"limit"`
	Language   problem.Language   `form:"language"`
	Difficulty problem.Difficulty `form:"difficulty"`
	Search     string             `form:"search"`
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

type ProblemListItem struct {
	ID         int64              `json:"id"`
	Title      string             `json:"title"`
	Language   problem.Language   `json:"language"`
	Difficulty problem.Difficulty `json:"difficulty"`
	Points     int32              `json:"points"`
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

// ============================================================================
// SERVICE
// ============================================================================

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// ============================================================================
// METHODS - Utilisent problem.Problem et problem.TestCase
// ============================================================================

// List returns paginated problems
func (s *Service) List(params ListProblemsParams) (*PaginatedResponse, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 100 {
		params.Limit = 20
	}

	query := s.db.Model(&problem.Problem{})

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

	var problems []problem.Problem
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
func (s *Service) GetByID(id int64, includeHidden bool) (*problem.Problem, error) {
	var p problem.Problem
	query := s.db.Preload("TestCases", func(db *gorm.DB) *gorm.DB {
		return db.Order("id ASC")
	})

	if err := query.First(&p, id).Error; err != nil {
		return nil, errors.New("problem not found")
	}

	// Hide test case content for students
	if !includeHidden {
		visibleTestCases := make([]problem.TestCase, 0)
		for _, tc := range p.TestCases {
			if tc.Hidden {
				// Mask hidden test cases
				tc.Input = "[hidden]"
				tc.Expected = "[hidden]"
			}
			visibleTestCases = append(visibleTestCases, tc)
		}
		p.TestCases = visibleTestCases
	}

	return &p, nil
}

// Create creates a new problem
func (s *Service) Create(req CreateProblemRequest, authorID int64) (*problem.Problem, error) {
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
		case problem.Medium:
			points = 200
		case problem.Hard:
			points = 300
		}
	}

	p := problem.Problem{
		Title:       req.Title,
		Description: req.Description,
		Language:    req.Language,
		Difficulty:  req.Difficulty,
		TimeLimit:   timeLimitMs,
		MemoryLimit: memoryLimitMb,
		AuthorID:    &authorID,
		Points:      &points,
	}

	// Use transaction
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&p).Error; err != nil {
			return err
		}

		// Create test cases
		for _, tcReq := range req.TestCases {
			tc := problem.TestCase{
				ProblemID: p.ID,
				Input:     tcReq.Input,
				Expected:  tcReq.Expected,
				Hidden:    tcReq.Hidden,
			}
			if err := tx.Create(&tc).Error; err != nil {
				return err
			}
			p.TestCases = append(p.TestCases, tc)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &p, nil
}

// Update updates a problem
func (s *Service) Update(id int64, req UpdateProblemRequest, userID int64, userRole string) (*problem.Problem, error) {
	var p problem.Problem
	if err := s.db.First(&p, id).Error; err != nil {
		return nil, errors.New("problem not found")
	}

	// Check permissions
	if (p.AuthorID == nil || *p.AuthorID != userID) && userRole != "Admin" {
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
		updates["time_limit"] = *req.TimeLimitMs
	}
	if req.MemoryLimitMb != nil {
		updates["memory_limit"] = *req.MemoryLimitMb
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

	if err := s.db.Model(&p).Updates(updates).Error; err != nil {
		return nil, err
	}

	return s.GetByID(id, true)
}

// Delete soft deletes a problem
func (s *Service) Delete(id int64, userID int64, userRole string) error {
	var p problem.Problem
	if err := s.db.First(&p, id).Error; err != nil {
		return errors.New("problem not found")
	}

	if (p.AuthorID == nil || *p.AuthorID != userID) && userRole != "Admin" {
		return errors.New("not authorized to delete this problem")
	}

	return s.db.Delete(&p).Error
}