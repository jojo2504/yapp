import { useState, useRef } from 'react';
import Editor from "@monaco-editor/react";
import styles from '../assets/base.module.css';

interface CodeEditorProps {
    defaultLanguage?: string;
    defaultValue?: string;
    onCodeChange?: (code: string) => void;
    onSubmit?: (code: string) => void;
}

export default function CodeEditor({
                                       defaultLanguage = 'python',
                                       defaultValue = '// Écrivez votre code ici...\n',
                                       onCodeChange,
                                       onSubmit
                                   }: CodeEditorProps) {
    const [code, setCode] = useState(defaultValue);
    const [language, setLanguage] = useState(defaultLanguage);
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const editorRef = useRef<any>(null);

    const handleEditorChange = (value: string | undefined) => {
        const newCode = value || '';
        setCode(newCode);
        if (onCodeChange) {
            onCodeChange(newCode);
        }
    };

    const handleEditorMount = (editor: any) => {
        editorRef.current = editor;
        setupAutocomplete(editor, language);
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = e.target.value;
        setLanguage(newLanguage);

        if (editorRef.current) {
            setupAutocomplete(editorRef.current, newLanguage);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(false);
        setOutput('');

        try {
            if (onSubmit) {
                onSubmit(code);
            }

            const submission = {
                user_id: 42,
                problem_id: 101,
                language: language,
                source_code: code,
                verdict: null,
                message: null,
                execution_time: null,
                memory_usage: null,
                judge_output: null,
                test_results: null
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

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '1OOhv',
            background: 'var(--bg-primary)'
        }}>
            {/* Header */}
            <div style={{
                background: 'var(--bg-secondary)',
                borderBottom: '2px solid var(--border-color)',
                padding: 'var(--space-md) var(--space-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h2 className={styles.h2} style={{ marginBottom: 0 }}>
                    <span className={styles.textGradient}>Code Editor</span>
                </h2>

                <div className={`${styles.flex} ${styles['gap-sm']}`} style={{ alignItems: 'center' }}>
                    <label className={styles.label} style={{ marginBottom: 0 }}>
                        Langage:
                    </label>
                    <select
                        value={language}
                        onChange={handleLanguageChange}
                        className={styles.select}
                        style={{
                            minWidth: '150px',
                            padding: '0.5rem 1rem'
                        }}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="csharp">C#</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="json">JSON</option>
                        <option value="sql">SQL</option>
                    </select>
                </div>
            </div>

            {/* Editor */}
            <div style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                margin: 'var(--space-md)'
            }}>
                <Editor
                    height="calc(66.67vh)"
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
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: {
                            other: true,
                            comments: false,
                            strings: false,
                        },
                        suggest: {
                            snippetsPreventQuickSuggestions: false,
                            showMethods: true,
                            showFunctions: true,
                            showConstructors: true,
                            showDeprecated: true,
                            showFields: true,
                            showVariables: true,
                            showClasses: true,
                            showStructs: true,
                            showInterfaces: true,
                            showModules: true,
                            showProperties: true,
                            showEnums: true,
                            showEnumMembers: true,
                            showKeywords: true,
                            showWords: true,
                            showColors: true,
                            showFiles: true,
                            showReferences: true,
                            showFolders: true,
                            showUnits: true,
                            showValues: true,
                            showOperators: true,
                            showConstants: true,
                        },
                        formatOnPaste: true,
                        formatOnType: true,
                        folding: true,
                        wordBasedSuggestions: 'matchingDocuments',
                        acceptSuggestionOnEnter: 'on',
                        acceptSuggestionOnCommitCharacter: true,
                    }}
                />
            </div>

            {/* Controls */}
            <div style={{
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-color)',
                padding: 'var(--space-md) var(--space-lg)',
                display: 'flex',
                gap: 'var(--space-md)',
                alignItems: 'center'
            }}>
                <button
                    className={styles.btnSuccess}
                    onClick={handleSubmit}
                    disabled={loading}
                    title="Ctrl+Entrée"
                >
                    {loading ? (
                        <span className={styles.flex} style={{ alignItems: 'center', gap: '0.5rem' }}>
                            <span className={styles.spinner} style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                            Exécution...
                        </span>
                    ) : (
                        <>▶ Exécuter</>
                    )}
                </button>

                <button
                    className={styles.btnOutline}
                    onClick={handleClear}
                    disabled={loading}
                    title="Effacer le code"
                >
                    🗑 Effacer
                </button>

                <div style={{ marginLeft: 'auto' }} className={styles.textMuted}>
                    <kbd style={{
                        background: 'var(--bg-elevated)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                    }}>
                        Ctrl
                    </kbd>
                    {' + '}
                    <kbd style={{
                        background: 'var(--bg-elevated)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                    }}>
                        Enter
                    </kbd>
                    {' pour exécuter'}
                </div>
            </div>

            {/* Output */}
            {output && (
                <div style={{
                    margin: '0 var(--space-lg) var(--space-lg)',
                }}>
                    <div className={error ? styles.alertError : styles.alertSuccess}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                            marginBottom: 'var(--space-sm)',
                            fontWeight: 'var(--font-semibold)'
                        }}>
                            {error ? '✗ Erreur' : '✓ Résultat'}
                        </div>
                        <pre style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--text-sm)',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            margin: 0,
                            maxHeight: '200px',
                            overflow: 'auto'
                        }} className={styles.customScrollbar}>
{output}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

// 🔧 Fonction pour configurer l'autocomplétion personnalisée
function setupAutocomplete(editor: any, language: string) {
    const monaco = (window as any).monaco;

    if (!monaco) return;

    const existingDisposables = (editor as any).__autocompleteDisposables;
    if (existingDisposables) {
        existingDisposables.forEach((d: any) => d.dispose());
    }

    const disposables: any[] = [];
    const suggestions = getLanguageSuggestions(language);

    const provider = monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            return {
                suggestions: suggestions.map((item: any) => ({
                    label: item.label,
                    kind: item.kind,
                    insertText: item.insertText || item.label,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: item.documentation,
                    detail: item.detail,
                    range: range,
                })),
            };
        },
        triggerCharacters: getTriggerCharacters(language),
    });

    disposables.push(provider);
    (editor as any).__autocompleteDisposables = disposables;
}

// 🎯 Suggestions pour chaque langage
function getLanguageSuggestions(language: string) {
    const monaco = (window as any).monaco;

    const suggestions: Record<string, any[]> = {
        javascript: [
            // Méthodes Array
            { label: 'map', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Transforme chaque élément du tableau', detail: 'array.map(callback)' },
            { label: 'filter', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Filtre les éléments du tableau', detail: 'array.filter(callback)' },
            { label: 'reduce', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Réduit le tableau à une seule valeur', detail: 'array.reduce(callback, initial)' },
            { label: 'forEach', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Exécute une fonction pour chaque élément', detail: 'array.forEach(callback)' },
            { label: 'find', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Trouve le premier élément qui satisfait', detail: 'array.find(callback)' },
            { label: 'some', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Teste si au moins un élément satisfait', detail: 'array.some(callback)' },
            { label: 'every', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Teste si tous les éléments satisfont', detail: 'array.every(callback)' },
            { label: 'includes', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Teste si le tableau contient un élément', detail: 'array.includes(element)' },
            { label: 'indexOf', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Retourne l\'index de l\'élément', detail: 'array.indexOf(element)' },
            { label: 'slice', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Extrait une partie du tableau', detail: 'array.slice(start, end)' },

            // Méthodes String
            { label: 'toUpperCase', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Convertit en majuscules', detail: 'string.toUpperCase()' },
            { label: 'toLowerCase', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Convertit en minuscules', detail: 'string.toLowerCase()' },
            { label: 'trim', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Supprime les espaces', detail: 'string.trim()' },
            { label: 'split', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Divise la chaîne', detail: 'string.split(separator)' },
            { label: 'replace', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Remplace une partie', detail: 'string.replace(search, replace)' },
            { label: 'substring', kind: monaco?.languages?.CompletionItemKind?.Method, documentation: 'Extrait une sous-chaîne', detail: 'string.substring(start, end)' },

            // Mots-clés
            { label: 'const', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Déclare une constante' },
            { label: 'let', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Déclare une variable (scope bloc)' },
            { label: 'function', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Déclare une fonction' },
            { label: 'async', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Fonction asynchrone' },
            { label: 'await', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Attend une promesse' },
            { label: 'return', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Retourne une valeur' },

            // Objets globaux
            { label: 'console', kind: monaco?.languages?.CompletionItemKind?.Variable, documentation: 'Objet console' },
            { label: 'Math', kind: monaco?.languages?.CompletionItemKind?.Variable, documentation: 'Objet Math' },
            { label: 'JSON', kind: monaco?.languages?.CompletionItemKind?.Variable, documentation: 'Objet JSON' },
            { label: 'Promise', kind: monaco?.languages?.CompletionItemKind?.Variable, documentation: 'Objet Promise' },
        ],

        python: [
            { label: 'print', kind: monaco?.languages?.CompletionItemKind?.Function, documentation: 'Affiche du texte', detail: 'print(value)' },
            { label: 'len', kind: monaco?.languages?.CompletionItemKind?.Function, documentation: 'Retourne la longueur', detail: 'len(object)' },
            { label: 'range', kind: monaco?.languages?.CompletionItemKind?.Function, documentation: 'Génère une séquence', detail: 'range(start, stop, step)' },
            { label: 'str', kind: monaco?.languages?.CompletionItemKind?.Function, documentation: 'Convertit en chaîne', detail: 'str(value)' },
            { label: 'int', kind: monaco?.languages?.CompletionItemKind?.Function, documentation: 'Convertit en entier', detail: 'int(value)' },
            { label: 'def', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Définit une fonction' },
            { label: 'class', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Définit une classe' },
            { label: 'import', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Importe un module' },
        ],

        typescript: [
            { label: 'interface', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Définit une interface' },
            { label: 'type', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Définit un type' },
            { label: 'enum', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Définit une énumération' },
            { label: 'class', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Définit une classe' },
            { label: 'public', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Modificateur public' },
            { label: 'private', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Modificateur private' },
        ],

        sql: [
            { label: 'SELECT', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Sélectionne des données' },
            { label: 'FROM', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Spécifie la table' },
            { label: 'WHERE', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Filtre les résultats' },
            { label: 'INSERT', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Insère des données' },
            { label: 'UPDATE', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Met à jour des données' },
            { label: 'DELETE', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Supprime des données' },
        ],

        html: [
            { label: 'div', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Conteneur div' },
            { label: 'p', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Paragraphe' },
            { label: 'a', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Lien hypertexte' },
            { label: 'button', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Bouton' },
            { label: 'input', kind: monaco?.languages?.CompletionItemKind?.Keyword, documentation: 'Champ de saisie' },
        ],

        css: [
            { label: 'display', kind: monaco?.languages?.CompletionItemKind?.Property, documentation: 'Propriété display' },
            { label: 'color', kind: monaco?.languages?.CompletionItemKind?.Property, documentation: 'Couleur du texte' },
            { label: 'background', kind: monaco?.languages?.CompletionItemKind?.Property, documentation: 'Couleur de fond' },
            { label: 'padding', kind: monaco?.languages?.CompletionItemKind?.Property, documentation: 'Remplissage interne' },
            { label: 'margin', kind: monaco?.languages?.CompletionItemKind?.Property, documentation: 'Marge externe' },
        ],
    };

    return suggestions[language] || suggestions.javascript;
}

// 🎯 Caractères de déclenchement pour chaque langage
function getTriggerCharacters(language: string): string[] {
    const triggers: Record<string, string[]> = {
        javascript: ['.', ' ', '('],
        typescript: ['.', ' ', '(', ':'],
        python: ['.', ' ', '('],
        sql: [' '],
        html: [' ', '<'],
        css: [':'],
    };

    return triggers[language] || ['.', ' ', '('];
}