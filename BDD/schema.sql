-- ============================================
-- YAPP - Yet Another Programming Platform
-- Schéma de base de données PostgreSQL
-- ============================================

-- Extension pour UUID (optionnel mais recommandé)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: organisations
-- Les écoles/établissements
-- ============================================
CREATE TABLE organisations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    localisation VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche par nom
CREATE INDEX idx_organisations_name ON organisations(name);

-- ============================================
-- TABLE: users
-- Étudiants, professeurs, administrateurs
-- ============================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),  -- NULL si OAuth uniquement
    role VARCHAR(50) NOT NULL DEFAULT 'Student' CHECK (role IN ('Student', 'Teacher', 'Admin')),
    organisation_id BIGINT REFERENCES organisations(id) ON DELETE SET NULL,

    -- OAuth fields
    oauth_provider VARCHAR(50),  -- 'google', 'github', etc.
    oauth_id VARCHAR(255),       -- ID unique du provider

    -- Metadata
    avatar_url VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE

    -- Contrainte: soit password_hash soit oauth rempli
    CONSTRAINT user_auth_check CHECK (
        password_hash IS NOT NULL OR (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL)
        ),
    -- Unicité OAuth
    CONSTRAINT unique_oauth UNIQUE (oauth_provider, oauth_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organisation ON users(organisation_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;

-- ============================================
-- TABLE: sessions
-- Tokens de connexion (refresh tokens)
-- ============================================
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,  -- UUID refresh token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour lookup rapide
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- TABLE: problem_sets
-- Les cours/ensembles de problèmes
-- ============================================
CREATE TABLE problem_sets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organisation_id BIGINT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- Le prof qui a créé
    is_published BOOLEAN DEFAULT FALSE,  -- Visible par les étudiants?

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index
CREATE INDEX idx_problem_sets_organisation ON problem_sets(organisation_id);
CREATE INDEX idx_problem_sets_created_by ON problem_sets(created_by);

-- ============================================
-- TABLE: problem_set_enrollments
-- Inscriptions des étudiants aux cours
-- ============================================
CREATE TABLE problem_set_enrollments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_set_id BIGINT NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Un étudiant ne peut s'inscrire qu'une fois à un cours
    CONSTRAINT unique_enrollment UNIQUE (user_id, problem_set_id)
);

-- Index
CREATE INDEX idx_enrollments_user ON problem_set_enrollments(user_id);
CREATE INDEX idx_enrollments_problem_set ON problem_set_enrollments(problem_set_id);

-- ============================================
-- TABLE: problems
-- Les exercices de programmation
-- ============================================
CREATE TABLE problems (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    language VARCHAR(50) NOT NULL CHECK (language IN (
        'Python', 'Rust', 'Csharp', 'C', 'Cpp',
        'Javascript', 'Typescript', 'Go', 'Java', 'Swift'
        )),
    difficulty VARCHAR(20) NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),

    -- Limites d'exécution
    time_limit_ms INT DEFAULT 2000,      -- 2 secondes par défaut
    memory_limit_mb INT DEFAULT 256,     -- 256 MB par défaut

    -- Metadata
    author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    points INT DEFAULT 100,

    -- Template de code initial (optionnel)
    starter_code TEXT,
    -- Solution de référence (visible uniquement par les profs)
    solution_code TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_problems_author ON problems(author_id);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_language ON problems(language);

-- ============================================
-- TABLE: problem_problem_sets (Many-to-Many)
-- Liaison entre problèmes et ensembles
-- ============================================
CREATE TABLE problem_problem_sets (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    problem_set_id BIGINT NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
    position INT DEFAULT 0,  -- Ordre d'affichage dans le set

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_problem_in_set UNIQUE (problem_id, problem_set_id)
);

-- Index
CREATE INDEX idx_pps_problem ON problem_problem_sets(problem_id);
CREATE INDEX idx_pps_problem_set ON problem_problem_sets(problem_set_id);

-- ============================================
-- TABLE: test_cases
-- Cas de test pour chaque problème
-- ============================================
CREATE TABLE test_cases (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected TEXT NOT NULL,
    hidden BOOLEAN DEFAULT FALSE,  -- Caché aux étudiants?
    position INT DEFAULT 0,        -- Ordre d'exécution

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_test_cases_problem ON test_cases(problem_id);

-- ============================================
-- TABLE: submissions
-- Soumissions de code des étudiants
-- ============================================
CREATE TABLE submissions (
                             id BIGSERIAL PRIMARY KEY,
                             user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                             problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
                             language VARCHAR(50) NOT NULL CHECK (language IN (
                                 'Python', 'Rust', 'Csharp', 'C', 'Cpp',
                                 'Javascript', 'Typescript', 'Go', 'Java', 'Swift'
                                 )),
    source_code TEXT NOT NULL,

    -- Résultat du jugement
    verdict VARCHAR(50) DEFAULT 'Pending' CHECK (verdict IN (
        'Pending', 'Accepted', 'WrongAnswer', 'TimeLimitExceeded',
        'MemoryLimitExceeded', 'RuntimeError', 'CompilationError', 'InternalError'
    )),
    message TEXT,  -- Explication du juge

    -- Métriques d'exécution
    execution_time_ms INT,
    memory_usage_kb INT,

    -- Output brut du juge (pour debug)
    judge_output TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_problem ON submissions(problem_id);
CREATE INDEX idx_submissions_verdict ON submissions(verdict);
CREATE INDEX idx_submissions_user_problem ON submissions(user_id, problem_id);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);

-- ============================================
-- TABLE: test_case_results
-- Résultats détaillés par cas de test
-- ============================================
CREATE TABLE test_case_results (
                                   id BIGSERIAL PRIMARY KEY,
                                   submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
                                   test_case_id BIGINT NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,

                                   verdict VARCHAR(50) NOT NULL CHECK (verdict IN (
                                                                                   'Pending', 'Accepted', 'WrongAnswer', 'TimeLimitExceeded',
                                                                                   'MemoryLimitExceeded', 'RuntimeError', 'CompilationError', 'InternalError'
                                       )),
                                   execution_time_ms INT,
                                   memory_usage_kb INT,
                                   actual_output TEXT,  -- Ce que le code a produit

                                   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_tcr_submission ON test_case_results(submission_id);
CREATE INDEX idx_tcr_test_case ON test_case_results(test_case_id);

-- ============================================
-- FONCTION: Mise à jour automatique de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_organisations_updated_at BEFORE UPDATE ON organisations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problem_sets_updated_at BEFORE UPDATE ON problem_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problem_set_enrollments_updated_at BEFORE UPDATE ON problem_set_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VUES UTILES (pour calcul à la volée)
-- ============================================

-- Vue: Statistiques par utilisateur
CREATE VIEW user_stats AS
SELECT
    u.id as user_id,
    u.name,
    u.organisation_id,
    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'Accepted') as problems_solved,
    COUNT(s.id) as total_submissions,
    COALESCE(SUM(p.points) FILTER (WHERE s.verdict = 'Accepted'), 0) as total_points
FROM users u
         LEFT JOIN submissions s ON u.id = s.user_id
         LEFT JOIN problems p ON s.problem_id = p.id
WHERE u.role = 'Student'
GROUP BY u.id, u.name, u.organisation_id;

-- Vue: Leaderboard par organisation
CREATE VIEW organisation_leaderboard AS
SELECT
    user_id,
    name,
    organisation_id,
    problems_solved,
    total_points,
    RANK() OVER (PARTITION BY organisation_id ORDER BY total_points DESC, problems_solved DESC) as rank
FROM user_stats
ORDER BY organisation_id, rank;

-- Vue: Progression d'un étudiant sur un ProblemSet
CREATE VIEW problem_set_progress AS
SELECT
    pse.user_id,
    pse.problem_set_id,
    ps.name as problem_set_name,
    COUNT(DISTINCT pps.problem_id) as total_problems,
    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'Accepted') as solved_problems
FROM problem_set_enrollments pse
         JOIN problem_sets ps ON pse.problem_set_id = ps.id
         JOIN problem_problem_sets pps ON ps.id = pps.problem_set_id
         LEFT JOIN submissions s ON pse.user_id = s.user_id AND pps.problem_id = s.problem_id
GROUP BY pse.user_id, pse.problem_set_id, ps.name;

-- ============================================
-- DONNÉES DE TEST (optionnel)
-- ============================================

-- Insérer une organisation de test
-- INSERT INTO organisations (name, localisation) VALUES ('EPITA', 'Paris, France');

-- Insérer un admin de test
-- INSERT INTO users (name, email, password_hash, role, organisation_id)
-- VALUES ('Admin Test', 'admin@epita.fr', '$2a$10$...', 'Admin', 1);