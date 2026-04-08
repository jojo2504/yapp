package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var jwtSecret = []byte(getJWTSecret())

func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Println("WARNING: JWT_SECRET not set, using insecure default. Set JWT_SECRET in production.")
		secret = "your-super-secret-key-change-in-production"
	}
	return secret
}

// Claims structure for JWT
type Claims struct {
	UserID         int64  `json:"user_id"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	OrganisationID int64  `json:"organisation_id"`
	jwt.RegisteredClaims
}

// JWTAuth middleware - validates JWT token
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Store user info in context
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Set("organisation_id", claims.OrganisationID)

		c.Next()
	}
}

// OptionalAuth - tries to authenticate but doesn't block if no token
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		tokenString := parts[1]
		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.Next()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Set("organisation_id", claims.OrganisationID)

		c.Next()
	}
}

// RequireRole middleware - checks if user has required role
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		roleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}
		for _, role := range roles {
			if roleStr == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		c.Abort()
	}
}

// GenerateToken creates a new JWT access token
func GenerateToken(userID int64, email, role string, organisationID int64) (string, error) {
	claims := &Claims{
		UserID:         userID,
		Email:          email,
		Role:           role,
		OrganisationID: organisationID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        uuid.New().String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// GenerateRefreshToken creates a new refresh token (longer expiry)
func GenerateRefreshToken(userID int64, email, role string, organisationID int64) (string, error) {
	claims := &Claims{
		UserID:         userID,
		Email:          email,
		Role:           role,
		OrganisationID: organisationID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        uuid.New().String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateToken validates and parses a JWT token
func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// Helper functions to get user info from context
func GetUserID(c *gin.Context) int64 {
	if id, exists := c.Get("user_id"); exists {
		if v, ok := id.(int64); ok {
			return v
		}
	}
	return 0
}

func GetUserEmail(c *gin.Context) string {
	if email, exists := c.Get("email"); exists {
		if v, ok := email.(string); ok {
			return v
		}
	}
	return ""
}

func GetUserRole(c *gin.Context) string {
	if role, exists := c.Get("role"); exists {
		if v, ok := role.(string); ok {
			return v
		}
	}
	return ""
}

func GetOrganisationID(c *gin.Context) int64 {
	if id, exists := c.Get("organisation_id"); exists {
		if v, ok := id.(int64); ok {
			return v
		}
	}
	return 0
}
