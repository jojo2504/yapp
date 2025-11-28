import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from "@monaco-editor/react";
import styles from './CodingPage.module.css';
import type {
    Problem,
    SubmissionResponse,
    Language,
    Difficulty,
    Verdict
} from '../../types';

// Mock problem for testing
const MOCK_PROBLEM: Problem = {
    id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    title: "Two Sum",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    language: 'Python',
    difficulty: 'easy',
    time_limit_ms: 2000,
    memory_limit_mb: 50,
    author_id: 1,
    points: 10,
    test_cases: [
        {
            id: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            problem_id: 1,
            input: "nums = [2,7,11,15], target = 9",
            expected: "[0,1]",
            hidden: false,
            position: 1
        },
        {
            id: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            problem_id: 1,
            input: "nums = [3,2,4], target = 6",
            expected: "[1,2]",
            hidden: false,
            position: 2
        }
    ]
};

const STARTER_CODE: Record<string, string> = {
    python: "# Écrivez votre solution ici\ndef solution():\n    pass\n",
    javascript: "// Écrivez votre solution ici\nfunction solution() {\n    \n}\n",
    typescript: "// Écrivez votre solution ici\nfunction solution(): void {\n    \n}\n",
    java: "public class Solution {\n    public void solution() {\n        \n    }\n}\n",
    cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n",
    csharp: "using System;\n\npublic class Solution {\n    public void Solve() {\n        \n    }\n}\n",
    go: "package main\n\nfunc main() {\n    \n}\n",
    rust: "fn main() {\n    \n}\n"
};

const LANGUAGE_MAP: Record<Language, string> = {
    'Python': 'python',
    'Rust': 'rust',
    'Csharp': 'csharp',
    'C': 'c',
    'Cpp': 'cpp',
    'Javascript': 'javascript',
    'Typescript': 'typescript',
    'Go': 'go',
    'Java': 'java',
    'Swift': 'swift'
};

// Reverse map for language selection
const REVERSE_LANGUAGE_MAP: Record<string, Language> = {
    'python': 'Python',
    'rust': 'Rust',
    'csharp': 'Csharp',
    'c': 'C',
    'cpp': 'Cpp',
    'javascript': 'Javascript',
    'typescript': 'Typescript',
    'go': 'Go',
    'java': 'Java',
    'swift': 'Swift'
};

interface SubmissionResult extends SubmissionResponse {
    verdict: Verdict;
}

function CodingPage() {
    const {problemId} = useParams<{ problemId?: string }>();
    const navigate = useNavigate();

    // Problem state
    const [problem, setProblem] = useState<Problem | null>(null);
    const [loadingProblem, setLoadingProblem] = useState(true);

    // Editor state
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState<Language>('Python');
    const [monacoLanguage, setMonacoLanguage] = useState('python');
    const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
    const [fontSize, setFontSize] = useState(14);

    // Submission state
    const [output, setOutput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
    const [activeTab, setActiveTab] = useState<'output' | 'testcases'>('output');

    // Layout state
    const [leftPanelWidth, setLeftPanelWidth] = useState(35);
    const [bottomPanelHeight, setBottomPanelHeight] = useState(30);
    useRef<never>(null);
// Fetch problem on mount
    useEffect(() => {
        const fetchProblem = async () => {
            if (!problemId) {
                // Use mock problem if no ID
                setProblem(MOCK_PROBLEM);
                setCode(MOCK_PROBLEM.starter_code || STARTER_CODE['python']);
                setLanguage('Python');
                setMonacoLanguage('python');
                setLoadingProblem(false);
                return;
            }

            try {
                const response = await fetch(`http://localhost:8080/api/problems/${problemId}`);
                if (response.ok) {
                    const data: Problem = await response.json();
                    setProblem(data);

                    const monacoLang = LANGUAGE_MAP[data.language];
                    setMonacoLanguage(monacoLang);
                    setLanguage(data.language);
                    setCode(data.starter_code || STARTER_CODE[monacoLang] || '');
                } else {
                    // Fallback to mock
                    setProblem(MOCK_PROBLEM);
                    setCode(STARTER_CODE['python']);
                    setLanguage('Python');
                    setMonacoLanguage('python');
                }
            } catch (error) {
                console.error('Error fetching problem:', error);
                setProblem(MOCK_PROBLEM);
                setCode(STARTER_CODE['python']);
                setLanguage('Python');
                setMonacoLanguage('python');
            } finally {
                setLoadingProblem(false);
            }
        };

        fetchProblem();
    }, [problemId]);

    // Handle language change
    const handleLanguageChange = (newLanguage: string) => {
        const typedLanguage = REVERSE_LANGUAGE_MAP[newLanguage] as Language;
        setLanguage(typedLanguage);
        setMonacoLanguage(newLanguage);
        setCode(STARTER_CODE[newLanguage] || '');
    };

    // Handle code change
    const handleCodeChange = (value: string | undefined) => {
        setCode(value || '');
    };

    // Submit code
    const handleSubmit = async () => {
        if (!problem) return;

        setSubmitting(true);
        setOutput('');
        setSubmissionResult(null);

        try {
            const token = localStorage.getItem('access_token');
            const submissionPayload = {
                problem_id: problem.id,
                language: language,
                source_code: code
            };

            const response = await fetch('http://localhost:8080/api/submissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && {'Authorization': `Bearer ${token}`})
                },
                body: JSON.stringify(submissionPayload)
            });

            const data: SubmissionResponse = await response.json();

            if (response.ok) {
                setSubmissionResult(data as SubmissionResult);
                setOutput(formatSubmissionResult(data));
                setActiveTab('output');
            } else {
                setOutput(`Erreur: ${(data as any).error || 'Erreur lors de la soumission'}`);
            }
        } catch (error) {
            setOutput(`Erreur de connexion: ${(error as Error).message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Run code (test without submitting)
    const handleRun = async () => {
        if (!problem) return;

        setSubmitting(true);
        setOutput('Exécution en cours...');

        try {
            const submitPayload = {
                problem_id: problem.id,
                language: language,
                source_code: code,
                user_id: 0 // Default user ID when not authenticated
            };

            const response = await fetch('http://localhost:8080/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(submitPayload)
            });

            const data: any = await response.json();

            if (response.ok) {
                setOutput(data.output || 'Code exécuté avec succès ✓');
            } else {
                setOutput(`Erreur: ${data.error || 'Erreur lors de l\'exécution'}`);
            }
        } catch (error) {
            setOutput(`Erreur: ${(error as Error).message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Format submission result
    const formatSubmissionResult = (result: SubmissionResponse): string => {
        let output = `═══════════════════════════════════════\n`;
        output += `  RÉSULTAT: ${getVerdictDisplay(result.verdict)}\n`;
        output += `═══════════════════════════════════════\n\n`;

        if (result.execution_time_ms) {
            output += `⏱️  Temps d'exécution: ${result.execution_time_ms} ms\n`;
        }
        if (result.memory_usage_kb) {
            output += `💾 Mémoire utilisée: ${result.memory_usage_kb} KB\n`;
        }
        if (result.score !== undefined) {
            output += `⭐ Score: ${result.score} points\n`;
        }

        if (result.error_message) {
            output += `\n❌ Erreur:\n${result.error_message}\n`;
        }

        if (result.test_case_results && result.test_case_results.length > 0) {
            output += `\n───────────────────────────────────────\n`;
            output += `  Tests: ${result.test_case_results.filter(t => t.passed).length}/${result.test_case_results.length} passés\n`;
            output += `───────────────────────────────────────\n`;
        }

        return output;
    };

    // Get verdict display
    const getVerdictDisplay = (verdict: Verdict): string => {
        const verdicts: Record<Verdict, string> = {
            'Accepted': '✅ ACCEPTÉ',
            'WrongAnswer': '❌ MAUVAISE RÉPONSE',
            'TimeLimitExceeded': '⏰ TEMPS DÉPASSÉ',
            'MemoryLimitExceeded': '💾 MÉMOIRE DÉPASSÉE',
            'RuntimeError': '💥 ERREUR D\'EXÉCUTION',
            'CompilationError': '🔧 ERREUR DE COMPILATION',
            'Pending': '⏳ EN ATTENTE',
            'Running': '🔄 EN COURS'
        };
        return verdicts[verdict];
    };

    // Get difficulty color
    const getDifficultyColor = (difficulty: Difficulty): string => {
        switch (difficulty) {
            case 'easy':
                return '#00b8a3';
            case 'medium':
                return '#ffc01e';
            case 'hard':
                return '#ef4743';
            default:
                return '#646cff';
        }
    };

    // Get difficulty label
    const getDifficultyLabel = (difficulty: Difficulty): string => {
        switch (difficulty) {
            case 'easy':
                return 'Facile';
            case 'medium':
                return 'Moyen';
            case 'hard':
                return 'Difficile';
            default:
                return difficulty;
        }
    };

    // Handle panel resize
    const handleLeftResize = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = leftPanelWidth;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = ((e.clientX - startX) / window.innerWidth) * 100;
            setLeftPanelWidth(Math.max(20, Math.min(50, startWidth + delta)));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleBottomResize = (e: React.MouseEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = bottomPanelHeight;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = ((startY - e.clientY) / window.innerHeight) * 100;
            setBottomPanelHeight(Math.max(15, Math.min(50, startHeight + delta)));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Reset code
    const handleReset = () => {
        if (problem?.starter_code) {
            setCode(problem.starter_code);
        } else {
            setCode(STARTER_CODE[monacoLanguage] || '');
        }
    };

    if (loadingProblem) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Chargement du problème...</p>
            </div>
        );
    }

    if (!problem) {
        return (
            <div className={styles.errorContainer}>
                <h2>❌ Problème non trouvé</h2>
                <p>Le problème demandé n'existe pas ou a été supprimé.</p>
                <button onClick={() => navigate('/problems')} className={styles.backButton}>
                    ← Retour aux problèmes
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Left Panel - Problem Description */}
            <div className={styles.leftPanel} style={{width: `${leftPanelWidth}%`}}>
                <div className={styles.problemHeader}>
                    <div className={styles.problemTitleRow}>
                        <h1 className={styles.problemTitle}>
                            {problem.id}. {problem.title}
                        </h1>
                        <span
                            className={styles.difficultyBadge}
                            style={{backgroundColor: getDifficultyColor(problem.difficulty)}}
                        >
                            {getDifficultyLabel(problem.difficulty)}
                        </span>
                    </div>
                    <div className={styles.problemMeta}>
                        <span>⏱️ {problem.time_limit_ms}ms</span>
                        <span>💾 {problem.memory_limit_mb}MB</span>
                        <span>⭐ {problem.points} pts</span>
                    </div>
                </div>

                <div className={styles.problemContent}>
                    <section className={styles.section}>
                        <h3>📝 Description</h3>
                        <div className={styles.description}>
                            {problem.description.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </section>

                    {problem.test_cases && problem.test_cases.filter(tc => !tc.hidden).length > 0 && (
                        <section className={styles.section}>
                            <h3>📋 Exemples</h3>
                            {problem.test_cases.filter(tc => !tc.hidden).map((tc, idx) => (
                                <div key={tc.id} className={styles.example}>
                                    <div className={styles.exampleHeader}>Exemple {idx + 1}</div>
                                    <div className={styles.exampleContent}>
                                        <div className={styles.exampleBlock}>
                                            <span className={styles.exampleLabel}>Entrée:</span>
                                            <pre>{tc.input}</pre>
                                        </div>
                                        <div className={styles.exampleBlock}>
                                            <span className={styles.exampleLabel}>Sortie:</span>
                                            <pre>{tc.expected}</pre>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    <section className={styles.section}>
                        <h3>⚠️ Contraintes</h3>
                        <ul className={styles.constraints}>
                            <li>Temps limite: {problem.time_limit_ms} ms</li>
                            <li>Mémoire limite: {problem.memory_limit_mb} MB</li>
                        </ul>
                    </section>
                </div>
            </div>

            {/* Resizer */}
            <div className={styles.resizerVertical} onMouseDown={handleLeftResize}/>

            {/* Right Panel - Editor + Output */}
            <div className={styles.rightPanel}>
                {/* Editor Section */}
                <div className={styles.editorSection} style={{height: `calc(${100 - bottomPanelHeight}% - 4px)`}}>
                    {/* Editor Toolbar */}
                    <div className={styles.editorToolbar}>
                        <div className={styles.toolbarLeft}>
                            <select
                                value={monacoLanguage}
                                onChange={(e) => handleLanguageChange(e.target.value)}
                                className={styles.languageSelect}
                            >
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                                <option value="csharp">C#</option>
                                <option value="go">Go</option>
                                <option value="rust">Rust</option>
                                <option value="c">C</option>
                                <option value="swift">Swift</option>
                            </select>

                            <select
                                value={theme}
                                onChange={(e) => setTheme(e.target.value as 'vs-dark' | 'light')}
                                className={styles.themeSelect}
                            >
                                <option value="vs-dark">🌙 Dark</option>
                                <option value="light">☀️ Light</option>
                            </select>

                            <select
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                className={styles.fontSizeSelect}
                            >
                                <option value="12">12px</option>
                                <option value="14">14px</option>
                                <option value="16">16px</option>
                                <option value="18">18px</option>
                                <option value="20">20px</option>
                            </select>
                        </div>

                        <div className={styles.toolbarRight}>
                            <button
                                onClick={handleReset}
                                className={styles.resetButton}
                                title="Réinitialiser le code"
                            >
                                🔄 Reset
                            </button>
                            <button
                                onClick={handleRun}
                                className={styles.runButton}
                                disabled={submitting}
                            >
                                {submitting ? '⏳' : '▶️'} Exécuter
                            </button>
                            <button
                                onClick={handleSubmit}
                                className={styles.submitButton}
                                disabled={submitting}
                            >
                                {submitting ? '⏳' : '📤'} Soumettre
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className={styles.editorContainer}>
                        <Editor
                            height="100%"
                            language={monacoLanguage}
                            value={code}
                            theme={theme}
                            onChange={handleCodeChange}
                            options={{
                                fontSize: fontSize,
                                minimap: {enabled: true},
                                lineNumbers: 'on',
                                roundedSelection: true,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 4,
                                insertSpaces: true,
                                wordWrap: 'on',
                                folding: true,
                                renderLineHighlight: 'all',
                                cursorBlinking: 'smooth',
                                cursorSmoothCaretAnimation: 'on',
                                smoothScrolling: true,
                                padding: {top: 10, bottom: 10}
                            }}
                        />
                    </div>
                </div>

                {/* Horizontal Resizer */}
                <div className={styles.resizerHorizontal} onMouseDown={handleBottomResize}/>

                {/* Output Section */}
                <div className={styles.outputSection} style={{height: `${bottomPanelHeight}%`}}>
                    {/* Output Tabs */}
                    <div className={styles.outputTabs}>
                        <button
                            className={`${styles.outputTab} ${activeTab === 'output' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('output')}
                        >
                            📤 Sortie
                        </button>
                        <button
                            className={`${styles.outputTab} ${activeTab === 'testcases' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('testcases')}
                        >
                            🧪 Tests ({problem.test_cases?.filter(tc => !tc.hidden).length || 0})
                        </button>
                    </div>

                    {/* Output Content */}
                    <div className={styles.outputContent}>
                        {activeTab === 'output' ? (
                            <pre className={`${styles.outputText} ${
                                submissionResult?.verdict === 'Accepted' ? styles.successOutput :
                                    submissionResult?.verdict ? styles.errorOutput : ''
                            }`}>
                                {output || '🚀 Exécutez votre code pour voir le résultat ici'}
                            </pre>
                        ) : (
                            <div className={styles.testCasesList}>
                                {problem.test_cases?.filter(tc => !tc.hidden).map((tc, idx) => (
                                    <div key={tc.id} className={styles.testCaseItem}>
                                        <div className={styles.testCaseHeader}>
                                            <span>Test {idx + 1}</span>
                                            {submissionResult?.test_case_results && submissionResult.test_case_results[idx] && (
                                                <span className={
                                                    submissionResult.test_case_results[idx].passed
                                                        ? styles.testPassed
                                                        : styles.testFailed
                                                }>
                                                    {submissionResult.test_case_results[idx].passed ? '✅' : '❌'}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.testCaseBody}>
                                            <div>
                                                <strong>Entrée:</strong>
                                                <pre>{tc.input}</pre>
                                            </div>
                                            <div>
                                                <strong>Sortie attendue:</strong>
                                                <pre>{tc.expected}</pre>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CodingPage