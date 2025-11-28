package auth

import (
	"backend/internal/api/middleware"
	"backend/api/types"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// User model


// Session model
type Session struct {
	ID        int64          `json:"id" gorm:"primaryKey"`
	UserID    int64          `json:"user_id"`
	Token     string         `json:"token"`
	ExpiresAt time.Time      `json:"expires_at"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// Organisation model (minimal for checking)
type Organisation struct {
	ID   int64  `json:"id" gorm:"primaryKey"`
	Name string `json:"name"`
}

// Request DTOs
type RegisterRequest struct {
	Name           string `json:"name" binding:"required,min=2,max=100"`
	Email          string `json:"email" binding:"required,email"`
	Password       string `json:"password" binding:"required,min=8"`
	OrganisationID int64  `json:"organisation_id" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// Response DTOs
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

// Service
type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// Register creates a new user
func (s *Service) Register(req RegisterRequest) (*AuthResponse, error) {
	// Check if email already exists
	var existingUser User
	if err := s.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("email already registered")
	}

	// Check if organisation exists
	var org Organisation
	if err := s.db.First(&org, req.OrganisationID).Error; err != nil {
		return nil, errors.New("organisation not found")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// Create user
	user := User{
		Name:           req.Name,
		Email:          req.Email,
		PasswordHash:   string(hashedPassword),
		Role:           "Student",
		OrganisationID: req.OrganisationID,
		IsActive:       true,
		EmailVerified:  false,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, errors.New("failed to create user")
	}

	// Generate tokens
	return s.generateAuthResponse(&user)
}

// Login authenticates a user
func (s *Service) Login(req LoginRequest) (*AuthResponse, error) {
	var user User
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	return s.generateAuthResponse(&user)
}

// Logout invalidates a session
func (s *Service) Logout(userID int64, token string) error {
	return s.db.Where("user_id = ? AND token = ?", userID, token).Delete(&Session{}).Error
}

// RefreshToken generates new tokens
func (s *Service) RefreshToken(refreshToken string) (*AuthResponse, error) {
	claims, err := middleware.ValidateToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Check session exists
	var session Session
	if err := s.db.Where("user_id = ? AND token = ?", claims.UserID, refreshToken).First(&session).Error; err != nil {
		return nil, errors.New("session not found")
	}

	if session.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("refresh token expired")
	}

	// Get user
	var user User
	if err := s.db.First(&user, claims.UserID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	// Delete old session
	s.db.Delete(&session)

	return s.generateAuthResponse(&user)
}

// GetCurrentUser returns the current user
func (s *Service) GetCurrentUser(userID int64) (*UserResponse, error) {
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, errors.New("user not found")
	}

	return &UserResponse{
		ID:             user.ID,
		Name:           user.Name,
		Email:          user.Email,
		Role:           user.Role,
		OrganisationID: user.OrganisationID,
		AvatarURL:      user.AvatarURL,
		IsActive:       user.IsActive,
		EmailVerified:  user.EmailVerified,
		CreatedAt:      user.CreatedAt.Format(time.RFC3339),
	}, nil
}

// Helper to generate auth response with tokens
func (s *Service) generateAuthResponse(user *User) (*AuthResponse, error) {
	accessToken, err := middleware.GenerateToken(user.ID, user.Email, user.Role, user.OrganisationID)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, err := middleware.GenerateRefreshToken(user.ID, user.Email, user.Role, user.OrganisationID)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	// Save session
	session := Session{
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	s.db.Create(&session)

	return &AuthResponse{
		User: UserResponse{
			ID:             user.ID,
			Name:           user.Name,
			Email:          user.Email,
			Role:           user.Role,
			OrganisationID: user.OrganisationID,
			AvatarURL:      user.AvatarURL,
			IsActive:       user.IsActive,
			EmailVerified:  user.EmailVerified,
			CreatedAt:      user.CreatedAt.Format(time.RFC3339),
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    86400, // 24 hours in seconds
	}, nil
}
