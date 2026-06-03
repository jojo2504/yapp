package exams

import (
	"backend/api/types/exam"
	"backend/api/types/group"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
)

type CreateExamRequest struct {
	Title           string      `json:"title" binding:"required,min=1,max=200"`
	DurationMinutes int         `json:"duration_minutes"`
	StartDatetime   string      `json:"start_datetime"`
	EndDatetime     string      `json:"end_datetime"`
	StudentCount    int         `json:"student_count"`
	GroupIDs        []int64     `json:"group_ids"`
	Questions       interface{} `json:"questions"`
}

type UpdateExamRequest struct {
	Title           *string     `json:"title"`
	DurationMinutes *int        `json:"duration_minutes"`
	StartDatetime   *string     `json:"start_datetime"`
	EndDatetime     *string     `json:"end_datetime"`
	StudentCount    *int        `json:"student_count"`
	GroupIDs        *[]int64    `json:"group_ids"`
	Questions       interface{} `json:"questions"`
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) Get(id int64) (*exam.Exam, error) {
	var e exam.Exam
	if err := s.db.First(&e, id).Error; err != nil {
		return nil, errors.New("exam not found")
	}
	return &e, nil
}

func (s *Service) List(userID int64, userRole string) ([]exam.Exam, error) {
	query := s.db.Model(&exam.Exam{})
	if userRole == "Teacher" {
		query = query.Where("created_by = ?", userID)
	}
	var exams []exam.Exam
	if err := query.Order("id DESC").Find(&exams).Error; err != nil {
		return nil, err
	}
	return exams, nil
}

// Upcoming returns the exams a student is scheduled for, determined by group
// membership (matched on the student's email). The frontend decides which ones
// to force based on each exam's start time. Results are ordered by start time.
func (s *Service) Upcoming(email string) ([]exam.Exam, error) {
	if email == "" {
		return []exam.Exam{}, nil
	}

	var groups []group.Group
	if err := s.db.Find(&groups).Error; err != nil {
		return nil, err
	}
	memberOf := make(map[int64]bool)
	for _, g := range groups {
		for _, member := range g.Students {
			if strings.EqualFold(strings.TrimSpace(member), email) {
				memberOf[g.ID] = true
				break
			}
		}
	}
	if len(memberOf) == 0 {
		return []exam.Exam{}, nil
	}

	var exams []exam.Exam
	if err := s.db.Order("start_datetime ASC").Find(&exams).Error; err != nil {
		return nil, err
	}
	result := make([]exam.Exam, 0)
	for _, ex := range exams {
		for _, gid := range ex.GroupIDs {
			if memberOf[gid] {
				result = append(result, ex)
				break
			}
		}
	}
	return result, nil
}

func (s *Service) Create(req CreateExamRequest, createdBy int64) (*exam.Exam, error) {
	duration := req.DurationMinutes
	if duration == 0 {
		duration = 60
	}
	e := exam.Exam{
		Title:           req.Title,
		DurationMinutes: duration,
		StartDatetime:   req.StartDatetime,
		EndDatetime:     req.EndDatetime,
		StudentCount:    req.StudentCount,
		GroupIDs:        req.GroupIDs,
		Questions:       req.Questions,
		CreatedBy:       &createdBy,
	}
	if err := s.db.Create(&e).Error; err != nil {
		return nil, err
	}
	return &e, nil
}

func (s *Service) Update(id int64, req UpdateExamRequest, userID int64, userRole string) (*exam.Exam, error) {
	var e exam.Exam
	if err := s.db.First(&e, id).Error; err != nil {
		return nil, errors.New("exam not found")
	}
	if (e.CreatedBy == nil || *e.CreatedBy != userID) && userRole != "Admin" {
		return nil, errors.New("not authorized")
	}

	updates := make(map[string]interface{})
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.DurationMinutes != nil {
		updates["duration_minutes"] = *req.DurationMinutes
	}
	if req.StartDatetime != nil {
		updates["start_datetime"] = *req.StartDatetime
	}
	if req.EndDatetime != nil {
		updates["end_datetime"] = *req.EndDatetime
	}
	if req.StudentCount != nil {
		updates["student_count"] = *req.StudentCount
	}
	if req.GroupIDs != nil {
		updates["group_ids"] = *req.GroupIDs
	}
	if req.Questions != nil {
		updates["questions"] = req.Questions
	}
	if err := s.db.Model(&e).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&e, id).Error; err != nil {
		return nil, err
	}
	return &e, nil
}

func (s *Service) Delete(id int64, userID int64, userRole string) error {
	var e exam.Exam
	if err := s.db.First(&e, id).Error; err != nil {
		return errors.New("exam not found")
	}
	if (e.CreatedBy == nil || *e.CreatedBy != userID) && userRole != "Admin" {
		return errors.New("not authorized")
	}
	return s.db.Delete(&e).Error
}

// authorize loads the exam and checks the caller may manage it (owner or Admin).
func (s *Service) authorize(id int64, userID int64, userRole string) (*exam.Exam, error) {
	var e exam.Exam
	if err := s.db.First(&e, id).Error; err != nil {
		return nil, errors.New("exam not found")
	}
	if (e.CreatedBy == nil || *e.CreatedBy != userID) && userRole != "Admin" {
		return nil, errors.New("not authorized")
	}
	return &e, nil
}

// Stop force-closes an exam immediately, regardless of its scheduled window.
func (s *Service) Stop(id int64, userID int64, userRole string) (*exam.Exam, error) {
	e, err := s.authorize(id, userID, userRole)
	if err != nil {
		return nil, err
	}
	now := time.Now().Format(time.RFC3339)
	if err := s.db.Model(e).Updates(map[string]interface{}{
		"status_override": "stopped",
		"end_datetime":    now,
	}).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(e, id).Error; err != nil {
		return nil, err
	}
	return e, nil
}

// Restart re-opens an exam: it becomes active now with a fresh window equal to
// its duration, so assigned students are pulled back in.
func (s *Service) Restart(id int64, userID int64, userRole string) (*exam.Exam, error) {
	e, err := s.authorize(id, userID, userRole)
	if err != nil {
		return nil, err
	}
	duration := e.DurationMinutes
	if duration <= 0 {
		duration = 60
	}
	start := time.Now()
	end := start.Add(time.Duration(duration) * time.Minute)
	if err := s.db.Model(e).Updates(map[string]interface{}{
		"status_override": "active",
		"start_datetime":  start.Format(time.RFC3339),
		"end_datetime":    end.Format(time.RFC3339),
	}).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(e, id).Error; err != nil {
		return nil, err
	}
	return e, nil
}
