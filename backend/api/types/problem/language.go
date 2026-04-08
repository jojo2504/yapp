package problem

type Language string

const (
	Python     Language = "Python"
	Rust       Language = "Rust"
	Csharp     Language = "Csharp"
	C          Language = "C"
	Cpp        Language = "Cpp"
	Javascript Language = "Javascript"
	Typescript Language = "Typescript"
	Go         Language = "Go"
	Java       Language = "Java"
	Swift      Language = "Swift"
)

// IsValid vérifie si le langage est supporté
func (l Language) IsValid() bool {
	switch l {
	case Python, Rust, Csharp, C, Cpp, Javascript, Typescript, Go, Java, Swift:
		return true
	}
	return false
}

// String retourne la représentation string du langage
func (l Language) String() string {
	return string(l)
}

// FileExtension retourne l'extension de fichier pour ce langage
func (l Language) FileExtension() string {
	switch l {
	case Python:
		return ".py"
	case Rust:
		return ".rs"
	case Csharp:
		return ".cs"
	case C:
		return ".c"
	case Cpp:
		return ".cpp"
	case Javascript:
		return ".js"
	case Typescript:
		return ".ts"
	case Go:
		return ".go"
	case Java:
		return ".java"
	case Swift:
		return ".swift"
	}
	return ".txt"
}

// AllLanguages retourne tous les langages supportés
func AllLanguages() []Language {
	return []Language{
		Python, Rust, Csharp, C, Cpp,
		Javascript, Typescript, Go, Java, Swift,
	}
}
