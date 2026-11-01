# Fleet validation — 2026-11-01

Status: **trial source preservation, not PR-ready or release-ready**. The full
upstream test gate is not green on the validation Mac. No source-built package
from this branch has replaced the working Linux acceptance runtime.

Base: upstream `v2026.1023.0`, commit
`1b4c803816e82b0265c8422e1a804327a7ed8c54`. Validation used Node 24.22.1 and
pnpm 9.15.4 on macOS, with focused Linux checks and live acceptance on Linux.

## Passing evidence

- `pnpm -r typecheck` and `pnpm build`; server typecheck repeated after the final
  test-fixture edits.
- `pnpm test:fleet`: the configuration/creation policy regression, all 20
  disposable-database approval checks, and five real HTTP authorization checks.
- The approval regression failed on the unmodified source for combined human
  approval and actionable HTTP error handling, then passed with this patch.
  The configuration regression also failed before the policy patch.
- Five authorization/inheritance suites: 172 tests passed. The separate hire
  idempotency suite passed in the completed serialized lane.
- Source-derived sandbox proxy code survived injected EPIPE on Linux and still
  rejected an unapproved destination. All five merged-/usr wrapper checks passed.
- All 158 serialized server suites completed successfully across the official
  four-way partition and necessary resumed/rerun invocations.
- UI: 723 files / 8,152 tests passed. Database package: 50 files / 193 tests passed.
  CLI, shared packages, adapters and plugin packages completed; environment-related
  failures described below passed on focused reruns without application changes.
- The Codex local adapter suite passed 542 tests, with one existing conditional skip.

The general server suite used the official eight-way partition. The new fleet
HTTP suite was also run explicitly. Existing upstream platform/optional-component
skips remain; no new skip was introduced to hide a failure. This is aggregate
coverage across initial runs and focused reruns, not a claim that one monolithic
`pnpm test:run` invocation exited successfully.

## Two unresolved upstream failures

Both were reproduced in an untouched archive of the exact base revision with a
fresh dependency install. The native recovery comparison used the same runner
binary built from the unchanged Rust source.

1. `server/src/services/native-runtime/native-session-resume.test.ts`:
   “archives a damaged prior epoch before completing guarded same-task replacement
   with real runnerd.” The fixture returned a failed/needs-review result instead
   of the expected successful completion. Both the fork and base failed the same
   assertion. This does not establish its cause or behavior on Linux.
2. `server/src/__tests__/file-resources-git-scan-load.test.ts`:
   “keeps 500 cross-actor/cross-issue requests globally bounded while health stays
   responsive.” Both the fork and base failed to reach the expected single-flight
   join count within the fixture's 15-second timeout on this Mac. The cause remains
   unverified; the assertion and timeout were preserved.

These remain unresolved. Do not describe the branch as fully tested, waive a
required release gate, or promote it based only on the narrower acceptance paths.

## Test-environment corrections and reruns

Personal Git defaults, a global ignore file, and an installed Paperclip CLI
changed upstream fixture behavior. Workspace tests passed with personal Git/CLI
state excluded. Adapter fixtures require `GIT_CONFIG_GLOBAL` to remain unset, so
those cases instead passed with disposable HOME/XDG directories. The CLI doctor
fixture likewise passed with disposable HOME, avoiding an unrelated host managed
installation. User global settings and installed applications were not modified.

A missing Cargo PATH entry in an initial partition was corrected; native Codex
and Dot runner integration suites then passed. A Git snapshot streaming timeout
under the concurrent run passed unchanged on its rerun. A CLI-auth socket failure
passed unchanged on rerun. These initial failures are not being represented as
successful first attempts.

Three upstream hire/inheritance suites explicitly mock only the fixed fleet
admission predicate to keep testing their underlying connection and retry logic.
They are not evidence of permission to hire in this fork. The real policy is
covered by the unmocked HTTP and authorization suites, which deny agent creation
and configuration despite grants while retaining authenticated human access.

## Live acceptance scope

The pinned, patched installed Linux runtime completed a fresh phone approval:
one authenticated human decision recorded both approval records and executed the
stored synthetic transaction once as observed. Baseline rows were unchanged and
one receipt was present. Temporary database infrastructure and credentials were
removed afterward.

A separate restricted Linux coding task completed 34 tests and 31 real Chromium
assertions, retained four screenshots and produced a draft PR for human review.
The coordinator independently repeated the checks in a restricted Linux sandbox.
A browser startup issue was fixed by placing Chromium's XDG configuration/cache
inside its disposable profile, without expanding worker filesystem/network access.

These are bounded acceptance results, not proof of arbitrary crash timing,
subscription refresh, production database mediation or general fleet readiness.
