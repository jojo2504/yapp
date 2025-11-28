package submission

type Verdict string

const (
	VerdictPending             Verdict = "Pending"
	VerdictAccepted            Verdict = "Accepted"
	VerdictWrongAnswer         Verdict = "WrongAnswer"
	VerdictTimeLimitExceeded   Verdict = "TimeLimitExceeded"
	VerdictMemoryLimitExceeded Verdict = "MemoryLimitExceeded"
	VerdictRuntimeError        Verdict = "RuntimeError"
	VerdictCompilationError    Verdict = "CompilationError"
	VerdictInternalError       Verdict = "InternalError"
)

// IsValid vérifie si le verdict est valide
func (v Verdict) IsValid() bool {
	switch v {
	case VerdictPending, VerdictAccepted, VerdictWrongAnswer,
		VerdictTimeLimitExceeded, VerdictMemoryLimitExceeded,
		VerdictRuntimeError, VerdictCompilationError, VerdictInternalError:
		return true
	}
	return false
}

// String retourne la représentation string
func (v Verdict) String() string {
	return string(v)
}

// IsSuccess vérifie si c'est un succès
func (v Verdict) IsSuccess() bool {
	return v == VerdictAccepted
}

// IsFailure vérifie si c'est un échec
func (v Verdict) IsFailure() bool {
	return v != VerdictPending && v != VerdictAccepted
}

// DisplayName retourne un nom lisible en français
func (v Verdict) DisplayName() string {
	switch v {
	case VerdictPending:
		return "En attente"
	case VerdictAccepted:
		return "Accepté"
	case VerdictWrongAnswer:
		return "Mauvaise réponse"
	case VerdictTimeLimitExceeded:
		return "Temps dépassé"
	case VerdictMemoryLimitExceeded:
		return "Mémoire dépassée"
	case VerdictRuntimeError:
		return "Erreur d'exécution"
	case VerdictCompilationError:
		return "Erreur de compilation"
	case VerdictInternalError:
		return "Erreur interne"
	}
	return string(v)
}

// Color retourne une couleur CSS
func (v Verdict) Color() string {
	switch v {
	case VerdictPending:
		return "#f9e2af" // jaune
	case VerdictAccepted:
		return "#a6e3a1" // vert
	case VerdictWrongAnswer, VerdictRuntimeError, VerdictCompilationError:
		return "#f38ba8" // rouge
	case VerdictTimeLimitExceeded, VerdictMemoryLimitExceeded:
		return "#fab387" // orange
	case VerdictInternalError:
		return "#6c7086" // gris
	}
	return "#cdd6f4"
}
