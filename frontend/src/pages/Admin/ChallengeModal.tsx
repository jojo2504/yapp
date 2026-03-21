import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import type { Challenge, Difficulty, Category, Language } from './ManageChallenges';
import styles from './ChallengeModal.module.css';

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

const EMPTY_FORM: Omit<Challenge, 'id'> = {
  title: '',
  description: '',
  difficulty: 'Easy',
  category: 'Arrays',
  starterCode: {
    javascript: 'function solution() {\n  // Your code here\n}',
    python:     'def solution():\n    # Your code here\n    pass',
    cpp:        '#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solution() {\n    // Your code here\n}',
    java:       'class Solution {\n    public void solution() {\n        // Your code here\n    }\n}',
  },
  testCases: [],
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initial: Challenge | null;
  onClose: () => void;
  onSave: (data: Omit<Challenge, 'id'>) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChallengeModal({ initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<Omit<Challenge, 'id'>>(
    initial
      ? { title: initial.title, description: initial.description, difficulty: initial.difficulty, category: initial.category, starterCode: { ...initial.starterCode }, testCases: [...initial.testCases] }
      : EMPTY_FORM
  );
  const [activeLang, setActiveLang] = useState<Language>('javascript');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [handleEsc]);

  // ── Field helpers ────────────────────────────────────────────────────────────

  function setField<K extends keyof Omit<Challenge, 'id'>>(key: K, value: Omit<Challenge, 'id'>[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function setCode(lang: Language, code: string) {
    setForm(prev => ({ ...prev, starterCode: { ...prev.starterCode, [lang]: code } }));
  }

  function addTestCase() {
    setForm(prev => ({
      ...prev,
      testCases: [...prev.testCases, { id: generateId(), input: '', output: '' }],
    }));
  }

  function updateTestCase(id: string, field: 'input' | 'output', value: string) {
    setForm(prev => ({
      ...prev,
      testCases: prev.testCases.map(tc => tc.id === id ? { ...tc, [field]: value } : tc),
    }));
  }

  function removeTestCase(id: string) {
    setForm(prev => ({ ...prev, testCases: prev.testCases.filter(tc => tc.id !== id) }));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const url    = initial ? `/api/challenges/${initial.id}` : '/api/challenges';
      const method = initial ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { ...form, id: initial.id } : form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save challenge.');
      }
    } catch {
      // No real API yet — fall through to optimistic local update.
    } finally {
      setLoading(false);
      onSave(form);
    }
  }

  const isEditing = Boolean(initial);
  const activeLangMeta = LANGUAGES.find(l => l.key === activeLang)!;

  const DIFF_ACTIVE: Record<Difficulty, string> = {
    Easy:   styles.diffBtnActiveEasy,
    Medium: styles.diffBtnActiveMedium,
    Hard:   styles.diffBtnActiveHard,
  };

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">

        {/* ── Modal header ── */}
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>{isEditing ? 'Editing challenge' : 'New challenge'}</p>
            <h2 className={styles.modalTitle}>{isEditing ? 'Edit Challenge' : 'Create Challenge'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <IconX />
          </button>
        </div>

        {/* ── Modal body (scrollable) ── */}
        <form id="challenge-form" className={styles.modalBody} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.errorBanner}>{error}</p>}

          {/* Title */}
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

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ch-desc">Description</label>
            <textarea
              id="ch-desc"
              className={styles.textarea}
              placeholder="Describe the problem, constraints, and expected behaviour…"
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              rows={5}
            />
          </div>

          {/* Difficulty + Category */}
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

          {/* Starter Code */}
          <div className={styles.field}>
            <span className={styles.label}>Starter Code</span>
            <div className={styles.codeBlock}>
              <div className={styles.langTabs}>
                {LANGUAGES.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.langTab} ${activeLang === key ? styles.langTabActive : ''}`}
                    onClick={() => setActiveLang(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={styles.editorWrap}>
                {/* Render one editor at a time; key forces remount on lang change
                    so Monaco reliably picks up the right language grammar. */}
                <Editor
                  key={activeLang}
                  height="260px"
                  language={activeLangMeta.monacoLang}
                  value={form.starterCode[activeLang]}
                  onChange={val => setCode(activeLang, val ?? '')}
                  theme="vs-dark"
                  options={{
                    minimap:             { enabled: false },
                    fontSize:            13,
                    lineNumbers:         'on',
                    scrollBeyondLastLine: false,
                    wordWrap:            'on',
                    padding:             { top: 12, bottom: 12 },
                    tabSize:             2,
                    automaticLayout:     true,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Test Cases */}
          <div className={styles.field}>
            <div className={styles.testHeader}>
              <span className={styles.label}>Test Cases</span>
              <button type="button" className={styles.btnAddCase} onClick={addTestCase}>
                + Add test case
              </button>
            </div>

            {form.testCases.length === 0 && (
              <p className={styles.emptyHint}>No test cases yet. Click "+ Add test case" to add one.</p>
            )}

            <div className={styles.testList}>
              {form.testCases.map((tc, i) => (
                <div key={tc.id} className={styles.testCase}>
                  <span className={styles.testNum}>#{i + 1}</span>
                  <div className={styles.testFields}>
                    <div className={styles.testField}>
                      <span className={styles.testLabel}>Input</span>
                      <textarea
                        className={styles.testInput}
                        placeholder={'e.g. [2,7,11,15]\n9'}
                        value={tc.input}
                        onChange={e => updateTestCase(tc.id, 'input', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className={styles.testField}>
                      <span className={styles.testLabel}>Expected Output</span>
                      <textarea
                        className={styles.testInput}
                        placeholder={'e.g. [0,1]'}
                        value={tc.output}
                        onChange={e => updateTestCase(tc.id, 'output', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.btnRemoveCase}
                    onClick={() => removeTestCase(tc.id)}
                    aria-label="Remove test case"
                  >
                    <IconX />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* ── Modal footer ── */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="challenge-form"
            className={styles.btnSave}
            disabled={loading}
          >
            {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Challenge'}
          </button>
        </div>

      </div>
    </div>
  );
}
