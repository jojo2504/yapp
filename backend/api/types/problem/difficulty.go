package problem

type Difficulty string

const (
	Easy   Difficulty = "easy"
	Medium Difficulty = "medium"
	Hard   Difficulty = "hard"
)

// IsValid vérifie si la difficulté est valide
func (d Difficulty) IsValid() bool {
	switch d {
	case Easy, Medium, Hard:
		return true
	}
	return false
}

// String retourne la représentation string
func (d Difficulty) String() string {
	return string(d)
}

// DefaultPoints retourne les points par défaut selon la difficulté
func (d Difficulty) DefaultPoints() int {
	switch d {
	case Easy:
		return 100
	case Medium:
		return 200
	case Hard:
		return 300
	}
	return 100
}

// Color retourne une couleur CSS pour l'affichage
func (d Difficulty) Color() string {
	switch d {
	case Easy:
		return "#00b8a3" // vert
	case Medium:
		return "#ffc01e" // jaune
	case Hard:
		return "#ef4743" // rouge
	}
	return "#646cff"
}
