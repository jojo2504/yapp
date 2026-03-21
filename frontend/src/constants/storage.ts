/** Centralised localStorage key constants. Use these instead of raw strings. */
export const LS = {
  // Auth
  TOKEN:          'token',
  USER:           'user',
  // Admin-preview impersonation
  ORIGINAL_USER:  'originalUser',
  ORIGINAL_TOKEN: 'originalToken',
  // Admin-managed content (persisted for all users to read)
  A_CHALLENGES:   'a_challenges',
  A_COURSES:      'a_courses',
  A_EXAMS:        'a_exams',
  A_GROUPS:       'a_groups',
  // Teacher-managed content (each item carries a teacherId field)
  T_CHALLENGES:   't_challenges',
  T_COURSES:      't_courses',
  T_EXAMS:        't_exams',
  T_GROUPS:       't_groups',
} as const;
