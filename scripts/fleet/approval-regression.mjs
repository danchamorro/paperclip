import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const mod = p => {
  if (p.startsWith('@paperclipai/db/dist/')) return import(new URL('../../packages/db/src/'+p.slice('@paperclipai/db/dist/'.length).replace(/\.js$/,'.ts'),import.meta.url));
  if (p.startsWith('@paperclipai/server/dist/')) return import(new URL('../../server/src/'+p.slice('@paperclipai/server/dist/'.length).replace(/\.js$/,'.ts'),import.meta.url));
  return import(require.resolve(p.replace('/index.js','')));
};
const schema = await mod('@paperclipai/db/dist/index.js');
const { createDb, startEmbeddedPostgresTestDatabase, companies, issues, approvals, toolInvocations, toolActionRequests, issueThreadInteractions, activityLog } = schema;
const { eq, and, sql } = await mod('drizzle-orm/index.js');
const { createToolGatewayService, ToolGatewayHttpError } = await mod('@paperclipai/server/dist/services/tool-gateway.js');
const { signToolArguments } = await mod('@paperclipai/server/dist/services/tool-content-guards.js');
const { issueRoutes } = await mod('@paperclipai/server/dist/routes/issues.js');
const { errorHandler } = await mod('@paperclipai/server/dist/middleware/error-handler.js');
const { default: express } = await mod('express/index.js');
const cluster = await startEmbeddedPostgresTestDatabase('paperclip-approval-fix-');
const db = createDb(cluster.connectionString);
const signingSecret = randomUUID();
const gateway = createToolGatewayService(db, { toolActionSigningSecret: signingSecret });
const userId = 'synthetic-reviewer';
let failures = 0;
const companyIds=[];
async function check(name, fn) { try { await fn(); console.log('PASS',name); } catch(e) { failures++; console.error('FAIL',name,e.message); } }
async function fixture(options = {}) {
 const companyId=randomUUID(), issueId=randomUUID(), invocationId=randomUUID(), actionRequestId=randomUUID(), interactionId=randomUUID(), approvalId=randomUUID();
 companyIds.push(companyId);
 const args='{"synthetic":true}'; const hash=createHash('sha256').update(args).digest('hex');
 await db.insert(companies).values({id:companyId,name:'Disposable approval test',issuePrefix:'T'+companyId.slice(0,8)});
 await db.insert(issues).values({id:issueId,companyId,title:'Synthetic request',status:options.closed?'done':'in_review',responsibleUserId:userId});
 await db.insert(toolInvocations).values({id:invocationId,companyId,issueId,toolName:'synthetic.fixed_operation',argumentsHash:hash,approvalState:'pending',status:'pending'});
 await db.insert(approvals).values({id:approvalId,companyId,type:'request_board_approval',status:options.formalStatus??'pending',payload:{source:'tool_gateway',actionRequestId:options.badLink?randomUUID():actionRequestId,invocationId,tool:'synthetic.fixed_operation',argumentsHash:hash}});
 await db.insert(issueThreadInteractions).values({id:interactionId,companyId,issueId,kind:'request_confirmation',status:'pending',effectiveResolverPolicy:'human_only',requestedResolverPolicy:'human_only',addresseeUserId:options.otherUser?'another-user':userId,payload:{version:1,prompt:"Approve the synthetic operation",toolAction:{version:1,actionRequestId,invocationId,toolName:"synthetic.fixed_operation",toolDisplayName:"Synthetic operation",connectionId:randomUUID(),applicationId:randomUUID(),appDisplayName:"Synthetic app",risk:"destructive",previewMarkdown:"One bounded synthetic operation",argumentsSummaryJson:args,argumentsHash:hash,expiresAt:new Date(Date.now()+60000).toISOString()}}});
 await db.insert(toolActionRequests).values({id:actionRequestId,companyId,issueId,interactionId,invocationId,approvalId:options.noFormal?null:approvalId,canonicalArgumentsHash:hash,canonicalArgumentsSummary:{sha256:hash},expiresAt:new Date(Date.now()+(options.expired?-60000:60000)),signedArguments:options.badSignature?'invalid':signToolArguments({invocationId,toolName:'synthetic.fixed_operation',canonicalArguments:args,signingSecret})});
 return {companyId,issueId,interactionId,actionRequestId,approvalId, approveLinkedFormalApproval:true, actor:{userId}};
}
async function row(table,id){return (await db.select().from(table).where(eq(table.id,id)))[0];}
async function assertPending(f) { assert.equal((await row(approvals,f.approvalId)).status,'pending'); assert.equal((await row(toolActionRequests,f.actionRequestId)).status,'pending'); }
let server;
try {
 await check('one human decision approves both records and attributes both',async()=>{
  const f=await fixture(); await gateway.approveActionRequest(f);
  const a=await row(approvals,f.approvalId),r=await row(toolActionRequests,f.actionRequestId);
  assert.equal(a.status,'approved');assert.equal(r.status,'approved');assert.equal(a.decidedByUserId,userId);assert.equal(r.decidedByUserId,userId);
  assert.equal((await row(issueThreadInteractions,f.interactionId)).status,'accepted');
  const events=await db.select().from(activityLog).where(and(eq(activityLog.entityId,f.approvalId),eq(activityLog.action,'approval.approved')));assert.equal(events.length,1);
  await gateway.approveActionRequest(f);
  assert.equal((await db.select().from(activityLog).where(eq(activityLog.entityId,f.approvalId))).length,1,'repeat does not duplicate formal decision');
 });
 await check('transaction failure rolls back both approvals and audit event',async()=>{
  const f=await fixture();
  await db.execute(sql.raw("CREATE FUNCTION fail_synthetic_approval() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status = 'approved' THEN RAISE EXCEPTION 'synthetic transaction failure'; END IF; RETURN NEW; END $$"));
  await db.execute(sql.raw("CREATE TRIGGER fail_synthetic_approval BEFORE UPDATE ON tool_action_requests FOR EACH ROW EXECUTE FUNCTION fail_synthetic_approval()"));
  try {await assert.rejects(gateway.approveActionRequest(f));await assertPending(f);assert.equal((await db.select().from(activityLog).where(eq(activityLog.entityId,f.approvalId))).length,0);}
  finally {await db.execute(sql.raw('DROP TRIGGER fail_synthetic_approval ON tool_action_requests'));await db.execute(sql.raw('DROP FUNCTION fail_synthetic_approval()'));}
 });
 await check('other gateway callers retain formal approval prerequisite',async()=>{const f=await fixture();const legacy={...f};delete legacy.approveLinkedFormalApproval;await assert.rejects(gateway.approveActionRequest(legacy),e=>e.reasonCode==='formal_approval_required');await assertPending(f);});
 await check('anonymous board fallback cannot approve linked formal record',async()=>{const f=await fixture();await assert.rejects(gateway.approveActionRequest({...f,actor:{userId:'board'}}));await assertPending(f);});
 await check('concurrent human decisions record one approval',async()=>{const f=await fixture();await Promise.all([gateway.approveActionRequest(f),gateway.approveActionRequest(f)]);assert.equal((await row(approvals,f.approvalId)).status,'approved');assert.equal((await db.select().from(activityLog).where(eq(activityLog.entityId,f.approvalId))).length,1);});
 for(const [name,options,inputChange] of [
  ['agent denied',{},f=>({...f,actor:{agentId:randomUUID()}})],
  ['expired denied',{expired:true}],['closed task denied',{closed:true}],['wrong addressee denied',{otherUser:true}],['unrelated formal approval denied',{badLink:true}],
  ['cross-company denied',{},f=>({...f,companyId:randomUUID()})],['wrong interaction denied',{},f=>({...f,interactionId:randomUUID()})],
 ]) await check(name,async()=>{const f=await fixture(options);await assert.rejects(gateway.approveActionRequest(inputChange?inputChange(f):f));await assertPending(f);});
 for(const status of ['rejected','cancelled','revision_requested']) await check('formal '+status+' remains blocked',async()=>{const f=await fixture({formalStatus:status});await assert.rejects(gateway.approveActionRequest(f));assert.equal((await row(approvals,f.approvalId)).status,status);assert.equal((await row(toolActionRequests,f.actionRequestId)).status,'pending');});
 await check('invalid signed payload never approves formal record',async()=>{const f=await fixture({badSignature:true});await assert.rejects(gateway.approveActionRequest(f));assert.equal((await row(approvals,f.approvalId)).status,'pending');});
 await check('already approved formal record remains supported',async()=>{const f=await fixture({formalStatus:'approved'});await gateway.approveActionRequest(f);assert.equal((await row(toolActionRequests,f.actionRequestId)).status,'approved');});
 await check('ordinary action without formal approval remains supported',async()=>{const f=await fixture({noFormal:true});await gateway.approveActionRequest(f);assert.equal((await row(toolActionRequests,f.actionRequestId)).status,'approved');});
 const app=express();app.use(express.json());app.use((req,res,next)=>{req.actor={type:'board',userId,isInstanceAdmin:true,source:'board_key',companyIds};next();});
 app.use('/api',issueRoutes(db,{}, {approveToolActionRequest:input=>gateway.approveActionRequest(input)}));app.use(errorHandler);
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const url='http://127.0.0.1:'+server.address().port;
 await check('actual task accept HTTP route completes both approvals',async()=>{const f=await fixture();const r=await fetch(`${url}/api/issues/${f.issueId}/interactions/${f.interactionId}/accept`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const b=await r.json();assert.equal(r.status,200,JSON.stringify(b));assert.equal(b.status,'accepted');assert.equal((await row(approvals,f.approvalId)).status,'approved');});
 await check('actual task accept HTTP route exposes expiry as 409 not 500',async()=>{const f=await fixture({expired:true});const r=await fetch(`${url}/api/issues/${f.issueId}/interactions/${f.interactionId}/accept`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const b=await r.json();assert.equal(r.status,409,JSON.stringify(b));assert.match(b.error,/expired/i);await assertPending(f);});
} finally { if(server) await new Promise(r=>server.close(r)); await cluster.cleanup(); }
console.log(`Regression failures: ${failures}`);process.exit(failures?1:0);
