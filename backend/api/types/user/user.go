package user

import "backend/api/types/base"

type User struct {
	base.BaseModel

	Name           string  `json:"name" gorm:"size:255;not null"`
	Email          string  `json:"email" gorm:"size:255;not null;uniqueIndex"`
	PasswordHash   *string `json:"-" gorm:"size:255"` // Jamais exposé en JSON
	Role           Role    `json:"role" gorm:"size:50;not null;default:Student;index"`
	OrganisationID *int64  `json:"organisation_id,omitempty" gorm:"index"`

	// OAuth fields
	OAuthProvider *string `json:"oauth_provider,omitempty" gorm:"size:50;index:idx_oauth,unique"`
	OAuthID       *string `json:"oauth_id,omitempty" gorm:"size:255;index:idx_oauth,unique"`

	// Metadata
	AvatarURL     *string `json:"avatar_url,omitempty" gorm:"type:text"`
	EmailVerified bool    `json:"email_verified" gorm:"default:false"`
	IsActive      bool    `json:"is_active" gorm:"default:true"`

	// Relations
	Organisation *Organisation `json:"organisation,omitempty" gorm:"foreignKey:OrganisationID"`
}

// TableName spécifie le nom de la table
func (User) TableName() string {
	return "users"
}

// HasPassword vérifie si l'utilisateur a un mot de passe
func (u *User) HasPassword() bool {
	return u.PasswordHash != nil && *u.PasswordHash != ""
}

// HasOAuth vérifie si l'utilisateur utilise OAuth
func (u *User) HasOAuth() bool {
	return u.OAuthProvider != nil && u.OAuthID != nil
}

// IsStudent vérifie si l'utilisateur est un étudiant
func (u *User) IsStudent() bool {
	return u.Role == RoleStudent
}

// IsTeacher vérifie si l'utilisateur est un professeur
func (u *User) IsTeacher() bool {
	return u.Role == RoleTeacher
}

// IsAdmin vérifie si l'utilisateur est un administrateur
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

// CanManageProblems vérifie si l'utilisateur peut créer/modifier des problèmes
func (u *User) CanManageProblems() bool {
	return u.Role == RoleTeacher || u.Role == RoleAdmin
}

// CanManageUsers vérifie si l'utilisateur peut gérer les utilisateurs
func (u *User) CanManageUsers() bool {
	return u.Role == RoleAdmin
}
