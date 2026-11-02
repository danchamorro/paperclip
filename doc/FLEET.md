# Fleet fork

This branch preserves the tested fleet changes on upstream release `v2026.1023.0`
(commit `1b4c803816e82b0265c8422e1a804327a7ed8c54`). Upstream remains
`https://github.com/paperclipai/paperclip`; this fork is
`https://github.com/danchamorro/paperclip`.

Start with [FLEET-STATUS.md](FLEET-STATUS.md) for current progress and next steps.
Current validation limits are recorded in [FLEET-VALIDATION.md](FLEET-VALIDATION.md).
This remains a trial branch. The bounded Dell deployment and its remaining
qualification limits are recorded there; it is not a general production release.

## Deliberate differences

- Agents cannot create agents or update agent configuration, including their own.
  Human operator authorization remains unchanged. The configuration route denies
  agent writes before normalization or secret-binding work. This is an
  instance-wide fleet policy, not a new upstream default or a configurable grant.
- A human accepting a task's governed tool action records its linked formal board
  approval in the same transaction as the action/interaction decision. Both carry
  the authenticated human identity. Expired, mismatched, rejected, cancelled and
  revision-requested approvals remain blocked. Other gateway entry points still
  require separate formal approval. The stored signed operation and existing
  execution/reconciliation paths remain authoritative.
- Expected tool-review failures keep their HTTP status and actionable message on
  task routes, instead of becoming generic HTTP 500 errors.
- A disconnected sandbox proxy client cannot crash the controller with an
  unhandled socket error.
- When CLI workers use network allowlisting, their shell environment retains the
  proxy variables injected by the sandbox launcher. Do not save those worker-only
  proxy URLs in agent configuration: the subscription startup probe runs on the
  host, outside that proxy. Existing credential exclusions remain in force.
- Local Codex workspace sandboxes project the controller-resolved Git metadata
  directories read/write and the current run's managed GitHub launcher read-only,
  with its `gh-config` scratch directory writable. The inner Codex sandbox gets
  the same Git roots. Invalid roots and another run's launcher path are rejected.
  Shells retain the scoped GitHub broker token, not arbitrary configured secrets.
  Git metadata is shared repository state; this is not isolation between branches
  at the Git object/ref level. The sibling checkout files remain outside the
  tested workspace boundary.
- `scripts/fleet/paperclip-bwrap-compat.py` is the fail-closed Linux merged-/usr
  wrapper used by the acceptance deployment. It preserves namespace, network and
  workspace restrictions while matching the host's four /usr aliases and avoiding
  duplicate mounts. It requires Bubblewrap at `/usr/bin/bwrap`. Configure the
  worker's `filesystemSandboxCommand` to its installed absolute path; do not use it
  on an unsupported host layout. Keep it outside the worker's writable workspace.

## Verification

Use Node 24.11+ and the pinned pnpm version. No production database is needed.

```sh
pnpm install --frozen-lockfile
pnpm --filter @paperclipai/plugin-sdk build
pnpm test:fleet
# Linux only; uses synthetic network destinations and no upstream connection:
pnpm test:fleet:linux
```

The approval suite uses the existing disposable embedded PostgreSQL helper and
actual task HTTP routes. It covers concurrent decisions, rollback of both approval
records and audit, authenticated human attribution, invalid signatures, expiry,
closed tasks, audience/tenant/context boundaries and legacy entry points. It does
not invoke an external write tool. The proxy suite fault-injects EPIPE in a child
controller and then verifies that the proxy still rejects an unapproved host.

`fleet-human-agent-control.test.ts` exercises the actual HTTP routes with the
fixed fleet policy, including denial despite CEO/agent/responsible-user grants,
unchanged runtime configuration after denial, and retained human creation and
configuration. Upstream credential-inheritance and hire-idempotency suites mock
only this fixed policy predicate so their lower-level inheritance assertions remain useful;
those suites do not establish that an agent may hire in the fleet. Authorization
and default-grant tests exercise the real policy and expect denial.

Keep personal Git defaults and a globally installed `paperclipai` out of the
test environment. Upstream workspace fixtures assume Git's default branch and
CLI discovery behavior; both can otherwise differ from CI. Preserve required
toolchains (including Cargo) in the test PATH. Do not change the user's global
Git configuration or move their installed CLI to accommodate the suite.

Before promoting a build, run the repository's typecheck, test and build gates.
A source change must not be promoted merely because its installed-runtime
predecessor passed. Review upstream tests against the intentional fleet policy;
do not suppress unrelated failures or change tests to conceal a regression.

## Live acceptance and deployment boundary

On 2026-11-01 the private Linux trial verified a single human phone click recording
both approval records and executing one fixed synthetic database transaction.
The independent worker and controller reads observed unchanged baseline rows and
one execution receipt. The disposable database, connector, networks and credentials
were removed afterward; task history retained the evidence. This demonstrates the
observed execution, not exactly-once behavior across every crash or provider.

The current deployment is `2026.1023.0-fleet.94f5ed2.git1`, promoted at
2026-11-02 00:51 UTC. It contains base `94f5ed2` plus the qualified source patch.
The local consolidation commit preserves those source bytes; it does not rebuild
or relabel the deployed package. See [FLEET-VALIDATION.md](FLEET-VALIDATION.md)
for aggregate Linux qualification and two completed coding deliveries.

The initial trial deployment was patched in its pinned installed runtime. On
2026-11-01 the packaged candidate `2026.1023.0-fleet.94f5ed2.proxy1` was promoted
on Dell01 after isolated acceptance. Its package manifest records base commit
`94f5ed2` plus the SHA256 of the uncommitted source patch. The prior runtime,
verified instance snapshot, source bundle and rollback script are retained on Dell.
See the deployment record in `~/.paperclip/local-trial/releases/` on that host.
Do not run source development mode against an existing instance database. Promote
only a verified packaged build with a backup and an explicit rollback path.

Subscription refresh, a production database broker, broad multi-repository
orchestration and production rollout are separate acceptance work.

## Maintenance

Keep this branch anchored to the validated upstream release. Bring newer upstream
releases into a separate candidate branch, reconcile the small source diff, run the
same regressions and repeat a fresh human approval before promotion. Preserve the
upstream license and attribution. Never commit instance configuration, credentials,
authentication files, database dumps or customer task evidence.

## Dell service operation

The user service remains `paperclipai.service`, with the same private Tailscale
URL and instance database. The launcher selects a versioned release beneath
`~/.paperclip/local-trial/releases/`; the previous `runtime/` directory is retained.
Both worker configurations mount the selected release's Paperclip skill and omit
saved HTTP proxy variables. Filesystem and network restrictions remain enabled.

A scoped systemd drop-in uses `KillMode=mixed`: SIGTERM reaches the controller
first so it can drain workers before stopping embedded PostgreSQL. systemd still
kills the full cgroup if the existing 300-second stop timeout expires. The former
control-group setting reproduced a database-shutdown error during the drain; the
corrected shutdown completed without that error.

Anonymous health responses deliberately hide the version. Check public readiness
and build commit, then verify the exact version through the authenticated API.
An initial rollout guard incorrectly required the hidden fields and automatically
restored the old launcher; that failed attempt is retained in the deployment record.

For the earlier `proxy1` candidate, `rollback.py --restore-snapshot` in the release directory stops
the service, preserves post-promotion instance data separately, restores the
verified pre-promotion snapshot and previous launcher, and restarts the service.
It retains the corrected systemd shutdown setting. Run it only as an authorized
rollback after checking for active work; it returns task state to the snapshot.
The earlier archive was extracted and all 3,978 file hashes matched. The later
`git1` promotion separately verified all 4,205 extracted file hashes and retained
the `proxy1` runtime. Its backup is
`~/.paperclip/local-trial/promotion-backups/20261102T005111Z` on Dell. Consult the
matching release record before rollback; do not apply an older snapshot casually.
Neither check is a full disaster-recovery rehearsal on a separate host.
