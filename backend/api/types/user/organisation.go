package user

import "backend/api/types/base"

type Organisation struct {
    base.BaseModel

    Name         string `json:"name"`
    Localisation string `json:"localisation"`
}
