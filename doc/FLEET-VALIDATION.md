# Fleet validation

Updated November 2, 2026. **Current: bounded Linux trial qualified and deployed**
as `2026.1023.0-fleet.94f5ed2.git1`; two coding deliveries completed. This is not
a general production release. See [FLEET-STATUS.md](FLEET-STATUS.md) for the active
milestone and the final section below for current evidence.

## Historical source preservation — November 1

At this stage the full upstream test gate was not green on the validation Mac,
and no source-built package had yet replaced the working Linux acceptance runtime.

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

## Previously unresolved upstream checks

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

These were resolved for the Linux qualification on 2026-11-01:

- The native test was accidentally selecting installed Codex ahead of its PATH
  fixture. Explicitly selecting the synthetic provider made all 50 tests in the
  file pass, with the real runner/database and recovery assertions retained.
- All four git-load tests passed unchanged on Linux. The earlier Mac contention
  failure remains recorded; its exact platform-specific cause was not established.

At the `proxy1` qualification stage, the earlier suite coverage had not been
rerun wholesale on Linux. The later `git1` aggregate qualification below supersedes
that coverage limit, while retaining the Mac failures as historical evidence.

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

## Packaged candidate qualification and promotion, 2026-11-01

Candidate: `2026.1023.0-fleet.94f5ed2.proxy1`, built from `94f5ed2` plus the
recorded uncommitted proxy and test-fixture patch. All 18 package versions and
tarball hashes were checked; staged package output matched the qualified runtime.
The source base is also preserved as a verified Git bundle, with its separate patch.

The full Linux base build passed; the updated Codex adapter was rebuilt on Linux.
All 9 adapter execution tests and 50 native recovery tests passed. Adapter/server
type checks passed on the Mac (the default Node 22 environment emitted an engine
warning); Linux build/tests used the supported host Node version. Installed
approval, agent policy and proxy-disconnect regressions passed again.

The isolated subscription-backed agent automatically resumed a linked retry after
a graceful controller restart. It reused the same receipt and single checkpoint,
passed 34 app tests, lint and 31 Chromium assertions, uploaded four screenshots
and a summary, and entered human review. The coordinator verified all uploaded
bytes against their stored hashes and checked attribution to the resumed run.
The test app's tracked source and sandbox restrictions stayed unchanged.

Harness failures were retained: missing controller JWT signing configuration and
a disabled global scheduler initially prevented a representative authenticated
recovery test. Normal controller recovery was enabled while periodic agent wakes
stayed disabled. Those earlier attempts were not counted as passes.

On the existing Dell instance, the migration files matched exactly (333 files),
so no schema migration was required. Promotion retained the six existing tasks
and a verified stopped-instance backup, including local storage and encryption
key. Both existing agents passed the ChatGPT subscription hello probe after
promotion. The deployed Linux worker then completed DCI-7: authenticated identity
check, 34 tests, lint, 31 browser assertions and five stored artifacts, ending in
human review. Tracked source stayed unchanged. A direct Node HTTP request initially
failed DNS inside the network namespace; the installed curl-based helper used the
configured proxy successfully. No network restriction was widened.

At this stage, GitHub job-to-PR delivery was still unproved. The later trials
below completed that bounded milestone. Token refresh, quota exhaustion, arbitrary
hard-crash/remote-effect reconciliation and production database mediation remain
unproved. Additional roles and connectors remain deferred.


## Git1 qualification and promotion — November 1–2

The qualified source is `94f5ed2e3b590208102826c677d394056215fe06` plus the
preserved adapter/proxy and native-recovery-fixture changes. Before consolidation,
all five modified local source/document files matched the Dell build inputs by
SHA256. Consolidation changes documentation only; the three code/test files retain:

| File | SHA256 |
| --- | --- |
| `packages/adapters/codex-local/src/server/execute.ts` | `b89e8c342b15da1a8186eed75d9055b6f6b63c61105a51751558e589a38c318c` |
| `packages/adapters/codex-local/src/server/execute.test.ts` | `a56298bcbea7c37720b7068c0c287ce53b432135e14b8caa440c2d702111751d` |
| `server/src/services/native-runtime/native-session-resume.test.ts` | `5c31cf1455465527b45c2d030db05c650180fad3a44e118e127da4279d80fe35` |

Repository typecheck and build passed. Linux test qualification used the canonical
suite groups and focused reruns, **not one successful monolithic invocation**:

- General server coverage completed after rerunning three affected files (189
  tests). UI: 723 files / 8,152 tests passed.
- CLI: all original failures passed on sequential, isolated reruns; the original
  group had 522 passes and four failed files.
- Shared: 910 passes; skills catalog: 20; adapter utilities: 1,722 with five skips;
  Claude adapter: 349 with one skip; Codex adapter: 548 covered, including the final
  14-test execution file on Linux.
- All 12 remaining adapter/plugin projects passed. Database: 193 tests covered;
  an affected 15-test file passed alone after an original timeout, unchanged.
- Serialized server: 158 suites, 3,112 passed, zero failed or skipped. Native
  recovery's 50-test file passed with its provider explicitly pinned to the fixture.
- Installed human-approval, agent-control, proxy-disconnect and managed-launcher
  regressions passed. The launcher regression used a synthetic broker and made
  no external GitHub requests; actual GitHub delivery was tested separately below.

Failed attempts remain part of the record. Corrections included missing `lsof`,
Git discovery across filesystem boundaries, restoring build-source Git metadata,
redirecting the canonical runner's hard-coded `/tmp` into private disk storage,
isolated SSH configuration, selecting the existing npm 11 for its expected pack
JSON shape, and projecting the resolver file into a private `/run`. No product
assertions or timeouts were relaxed. A Slack HTTP fixture received unrelated GETs;
it passed twice with private loopback networking, but the sender was not identified.
The exact cause of a database timing difference remains unproved.

**Operational incident:** a CLI install fixture reached the host user service
manager and stopped/disabled idle Paperclip. The original service was restored and
re-enabled. Subsequent checks isolated host services and networking; a disposable
HOME alone had not been sufficient. Retain this incident in release assessments.

Promotion verified that all 333 migration files matched the previous runtime,
so no schema migration was needed. After a clean service/database stop, the
snapshot was extracted and all **4,205 file hashes** matched. The archive SHA256 is
`a4681b7c714db018d2dbd5740b1a58570e330f2f754344eb28b2a6f8f95a9b9b`.
The snapshot lives on Dell at
`~/.paperclip/local-trial/promotion-backups/20261102T005111Z`;
`proxy1` remains available. This proves snapshot byte recovery, not separate-host
service recovery. Authenticated health was rechecked during consolidation:
`git1`, authenticated/private, ready, healthy backups and zero live runs.

## Completed coding deliveries — November 2

- [DCI-8](https://omarchy-dell-01.tailac8040.ts.net:8443/DCI/issues/DCI-8): Undo
  feature; 36 tests, lint/diff checks and 32 Chromium assertions; four screenshots.
  [PR 19](https://github.com/danchamorro/pi-agent-fleet-e2e-21/pull/19) merged at
  `468bdeeb64dbca45cda67ab0fa1ba87dca4a1c75`. This trial required coordinator repairs
  to managed Git access, repository URL matching, CLI discovery and loopback proxy
  routing before it completed.
- [DCI-9](https://omarchy-dell-01.tailac8040.ts.net:8443/DCI/issues/DCI-9): fresh
  completion-progress task; 38 tests, lint/diff checks and 72 Chromium assertions;
  six screenshots. [PR 21](https://github.com/danchamorro/pi-agent-fleet-e2e-21/pull/21)
  merged at `eacb4f2feac6ef8b8f2ff1106bea301700db285f`.
  **No coordinator repairs after dispatch.** Configuration and instructions were
  prepared beforehand; the coordinator reviewed evidence and handled the authorized
  merge. This is not yet Daniel's unassisted task-submission workflow.

Both tasks resumed after Daniel's human-only confirmation, verified the actual
GitHub merge and reached Done. DCI-9 also compared the merged and tested Git trees.
Saved artifact hashes and run attribution were checked. CodeRabbit/GitGuardian
checks passed; Codex review reported no findings. This does not prove automatic
review-bot ingestion, enforced merge permissions or a generic review/fix loop.

The underlying execution logs remain in the Dell trial log directory
`~/.paperclip/fork-trial-94f5ed2/logs/`; the local trial checkpoints and promotion
receipts are indexed from FLEET-STATUS. They are historical records, not current
instructions to rerun promotion or dispatch.
