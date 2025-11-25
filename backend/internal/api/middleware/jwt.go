package middleware

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// ============================================================================
// JWT MIDDLEWARE - Le gardien de tes routes protégées
// ============================================================================
//
// POURQUOI UN MIDDLEWARE ?
// - Un middleware est du code qui s'exécute AVANT ton handler
// - Il peut bloquer la requête si l'utilisateur n'est pas authentifié
// - Il peut ajouter des informations au contexte (ex: l'ID de l'utilisateur)
//
// FLOW:
// 1. Le frontend envoie: Authorization: Bearer <token>
// 2. Le middleware extrait et vérifie le token
// 3. Si valide → la requête continue vers le handler
// 4. Si invalide → erreur 401 Unauthorized
// ============================================================================

// Claims représente le contenu du JWT
// On y stocke les infos de l'utilisateur qu'on veut retrouver facilement
type Claims struct {
	UserID         int64  `json:"user_id"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	OrganisationID int64  `json:"organisation_id"`
	jwt.RegisteredClaims
}

// JWTAuth est le middleware qui protège les routes
// Il vérifie que le token JWT est valide avant de laisser passer la requête
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Récupérer le header Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Authorization header required",
				"message": "Vous devez être connecté pour accéder à cette ressource",
			})
			c.Abort() // Stoppe la chaîne de middlewares/handlers
			return
		}

		// 2. Vérifier le format "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Invalid authorization format",
				"message": "Format attendu: Bearer <token>",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// 3. Parser et valider le token
		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Invalid or expired token",
				"message": "Votre session a expiré, veuillez vous reconnecter",
			})
			c.Abort()
			return
		}

		// 4. Stocker les infos user dans le contexte
		// Ça permet aux handlers suivants d'accéder aux infos de l'utilisateur
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Set("organisation_id", claims.OrganisationID)

		// 5. Continuer vers le handler
		c.Next()
	}
}

// RequireRole vérifie que l'utilisateur a le bon rôle
// Usage: router.GET("/admin", middleware.JWTAuth(), middleware.RequireRole("Admin"), handler)
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Récupérer le rôle depuis le contexte (mis par JWTAuth)
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Role not found in context",
			})
			c.Abort()
			return
		}

		// Vérifier si le rôle de l'utilisateur est dans la liste autorisée
		roleStr := userRole.(string)
		for _, allowedRole := range roles {
			if roleStr == allowedRole {
				c.Next()
				return
			}
		}

		// Rôle non autorisé
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Insufficient permissions",
			"message": "Vous n'avez pas les droits pour accéder à cette ressource",
		})
		c.Abort()
	}
}

// ============================================================================
// FONCTIONS UTILITAIRES POUR LES TOKENS
// ============================================================================

// getJWTSecret récupère la clé secrète depuis les variables d'environnement
// IMPORTANT: En production, utilise une clé longue et aléatoire !
func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Clé par défaut pour le développement uniquement
		// NE JAMAIS UTILISER EN PRODUCTION !
		secret = "your-super-secret-key-change-in-production"
	}
	return []byte(secret)
}

// GenerateToken crée un nouveau JWT pour un utilisateur
// Appelé après un login réussi
func GenerateToken(userID int64, email, role string, organisationID int64) (string, error) {
	// Définir l'expiration (24 heures)
	expirationTime := time.Now().Add(24 * time.Hour)

	// Créer les claims (le contenu du token)
	claims := &Claims{
		UserID:         userID,
		Email:          email,
		Role:           role,
		OrganisationID: organisationID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "yapp-backend",
		},
	}

	// Créer le token avec l'algorithme HS256
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Signer le token avec notre clé secrète
	tokenString, err := token.SignedString(getJWTSecret())
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateToken vérifie et décode un token JWT
func ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	// Parser le token et vérifier la signature
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}

	return claims, nil
}

// GenerateRefreshToken crée un token de rafraîchissement (durée plus longue)
// Utilisé pour renouveler le token d'accès sans re-login
func GenerateRefreshToken(userID int64) (string, error) {
	expirationTime := time.Now().Add(7 * 24 * time.Hour) // 7 jours

	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "yapp-backend-refresh",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// ============================================================================
// HELPERS POUR RÉCUPÉRER LES INFOS USER DANS LES HANDLERS
// ============================================================================

// GetUserID récupère l'ID de l'utilisateur depuis le contexte Gin
// Usage dans un handler: userID := middleware.GetUserID(c)
func GetUserID(c *gin.Context) int64 {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	return userID.(int64)
}

// GetUserEmail récupère l'email de l'utilisateur depuis le contexte
func GetUserEmail(c *gin.Context) string {
	email, exists := c.Get("email")
	if !exists {
		return ""
	}
	return email.(string)
}

// GetUserRole récupère le rôle de l'utilisateur depuis le contexte
func GetUserRole(c *gin.Context) string {
	role, exists := c.Get("role")
	if !exists {
		return ""
	}
	return role.(string)
}

// GetOrganisationID récupère l'ID de l'organisation depuis le contexte
func GetOrganisationID(c *gin.Context) int64 {
	orgID, exists := c.Get("organisation_id")
	if !exists {
		return 0
	}
	return orgID.(int64)
}