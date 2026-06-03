import { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { apiFetch } from '../../services/api';
import styles from './CodeEditor.module.css';

// ── Types ─────────────────────────────────────────────────────────
type Language = 'javascript' | 'python' | 'cpp' | 'java';

const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: 'JavaScript',
  python:     'Python',
  cpp:        'C++',
  java:       'Java',
};

const MONACO_LANG: Record<Language, string> = {
  javascript: 'javascript',
  python:     'python',
  cpp:        'cpp',
  java:       'java',
};

// Language values the backend/judge expects
const JUDGE_LANG: Record<Language, string> = {
  javascript: 'Javascript',
  python:     'Python',
  cpp:        'Cpp',
  java:       'Java',
};

const DEFAULT_CODE: Record<Language, string> = {
  javascript:
`// Write your solution here
function solution() {

}

console.log(solution());`,

  python:
`# Write your solution here
def solution():
    pass

print(solution())`,

  cpp:
`#include <iostream>
using namespace std;

int main() {
    // Write your solution here

    return 0;
}`,

  java:
`public class Solution {
    public static void main(String[] args) {
        // Write your solution here
    }
}`,
};

// ── Types ─────────────────────────────────────────────────────────
type RunStatus = 'idle' | 'running' | 'done' | 'error' | 'timeout';

interface RunResult {
  status:   RunStatus;
  verdict?: string;
  stdout?:  string;
  stderr?:  string;
}

// ── Polling helper ─────────────────────────────────────────────────
async function pollSubmission(id: number, timeoutMs = 20_000): Promise<RunResult> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 800));
    try {
      const sub = await apiFetch<{
        verdict:       string;
        judge_output?: string;
        message?:      string;
      }>(`/api/submissions/${id}`);
      if (sub.verdict !== 'Pending') {
        return {
          status:  'done',
          verdict: sub.verdict,
          stdout:  sub.judge_output ?? undefined,
          stderr:  sub.message ?? undefined,
        };
      }
    } catch {
      // network blip — keep polling
    }
  }
  return { status: 'timeout' };
}

interface CodeEditorProps {
  /** Called whenever the language or code changes, so a parent can track state. */
  onStateChange?: (language: string, code: string) => void;
  /**
   * Force the editor to a single language and hide the language selector.
   * Set by challenge pages so students can only solve in the language the
   * challenge creator picked. Without it the editor lets the user pick.
   */
  language?: Language;
  /**
   * Single starter code string to seed the editor with (paired with
   * `language`). When `language` is omitted this prop is ignored and the
   * built-in DEFAULT_CODE templates are used instead.
   */
  starterCode?: string;
}

// ── Component ─────────────────────────────────────────────────────
export default function CodeEditor({ onStateChange, language: lockedLanguage, starterCode }: CodeEditorProps = {}) {
  const isLocked = lockedLanguage !== undefined;

  // Resolve the initial code for a given language. When locked, use the
  // supplied starterCode (falling back to the built-in default); otherwise
  // just use the built-in default for that language.
  const resolveCode = (lang: Language) => {
    if (isLocked && lang === lockedLanguage && typeof starterCode === 'string') {
      return starterCode;
    }
    return DEFAULT_CODE[lang];
  };

  const [language, setLanguage] = useState<Language>(lockedLanguage ?? 'javascript');
  const [result,   setResult]   = useState<RunResult>({ status: 'idle' });
  const [running,  setRunning]  = useState(false);

  const codeRef = useRef<string>(resolveCode(language));

  const handleLanguageChange = (lang: Language) => {
    if (isLocked) return;
    const code = resolveCode(lang);
    setLanguage(lang);
    codeRef.current = code;
    setResult({ status: 'idle' });
    onStateChange?.(lang, code);
  };

  const handleRun = async () => {
    setRunning(true);
    setResult({ status: 'running' });
    try {
      const res = await apiFetch<{ id: number }>('/api/run', {
        method: 'POST',
        body: JSON.stringify({
          code:     codeRef.current,
          language: JUDGE_LANG[language],
        }),
      });
      const polled = await pollSubmission(res.id);
      setResult(polled);
    } catch (e: unknown) {
      setResult({
        status: 'error',
        stderr: e instanceof Error ? e.message : 'Failed to reach server.',
      });
    } finally {
      setRunning(false);
    }
  };

  // ── Output display ────────────────────────────────────────────────
  let outputContent: React.ReactNode;
  switch (result.status) {
    case 'idle':
      outputContent = <span className={styles.outputPlaceholder}>Run your code to see output…</span>;
      break;
    case 'running':
      outputContent = <span className={styles.outputPlaceholder}>⏳ Running…</span>;
      break;
    case 'timeout':
      outputContent = <span className={styles.outputError}>⏱ Timed out — judge did not respond within 20 seconds.</span>;
      break;
    case 'error':
      outputContent = <span className={styles.outputError}>{result.stderr}</span>;
      break;
    case 'done': {
      const isOk = result.verdict === 'Accepted';
      outputContent = (
        <>
          <span className={isOk ? styles.outputOk : styles.outputError}>
            {isOk ? 'OK' : result.verdict}
          </span>
          {result.stdout && <span>{'\n'}{result.stdout}</span>}
          {result.stderr && <span className={styles.outputError}>{'\n'}{result.stderr}</span>}
          {!result.stdout && !result.stderr && (
            <span className={styles.outputPlaceholder}>{'\n'}(no output)</span>
          )}
        </>
      );
      break;
    }
  }

  return (
    <div className={styles.container}>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        {isLocked ? (
          <div className={styles.langSelector}>
            <span className={`${styles.langBtn} ${styles.langBtnActive}`}>
              {LANGUAGE_LABELS[language]}
            </span>
          </div>
        ) : (
          <div className={styles.langSelector}>
            {(Object.keys(LANGUAGE_LABELS) as Language[]).map(lang => (
              <button
                key={lang}
                className={`${styles.langBtn} ${language === lang ? styles.langBtnActive : ''}`}
                onClick={() => handleLanguageChange(lang)}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        )}

        <button
          className={`${styles.runBtn} ${running ? styles.runBtnBusy : ''}`}
          onClick={handleRun}
          disabled={running}
        >
          {running ? '◼ Running…' : '▶ Run'}
        </button>
      </div>

      {/* ── Monaco editor ── */}
      <div className={styles.editorWrap}>
        <Editor
          key={language}
          height="100%"
          language={MONACO_LANG[language]}
          defaultValue={resolveCode(language)}
          theme="vs-dark"
          onChange={v => { codeRef.current = v ?? ''; onStateChange?.(language, v ?? ''); }}
          options={{
            fontSize:             13,
            fontFamily:           "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            minimap:              { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers:          'on',
            tabSize:              2,
            wordWrap:             'on',
            renderLineHighlight:  'gutter',
            padding:              { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* ── Output panel ── */}
      <div className={styles.outputPanel}>
        <div className={styles.outputHeader}>
          <span className={styles.outputLabel}>Output</span>
          {result.status !== 'idle' && (
            <button className={styles.clearBtn} onClick={() => setResult({ status: 'idle' })}>
              Clear
            </button>
          )}
        </div>
        <pre className={styles.outputContent}>
          {outputContent}
        </pre>
      </div>

    </div>
  );
}
