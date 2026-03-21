import { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import styles from './CodeEditor.module.css';

// ── Types ─────────────────────────────────────────────────────────
type Language = 'javascript' | 'python' | 'cpp' | 'java';

const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: 'JavaScript',
  python:     'Python',
  cpp:        'C++',
  java:       'Java',
};

// Monaco uses 'cpp' for C++ — all others match directly
const MONACO_LANG: Record<Language, string> = {
  javascript: 'javascript',
  python:     'python',
  cpp:        'cpp',
  java:       'java',
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

// ── Component ─────────────────────────────────────────────────────
interface Props {
  examId:    string;
  studentId: string;
}

export default function CodeEditor({ examId, studentId }: Props) {
  const [language, setLanguage] = useState<Language>('javascript');
  const [output,   setOutput]   = useState<string | null>(null);
  const [running,  setRunning]  = useState(false);

  // Keep latest code without making Monaco a controlled component
  const codeRef = useRef<string>(DEFAULT_CODE.javascript);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    codeRef.current = DEFAULT_CODE[lang];
    setOutput(null);
  };

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const res  = await fetch('/api/exam/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          examId,
          studentId,
          code:     codeRef.current,
          language,
        }),
      });
      const data = await res.json();
      setOutput(
        typeof data.output === 'string'
          ? data.output
          : JSON.stringify(data, null, 2),
      );
    } catch {
      setOutput('Error: failed to reach the code runner.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={styles.container}>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
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

        <button
          className={`${styles.runBtn} ${running ? styles.runBtnBusy : ''}`}
          onClick={handleRun}
          disabled={running}
        >
          {running ? '◼ Running…' : '▶ Run'}
        </button>
      </div>

      {/* ── Monaco editor ── */}
      {/* key={language} remounts the editor on language change, resetting content */}
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
            renderLineHighlight:  'gutter',
            padding:              { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* ── Output panel ── */}
      <div className={styles.outputPanel}>
        <div className={styles.outputHeader}>
          <span className={styles.outputLabel}>Output</span>
          {output !== null && (
            <button className={styles.clearBtn} onClick={() => setOutput(null)}>
              Clear
            </button>
          )}
        </div>
        <pre className={styles.outputContent}>
          {output === null
            ? <span className={styles.outputPlaceholder}>Run your code to see output…</span>
            : output}
        </pre>
      </div>

    </div>
  );
}
