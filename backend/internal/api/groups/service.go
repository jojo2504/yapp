package groups

import (
	"backend/api/types/group"
	"errors"

	"gorm.io/gorm"
)

type CreateGroupRequest struct {
	Name      string   `json:"name" binding:"required,min=1,max=200"`
	Students  []string `json:"students"`
	CourseIDs []int64  `json:"course_ids"`
}

type UpdateGroupRequest struct {
	Name      *string  `json:"name"`
	Students  []string `json:"students"`
	CourseIDs []int64  `json:"course_ids"`
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) Get(id int64) (*group.Group, error) {
	var g group.Group
	if err := s.db.First(&g, id).Error; err != nil {
		return nil, errors.New("group not found")
	}
	if g.Students == nil {
		g.Students = []string{}
	}
	if g.CourseIDs == nil {
		g.CourseIDs = []int64{}
	}
	return &g, nil
}

func (s *Service) List(userID int64, userRole string) ([]group.Group, error) {
	query := s.db.Model(&group.Group{})
	if userRole == "Teacher" {
		query = query.Where("created_by = ?", userID)
	}
	var groups []group.Group
	if err := query.Order("id DESC").Find(&groups).Error; err != nil {
		return nil, err
	}
	// Ensure non-nil slices in response
	for i := range groups {
		if groups[i].Students == nil {
			groups[i].Students = []string{}
		}
		if groups[i].CourseIDs == nil {
			groups[i].CourseIDs = []int64{}
		}
	}
	return groups, nil
}

func (s *Service) Create(req CreateGroupRequest, createdBy int64) (*group.Group, error) {
	students := req.Students
	if students == nil {
		students = []string{}
	}
	courseIDs := req.CourseIDs
	if courseIDs == nil {
		courseIDs = []int64{}
	}
	g := group.Group{
		Name:      req.Name,
		Students:  students,
		CourseIDs: courseIDs,
		CreatedBy: &createdBy,
	}
	if err := s.db.Create(&g).Error; err != nil {
		return nil, err
	}
	return &g, nil
}

func (s *Service) Update(id int64, req UpdateGroupRequest, userID int64, userRole string) (*group.Group, error) {
	var g group.Group
	if err := s.db.First(&g, id).Error; err != nil {
		return nil, errors.New("group not found")
	}
	if (g.CreatedBy == nil || *g.CreatedBy != userID) && userRole != "Admin" {
		return nil, errors.New("not authorized")
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Students != nil {
		updates["students"] = req.Students
	}
	if req.CourseIDs != nil {
		updates["course_ids"] = req.CourseIDs
	}
	if err := s.db.Model(&g).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.First(&g, id).Error; err != nil {
		return nil, err
	}
	if g.Students == nil {
		g.Students = []string{}
	}
	if g.CourseIDs == nil {
		g.CourseIDs = []int64{}
	}
	return &g, nil
}

func (s *Service) Delete(id int64, userID int64, userRole string) error {
	var g group.Group
	if err := s.db.First(&g, id).Error; err != nil {
		return errors.New("group not found")
	}
	if (g.CreatedBy == nil || *g.CreatedBy != userID) && userRole != "Admin" {
		return errors.New("not authorized")
	}
	return s.db.Delete(&g).Error
}
