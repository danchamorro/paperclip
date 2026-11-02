# Paperclip fleet — current state and next steps

Last updated: November 2, 2026, America/New_York.

This is the starting point for Daniel and the coordinating agent. It describes our fleet project, not all features available in upstream Paperclip. Update the current sections in place as work advances. Trial logs preserve the detailed history; their old pending steps are not the current backlog.

## What we are building

Daniel assigns work in Paperclip. An agent implements the task in its own workspace, verifies the result, and returns a pull request with evidence. Daniel controls the merge. After human confirmation, the agent verifies the merge and closes the task.

The eventual vision is a fleet with specialized agents and selected integrations. The current milestone is one coding agent that Daniel can use directly through Paperclip, with repeatable setup and a clear human handoff.

Paperclip owns task state, scheduling, approvals and recovery. We accepted its native flow. We are maintaining focused changes to a pinned Paperclip fork, not building a second orchestration engine.

## Current position

- **The bounded coding workflow has completed twice.** Both PRs are merged and both Paperclip tasks are Done.
- **The second coding run needed no coordinator repairs after dispatch.** Its configuration was prepared beforehand using the settings proved in the first trial.
- **The service is healthy and idle.** Authenticated API checked November 2: private deployment on Dell01, version `2026.1023.0-fleet.94f5ed2.git1`, zero active agent runs. This is a dated snapshot, not a continuous health guarantee.
- **Next milestone: make task creation reusable. The working source and technical records have been consolidated for local preservation.** We have not yet proved that Daniel can submit an ordinary task directly in Paperclip without coordinator preparation.
- No new coding task is currently dispatched.

## What exists

| Part | Current capability | Boundary |
| --- | --- | --- |
| Paperclip | Authenticated Linux service on Dell01, private access over Tailscale, usable from a phone | Pinned trial deployment with focused fork changes |
| Coding worker | Linux Test Engineer using ChatGPT subscription sign-in | One worker exercised; refresh and quota exhaustion need separate acceptance |
| Task workspace | Native separate Git worktree, filesystem restrictions and network allowlist | Isolation exercised on synthetic tasks; broader containment is not claimed |
| GitHub access | Managed connection to `danchamorro/pi-agent-fleet-e2e-21` | Throwaway repository only |
| Verification | Unit tests, lint, diff checks, actual Chromium assertions and screenshots | Synthetic checklist app; not a general verification recipe for every app |
| Human handoff | Draft PR, saved human-only confirmation, provider merge verification and task closure | Coordinator handled GitHub review/merge after Daniel's authorization |
| Approvals | Phone confirmation and one bounded synthetic database operation tested | Temporary database test infrastructure was removed; no production database broker |
| Recovery and operations | Bounded restart exercise, backups, verified snapshot extraction and rollback preparation | Not arbitrary crash recovery or a separate-host disaster recovery rehearsal |

The worker is instructed never to merge. Its GitHub permissions in the throwaway repository are broader than that instruction; do not describe human-only merging as an enforced GitHub permission restriction.

## Accomplishments and evidence

| Milestone | Observed result | Evidence |
| --- | --- | --- |
| Initial Linux/browser and recovery trials | Browser execution and a bounded continuation after restart completed | Paperclip DCI-1 and DCI-2 |
| Human controls and database approval trial | Human approval handling, phone use and a fixed synthetic database operation completed; agent configuration changes denied in the tested paths | Paperclip DCI-4 and DCI-5; fork validation records |
| Packaged runtime qualification | Patched runtime promoted with backup/restore verification; browser evidence retained | Paperclip DCI-7; deployed `git1` release records |
| First coding delivery: Undo | 36 tests and 32 Chromium assertions passed; four screenshots; PR merged; human confirmation resumed native task closure | [DCI-8](https://omarchy-dell-01.tailac8040.ts.net:8443/DCI/issues/DCI-8), [PR #19](https://github.com/danchamorro/pi-agent-fleet-e2e-21/pull/19) |
| Fresh repeat: completion progress | 38 tests and 72 Chromium assertions passed; six screenshots; zero coordinator repairs after dispatch; PR merged and native task closure completed | [DCI-9](https://omarchy-dell-01.tailac8040.ts.net:8443/DCI/issues/DCI-9), [PR #21](https://github.com/danchamorro/pi-agent-fleet-e2e-21/pull/21) |

PR #19 merged at `468bdeeb64dbca45cda67ab0fa1ba87dca4a1c75`. PR #21 merged at `eacb4f2feac6ef8b8f2ff1106bea301700db285f`. DCI-9's closure run verified that merged main's Git tree matched the tested task tree.

The coordinator inspected the diffs and representative screenshots and verified saved artifact hashes and run attribution. CodeRabbit and GitGuardian checks passed before the respective merges; Codex code review reported no findings. This does not establish a Paperclip-managed review-and-fix loop.

The first coding trial needed repairs to sandbox access for Git metadata and managed GitHub launchers, repository URL matching, the installed GitHub CLI path, and local browser/app proxy routing. The second reused the corrected setup without further repairs.

Repository validation covered the full test set through completed groups and targeted reruns. No single monolithic full-suite invocation passed. Original failed attempts and environment corrections remain recorded; assertions were not weakened. Typecheck and build passed. One CLI fixture accidentally stopped the idle service through the host service manager; the service was restored, and subsequent tests isolated that access. Do not erase that limitation from future release reports.

## What still depends on the coordinator

The coordinator currently prepares each task's instructions and configuration, checks evidence, follows GitHub reviews and performs Daniel-authorized merges. Daniel completes the human-only Paperclip confirmation himself. The final confirmation resumes the worker, which checks the actual GitHub result before marking the task Done.

Our next improvement should reduce the task-preparation dependency. A successful prepared trial is not yet a self-service workflow.

## Agreed next steps

1. **Consolidate the foundation — complete.** Reviewed the existing patch against the qualified build hashes, reconciled the technical docs, and moved this canonical document into the fork. Preserved locally on `fleet/2026.1023-hardening` in the commit containing this update. No fork push, deployment or restart is part of consolidation.
2. **Make project setup reusable.** Use the settings that worked for DCI-8/DCI-9 to prepare a standard project/agent setup. Retain the same subscription, workspace, evidence and human-control boundaries. Success means a new task does not require coordinator-authored per-task configuration.
3. **Test Daniel's direct workflow.** Daniel submits one small task through Paperclip. The agent returns its verified PR through the same handoff. Observe and record any intervention instead of silently repairing the trial.
4. **Then select one real-repository trial.** Choose a small, low-risk change and explicitly establish repository access and scope. No production repository or deployment is authorized by this document.

Current active focus: step 2, reusable project/agent setup. Steps 2–4 are the agreed direction, not evidence of completed work. Keep each implementation step bounded and review its result before expanding.

## Deferred work and known limits

- Additional agent roles and multi-agent coordination.
- Slack, Jira, Sentry and automatic intake.
- A Paperclip-managed loop that ingests review findings and fixes them.
- Production database approvals, disposable database lifecycle and cleanup.
- Subscription refresh and quota-exhaustion behavior.
- Recovery and reconciliation after uncertain external writes, PR creation or other arbitrary crashes.
- Cloud workers, broad multi-repository use and production rollout.
- Cleanup/retention automation and capability-enforced human-only merging.

Older trial tasks remain visible: DCI-3 is blocked and DCI-6 is in review. They were not silently closed or deleted. Consolidation rechecked both states. Keep them as historical unfinished trial records pending an explicit close/archive decision; DCI-3's later approval evidence is in DCI-4/DCI-5 and DCI-6's later delivery evidence is in DCI-8/DCI-9. Neither is an active dispatched task; do not claim that their original acceptance was completed or modify PR17 as housekeeping.

## Question parking lot

Daniel has more questions to discuss. Their details have not been supplied yet; do not invent questions on his behalf.

| Question | Why it matters | When to discuss | Decision |
| --- | --- | --- | --- |
| No questions recorded yet | — | — | — |

When a question arises, record it here and give a brief answer if useful. A question alone does not change the active milestone or authorize implementation. If it affects the current work, explain the dependency and let Daniel choose whether to address it now. Otherwise return to the active milestone.

## Keeping this document useful

- Update current status, accomplishments, limitations and the next step after each meaningful milestone or decision.
- Replace obsolete current-state wording; keep a short dated change log rather than appending conflicting status summaries.
- Link evidence and distinguish executed checks from recommendations and untested behavior.
- Record scope changes explicitly. Keep credentials, authentication links, private tokens and customer data out of this document.
- Read this document at resumption, then verify live state before actions involving deployment, task dispatch, publication or merge.

## Next setup assessment

The source already supports project-level `executionWorkspacePolicy` (isolated
mode, Git worktree strategy, base ref and branch template) and agent adapter
configuration. The trials supplied several settings through per-issue overrides.
Start by reusing these existing surfaces; no additional scheduler is proposed.

The next bounded change should:

1. Capture the existing agent/project values for rollback. Preserve old trial
   worktrees and PR17 while selecting a clean project checkout of the same repo.
2. Put the proven CLI path, subscription-only configuration, restricted filesystem
   mounts, network destinations and reusable instructions in the coding agent's
   default settings. Remove task IDs and task-specific permissions from the shared
   instructions. Keep publication limited to the authorized throwaway repository.
3. Put the worktree/base-ref/branch defaults in the project's native policy and
   check the instance feature gate. Keep tests/browser loopback proxy handling in
   the reusable verification instructions.
4. Have Daniel create one ordinary task through Paperclip without coordinator-made
   issue overrides. Pass only if the correct workspace and managed identity are
   selected, tests and browser evidence pass, a draft PR is returned, and the human
   confirmation/merge-verification flow completes. Record any intervention.

This is a source-informed assessment, not a tested configuration change. The next
step will change agent/project runtime settings; it does not require another
Paperclip source patch on the evidence currently available.

## Detailed records

- [Fork behavior and operations](FLEET.md)
- [Qualification, provenance and acceptance evidence](FLEET-VALIDATION.md)
- Live task and PR links in the milestone table above.
- Local historical records: conversation workspace
  `/Users/danielchamorro/.t3/scratch/2026-10-31-hello-fce16caf`, under
  `artifacts/paperclip-github-trial/` (README, checkpoint and promotion receipts)
  and `artifacts/paperclip-repeat-trial/` (task, result and artifact manifest).
  These are local evidence files, not portable repository dependencies. Old pending
  fields in those records are historical. This document is authoritative for the
  current milestone.

## Change log

- **2026-11-02:** Established this single current-state document at Daniel's request. Confirmed healthy private `git1` service, no active runs, and DCI-8/DCI-9 Done. Captured the two completed delivery trials, remaining limitations, next agreed milestone and question-parking process. No new task, runtime change, commit or publication performed.

- **2026-11-02, consolidation:** Moved the canonical status into the maintained fork; refreshed live health/task states; matched code/test hashes to the qualified build; reconciled technical records and recorded the bounded reusable-setup assessment. Preserved the existing code unchanged.
