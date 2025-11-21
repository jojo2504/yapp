import { useState, useRef } from 'react';
import Editor from "@monaco-editor/react";
import styles from '../../pages/Coding/CodingPage.module.css';

interface Problem {
    id: number;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    description: string;
    examples: Array<{
        input: string;
        output: string;
        explanation?: string;
    }>;
    constraints: string[];
}

// Problème exemple
const mockProblem: Problem = {
    id: 101,
    title: "Two Sum",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    examples: [
        {
            input: "nums = [2,7,11,15], target = 9",
            output: "[0,1]",
            explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
        },
        {
            input: "nums = [3,2,4], target = 6",
            output: "[1,2]"
        }
    ],
    constraints: [
        "2 <= nums.length <= 10⁴",
        "-10⁹ <= nums[i] <= 10⁹",
        "-10⁹ <= target <= 10⁹",
        "Only one valid answer exists."
    ]
};

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function CodeEditorPage() {
    // États pour le code
    const [code, setCode] = useState('// Écrivez votre code ici...\n');
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    // États pour le layout
    const [problemWidth, setProblemWidth] = useState(30); // %
    const [editorHeight, setEditorHeight] = useState(60); // %
    const [chatWidth, setChatWidth] = useState(25); // %

    // États pour les sections maximisées
    const [maximizedSection, setMaximizedSection] = useState<'problem' | 'editor' | 'chat' | 'output' | null>(null);

    // État pour le chat
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: 'Bonjour ! Je suis là pour vous aider avec ce problème. Posez-moi vos questions !', timestamp: new Date() }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    const editorRef = useRef<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Gestion du redimensionnement
    const handleProblemResize = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = problemWidth;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = ((e.clientX - startX) / window.innerWidth) * 100;
            const newWidth = Math.max(20, Math.min(50, startWidth + delta));
            setProblemWidth(newWidth);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleEditorResize = (e: React.MouseEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = editorHeight;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = ((e.clientY - startY) / window.innerHeight) * 100;
            const newHeight = Math.max(30, Math.min(80, startHeight + delta));
            setEditorHeight(newHeight);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleChatResize = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = chatWidth;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = ((startX - e.clientX) / window.innerWidth) * 100;
            const newWidth = Math.max(20, Math.min(40, startWidth + delta));
            setChatWidth(newWidth);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Gestion de l'éditeur
    const handleEditorChange = (value: string | undefined) => {
        setCode(value || '');
    };

    const handleEditorMount = (editor: any) => {
        editorRef.current = editor;
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(false);
        setOutput('');

        try {
            const submission = {
                user_id: 42,
                problem_id: mockProblem.id,
                language: language,
                source_code: code,
            };

            const response = await fetch('http://localhost:8080/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submission)
            });

            if (response.ok) {
                const data = await response.json();
                setOutput(data.output || 'Code exécuté avec succès ✓');
                setError(false);
            } else {
                setOutput('Erreur lors de l\'exécution du code');
                setError(true);
            }
        } catch (error) {
            setOutput('Erreur: ' + (error as Error).message);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setCode('// Écrivez votre code ici...\n');
        setOutput('');
        setError(false);
    };

    // Gestion du chat
    const handleSendMessage = async () => {
        if (!chatInput.trim() || chatLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: chatInput,
            timestamp: new Date()
        };

        setMessages([...messages, userMessage]);
        setChatInput('');
        setChatLoading(true);

        // Simuler une réponse (remplacer par un vrai appel API)
        setTimeout(() => {
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: 'Je comprends votre question. Pour résoudre ce problème, vous pouvez utiliser un dictionnaire pour stocker les valeurs déjà vues...',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setChatLoading(false);
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 1000);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const toggleMaximize = (section: 'problem' | 'editor' | 'chat' | 'output') => {
        setMaximizedSection(maximizedSection === section ? null : section);
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return '#00b8a3';
            case 'Medium': return '#ffc01e';
            case 'Hard': return '#ef4743';
            default: return '#646cff';
        }
    };

    // Vue maximisée
    if (maximizedSection) {
        return (
            <div className={styles.maximizedContainer}>
                <div className={styles.maximizedHeader}>
                    <h3>{maximizedSection.toUpperCase()}</h3>
                    <button
                        className={styles.maximizeBtn}
                        onClick={() => setMaximizedSection(null)}
                    >
                        ✕ Réduire
                    </button>
                </div>
                <div className={styles.maximizedContent}>
                    {maximizedSection === 'problem' && (
                        <ProblemSection problem={mockProblem} getDifficultyColor={getDifficultyColor} />
                    )}
                    {maximizedSection === 'editor' && (
                        <>
                            <div className={styles.editorControls}>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className={styles.languageSelect}
                                >
                                    <option value="javascript">JavaScript</option>
                                    <option value="typescript">TypeScript</option>
                                    <option value="python">Python</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C++</option>
                                    <option value="csharp">C#</option>
                                </select>
                                <button className={styles.runBtn} onClick={handleSubmit} disabled={loading}>
                                    {loading ? '⏳ Exécution...' : '▶ Exécuter'}
                                </button>
                                <button className={styles.clearBtn} onClick={handleClear}>
                                    🗑 Effacer
                                </button>
                            </div>
                            <Editor
                                height="calc(100% - 60px)"
                                language={language}
                                value={code}
                                onChange={handleEditorChange}
                                onMount={handleEditorMount}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: true },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                }}
                            />
                        </>
                    )}
                    {maximizedSection === 'chat' && (
                        <ChatSection
                            messages={messages}
                            chatInput={chatInput}
                            setChatInput={setChatInput}
                            handleKeyPress={handleKeyPress}
                            handleSendMessage={handleSendMessage}
                            chatLoading={chatLoading}
                            chatEndRef={chatEndRef}
                        />
                    )}
                    {maximizedSection === 'output' && (
                        <OutputSection output={output} error={error} />
                    )}
                </div>
            </div>
        );
    }

    // Vue normale avec toutes les sections
    // @ts-ignore
    return (
        <div className={styles.container}>
            {/* Section Problème (Gauche) */}
            <div
                className={styles.problemPanel}
                style={{ width: `${problemWidth}%` }}
            >
                <div className={styles.panelHeader}>
                    <h3>📋 Énoncé du Problème</h3>
                    <button
                        className={styles.maximizeBtn}
                        onClick={() => toggleMaximize('problem')}
                        title="Agrandir"
                    >
                        ⛶
                    </button>
                </div>
                <div className={styles.panelContent}>
                    <ProblemSection problem={mockProblem} getDifficultyColor={getDifficultyColor} />
                </div>
            </div>

            {/* Diviseur redimensionnable (Problème) */}
            <div
                className={styles.resizer}
                onMouseDown={handleProblemResize}
            />

            {/* Section Centrale (Éditeur + Output) */}
            <div className={styles.centerPanel}>
                {/* Éditeur */}
                <div
                    className={styles.editorPanel}
                    style={{ height: `${editorHeight}%` }}
                >
                    <div className={styles.panelHeader}>
                        <div className={styles.editorControls}>
                            <span>💻 Éditeur de Code</span>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className={styles.languageSelect}
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                                <option value="csharp">C#</option>
                            </select>
                        </div>
                        <div className={styles.headerButtons}>
                            <button className={styles.runBtn} onClick={handleSubmit} disabled={loading}>
                                {loading ? '⏳' : '▶'}
                            </button>
                            <button className={styles.clearBtn} onClick={handleClear}>
                                🗑
                            </button>
                            <button
                                className={styles.maximizeBtn}
                                onClick={() => toggleMaximize('editor')}
                            >
                                ⛶
                            </button>
                        </div>
                    </div>
                    <div className={styles.editorContent}>
                        <Editor
                            height="100%"
                            language={language}
                            value={code}
                            onChange={handleEditorChange}
                            onMount={handleEditorMount}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    </div>
                </div>

                {/* Diviseur redimensionnable (Éditeur) */}
                <div
                    className={`${styles.resizer} ${styles.horizontal}`}
                    onMouseDown={handleEditorResize}
                />

                {/* Output */}
                <div className={styles.outputPanel}>
                    <div className={styles.panelHeader}>
                        <h3>📤 Résultat</h3>
                        <button
                            className={styles.maximizeBtn}
                            onClick={() => toggleMaximize('output')}
                        >
                            ⛶
                        </button>
                    </div>
                    <div className={styles.panelContent}>
                        <OutputSection output={output} error={error} />
                    </div>
                </div>
            </div>

            {/* Diviseur redimensionnable (Chat) */}
            <div
                className={styles.resizer}
                onMouseDown={handleChatResize}
            />

            {/* Section Chat (Droite) */}
            <div
                className={styles.chatPanel}
                style={{ width: `${chatWidth}%` }}
            >
                <div className={styles.panelHeader}>
                    <h3>💬 Assistant IA</h3>
                    <button
                        className={styles.maximizeBtn}
                        onClick={() => toggleMaximize('chat')}
                    >
                        ⛶
                    </button>
                </div>
                <div className={styles.panelContent}>
                    <ChatSection
                        messages={messages}
                        chatInput={chatInput}
                        setChatInput={setChatInput}
                        handleKeyPress={handleKeyPress}
                        handleSendMessage={handleSendMessage}
                        chatLoading={chatLoading}
                        chatEndRef={chatEndRef}
                    />
                </div>
            </div>
        </div>
    );
}

// Composant Section Problème
function ProblemSection({ problem, getDifficultyColor }: { problem: Problem, getDifficultyColor: (d: string) => string }) {
    return (
        <div className={styles.problemContent}>
            <div className={styles.problemTitle}>
                <h2>{problem.id}. {problem.title}</h2>
                <span
                    className={styles.difficulty}
                    style={{ backgroundColor: getDifficultyColor(problem.difficulty) }}
                >
                    {problem.difficulty}
                </span>
            </div>

            <div className={styles.section}>
                <h3>Description</h3>
                <p>{problem.description}</p>
            </div>

            <div className={styles.section}>
                <h3>Exemples</h3>
                {problem.examples.map((example, idx) => (
                    <div key={idx} className={styles.example}>
                        <p><strong>Exemple {idx + 1}:</strong></p>
                        <div className={styles.codeBlock}>
                            <div><strong>Input:</strong> {example.input}</div>
                            <div><strong>Output:</strong> {example.output}</div>
                            {example.explanation && (
                                <div><strong>Explication:</strong> {example.explanation}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.section}>
                <h3>Contraintes</h3>
                <ul>
                    {problem.constraints.map((constraint, idx) => (
                        <li key={idx}>{constraint}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// Composant Chat
function ChatSection({ messages, chatInput, setChatInput, handleKeyPress, handleSendMessage, chatLoading, chatEndRef }: any) {
    return (
        <div className={styles.chatContent}>
            <div className={styles.messagesContainer}>
                {messages.map((msg: ChatMessage, idx: number) => (
                    <div
                        key={idx}
                        className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
                    >
                        <div className={styles.messageHeader}>
                            <span className={styles.messageRole}>
                                {msg.role === 'user' ? '👤 Vous' : '🤖 Assistant'}
                            </span>
                            <span className={styles.messageTime}>
                                {msg.timestamp.toLocaleTimeString()}
                            </span>
                        </div>
                        <div className={styles.messageContent}>{msg.content}</div>
                    </div>
                ))}
                {chatLoading && (
                    <div className={`${styles.message} ${styles.assistantMessage}`}>
                        <div className={styles.messageContent}>
                            <span className={styles.typing}>En train d'écrire...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className={styles.chatInput}>
                <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Posez votre question..."
                    rows={3}
                />
                <button onClick={handleSendMessage} disabled={chatLoading || !chatInput.trim()}>
                    Envoyer
                </button>
            </div>
        </div>
    );
}

// Composant Output
function OutputSection({ output, error }: { output: string, error: boolean }) {
    return (
        <div className={styles.outputContent}>
            {output ? (
                <pre className={error ? styles.errorOutput : styles.successOutput}>
                    {output}
                </pre>
            ) : (
                <div className={styles.emptyOutput}>
                    <p>🚀 Exécutez votre code pour voir le résultat ici</p>
                </div>
            )}
        </div>
    );
}