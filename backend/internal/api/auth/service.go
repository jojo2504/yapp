package auth

import (
	"backend/api/types/base"
	"backend/api/types/organisation"
	"backend/api/types/session"
	"backend/api/types/user"
	"backend/internal/api/middleware"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ============================================================================
// REQUEST DTOs (only define what doesn't exist in types)
// ============================================================================

type RegisterRequest struct {
	Name           string `json:"name" binding:"required,min=2,max=100"`
	Email          string `json:"email" binding:"required,email"`
	Password       string `json:"password" binding:"required,min=8"`
	OrganisationID int64  `json:"organisation_id"`
}

type AdminCreateUserRequest struct {
	Name           string `json:"name" binding:"required,min=2,max=100"`
	Email          string `json:"email" binding:"required,email"`
	Password       string `json:"password" binding:"required,min=8"`
	Role           string `json:"role" binding:"required"`
	OrganisationID int64  `json:"organisation_id"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
}

type UserResponse struct {
	ID             int64   `json:"id"`
	Name           string  `json:"name"`
	Email          string  `json:"email"`
	Role           string  `json:"role"`
	OrganisationID int64   `json:"organisation_id"`
	AvatarURL      *string `json:"avatar_url"`
	IsActive       bool    `json:"is_active"`
	EmailVerified  bool    `json:"email_verified"`
	CreatedAt      string  `json:"created_at"`
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
// METHODS
// ============================================================================

// Register creates a new user
func (s *Service) Register(req RegisterRequest) (*AuthResponse, error) {
	// Check if email already exists
	var existingUser user.User
	if err := s.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("email already registered")
	}

	// Check if organisation exists (optional)
	var orgIDPtr *int64
	if req.OrganisationID != 0 {
		var org organisation.Organisation
		if err := s.db.First(&org, req.OrganisationID).Error; err != nil {
			return nil, errors.New("organisation not found")
		}
		orgID := req.OrganisationID
		orgIDPtr = &orgID
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// Create user with existing type
	hashedStr := string(hashedPassword)
	newUser := user.User{
		BaseModel: base.BaseModel{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:           req.Name,
		Email:          req.Email,
		PasswordHash:   &hashedStr,
		Role:           user.RoleStudent,
		OrganisationID: orgIDPtr,
		IsActive:       true,
		EmailVerified:  false,
	}

	if err := s.db.Create(&newUser).Error; err != nil {
		return nil, errors.New("failed to create user")
	}

	// Generate tokens
	return s.generateAuthResponse(&newUser)
}

// CreateUserAsAdmin creates a user with any role — caller must already be verified as Admin at the route level
func (s *Service) CreateUserAsAdmin(req AdminCreateUserRequest) (*AuthResponse, error) {
	role := user.Role(req.Role)
	if !role.IsValid() {
		return nil, errors.New("invalid role: must be Student, Teacher, or Admin")
	}

	var existingUser user.User
	if err := s.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("email already registered")
	}

	var orgIDPtr *int64
	if req.OrganisationID != 0 {
		var org organisation.Organisation
		if err := s.db.First(&org, req.OrganisationID).Error; err != nil {
			return nil, errors.New("organisation not found")
		}
		orgID := req.OrganisationID
		orgIDPtr = &orgID
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	hashedStr := string(hashedPassword)
	newUser := user.User{
		BaseModel: base.BaseModel{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:           req.Name,
		Email:          req.Email,
		PasswordHash:   &hashedStr,
		Role:           role,
		OrganisationID: orgIDPtr,
		IsActive:       true,
		EmailVerified:  true,
	}

	if err := s.db.Create(&newUser).Error; err != nil {
		return nil, errors.New("failed to create user")
	}

	return s.generateAuthResponse(&newUser)
}

// Login authenticates a user
func (s *Service) Login(req LoginRequest) (*AuthResponse, error) {
	var u user.User
	if err := s.db.Where("email = ?", req.Email).First(&u).Error; err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !u.IsActive {
		return nil, errors.New("account is deactivated")
	}

	if u.PasswordHash == nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*u.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	return s.generateAuthResponse(&u)
}

// Logout invalidates a session
func (s *Service) Logout(userID int64, token string) error {
	return s.db.Where("user_id = ? AND token = ?", userID, token).Delete(&session.Session{}).Error
}

// RefreshToken generates new tokens
func (s *Service) RefreshToken(refreshToken string) (*AuthResponse, error) {
	claims, err := middleware.ValidateToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Check session exists
	var sess session.Session
	if err := s.db.Where("user_id = ? AND token = ?", claims.UserID, refreshToken).First(&sess).Error; err != nil {
		return nil, errors.New("session not found")
	}

	if sess.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("refresh token expired")
	}

	// Get user
	var u user.User
	if err := s.db.First(&u, claims.UserID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	// Delete old session
	s.db.Delete(&sess)

	return s.generateAuthResponse(&u)
}

// GetCurrentUser returns the current user
func (s *Service) GetCurrentUser(userID int64) (*UserResponse, error) {
	var u user.User
	if err := s.db.First(&u, userID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	var orgID int64 = 0
	if u.OrganisationID != nil {
		orgID = *u.OrganisationID
	}

	return &UserResponse{
		ID:             u.ID,
		Name:           u.Name,
		Email:          u.Email,
		Role:           string(u.Role),
		OrganisationID: orgID,
		AvatarURL:      u.AvatarURL,
		IsActive:       u.IsActive,
		EmailVerified:  u.EmailVerified,
		CreatedAt:      u.CreatedAt.Format(time.RFC3339),
	}, nil
}

// Helper to generate auth response with tokens
func (s *Service) generateAuthResponse(u *user.User) (*AuthResponse, error) {
	var orgID int64 = 0
	if u.OrganisationID != nil {
		orgID = *u.OrganisationID
	}

	accessToken, err := middleware.GenerateToken(u.ID, u.Email, string(u.Role), orgID)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, err := middleware.GenerateRefreshToken(u.ID, u.Email, string(u.Role), orgID)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	// Save session using existing session type
	sess := session.Session{
		BaseModel: base.BaseModel{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserID:    u.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := s.db.Create(&sess).Error; err != nil {
		return nil, errors.New("failed to save session")
	}

	return &AuthResponse{
		User: UserResponse{
			ID:             u.ID,
			Name:           u.Name,
			Email:          u.Email,
			Role:           string(u.Role),
			OrganisationID: orgID,
			AvatarURL:      u.AvatarURL,
			IsActive:       u.IsActive,
			EmailVerified:  u.EmailVerified,
			CreatedAt:      u.CreatedAt.Format(time.RFC3339),
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    86400, // 24 hours in seconds
	}, nil
}