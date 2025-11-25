package auth

import (
	"backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ============================================================================
// ROUTES D'AUTHENTIFICATION
// ============================================================================
//
// POURQUOI UN FICHIER SÉPARÉ POUR LES ROUTES ?
//
// 1. CLARTÉ
//    - On voit d'un coup d'œil toutes les routes du module
//    - Plus facile à maintenir
//
// 2. ORGANISATION
//    - Chaque module (auth, problems, etc.) définit ses propres routes
//    - Le main.go reste propre
//
// 3. GROUPEMENT
//    - On peut appliquer des middlewares à un groupe de routes
//    - Ex: Toutes les routes /api/auth/... ont le même préfixe
//
// ============================================================================

// RegisterRoutes enregistre toutes les routes d'authentification
// Cette fonction est appelée depuis main.go
func RegisterRoutes(router *gin.Engine, db *gorm.DB) {
	// Créer le service et le handler
	service := NewAuthService(db)
	handler := NewAuthHandler(service)

	// Groupe de routes /api/auth
	auth := router.Group("/api/auth")
	{
		// Routes PUBLIQUES (pas besoin d'être connecté)
		// =============================================

		// POST /api/auth/register - Créer un compte
		auth.POST("/register", handler.Register)

		// POST /api/auth/login - Se connecter
		auth.POST("/login", handler.Login)

		// POST /api/auth/refresh - Rafraîchir le token
		auth.POST("/refresh", handler.RefreshToken)

		// Routes PROTÉGÉES (besoin d'être connecté)
		// ==========================================
		// On applique le middleware JWTAuth() à ces routes

		// GET /api/auth/me - Récupérer son profil
		auth.GET("/me", middleware.JWTAuth(), handler.GetMe)

		// POST /api/auth/logout - Se déconnecter
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