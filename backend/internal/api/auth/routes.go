package auth

import (
	"backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(router *gin.Engine, db *gorm.DB) {

	service := NewAuthService(db)
	handler := NewAuthHandler(service)

	auth := router.Group("/api/auth")
	{
		auth.POST("/register", handler.Register)
		auth.POST("/login", handler.Login)
		auth.POST("/refresh", handler.RefreshToken)
		auth.GET("/me", middleware.JWTAuth(), handler.GetMe)
		auth.POST("/logout", middleware.JWTAuth(), handler.Logout)
	}
}

// ============================================================================
// RÉCAPITULATIF DES ROUTES
// ============================================================================
//
// | Méthode | URL                | Auth? | Description                    |
// |---------|--------------------| ------|--------------------------------|
// | POST    | /api/auth/register | Non   | Créer un compte                |
// | POST    | /api/auth/login    | Non   | Se connecter                   |
// | POST    | /api/auth/refresh  | Non   | Rafraîchir le token            |
// | GET     | /api/auth/me       | Oui   | Récupérer son profil           |
// | POST    | /api/auth/logout   | Oui   | Se déconnecter                 |
//
// ============================================================================