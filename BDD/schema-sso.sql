-- ============================================
-- YAPP - Yet Another Programming Platform
-- Schéma de base de données PostgreSQL
-- SSO Institutionnel
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: organisations
-- Les écoles/établissements avec abonnement
-- ============================================
CREATE TABLE organisations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,  -- ex: 'epita', 'epitech'
    localisation VARCHAR(255),
    
    -- SSO Configuration
    sso_provider VARCHAR(50) NOT NULL DEFAULT 'saml',  -- 'saml', 'oidc', 'cas'
    sso_entity_id VARCHAR(255),          -- SAML Entity ID
    sso_login_url VARCHAR(500),          -- URL de login SSO
    sso_logout_url VARCHAR(500),         -- URL de logout SSO
    sso_certificate TEXT,                -- Certificat public pour vérifier les signatures
    sso_metadata_url VARCHAR(500),       -- URL des métadonnées SAML (optionnel)
    
    -- Abonnement
    subscription_plan VARCHAR(50) DEFAULT 'free',  -- 'free', 'basic', 'premium', 'enterprise'
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    max_users INT DEFAULT 100,           -- Limite d'utilisateurs
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Contact admin de l'organisation
    admin_email VARCHAR(255),
    admin_name VARCHAR(255),
    
    -- Branding (optionnel)
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),  -- ex: '#FF5733'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organisations_slug ON organisations(slug);
CREATE INDEX idx_organisations_active ON organisations(is_active) WHERE is_active = TRUE;

-- ============================================
-- TABLE: users
-- Utilisateurs authentifiés via SSO
-- ============================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    
    -- Identité SSO (vient du provider)
    sso_id VARCHAR(255) NOT NULL,        -- ID unique de l'utilisateur chez le provider SSO
    organisation_id BIGINT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    
    -- Infos de profil (récupérées du SSO)
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    
    -- Rôle sur YAPP (peut être mappé depuis le SSO ou assigné manuellement)
    role VARCHAR(50) NOT NULL DEFAULT 'Student' CHECK (role IN ('Student', 'Teacher', 'Admin')),
    
    -- Attributs SSO additionnels (JSON pour flexibilité)
    sso_attributes JSONB,  -- ex: {"department": "INFO", "year": "2024", "group": "A1"}
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CONSTRAINT unique_sso_user UNIQUE (organisation_id, sso_id),
    CONSTRAINT unique_org_email UNIQUE (organisation_id, email)
);

CREATE INDEX idx_users_organisation ON users(organisation_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_sso ON users(organisation_id, sso_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TABLE: sessions
-- Sessions de connexion (après auth SSO)
-- ============================================
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tokens
    access_token_hash VARCHAR(255) NOT NULL,  -- Hash du JWT access token
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    
    -- SSO session info
    sso_session_id VARCHAR(255),  -- Session ID du provider SSO (pour logout)
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
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
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Visibilité
    is_published BOOLEAN DEFAULT FALSE,
    publish_at TIMESTAMP WITH TIME ZONE,  -- Publication programmée
    
    -- Restrictions (optionnel)
    allowed_groups TEXT[],  -- ex: ['A1', 'A2'] - filtre sur sso_attributes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
    enrolled_by BIGINT REFERENCES users(id),  -- NULL = auto-inscrit, sinon = prof
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_enrollment UNIQUE (user_id, problem_set_id)
);

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
    time_limit_ms INT DEFAULT 2000,
    memory_limit_mb INT DEFAULT 256,
    
    -- Metadata
    author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    organisation_id BIGINT REFERENCES organisations(id),  -- NULL = problème global
    points INT DEFAULT 100,
    
    -- Code
    starter_code TEXT,
    solution_code TEXT,
    
    -- Status
    is_public BOOLEAN DEFAULT FALSE,  -- Visible par toutes les organisations?
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_problems_author ON problems(author_id);
CREATE INDEX idx_problems_organisation ON problems(organisation_id);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_language ON problems(language);

-- ============================================
-- TABLE: problem_problem_sets (Many-to-Many)
-- ============================================
CREATE TABLE problem_problem_sets (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    problem_set_id BIGINT NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
    position INT DEFAULT 0,
    
    -- Dates limites spécifiques à ce problem set
    due_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_problem_in_set UNIQUE (problem_id, problem_set_id)
);

CREATE INDEX idx_pps_problem ON problem_problem_sets(problem_id);
CREATE INDEX idx_pps_problem_set ON problem_problem_sets(problem_set_id);

-- ============================================
-- TABLE: test_cases
-- ============================================
CREATE TABLE test_cases (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected TEXT NOT NULL,
    hidden BOOLEAN DEFAULT FALSE,
    position INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_cases_problem ON test_cases(problem_id);

-- ============================================
-- TABLE: submissions
-- ============================================
CREATE TABLE submissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    problem_set_id BIGINT REFERENCES problem_sets(id),  -- Contexte de soumission
    
    language VARCHAR(50) NOT NULL CHECK (language IN (
        'Python', 'Rust', 'Csharp', 'C', 'Cpp',
        'Javascript', 'Typescript', 'Go', 'Java', 'Swift'
    )),
    source_code TEXT NOT NULL,
    
    -- Résultat
    verdict VARCHAR(50) DEFAULT 'Pending' CHECK (verdict IN (
        'Pending', 'Running', 'Accepted', 'WrongAnswer', 'TimeLimitExceeded',
        'MemoryLimitExceeded', 'RuntimeError', 'CompilationError', 'InternalError'
    )),
    message TEXT,
    
    -- Métriques
    execution_time_ms INT,
    memory_usage_kb INT,
    score INT,  -- Points obtenus
    
    -- Debug
    judge_output TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_problem ON submissions(problem_id);
CREATE INDEX idx_submissions_problem_set ON submissions(problem_set_id);
CREATE INDEX idx_submissions_verdict ON submissions(verdict);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);

-- ============================================
-- TABLE: test_case_results
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
    actual_output TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- Triggers
CREATE TRIGGER update_organisations_updated_at BEFORE UPDATE ON organisations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problem_sets_updated_at BEFORE UPDATE ON problem_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VUES
-- ============================================

-- Stats utilisateur
CREATE VIEW user_stats AS
SELECT
    u.id as user_id,
    u.name,
    u.organisation_id,
    COUNT(DISTINCT s.problem_id) FILTER (WHERE s.verdict = 'Accepted') as problems_solved,
    COUNT(s.id) as total_submissions,
    COALESCE(SUM(s.score) FILTER (WHERE s.verdict = 'Accepted'), 0) as total_points
FROM users u
LEFT JOIN submissions s ON u.id = s.user_id
WHERE u.role = 'Student'
GROUP BY u.id, u.name, u.organisation_id;

-- Leaderboard par organisation
CREATE VIEW organisation_leaderboard AS
SELECT
    user_id,
    name,
    organisation_id,
    problems_solved,
    total_points,
    RANK() OVER (PARTITION BY organisation_id ORDER BY total_points DESC) as rank
FROM user_stats
ORDER BY organisation_id, rank;
