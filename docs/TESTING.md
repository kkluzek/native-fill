# Testing Guide — NativeFill v2.1

**All test specifications are in code. See test files for details.**

## Quick Start

```bash
# Static analysis
bun run check

# All tests
bun run test

# Individual suites
bun run test:unit          # UT-001 to UT-006
bun run test:integration   # IT-001 to IT-006
bun run test:e2e           # TP-001 to TP-012

# Firefox validation
web-ext lint && build
```

## Test Organization

All tests are self-documenting with acceptance criteria in file headers:

- **tests/unit/** — Unit tests (UT-xxx) with ACCEPTANCE C, D criteria
- **tests/integration/** — Integration tests (IT-xxx) with ACCEPTANCE F criteria
- **tests/e2e/** — E2E scenarios (TP-xxx, MAN-xxx, AX-xxx) with ACCEPTANCE A, B, E, G criteria

## Coverage Targets

- Unit: ≥90% line coverage (`src/utils/`)
- E2E: All acceptance criteria A–H validated
- Performance: PF-001 to PF-004 benchmarks
- Security: SEC-001 to SEC-004 audits

## Acceptance Criteria Summary

| ID | Title | Test Files |
|----|-------|------------|
| **A** | Multi-browser | `safari-parity.spec.ts`, `chrome-mv3.test.ts` |
| **B** | UX native-like | `harness.spec.ts`, `accessibility.test.ts` |
| **C** | Data & Storage | `state.test.ts`, `storage-local.test.ts` |
| **D** | Domain Rules | `domain-rules.test.ts`, `harness.spec.ts` |
| **E** | WASM fuzzy | `perf-metrics.test.ts`, `harness.spec.ts` |
| **F** | Security | `security.test.ts`, `fields.test.ts` |
| **G** | Performance | `perf-metrics.test.ts`, `release-builds.test.ts` |
| **H** | Test Coverage | All test suites + web-ext validation |

**For detailed requirements, manual checklists, and step-by-step procedures, see test file headers.**
