-- =============================================================================
-- YAPP - Initial Schema Migration
-- Compatible with: PostgreSQL 16 / Supabase
--
-- Tables (in dependency order):
--   organisations, users, sessions, problems, test_cases,
--   problem_sets, problem_problem_sets, problem_set_enrollments,
--   submissions, test_case_results
--
-- NOTE: The 'organisations' table merges two model definitions found in the
--   codebase (api/types/user/organisation.go and api/types/organisation/).
--   Both 'localisation' and 'domain' columns are included; neither is required.
-- =============================================================================

BEGIN;


-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM ('Student', 'Teacher', 'Admin');

CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE language AS ENUM (
    'Python', 'Rust', 'C#', 'C', 'C++',
    'JavaScript', 'TypeScript', 'Go', 'Java', 'Swift'
);

CREATE TYPE verdict AS ENUM (
    'Pending',
    'Accepted',
    'WrongAnswer',
    'TimeLimitExceeded',
    'MemoryLimitExceeded',
    'RuntimeError',
    'CompilationError',
    'InternalError'
);

CREATE TYPE problem_set_type AS ENUM ('assignment', 'exam', 'practice');

-- =============================================================================
-- organisations
-- Merged from: api/types/user/organisation.go + api/types/organisation/
-- =============================================================================

CREATE TABLE IF NOT EXISTS organisations (
    id          BIGSERIAL    PRIMARY KEY,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    name         VARCHAR(255) NOT NULL,
    localisation VARCHAR(255),           -- from user/organisation.go
    domain       VARCHAR(255)            -- from organisation/organisation.go
);

CREATE INDEX IF NOT EXISTS idx_organisations_deleted_at
    ON organisations (deleted_at);

-- =============================================================================
-- users
-- api/types/user/user.go
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    name             VARCHAR(255) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    password_hash    VARCHAR(255),
    role             user_role    NOT NULL DEFAULT 'Student',
    organisation_id  BIGINT       REFERENCES organisations (id) ON DELETE SET NULL,

    o_auth_provider  VARCHAR(50),
    o_auth_id        VARCHAR(255),

    avatar_url       TEXT,
    email_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Unique email per non-deleted user
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON users (email) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_role
    ON users (role);

CREATE INDEX IF NOT EXISTS idx_users_organisation_id
    ON users (organisation_id);

-- Composite unique index for OAuth (only when both provider and ID are set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth
    ON users (o_auth_provider, o_auth_id)
    WHERE o_auth_provider IS NOT NULL
      AND o_auth_id        IS NOT NULL
      AND deleted_at       IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at
    ON users (deleted_at);

-- =============================================================================
-- sessions
-- api/types/session/session.go
-- =============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token
    ON sessions (token) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
    ON sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at
    ON sessions (deleted_at);

-- =============================================================================
-- problems
-- api/types/problem/problem.go
-- =============================================================================

CREATE TABLE IF NOT EXISTS problems (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    title         VARCHAR(255) NOT NULL,
    description   TEXT         NOT NULL,
    language      language     NOT NULL,
    difficulty    difficulty   NOT NULL DEFAULT 'easy',

    time_limit    INTEGER      NOT NULL DEFAULT 2000,  -- milliseconds
    memory_limit  INTEGER      NOT NULL DEFAULT 256,   -- megabytes

    author_id     BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    points        INTEGER      NOT NULL DEFAULT 100,

    starter_code  TEXT,
    solution_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_problems_language
    ON problems (language);

CREATE INDEX IF NOT EXISTS idx_problems_difficulty
    ON problems (difficulty);

CREATE INDEX IF NOT EXISTS idx_problems_author_id
    ON problems (author_id);

CREATE INDEX IF NOT EXISTS idx_problems_deleted_at
    ON problems (deleted_at);

-- =============================================================================
-- test_cases
-- api/types/problem/testcase.go
-- =============================================================================

CREATE TABLE IF NOT EXISTS test_cases (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    problem_id  BIGINT  NOT NULL REFERENCES problems (id) ON DELETE CASCADE,
    input       TEXT    NOT NULL,
    expected    TEXT    NOT NULL,
    hidden      BOOLEAN NOT NULL DEFAULT FALSE,
    position    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_test_cases_problem_id
    ON test_cases (problem_id);

CREATE INDEX IF NOT EXISTS idx_test_cases_deleted_at
    ON test_cases (deleted_at);

-- =============================================================================
-- problem_sets
-- api/types/problem/problem_set.go
-- =============================================================================

CREATE TABLE IF NOT EXISTS problem_sets (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    name             VARCHAR(255)      NOT NULL,
    description      TEXT,
    organisation_id  BIGINT            NOT NULL REFERENCES organisations (id) ON DELETE CASCADE,
    created_by       BIGINT            REFERENCES users (id) ON DELETE SET NULL,
    is_published     BOOLEAN           NOT NULL DEFAULT FALSE,

    type             problem_set_type  NOT NULL DEFAULT 'assignment',
    starts_at        TIMESTAMPTZ,
    ends_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_problem_sets_organisation_id
    ON problem_sets (organisation_id);

CREATE INDEX IF NOT EXISTS idx_problem_sets_created_by
    ON problem_sets (created_by);

CREATE INDEX IF NOT EXISTS idx_problem_sets_deleted_at
    ON problem_sets (deleted_at);

-- =============================================================================
-- problem_problem_sets  (many-to-many join table)
-- GORM tag: many2many:problem_problem_sets
-- =============================================================================

CREATE TABLE IF NOT EXISTS problem_problem_sets (
    problem_id      BIGINT NOT NULL REFERENCES problems     (id) ON DELETE CASCADE,
    problem_set_id  BIGINT NOT NULL REFERENCES problem_sets (id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, problem_set_id)
);

CREATE INDEX IF NOT EXISTS idx_problem_problem_sets_problem_set_id
    ON problem_problem_sets (problem_set_id);

-- =============================================================================
-- problem_set_enrollments
-- api/types/problem/enrollment.go
-- =============================================================================

CREATE TABLE IF NOT EXISTS problem_set_enrollments (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    user_id         BIGINT      NOT NULL REFERENCES users        (id) ON DELETE CASCADE,
    problem_set_id  BIGINT      NOT NULL REFERENCES problem_sets (id) ON DELETE CASCADE,
    enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active enrollment per (user, problem_set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment
    ON problem_set_enrollments (user_id, problem_set_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_problem_set_enrollments_problem_set_id
    ON problem_set_enrollments (problem_set_id);

CREATE INDEX IF NOT EXISTS idx_problem_set_enrollments_deleted_at
    ON problem_set_enrollments (deleted_at);

-- =============================================================================
-- submissions
-- api/types/submission/submission.go
-- =============================================================================

CREATE TABLE IF NOT EXISTS submissions (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    user_id     BIGINT   NOT NULL REFERENCES users    (id) ON DELETE CASCADE,
    problem_id  BIGINT   NOT NULL REFERENCES problems (id) ON DELETE CASCADE,
    language    language NOT NULL,
    source_code TEXT     NOT NULL,

    verdict         verdict  NOT NULL DEFAULT 'Pending',
    message         TEXT,

    execution_time  INTEGER,   -- milliseconds, nullable (*uint32 in Go)
    memory_usage    INTEGER,   -- megabytes, nullable (*uint32 in Go)

    judge_output    TEXT,

    is_exam_submission  BOOLEAN  NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id
    ON submissions (user_id);

CREATE INDEX IF NOT EXISTS idx_submissions_problem_id
    ON submissions (problem_id);

CREATE INDEX IF NOT EXISTS idx_submissions_verdict
    ON submissions (verdict);

-- Composite index for "user's submissions on a problem" queries
CREATE INDEX IF NOT EXISTS idx_user_problem
    ON submissions (user_id, problem_id);

CREATE INDEX IF NOT EXISTS idx_submissions_deleted_at
    ON submissions (deleted_at);

-- =============================================================================
-- test_case_results
-- api/types/submission/testcase_result.go
-- =============================================================================

CREATE TABLE IF NOT EXISTS test_case_results (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    submission_id   BIGINT  NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
    test_case_id    BIGINT  NOT NULL REFERENCES test_cases  (id) ON DELETE CASCADE,
    verdict         verdict NOT NULL,

    execution_time  INTEGER NOT NULL DEFAULT 0,   -- milliseconds (uint32 in Go)
    memory_kb       INTEGER NOT NULL DEFAULT 0,   -- kilobytes    (uint32 in Go)

    actual_output   TEXT
);

CREATE INDEX IF NOT EXISTS idx_test_case_results_submission_id
    ON test_case_results (submission_id);

CREATE INDEX IF NOT EXISTS idx_test_case_results_test_case_id
    ON test_case_results (test_case_id);

CREATE INDEX IF NOT EXISTS idx_test_case_results_deleted_at
    ON test_case_results (deleted_at);

-- =============================================================================
-- exam_violations
-- Records integrity violations detected during timed exams.
-- =============================================================================

CREATE TABLE IF NOT EXISTS exam_violations (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users        (id) ON DELETE CASCADE,
    problem_set_id  BIGINT       NOT NULL REFERENCES problem_sets (id) ON DELETE CASCADE,
    violation_type  VARCHAR(50)  NOT NULL,
    duration_seconds INT,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exam_violations_user_id
    ON exam_violations (user_id);

CREATE INDEX IF NOT EXISTS idx_exam_violations_problem_set_id
    ON exam_violations (problem_set_id);

-- =============================================================================
-- notifications
-- Per-user notifications (in-app).
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications (user_id);

-- =============================================================================
-- leaderboard_view
-- Ranks users by number of accepted submissions (verdict = 'Accepted').
-- =============================================================================

CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
    u.id                                           AS user_id,
    u.name                                         AS name,
    COUNT(s.id)                                    AS total_solved,
    RANK() OVER (ORDER BY COUNT(s.id) DESC)        AS rank
FROM users u
LEFT JOIN submissions s
    ON s.user_id  = u.id
   AND s.verdict  = 'Accepted'
   AND s.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.name
ORDER BY total_solved DESC;

COMMIT;
