package challenge

import (
	"database/sql/driver"
	"errors"
	"fmt"

	"backend/api/types/base"
)

// JSONText is raw JSON stored in a Postgres TEXT column. It round-trips
// through GORM (Scanner/Valuer) as a text string and through encoding/json
// (Marshaler/Unmarshaler) as raw JSON — so the surrounding API and the DB
// both see the same array/object shape without intermediate map[string]any
// conversions tripping up the pgx encoder.
type JSONText []byte

// Value implements driver.Valuer — pgx receives the bytes as a TEXT string.
func (j JSONText) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return string(j), nil
}

// Scan implements sql.Scanner — accepts whatever the driver hands back
// (string or []byte) and stores it verbatim.
func (j *JSONText) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	switch v := value.(type) {
	case string:
		*j = JSONText(v)
	case []byte:
		// Copy so we don't alias the driver's buffer.
		buf := make([]byte, len(v))
		copy(buf, v)
		*j = buf
	default:
		return fmt.Errorf("JSONText.Scan: unsupported type %T", value)
	}
	return nil
}

// MarshalJSON returns the raw JSON so the API response keeps the typed shape
// (an array or object), not a quoted string.
func (j JSONText) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return []byte(j), nil
}

// UnmarshalJSON captures the raw JSON exactly as it appears in the request.
func (j *JSONText) UnmarshalJSON(data []byte) error {
	if j == nil {
		return errors.New("JSONText: UnmarshalJSON on nil pointer")
	}
	*j = append((*j)[:0], data...)
	return nil
}

// Challenge is the DB model for teacher-created coding challenges.
// A challenge is bound to a single language: the student can only solve it in
// that language. StarterCode is the single-language template; TestCases is a
// JSON array of validators (also single-language).
type Challenge struct {
	base.BaseModel
	Title       string   `json:"title" gorm:"size:255;not null"`
	Description string   `json:"description" gorm:"type:text"`
	Difficulty  string   `json:"difficulty" gorm:"size:20;not null;default:'Easy'"`
	Category    string   `json:"category" gorm:"size:100"`
	Language    string   `json:"language" gorm:"size:50;not null;default:'python'"`
	StarterCode string   `json:"starter_code" gorm:"type:text"`
	TestCases   JSONText `json:"test_cases" gorm:"column:test_cases;type:text"`
	CreatedBy   *int64   `json:"created_by,omitempty" gorm:"index"`
}

func (Challenge) TableName() string { return "challenges" }
