package auth

import (
	"errors"
	"time"

	"backend/api/types/session"
	"backend/api/types/user"
	"backend/internal/api/middleware"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ============================================================================
// SERVICE D'AUTHENTIFICATION
// ============================================================================
//
// POURQUOI UN SERVICE SÉPARÉ DU HANDLER ?
//
// 1. SÉPARATION DES RESPONSABILITÉS
//    - Handler: Gère HTTP (request/response, validation)
//    - Service: Gère la logique métier (pas de notion de HTTP)
//
// 2. TESTABILITÉ
//    - Tu peux tester le service sans simuler des requêtes HTTP
//    - Plus facile à mocker pour les tests unitaires
//
// 3. RÉUTILISABILITÉ
//    - Le service peut être appelé par d'autres parties du code
//    - Ex: Un job de nettoyage des sessions expirées
//
// ============================================================================

// AuthService contient la logique d'authentification
type AuthService struct {
	db *gorm.DB
}

// NewAuthService crée une nouvelle instance du service
func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{db: db}
}

// ============================================================================
// STRUCTURES DE DONNÉES (DTOs - Data Transfer Objects)
// ============================================================================

// RegisterRequest représente les données envoyées pour créer un compte
type RegisterRequest struct {
	Name           string `json:"name" binding:"required,min=2,max=100"`
	Email          string `json:"email" binding:"required,email"`
	Password       string `json:"password" binding:"required,min=8"`
	OrganisationID int64  `json:"organisation_id" binding:"required"`
}

// LoginRequest représente les données envoyées pour se connecter
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse représente la réponse après login/register
type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"` // Secondes avant expiration
}

// UserResponse représente les infos user à renvoyer (sans le password !)
type UserResponse struct {
	ID             int64     `json:"id"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	Role           string    `json:"role"`
	OrganisationID int64     `json:"organisation_id"`
	AvatarURL      string    `json:"avatar_url,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// ============================================================================
// MÉTHODES DU SERVICE
// ============================================================================

// Register crée un nouveau compte utilisateur
func (s *AuthService) Register(req RegisterRequest) (*AuthResponse, error) {
	// 1. Vérifier que l'email n'existe pas déjà
	var existingUser user.User
	result := s.db.Where("email = ?", req.Email).First(&existingUser)
	if result.Error == nil {
		// Un utilisateur avec cet email existe déjà
		return nil, errors.New("un compte avec cet email existe déjà")
	}
	if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// Erreur inattendue
		return nil, result.Error
	}

	// 2. Vérifier que l'organisation existe
	var org user.Organisation
	if err := s.db.First(&org, req.OrganisationID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("organisation non trouvée")
		}
		return nil, err
	}

	// 3. Hasher le mot de passe
	// POURQUOI HASHER ?
	// - On ne stocke JAMAIS un mot de passe en clair dans la BDD
	// - bcrypt ajoute un "salt" automatiquement (protection contre rainbow tables)
	// - Le coût de 12 rend le bruteforce très lent
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, errors.New("erreur lors du hashage du mot de passe")
	}

	// 4. Créer l'utilisateur
	newUser := user.User{
		Name:           req.Name,
		Email:          req.Email,
		PasswordHash:   string(hashedPassword),
		Role:           user.Student, // Par défaut, un nouvel utilisateur est Student
		OrganisationID: req.OrganisationID,
		IsActive:       true,
		EmailVerified:  false, // TODO: Implémenter la vérification email
	}

	if err := s.db.Create(&newUser).Error; err != nil {
		return nil, errors.New("erreur lors de la création du compte")
	}

	// 5. Générer les tokens
	return s.generateAuthResponse(&newUser)
}

// Login vérifie les credentials et retourne les tokens
func (s *AuthService) Login(req LoginRequest) (*AuthResponse, error) {
	// 1. Chercher l'utilisateur par email
	var u user.User
	result := s.db.Where("email = ?", req.Email).First(&u)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// SÉCURITÉ: Message générique pour ne pas révéler si l'email existe
		return nil, errors.New("email ou mot de passe incorrect")
	}
	if result.Error != nil {
		return nil, result.Error
	}

	// 2. Vérifier que le compte est actif
	if !u.IsActive {
		return nil, errors.New("ce compte a été désactivé")
	}

	// 3. Vérifier le mot de passe
	// bcrypt.CompareHashAndPassword compare le hash stocké avec le password fourni
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password))
	if err != nil {
		// SÉCURITÉ: Message générique
		return nil, errors.New("email ou mot de passe incorrect")
	}

	// 4. Générer les tokens
	return s.generateAuthResponse(&u)
}

// Logout invalide la session de l'utilisateur
func (s *AuthService) Logout(userID int64, token string) error {
	// Supprimer la session de la BDD
	result := s.db.Where("user_id = ? AND token = ?", userID, token).Delete(&session.Session{})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

// RefreshToken génère un nouveau access token à partir du refresh token
func (s *AuthService) RefreshToken(refreshToken string) (*AuthResponse, error) {
	// 1. Valider le refresh token
	claims, err := middleware.ValidateToken(refreshToken)
	if err != nil {
		return nil, errors.New("refresh token invalide ou expiré")
	}

	// 2. Vérifier que la session existe en BDD
	var sess session.Session
	result := s.db.Where("user_id = ? AND token = ?", claims.UserID, refreshToken).First(&sess)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return nil, errors.New("session non trouvée")
	}
	if result.Error != nil {
		return nil, result.Error
	}

	// 3. Vérifier que la session n'a pas expiré
	if time.Now().After(sess.ExpiresAt) {
		// Supprimer la session expirée
		s.db.Delete(&sess)
		return nil, errors.New("session expirée")
	}

	// 4. Récupérer l'utilisateur
	var u user.User
	if err := s.db.First(&u, claims.UserID).Error; err != nil {
		return nil, errors.New("utilisateur non trouvé")
	}

	// 5. Générer de nouveaux tokens
	return s.generateAuthResponse(&u)
}

// GetCurrentUser récupère les infos de l'utilisateur connecté
func (s *AuthService) GetCurrentUser(userID int64) (*UserResponse, error) {
	var u user.User
	result := s.db.First(&u, userID)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return nil, errors.New("utilisateur non trouvé")
	}
	if result.Error != nil {
		return nil, result.Error
	}

	return &UserResponse{
		ID:             u.ID,
		Name:           u.Name,
		Email:          u.Email,
		Role:           string(u.Role),
		OrganisationID: u.OrganisationID,
		AvatarURL:      u.AvatarURL,
		CreatedAt:      u.CreatedAt,
	}, nil
}

// ============================================================================
// MÉTHODES PRIVÉES (helpers)
// ============================================================================

// generateAuthResponse crée la réponse avec les tokens JWT
func (s *AuthService) generateAuthResponse(u *user.User) (*AuthResponse, error) {
	// Générer l'access token (courte durée: 24h)
	accessToken, err := middleware.GenerateToken(
		u.ID,
		u.Email,
		string(u.Role),
		u.OrganisationID,
	)
	if err != nil {
		return nil, errors.New("erreur lors de la génération du token")
	}

	// Générer le refresh token (longue durée: 7 jours)
	refreshToken, err := middleware.GenerateRefreshToken(u.ID)
	if err != nil {
		return nil, errors.New("erreur lors de la génération du refresh token")
	}

	// Sauvegarder la session en BDD
	// Ça permet d'invalider les sessions (logout, changement de password, etc.)
	newSession := session.Session{
		UserID:    u.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := s.db.Create(&newSession).Error; err != nil {
		return nil, errors.New("erreur lors de la création de la session")
	}

	return &AuthResponse{
		User: UserResponse{
			ID:             u.ID,
			Name:           u.Name,
			Email:          u.Email,
			Role:           string(u.Role),
			OrganisationID: u.OrganisationID,
			AvatarURL:      u.AvatarURL,
			CreatedAt:      u.CreatedAt,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    24 * 60 * 60, // 24 heures en secondes
	}, nil
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

// HashPassword hash un mot de passe avec bcrypt
// Utile pour les tests ou pour changer un mot de passe
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// CheckPassword vérifie si un mot de passe correspond au hash
func CheckPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// GenerateSessionToken génère un token de session unique
func GenerateSessionToken() string {
	return uuid.New().String()
}