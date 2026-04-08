import { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { apiFetch } from '../../services/api';
import styles from './Playground.module.css';

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
`// Write your code here
function main() {
  const input = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
  console.log("Hello from JavaScript!");
}

main();`,

  python:
`# Write your code here
import sys

def main():
    # Read stdin if needed
    # data = sys.stdin.read()
    print("Hello from Python!")

main()`,

  cpp:
`#include <iostream>
using namespace std;

int main() {
    // Write your code here
    cout << "Hello from C++!" << endl;
    return 0;
}`,

  java:
`public class Solution {
    public static void main(String[] args) {
        // Write your code here
        System.out.println("Hello from Java!");
    }
}`,
};

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
        verdict:      string;
        judge_output?: string;
        message?:     string;
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

// ── Component ─────────────────────────────────────────────────────
export default function Playground() {
  const [language, setLanguage] = useState<Language>('python');
  const [stdin,    setStdin]    = useState('');
  const [result,   setResult]   = useState<RunResult>({ status: 'idle' });

  const codeRef = useRef<string>(DEFAULT_CODE.python);

  const handleLangChange = (lang: Language) => {
    setLanguage(lang);
    codeRef.current = DEFAULT_CODE[lang];
    setResult({ status: 'idle' });
  };

  const handleRun = async () => {
    setResult({ status: 'running' });
    try {
      const res = await apiFetch<{ id: number }>('/api/run', {
        method: 'POST',
        body: JSON.stringify({
          code:     codeRef.current,
          language: JUDGE_LANG[language],
          stdin,
        }),
      });

      const polled = await pollSubmission(res.id);
      setResult(polled);
    } catch (e: unknown) {
      setResult({
        status: 'error',
        stderr: e instanceof Error ? e.message : 'Failed to reach server.',
      });
    }
  };

  const isRunning = result.status === 'running';

  // ── Output display ───────────────────────────────────────────────
  let outputContent: React.ReactNode;
  switch (result.status) {
    case 'idle':
      outputContent = <span className={styles.placeholder}>Run your code to see output…</span>;
      break;
    case 'running':
      outputContent = <span className={styles.placeholder}>⏳ Running…</span>;
      break;
    case 'timeout':
      outputContent = (
        <span className={styles.verdictTimeout}>
          ⏱ Timed out — judge did not respond within 20 seconds.
        </span>
      );
      break;
    case 'error':
      outputContent = <span className={styles.verdictError}>{result.stderr}</span>;
      break;
    case 'done': {
      const isError = result.verdict === 'RuntimeError' || result.verdict === 'CompilationError' || result.verdict === 'InternalError';
      const isTLE   = result.verdict === 'TimeLimitExceeded';
      const verdictClass = isError ? styles.verdictError : isTLE ? styles.verdictTimeout : styles.verdictAccepted;

      // For compilation errors the error text is in stderr; for runtime it's both
      const mainOutput = result.stdout || '';
      const errOutput  = result.stderr || '';

      outputContent = (
        <>
          <span className={`${styles.verdictBadge} ${verdictClass}`}>
            {result.verdict === 'Accepted' ? 'OK' : result.verdict}
          </span>
          {mainOutput && <span>{'\n'}{mainOutput}</span>}
          {errOutput  && <span className={styles.verdictError}>{'\n'}{errOutput}</span>}
          {!mainOutput && !errOutput && (
            <span className={styles.placeholder}>{'\n'}(no output)</span>
          )}
        </>
      );
      break;
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Code Playground</h1>
        <p className={styles.subtitle}>Write, run, and test code in your browser</p>
      </div>

      <div className={styles.body}>

        {/* ── Left: Editor ── */}
        <div className={styles.editorPanel}>
          <div className={styles.toolbar}>
            <div className={styles.langTabs}>
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map(lang => (
                <button
                  key={lang}
                  className={`${styles.langBtn} ${language === lang ? styles.langBtnActive : ''}`}
                  onClick={() => handleLangChange(lang)}
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>
            <button
              className={`${styles.runBtn} ${isRunning ? styles.runBtnBusy : ''}`}
              onClick={handleRun}
              disabled={isRunning}
            >
              {isRunning ? '◼ Running…' : '▶ Run'}
            </button>
          </div>

          <div className={styles.editorWrap}>
            <Editor
              key={language}
              height="100%"
              language={MONACO_LANG[language]}
              defaultValue={DEFAULT_CODE[language]}
              theme="vs-dark"
              onChange={v => { codeRef.current = v ?? ''; }}
              options={{
                fontSize:             13,
                fontFamily:           "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                minimap:              { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers:          'on',
                tabSize:              2,
                wordWrap:             'on',
                padding:              { top: 12, bottom: 12 },
              }}
            />
          </div>
        </div>

        {/* ── Right: Stdin + Output ── */}
        <div className={styles.ioPanel}>

          {/* Stdin */}
          <div className={styles.stdinSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Input (stdin)</span>
            </div>
            <textarea
              className={styles.stdinArea}
              value={stdin}
              onChange={e => setStdin(e.target.value)}
              placeholder="Paste input here…"
              spellCheck={false}
            />
          </div>

          {/* Output */}
          <div className={styles.outputSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Output</span>
              {result.status !== 'idle' && (
                <button className={styles.clearBtn} onClick={() => setResult({ status: 'idle' })}>
                  Clear
                </button>
              )}
            </div>
            <pre className={styles.outputArea}>
              {outputContent}
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
}
