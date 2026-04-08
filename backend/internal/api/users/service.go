package users

import (
	"backend/api/types/user"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ── DTOs ─────────────────────────────────────────────────────────────────────

type UserDTO struct {
	ID             int64   `json:"id"`
	Name           string  `json:"name"`
	Email          string  `json:"email"`
	Role           string  `json:"role"`
	OrganisationID int64   `json:"organisation_id"`
	IsActive       bool    `json:"is_active"`
	EmailVerified  bool    `json:"email_verified"`
	CreatedAt      string  `json:"created_at"`
}

type ListFilter struct {
	Search string
	Role   string
}

type UpdateUserRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type ChangePasswordRequest struct {
	Password string `json:"password" binding:"required,min=8"`
}

// ── Service ───────────────────────────────────────────────────────────────────

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func toDTO(u user.User) UserDTO {
	var orgID int64
	if u.OrganisationID != nil {
		orgID = *u.OrganisationID
	}
	return UserDTO{
		ID:             u.ID,
		Name:           u.Name,
		Email:          u.Email,
		Role:           string(u.Role),
		OrganisationID: orgID,
		IsActive:       u.IsActive,
		EmailVerified:  u.EmailVerified,
		CreatedAt:      u.CreatedAt.Format(time.RFC3339),
	}
}

func (s *Service) ListUsers(f ListFilter) ([]UserDTO, error) {
	var users []user.User
	q := s.db.Model(&user.User{})
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where("name ILIKE ? OR email ILIKE ?", like, like)
	}
	if f.Role != "" {
		q = q.Where("role = ?", f.Role)
	}
	if err := q.Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, err
	}
	dtos := make([]UserDTO, len(users))
	for i, u := range users {
		dtos[i] = toDTO(u)
	}
	return dtos, nil
}

func (s *Service) UpdateUser(id int64, req UpdateUserRequest) (*UserDTO, error) {
	var u user.User
	if err := s.db.First(&u, id).Error; err != nil {
		return nil, errors.New("user not found")
	}
	if req.Name != "" {
		u.Name = req.Name
	}
	if req.Email != "" {
		var existing user.User
		if err := s.db.Where("email = ? AND id != ?", req.Email, id).First(&existing).Error; err == nil {
			return nil, errors.New("email already in use")
		}
		u.Email = req.Email
	}
	if req.Role != "" {
		role := user.Role(req.Role)
		if !role.IsValid() {
			return nil, errors.New("invalid role")
		}
		u.Role = role
	}
	u.UpdatedAt = time.Now()
	if err := s.db.Save(&u).Error; err != nil {
		return nil, errors.New("failed to update user")
	}
	dto := toDTO(u)
	return &dto, nil
}

func (s *Service) ChangePassword(id int64, req ChangePasswordRequest) error {
	var u user.User
	if err := s.db.First(&u, id).Error; err != nil {
		return errors.New("user not found")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return errors.New("failed to hash password")
	}
	hashedStr := string(hashed)
	u.PasswordHash = &hashedStr
	u.UpdatedAt = time.Now()
	return s.db.Save(&u).Error
}

func (s *Service) ToggleBan(id int64, callerID int64) (*UserDTO, error) {
	if id == callerID {
		return nil, errors.New("cannot ban yourself")
	}
	var u user.User
	if err := s.db.First(&u, id).Error; err != nil {
		return nil, errors.New("user not found")
	}
	u.IsActive = !u.IsActive
	u.UpdatedAt = time.Now()
	if err := s.db.Save(&u).Error; err != nil {
		return nil, errors.New("failed to update user")
	}
	dto := toDTO(u)
	return &dto, nil
}

func (s *Service) DeleteUser(id int64, callerID int64) error {
	if id == callerID {
		return errors.New("cannot delete yourself")
	}
	result := s.db.Delete(&user.User{}, id)
	if result.Error != nil {
		return errors.New("failed to delete user")
	}
	if result.RowsAffected == 0 {
		return errors.New("user not found")
	}
	return nil
}
