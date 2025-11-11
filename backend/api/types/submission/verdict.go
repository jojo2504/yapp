package submission

// Verdict represents the result of a submission
type Verdict string

const (
	VerdictPending             Verdict = "Pending"
	VerdictAccepted            Verdict = "Accepted"
	VerdictWrongAnswer         Verdict = "WrongAnswer"
	VerdictTimeLimitExceeded   Verdict = "TimeLimitExceeded"
	VerdictMemoryLimitExceeded Verdict = "MemoryLimitExceeded"
	VerdictRuntimeError        Verdict = "RuntimeError"
	VerdictCompilationError    Verdict = "CompilationError"
	VerdictInternalError       Verdict = "InternalError"
)
