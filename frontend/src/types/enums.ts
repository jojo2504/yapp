// Enums (from difficulty.go, language.go)

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Language =
    | 'Python'
    | 'Rust'
    | 'Csharp'
    | 'C'
    | 'Cpp'
    | 'Javascript'
    | 'Typescript'
    | 'Go'
    | 'Java'
    | 'Swift';

export type UserRole = 'Student' | 'Teacher' | 'Admin';

export type Verdict =
    | 'Pending'
    | 'Running'
    | 'Accepted'
    | 'WrongAnswer'
    | 'TimeLimitExceeded'
    | 'MemoryLimitExceeded'
    | 'RuntimeError'
    | 'CompilationError'
    | 'InternalError';
