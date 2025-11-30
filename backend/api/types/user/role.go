package user

type Role string

const (
	RoleTeacher Role = "Teacher"
	RoleStudent Role = "Student"
	RoleAdmin   Role = "Admin"
)

// IsValid vérifie si le rôle est valide
func (r Role) IsValid() bool {
	switch r {
	case RoleTeacher, RoleStudent, RoleAdmin:
		return true
	}
	return false
}

// String retourne la représentation string du rôle
func (r Role) String() string {
	return string(r)
}
