package database

import (
	"backend/api/types/problem"
	"backend/api/types/session"
	"backend/api/types/submission"
	"backend/api/types/user"
	"log"
	"os"

	"gorm.io/gorm"
)

// AllModels retourne tous les modèles pour la migration
func AllModels() []interface{} {
	return []interface{}{
		&user.Organisation{},
		&user.User{},
		&session.Session{},
		&problem.ProblemSet{},
		&problem.Problem{},
		&problem.ProblemSetEnrollment{},
		&problem.TestCase{},
		&submission.Submission{},
		&submission.TestCaseResult{},
	}
}

// RunMigrations exécute toutes les migrations
func RunMigrations(db *gorm.DB) error {
	log.Println("🔄 Running database migrations...")

	if err := db.AutoMigrate(AllModels()...); err != nil {
		return err
	}

	log.Println("✅ Migrations completed successfully")
	return nil
}

// SeedDatabase ajoute des données de test initiales (dev only)
func SeedDatabase(db *gorm.DB) error {
	// Ne seed que en développement
	if os.Getenv("ENV") == "production" {
		return nil
	}

	log.Println("🌱 Seeding database...")

	// Vérifier si des données existent déjà
	var orgCount int64
	db.Model(&user.Organisation{}).Count(&orgCount)
	if orgCount > 0 {
		log.Println("⏭️  Database already seeded, skipping...")
		return nil
	}

	// === Créer une organisation de test ===
	org := &user.Organisation{
		Name:         "EPITA",
		Localisation: "Paris, France",
	}
	if err := db.Create(org).Error; err != nil {
		return err
	}
	log.Printf("   ✓ Created organisation: %s\n", org.Name)

	// === Créer un admin ===
	// Mot de passe: "admin123" (hashé avec bcrypt)
	adminPassword := "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
	admin := &user.User{
		Name:           "Admin",
		Email:          "admin@epita.fr",
		PasswordHash:   &adminPassword,
		Role:           user.RoleAdmin,
		OrganisationID: &org.ID,
		EmailVerified:  true,
		IsActive:       true,
	}
	if err := db.Create(admin).Error; err != nil {
		return err
	}
	log.Printf("   ✓ Created admin: %s\n", admin.Email)

	// === Créer un professeur ===
	teacherPassword := "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
	teacher := &user.User{
		Name:           "Prof Python",
		Email:          "prof@epita.fr",
		PasswordHash:   &teacherPassword,
		Role:           user.RoleTeacher,
		OrganisationID: &org.ID,
		EmailVerified:  true,
		IsActive:       true,
	}
	if err := db.Create(teacher).Error; err != nil {
		return err
	}
	log.Printf("   ✓ Created teacher: %s\n", teacher.Email)

	// === Créer un étudiant ===
	studentPassword := "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
	student := &user.User{
		Name:           "Étudiant Test",
		Email:          "student@epita.fr",
		PasswordHash:   &studentPassword,
		Role:           user.RoleStudent,
		OrganisationID: &org.ID,
		EmailVerified:  true,
		IsActive:       true,
	}
	if err := db.Create(student).Error; err != nil {
		return err
	}
	log.Printf("   ✓ Created student: %s\n", student.Email)

	// === Créer un ProblemSet ===
	desc := "Apprenez les bases de Python avec des exercices pratiques"
	problemSet := &problem.ProblemSet{
		Name:           "Python - Les Bases",
		Description:    &desc,
		OrganisationID: org.ID,
		CreatedBy:      &teacher.ID,
		IsPublished:    true,
	}
	if err := db.Create(problemSet).Error; err != nil {
		return err
	}
	log.Printf("   ✓ Created problem set: %s\n", problemSet.Name)

	// === Inscrire l'étudiant au ProblemSet ===
	enrollment := &problem.ProblemSetEnrollment{
		UserID:       student.ID,
		ProblemSetID: problemSet.ID,
	}
	if err := db.Create(enrollment).Error; err != nil {
		return err
	}
	log.Println("   ✓ Enrolled student to problem set")

	// === Créer un problème "Two Sum" ===
	starterCode := `def two_sum(nums: list[int], target: int) -> list[int]:
    # Votre code ici
    pass
`
	solutionCode := `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
`
	prob := &problem.Problem{
		Title: "Two Sum",
		Description: `Étant donné un tableau d'entiers **nums** et un entier **target**, retournez les indices des deux nombres dont la somme est égale à target.

Vous pouvez supposer que chaque entrée a exactement une solution, et vous ne pouvez pas utiliser le même élément deux fois.

Vous pouvez retourner la réponse dans n'importe quel ordre.`,
		Language:     problem.Python,
		Difficulty:   problem.Easy,
		TimeLimit:    2000,
		MemoryLimit:  256,
		AuthorID:     &teacher.ID,
		Points:       100,
		StarterCode:  &starterCode,
		SolutionCode: &solutionCode,
	}
	if err := db.Create(prob).Error; err != nil {
		return err
	}
	log.Printf("   ✓ Created problem: %s\n", prob.Title)

	// === Associer le problème au ProblemSet ===
	if err := db.Exec(
		"INSERT INTO problem_problem_sets (problem_id, problem_set_id, position, created_at) VALUES (?, ?, ?, NOW())",
		prob.ID, problemSet.ID, 1,
	).Error; err != nil {
		return err
	}

	// === Créer des test cases ===
	testCases := []problem.TestCase{
		{
			ProblemID: prob.ID,
			Input:     "[2,7,11,15]\n9",
			Expected:  "[0, 1]",
			Hidden:    false,
			Position:  1,
		},
		{
			ProblemID: prob.ID,
			Input:     "[3,2,4]\n6",
			Expected:  "[1, 2]",
			Hidden:    false,
			Position:  2,
		},
		{
			ProblemID: prob.ID,
			Input:     "[3,3]\n6",
			Expected:  "[0, 1]",
			Hidden:    true, // Test caché
			Position:  3,
		},
	}
	for _, tc := range testCases {
		if err := db.Create(&tc).Error; err != nil {
			return err
		}
	}
	log.Printf("   ✓ Created %d test cases\n", len(testCases))

	log.Println("✅ Database seeded successfully!")
	log.Println("")
	log.Println("📧 Comptes de test créés:")
	log.Println("   Admin:    admin@epita.fr    / admin123")
	log.Println("   Prof:     prof@epita.fr     / admin123")
	log.Println("   Étudiant: student@epita.fr  / admin123")
	log.Println("")

	return nil
}
