import assert from 'node:assert/strict';
import { authorizationService } from '../../server/src/services/authorization.ts';

const db = new Proxy({}, { get(_target, key) { throw new Error(`Unexpected grant/database lookup: ${String(key)}`); } });
const access = authorizationService(db);
const companyId = '00000000-0000-4000-8000-000000000001';
const agentId = '00000000-0000-4000-8000-000000000002';
for (const action of ['agent_config:update', 'agents:create']) {
  for (const scope of [{}, { requiresChangeGrant: true, consentedChange: true }]) {
    const decision = await access.decide({
      actor: { type: 'agent', agentId, companyId, source: 'agent_key', onBehalfOfUserId: 'operator' }, action,
      resource: action === 'agents:create' ? { type: 'company', companyId } : { type: 'agent', companyId, agentId }, scope,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'deny_policy_restricted');
  }
  const human = await access.decide({
    actor: { type: 'board', userId: 'operator', isInstanceAdmin: true, source: 'board_key' }, action,
    resource: { type: 'company', companyId },
  });
  assert.equal(human.allowed, true, 'existing human administrator authorization must remain available');
}
console.log('PASS: agent configuration/creation denied before grants; consent cannot override; human administrator retains access');
