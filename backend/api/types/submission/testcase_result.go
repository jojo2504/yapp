package submission

type TestCaseResult struct {
    TestCaseID    uint64  `json:"test_case_id"`
    Verdict       Verdict `json:"verdict"`
    ExecutionTime uint32  `json:"execution_time"`
    MemoryKB      uint32  `json:"memory_kb"`
}
