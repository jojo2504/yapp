package user

import "backend/api/types/base"

type User struct {
	base.BaseModel

	Name           string `json:"name"`
	Email          string `json:"email"`
	Role           Role   `json:"role"`
	OrganisationID *int64 `json:"organisation_id,omitempty"`
}
