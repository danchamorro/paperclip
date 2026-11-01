# Fleet fork

This branch preserves the tested fleet changes on upstream release `v2026.1023.0`
(commit `1b4c803816e82b0265c8422e1a804327a7ed8c54`). Upstream remains
`https://github.com/paperclipai/paperclip`; this fork is
`https://github.com/danchamorro/paperclip`.

Current validation limits are recorded in [FLEET-VALIDATION.md](FLEET-VALIDATION.md).
This is a trial branch, not a deployment-ready release.

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

The active trial deployment was patched in its pinned installed runtime. Creating
this source branch does not switch that running service to a source-built release.
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
