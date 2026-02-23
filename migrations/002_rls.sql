-- =============================================================================
-- YAPP - Row Level Security
-- Run AFTER 001_init.sql.
--
-- JWT claim mapping (set by the Go backend):
--   auth.jwt() ->> 'user_id'        → BIGINT  — caller's users.id
--   auth.jwt() ->> 'role'           → TEXT    — 'Student' | 'Teacher' | 'Admin'
--   auth.jwt() ->> 'organisation_id'→ BIGINT  — caller's organisation
--
-- The backend service role (used by the Go API) bypasses RLS entirely, so
-- write operations performed by the judge worker or internal services need
-- no INSERT/UPDATE policies of their own.
-- =============================================================================

BEGIN;

-- =============================================================================
-- HELPER FUNCTIONS
-- Centralise JWT claim extraction so policies stay readable.
-- SECURITY DEFINER + STABLE: evaluated once per statement, runs as owner.
-- =============================================================================

-- Caller's users.id
CREATE OR REPLACE FUNCTION yapp_uid()
    RETURNS BIGINT
    LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT (auth.jwt() ->> 'user_id')::BIGINT $$;

-- Caller's role string
CREATE OR REPLACE FUNCTION yapp_role()
    RETURNS TEXT
    LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT auth.jwt() ->> 'role' $$;

-- TRUE when the caller is a Teacher or Admin
CREATE OR REPLACE FUNCTION yapp_is_staff()
    RETURNS BOOLEAN
    LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT yapp_role() IN ('Teacher', 'Admin') $$;

-- TRUE when the caller is an Admin
CREATE OR REPLACE FUNCTION yapp_is_admin()
    RETURNS BOOLEAN
    LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT yapp_role() = 'Admin' $$;

-- TRUE when a valid JWT with a user_id claim is present
CREATE OR REPLACE FUNCTION yapp_is_authenticated()
    RETURNS BOOLEAN
    LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT (auth.jwt() ->> 'user_id') IS NOT NULL $$;

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE organisations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_sets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_problem_sets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_set_enrollments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_results          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_violations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;

-- Force RLS even for the table owner so that the API role cannot
-- accidentally gain elevated access.  Remove this block if your
-- backend connects as a superuser / BYPASSRLS role.
ALTER TABLE organisations              FORCE ROW LEVEL SECURITY;
ALTER TABLE users                      FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions                   FORCE ROW LEVEL SECURITY;
ALTER TABLE problems                   FORCE ROW LEVEL SECURITY;
ALTER TABLE test_cases                 FORCE ROW LEVEL SECURITY;
ALTER TABLE problem_sets               FORCE ROW LEVEL SECURITY;
ALTER TABLE problem_problem_sets       FORCE ROW LEVEL SECURITY;
ALTER TABLE problem_set_enrollments    FORCE ROW LEVEL SECURITY;
ALTER TABLE submissions                FORCE ROW LEVEL SECURITY;
ALTER TABLE test_case_results          FORCE ROW LEVEL SECURITY;
ALTER TABLE exam_violations            FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications              FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- 1. organisations
--    Anyone authenticated may read; only staff may write.
-- =============================================================================

CREATE POLICY "organisations_select_authenticated"
    ON organisations FOR SELECT
    USING (yapp_is_authenticated() AND deleted_at IS NULL);

CREATE POLICY "organisations_insert_staff"
    ON organisations FOR INSERT
    WITH CHECK (yapp_is_staff());

CREATE POLICY "organisations_update_staff"
    ON organisations FOR UPDATE
    USING (yapp_is_staff() AND deleted_at IS NULL);

CREATE POLICY "organisations_delete_admin"
    ON organisations FOR DELETE
    USING (yapp_is_admin());

-- =============================================================================
-- 2. users
--    Users can only read and update their own row.
-- =============================================================================

CREATE POLICY "users_select_own"
    ON users FOR SELECT
    USING (id = yapp_uid() AND deleted_at IS NULL);

CREATE POLICY "users_update_own"
    ON users FOR UPDATE
    USING (id = yapp_uid() AND deleted_at IS NULL);

-- Admins can read all users (e.g. user management page).
CREATE POLICY "users_select_admin"
    ON users FOR SELECT
    USING (yapp_is_admin() AND deleted_at IS NULL);

-- =============================================================================
-- 3. sessions
--    Users can only read their own sessions.
-- =============================================================================

CREATE POLICY "sessions_select_own"
    ON sessions FOR SELECT
    USING (user_id = yapp_uid() AND deleted_at IS NULL);

-- =============================================================================
-- 4. problems
--    Anyone authenticated can read.
--    Only teachers and admins can insert, update, or delete.
-- =============================================================================

CREATE POLICY "problems_select_authenticated"
    ON problems FOR SELECT
    USING (yapp_is_authenticated() AND deleted_at IS NULL);

CREATE POLICY "problems_insert_staff"
    ON problems FOR INSERT
    WITH CHECK (yapp_is_staff());

CREATE POLICY "problems_update_staff"
    ON problems FOR UPDATE
    USING (yapp_is_staff() AND deleted_at IS NULL);

CREATE POLICY "problems_delete_staff"
    ON problems FOR DELETE
    USING (yapp_is_staff());

-- =============================================================================
-- 5. test_cases
--    Same rules as problems.
-- =============================================================================

CREATE POLICY "test_cases_select_authenticated"
    ON test_cases FOR SELECT
    USING (yapp_is_authenticated() AND deleted_at IS NULL);

CREATE POLICY "test_cases_insert_staff"
    ON test_cases FOR INSERT
    WITH CHECK (yapp_is_staff());

CREATE POLICY "test_cases_update_staff"
    ON test_cases FOR UPDATE
    USING (yapp_is_staff() AND deleted_at IS NULL);

CREATE POLICY "test_cases_delete_staff"
    ON test_cases FOR DELETE
    USING (yapp_is_staff());

-- =============================================================================
-- 6. problem_sets
--    Anyone authenticated can read.
--    Only teachers and admins can insert, update, or delete.
-- =============================================================================

CREATE POLICY "problem_sets_select_authenticated"
    ON problem_sets FOR SELECT
    USING (yapp_is_authenticated() AND deleted_at IS NULL);

CREATE POLICY "problem_sets_insert_staff"
    ON problem_sets FOR INSERT
    WITH CHECK (yapp_is_staff());

CREATE POLICY "problem_sets_update_staff"
    ON problem_sets FOR UPDATE
    USING (yapp_is_staff() AND deleted_at IS NULL);

CREATE POLICY "problem_sets_delete_staff"
    ON problem_sets FOR DELETE
    USING (yapp_is_staff());

-- =============================================================================
-- 7. problem_problem_sets  (many-to-many join table)
--    Inherits problem_sets access: authenticated read, staff write.
-- =============================================================================

CREATE POLICY "pps_select_authenticated"
    ON problem_problem_sets FOR SELECT
    USING (yapp_is_authenticated());

CREATE POLICY "pps_insert_staff"
    ON problem_problem_sets FOR INSERT
    WITH CHECK (yapp_is_staff());

CREATE POLICY "pps_delete_staff"
    ON problem_problem_sets FOR DELETE
    USING (yapp_is_staff());

-- =============================================================================
-- 8. problem_set_enrollments
--    Users can only read their own enrollments.
--    Only teachers and admins can enroll or remove users.
-- =============================================================================

CREATE POLICY "enrollments_select_own"
    ON problem_set_enrollments FOR SELECT
    USING (user_id = yapp_uid() AND deleted_at IS NULL);

-- Staff can see all enrollments for a problem set (e.g. roster view).
CREATE POLICY "enrollments_select_staff"
    ON problem_set_enrollments FOR SELECT
    USING (yapp_is_staff() AND deleted_at IS NULL);

CREATE POLICY "enrollments_insert_staff"
    ON problem_set_enrollments FOR INSERT
    WITH CHECK (yapp_is_staff());

CREATE POLICY "enrollments_delete_staff"
    ON problem_set_enrollments FOR DELETE
    USING (yapp_is_staff());

-- =============================================================================
-- 9. submissions
--    Users can only read their own submissions.
--    Any authenticated user may submit (user_id must match the caller).
-- =============================================================================

CREATE POLICY "submissions_select_own"
    ON submissions FOR SELECT
    USING (user_id = yapp_uid() AND deleted_at IS NULL);

-- Staff can read all submissions (for grading, review).
CREATE POLICY "submissions_select_staff"
    ON submissions FOR SELECT
    USING (yapp_is_staff() AND deleted_at IS NULL);

-- Prevent submitting on behalf of another user.
CREATE POLICY "submissions_insert_authenticated"
    ON submissions FOR INSERT
    WITH CHECK (yapp_is_authenticated() AND user_id = yapp_uid());

-- =============================================================================
-- 10. test_case_results
--     Users can only read results linked to their own submissions.
--     Results are written by the judge via the service role (bypasses RLS).
-- =============================================================================

CREATE POLICY "tcr_select_own_submissions"
    ON test_case_results FOR SELECT
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1
            FROM   submissions s
            WHERE  s.id         = test_case_results.submission_id
              AND  s.user_id    = yapp_uid()
              AND  s.deleted_at IS NULL
        )
    );

-- Staff can read all test case results.
CREATE POLICY "tcr_select_staff"
    ON test_case_results FOR SELECT
    USING (yapp_is_staff() AND deleted_at IS NULL);

-- =============================================================================
-- 11. exam_violations
--     Only admins and teachers can read.
--     Inserts are performed by the backend service role (bypasses RLS).
--     A staff INSERT policy is included for manual admin entries.
-- =============================================================================

CREATE POLICY "violations_select_staff"
    ON exam_violations FOR SELECT
    USING (yapp_is_staff() AND deleted_at IS NULL);

CREATE POLICY "violations_insert_staff"
    ON exam_violations FOR INSERT
    WITH CHECK (yapp_is_staff());

CREATE POLICY "violations_delete_admin"
    ON exam_violations FOR DELETE
    USING (yapp_is_admin());

-- =============================================================================
-- 12. notifications
--     Users can only read their own notifications.
--     Users may mark their own notifications as read (UPDATE is_read).
--     Inserts are performed by the backend service role (bypasses RLS).
-- =============================================================================

CREATE POLICY "notifications_select_own"
    ON notifications FOR SELECT
    USING (user_id = yapp_uid() AND deleted_at IS NULL);

CREATE POLICY "notifications_update_own"
    ON notifications FOR UPDATE
    USING (user_id = yapp_uid() AND deleted_at IS NULL);

-- =============================================================================
-- LEADERBOARD VIEW — security_invoker = false (default)
-- The view runs as its owner (postgres / BYPASSRLS), so RLS on the
-- underlying tables is not applied to the view query.  This lets all
-- authenticated users see the full ranking.
-- =============================================================================

DROP VIEW IF EXISTS leaderboard_view;

CREATE VIEW leaderboard_view
    WITH (security_invoker = false)
AS
SELECT
    u.id                                        AS user_id,
    u.name                                      AS name,
    COUNT(s.id)                                 AS total_solved,
    RANK() OVER (ORDER BY COUNT(s.id) DESC)     AS rank
FROM users u
LEFT JOIN submissions s
    ON  s.user_id    = u.id
    AND s.verdict    = 'Accepted'
    AND s.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.name
ORDER BY total_solved DESC;

-- =============================================================================
-- GRANTS
-- Grant the minimum required SELECT/INSERT/UPDATE to the `authenticated`
-- Supabase role.  The service_role (backend) already has full access.
-- =============================================================================

GRANT SELECT ON organisations              TO authenticated;
GRANT SELECT ON users                      TO authenticated;
GRANT UPDATE ON users                      TO authenticated;
GRANT SELECT ON sessions                   TO authenticated;
GRANT SELECT ON problems                   TO authenticated;
GRANT SELECT ON test_cases                 TO authenticated;
GRANT SELECT ON problem_sets               TO authenticated;
GRANT SELECT ON problem_problem_sets       TO authenticated;
GRANT SELECT ON problem_set_enrollments    TO authenticated;
GRANT SELECT, INSERT ON submissions        TO authenticated;
GRANT SELECT ON test_case_results          TO authenticated;
GRANT SELECT ON exam_violations            TO authenticated;
GRANT SELECT, UPDATE ON notifications      TO authenticated;
GRANT SELECT ON leaderboard_view           TO authenticated;

COMMIT;
