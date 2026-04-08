package courses

import (
	"backend/api/types/course"
	"errors"

	"gorm.io/gorm"
)

type CreateCourseRequest struct {
	Name         string  `json:"name" binding:"required,min=1,max=200"`
	Description  string  `json:"description"`
	ChallengeIDs []int64 `json:"challenge_ids"`
}

type UpdateCourseRequest struct {
	Name         *string `json:"name"`
	Description  *string `json:"description"`
	ChallengeIDs []int64 `json:"challenge_ids"`
}

type AssignGroupsRequest struct {
	GroupIDs []int64 `json:"group_ids" binding:"required"`
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func ensureSlices(c *course.Course) {
	if c.ChallengeIDs == nil {
		c.ChallengeIDs = []int64{}
	}
	if c.GroupIDs == nil {
		c.GroupIDs = []int64{}
	}
}

func (s *Service) Get(id int64) (*course.Course, error) {
	var c course.Course
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, errors.New("course not found")
	}
	ensureSlices(&c)
	return &c, nil
}

func (s *Service) List(userID int64, userRole string) ([]course.Course, error) {
	query := s.db.Model(&course.Course{})
	// Teachers see only their own; Admins and Students see all
	if userRole == "Teacher" {
		query = query.Where("created_by = ?", userID)
	}
	var courses []course.Course
	if err := query.Order("id DESC").Find(&courses).Error; err != nil {
		return nil, err
	}
	for i := range courses {
		ensureSlices(&courses[i])
	}
	return courses, nil
}

func (s *Service) Create(req CreateCourseRequest, createdBy int64) (*course.Course, error) {
	challengeIDs := req.ChallengeIDs
	if challengeIDs == nil {
		challengeIDs = []int64{}
	}
	c := course.Course{
		Name:         req.Name,
		Description:  req.Description,
		ChallengeIDs: challengeIDs,
		GroupIDs:     []int64{},
		CreatedBy:    &createdBy,
	}
	if err := s.db.Create(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Service) Update(id int64, req UpdateCourseRequest, userID int64, userRole string) (*course.Course, error) {
	var c course.Course
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, errors.New("course not found")
	}
	if (c.CreatedBy == nil || *c.CreatedBy != userID) && userRole != "Admin" {
		return nil, errors.New("not authorized")
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ChallengeIDs != nil {
		updates["challenge_ids"] = req.ChallengeIDs
	}
	if err := s.db.Model(&c).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, err
	}
	ensureSlices(&c)
	return &c, nil
}

func (s *Service) Delete(id int64, userID int64, userRole string) error {
	var c course.Course
	if err := s.db.First(&c, id).Error; err != nil {
		return errors.New("course not found")
	}
	if (c.CreatedBy == nil || *c.CreatedBy != userID) && userRole != "Admin" {
		return errors.New("not authorized")
	}
	return s.db.Delete(&c).Error
}

func (s *Service) AssignGroups(id int64, groupIDs []int64, userID int64, userRole string) (*course.Course, error) {
	var c course.Course
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, errors.New("course not found")
	}
	if (c.CreatedBy == nil || *c.CreatedBy != userID) && userRole != "Admin" {
		return nil, errors.New("not authorized")
	}
	if err := s.db.Model(&c).Update("group_ids", groupIDs).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, err
	}
	ensureSlices(&c)
	return &c, nil
}
