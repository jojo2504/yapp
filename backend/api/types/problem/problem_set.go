package problem

import "backend/api/types/base"

type ProblemSet struct {
    base.BaseModel

    Name           string     `json:"name"`
    OrganisationID int64      `json:"organisation_id"`
    Problems       []*Problem `json:"problems,omitempty" pg:"many2many:problem_problem_sets"`
}
