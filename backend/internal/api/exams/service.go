package exams

import (
	"backend/api/types/exam"
	"errors"

	"gorm.io/gorm"
)

type CreateExamRequest struct {
	Title           string      `json:"title" binding:"required,min=1,max=200"`
	DurationMinutes int         `json:"duration_minutes"`
	StartDatetime   string      `json:"start_datetime"`
	EndDatetime     string      `json:"end_datetime"`
	StudentCount    int         `json:"student_count"`
	Questions       interface{} `json:"questions"`
}

type UpdateExamRequest struct {
	Title           *string     `json:"title"`
	DurationMinutes *int        `json:"duration_minutes"`
	StartDatetime   *string     `json:"start_datetime"`
	EndDatetime     *string     `json:"end_datetime"`
	StudentCount    *int        `json:"student_count"`
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
