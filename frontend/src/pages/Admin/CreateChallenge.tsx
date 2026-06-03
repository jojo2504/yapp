import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { apiFetch } from '../../services/api';
import type { Challenge, Difficulty, Category, Language, TestCase } from './ManageChallenges';
import {
  LANGUAGE_LABELS,
  starterTemplate,
  validatorTemplate,
  resolveStarter,
  resolveValidator,
} from './ManageChallenges';
import styles from './CreateChallenge.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const CATEGORIES: Category[] = [
  'Arrays', 'Strings', 'Dynamic Programming', 'Trees',
  'Graphs', 'Math', 'Hash Maps', 'Sorting', 'Binary Search',
  'Linked Lists', 'Stack & Queue',
];

const LANGUAGES: { key: Language; label: string; monacoLang: string }[] = [
  { key: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { key: 'python',     label: 'Python',     monacoLang: 'python'     },
  { key: 'cpp',        label: 'C++',        monacoLang: 'cpp'        },
  { key: 'java',       label: 'Java',       monacoLang: 'java'       },
];

const DEFAULT_LANGUAGE: Language = 'python';

function emptyForm(): Omit<Challenge, 'id'> {
  return {
    title: '',
    description: '',
    difficulty: 'Easy',
    category: 'Arrays',
    language: DEFAULT_LANGUAGE,
    starterCode: starterTemplate(DEFAULT_LANGUAGE),
    testCases: [],
    visibility: 'everyone',
    groupIds: [],
  };
}

interface GroupOption {
  id: string;
  name: string;
  studentCount: number;
}

interface ApiGroup {
  id: number;
  name: string;
  students: string[];
}

// ── API DTO ───────────────────────────────────────────────────────────────────

interface ApiChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  language?: string;
  starter_code?: unknown;
  test_cases: unknown;
  visibility?: string;
  group_ids?: number[];
}

interface ApiTestCase {
  id?: string;
  title?: string;
  hidden?: boolean;
  validator?: unknown;
  validators?: unknown;
}

function normalizeLanguage(raw: unknown): Language {
  if (raw === 'javascript' || raw === 'python' || raw === 'cpp' || raw === 'java') return raw;
  return DEFAULT_LANGUAGE;
}

function fromApi(raw: ApiChallenge): Omit<Challenge, 'id'> {
  const language = normalizeLanguage(raw.language);
  return {
    title: raw.title ?? '',
    description: raw.description ?? '',
    difficulty: (['Easy', 'Medium', 'Hard'].includes(raw.difficulty) ? raw.difficulty : 'Easy') as Difficulty,
    category: (raw.category ?? 'Arrays') as Category,
    language,
    starterCode: resolveStarter(raw.starter_code, language),
    testCases: Array.isArray(raw.test_cases)
      ? (raw.test_cases as ApiTestCase[]).map((tc, i) => ({
          id: tc.id ?? generateId(),
          title: tc.title ?? `Test ${i + 1}`,
          hidden: tc.hidden ?? false,
          validator: resolveValidator(tc.validator, tc.validators, language),
        }))
      : [],
    visibility: raw.visibility === 'groups' ? 'groups' : 'everyone',
    groupIds: (raw.group_ids ?? []).map(String),
  };
}

function toApi(c: Omit<Challenge, 'id'>): object {
  return {
    title: c.title,
    description: c.description,
    difficulty: c.difficulty,
    category: c.category,
    language: c.language,
    starter_code: c.starterCode,
    test_cases: c.testCases.map(tc => ({
      title:     tc.title,
      hidden:    tc.hidden,
      validator: tc.validator,
    })),
    visibility: c.visibility,
    group_ids: c.visibility === 'groups' ? c.groupIds.map(Number) : [],
  };
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateChallenge() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = Boolean(id);

  const listingPath = useMemo(
    () => (location.pathname.startsWith('/admin') ? '/admin/challenges' : '/teacher/challenges'),
    [location.pathname]
  );

  const [form, setForm] = useState<Omit<Challenge, 'id'>>(emptyForm);
  const [loading, setLoading] = useState<boolean>(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // ── Load (edit mode) ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isEditing) return;
    setLoading(true);
    apiFetch<ApiChallenge>(`/api/challenges/${id}`)
      .then(data => setForm(fromApi(data)))
      .catch(e => setError(e.message ?? 'Failed to load challenge.'))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  // ── Load groups (for the access picker) ──────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setGroupsLoading(true);
    apiFetch<ApiGroup[]>('/api/groups')
      .then(data => {
        if (cancelled) return;
        setGroups(data.map(g => ({
          id: String(g.id),
          name: g.name ?? '',
          studentCount: (g.students ?? []).length,
        })));
      })
      .catch(() => { if (!cancelled) setGroups([]); })
      .finally(() => { if (!cancelled) setGroupsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Field helpers ────────────────────────────────────────────────────────────

  function setField<K extends keyof Omit<Challenge, 'id'>>(key: K, value: Omit<Challenge, 'id'>[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleGroup(groupId: string) {
    setForm(prev => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter(g => g !== groupId)
        : [...prev.groupIds, groupId],
    }));
  }

  // Changing language while creating wipes starter + every validator and
  // refills them with the default templates for the new language. Editing an
  // existing challenge's language is intentionally disabled (it would silently
  // break the saved code).
  function changeLanguage(lang: Language) {
    setForm(prev => {
      if (prev.language === lang) return prev;
      // Only reset bodies that still match the *previous* language's defaults,
      // so a teacher who has already written code doesn't lose it.
      const prevStarter = starterTemplate(prev.language);
      const prevValidator = validatorTemplate(prev.language);
      return {
        ...prev,
        language: lang,
        starterCode: prev.starterCode === prevStarter ? starterTemplate(lang) : prev.starterCode,
        testCases: prev.testCases.map(tc => ({
          ...tc,
          validator: tc.validator === prevValidator ? validatorTemplate(lang) : tc.validator,
        })),
      };
    });
  }

  function addTestCase() {
    setForm(prev => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        {
          id: generateId(),
          title: `Test ${prev.testCases.length + 1}`,
          hidden: false,
          validator: validatorTemplate(prev.language),
        },
      ],
    }));
  }

  function updateTc(tcId: string, patch: Partial<TestCase>) {
    setForm(prev => ({
      ...prev,
      testCases: prev.testCases.map(tc => tc.id === tcId ? { ...tc, ...patch } : tc),
    }));
  }

  function removeTestCase(tcId: string) {
    setForm(prev => ({ ...prev, testCases: prev.testCases.filter(tc => tc.id !== tcId) }));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    for (const tc of form.testCases) {
      if (!tc.title.trim()) { setError('Every validator needs a title.'); return; }
    }
    setError('');
    setSaving(true);
    try {
      if (isEditing && id) {
        await apiFetch<ApiChallenge>(`/api/challenges/${id}`, {
          method: 'PUT',
          body: JSON.stringify(toApi(form)),
        });
      } else {
        await apiFetch<ApiChallenge>('/api/challenges', {
          method: 'POST',
          body: JSON.stringify(toApi(form)),
        });
      }
      navigate(listingPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save challenge.');
      setSaving(false);
    }
  }

  const monacoLang = LANGUAGES.find(l => l.key === form.language)!.monacoLang;

  const DIFF_ACTIVE: Record<Difficulty, string> = {
    Easy:   styles.diffBtnActiveEasy,
    Medium: styles.diffBtnActiveMedium,
    Hard:   styles.diffBtnActiveHard,
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>Loading challenge…</div>
      </div>
    );
  }

  return (
    <form className={styles.page} onSubmit={handleSubmit} noValidate>

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(listingPath)}
        >
          <IconBack />
          <span>Back to challenges</span>
        </button>

        <div className={styles.topBarActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => navigate(listingPath)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={saving}
          >
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create challenge'}
          </button>
        </div>
      </div>

      {/* ── Header ── */}
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>{isEditing ? 'Editing challenge' : 'New challenge'}</p>
        <h1 className={styles.heading}>
          {isEditing
            ? form.title.trim() || 'Untitled challenge'
            : 'Create a new challenge'}
        </h1>
        <p className={styles.subheading}>
          Pick the language students must use, then define the problem, the
          starter code, and the validators that decide whether their solution
          is correct.
        </p>
      </header>

      {error && <p className={styles.errorBanner}>{error}</p>}

      {/* ── Section: Basics ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>1. Overview</h2>
          <p className={styles.sectionHint}>What students see at the top of the challenge page.</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ch-title">Title</label>
          <input
            id="ch-title"
            type="text"
            className={styles.input}
            placeholder="e.g. Two Sum"
            value={form.title}
            onChange={e => setField('title', e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ch-desc">Description</label>
          <textarea
            id="ch-desc"
            className={styles.textarea}
            placeholder="Describe the problem, constraints, and expected behaviour…"
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            rows={6}
          />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <span className={styles.label}>Difficulty</span>
            <div className={styles.diffGroup}>
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  type="button"
                  className={`${styles.diffBtn} ${styles[`diffBtn_${d}`]} ${form.difficulty === d ? DIFF_ACTIVE[d] : ''}`}
                  onClick={() => setField('difficulty', d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ch-cat">Category</label>
            <div className={styles.selectWrap}>
              <select
                id="ch-cat"
                className={styles.select}
                value={form.category}
                onChange={e => setField('category', e.target.value as Category)}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Language ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>2. Language</h2>
          <p className={styles.sectionHint}>
            {isEditing
              ? "Locked once a challenge has been created — changing it after the fact would break already-written validators."
              : 'Students will only be able to submit in this language. Changing it now resets the starter code and validators to the new language\'s default templates (anything you\'ve customised is kept).'}
          </p>
        </div>

        <div className={styles.langTabs}>
          {LANGUAGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`${styles.langTab} ${form.language === key ? styles.langTabActive : ''}`}
              onClick={() => !isEditing && changeLanguage(key)}
              disabled={isEditing}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Section: Starter code ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>3. Starter code · {LANGUAGE_LABELS[form.language]}</h2>
          <p className={styles.sectionHint}>
            What the student's editor is pre-filled with. Write the function
            signature the validators will call (e.g. <code>solution</code>).
          </p>
        </div>

        <div className={styles.codeBlock}>
          <div className={styles.editorWrap}>
            <Editor
              key={`starter-${form.language}`}
              height="280px"
              language={monacoLang}
              value={form.starterCode}
              onChange={val => setField('starterCode', val ?? '')}
              theme="vs-dark"
              options={{
                minimap:              { enabled: false },
                fontSize:             13,
                lineNumbers:          'on',
                scrollBeyondLastLine: false,
                wordWrap:             'on',
                padding:              { top: 12, bottom: 12 },
                tabSize:              2,
                automaticLayout:      true,
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Section: Validators ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>4. Validators</h2>
          <p className={styles.sectionHint}>
            Each validator is a complete program in {LANGUAGE_LABELS[form.language]}. It
            picks its own inputs, calls the student's function directly, and
            exits <code>0</code> on success or non-zero on failure. The
            validator is concatenated with the student's source before the
            sandbox compiles and runs it
            {form.language === 'java' && (
              <> — the student's source must be <code>class Solution</code> and the validator must be <code>public class Validator</code> with a <code>main</code></>
            )}
            . Hidden validators run during grading but their title is not shown
            to the student.
          </p>
        </div>

        <button type="button" className={styles.btnAdd} onClick={addTestCase}>
          <IconPlus />
          <span>Add validator</span>
        </button>

        {form.testCases.length === 0 && (
          <p className={styles.emptyHint}>
            No validators yet. Click "Add validator" to create one.
          </p>
        )}

        <div className={styles.testList}>
          {form.testCases.map((tc, i) => (
            <article key={tc.id} className={styles.testCard}>
              <div className={styles.testCardHeader}>
                <span className={styles.testNum}>#{i + 1}</span>

                <input
                  type="text"
                  className={styles.testTitleInput}
                  placeholder="Validator title (e.g. Handles empty array)"
                  value={tc.title}
                  onChange={e => updateTc(tc.id, { title: e.target.value })}
                />

                <button
                  type="button"
                  className={`${styles.btnHidden} ${tc.hidden ? styles.btnHiddenActive : ''}`}
                  onClick={() => updateTc(tc.id, { hidden: !tc.hidden })}
                  title={tc.hidden ? 'Hidden from students' : 'Visible to students'}
                >
                  {tc.hidden ? 'Hidden' : 'Visible'}
                </button>

                <button
                  type="button"
                  className={styles.btnRemove}
                  onClick={() => removeTestCase(tc.id)}
                  aria-label="Remove validator"
                >
                  <IconTrash />
                </button>
              </div>

              <div className={styles.testCardBody}>
                <div className={styles.field}>
                  <span className={styles.testLabel}>
                    Validator program · {LANGUAGE_LABELS[form.language]}
                  </span>
                  <div className={styles.codeBlock}>
                    <div className={styles.editorWrap}>
                      <Editor
                        key={`validator-${tc.id}-${form.language}`}
                        height="260px"
                        language={monacoLang}
                        value={tc.validator}
                        onChange={val => updateTc(tc.id, { validator: val ?? '' })}
                        theme="vs-dark"
                        options={{
                          minimap:              { enabled: false },
                          fontSize:             13,
                          lineNumbers:          'on',
                          scrollBeyondLastLine: false,
                          wordWrap:             'on',
                          padding:              { top: 12, bottom: 12 },
                          tabSize:              2,
                          automaticLayout:      true,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Section: Access ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>5. Access</h2>
          <p className={styles.sectionHint}>
            Choose who can open and submit this challenge. "Everyone" makes it
            available to all students; "Specific groups" limits it to the groups
            you select.
          </p>
        </div>

        <div className={styles.accessToggle}>
          <button
            type="button"
            className={`${styles.accessOption} ${form.visibility === 'everyone' ? styles.accessOptionActive : ''}`}
            onClick={() => setField('visibility', 'everyone')}
          >
            <span className={styles.accessOptionTitle}>Everyone</span>
            <span className={styles.accessOptionDesc}>All students can access</span>
          </button>
          <button
            type="button"
            className={`${styles.accessOption} ${form.visibility === 'groups' ? styles.accessOptionActive : ''}`}
            onClick={() => setField('visibility', 'groups')}
          >
            <span className={styles.accessOptionTitle}>Specific groups</span>
            <span className={styles.accessOptionDesc}>Only selected groups can access</span>
          </button>
        </div>

        {form.visibility === 'groups' && (
          <div className={styles.field}>
            <span className={styles.label}>
              Allowed groups
              {form.groupIds.length > 0 && (
                <span className={styles.labelCount}> · {form.groupIds.length} selected</span>
              )}
            </span>

            {groupsLoading ? (
              <p className={styles.emptyHint}>Loading groups…</p>
            ) : groups.length === 0 ? (
              <p className={styles.emptyHint}>No groups exist yet. Create a group first to restrict access.</p>
            ) : (
              <div className={styles.groupList}>
                {groups.map(group => {
                  const checked = form.groupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`${styles.groupItem} ${checked ? styles.groupItemChecked : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.groupCheckbox}
                        checked={checked}
                        onChange={() => toggleGroup(group.id)}
                      />
                      <span className={styles.groupName}>{group.name}</span>
                      <span className={styles.groupCount}>
                        {group.studentCount} student{group.studentCount !== 1 ? 's' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {form.groupIds.length === 0 && !groupsLoading && groups.length > 0 && (
              <p className={styles.emptyHint}>
                No groups selected — no students will be able to access this challenge until you pick at least one.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Footer (sticky save) ── */}
      <div className={styles.footerBar}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => navigate(listingPath)}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={saving}
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create challenge'}
        </button>
      </div>

    </form>
  );
}
