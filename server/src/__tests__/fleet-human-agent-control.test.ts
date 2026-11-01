import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { agents, approvals, companies, companyMemberships, createDb, principalPermissionGrants } from "@paperclipai/db";
import { agentRoutes } from "../routes/agents.js";
import { errorHandler } from "../middleware/index.js";
import { startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";

let database: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>;
let db: ReturnType<typeof createDb>;

beforeAll(async () => {
  database = await startEmbeddedPostgresTestDatabase("fleet-human-control-");
  db = createDb(database.connectionString);
}, 90_000);
afterAll(async () => { await database?.cleanup(); });

async function fixture() {
  const companyId = randomUUID();
  const agentId = randomUUID();
  const userId = `operator-${companyId}`;
  await db.insert(companies).values({ id: companyId, name: "Synthetic fleet policy", issuePrefix: `F${companyId.slice(0, 7)}` });
  await db.insert(companyMemberships).values({ companyId, principalType: "user", principalId: userId, membershipRole: "owner", status: "active" });
  await db.insert(agents).values({ id: agentId, companyId, name: "Manager", role: "ceo", adapterType: "process", adapterConfig: { command: "/usr/bin/true" }, permissions: { canCreateAgents: true } });
  for (const principalType of ["agent", "user"] as const) {
    for (const permissionKey of ["agents:create", "agents:configure"] as const) {
      await db.insert(principalPermissionGrants).values({ companyId, principalType, principalId: principalType === "agent" ? agentId : userId, permissionKey });
    }
  }
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.actor = req.header("X-Test-Human") === "yes"
      ? { type: "board", userId, companyIds: [companyId], isInstanceAdmin: true, source: "board_key" }
      : { type: "agent", agentId, companyId, source: "agent_jwt", onBehalfOfUserId: userId,
          onBehalfOfMemberships: [{ companyId, membershipRole: "owner", status: "active" }] };
    next();
  });
  app.use("/api", agentRoutes(db));
  app.use(errorHandler);
  return { app, companyId, agentId };
}

it.each(["agents", "agent-hires"])("denies agent %s even with CEO, agent and responsible-user grants", async (endpoint) => {
  const f = await fixture();
  const response = await request(f.app).post(`/api/companies/${f.companyId}/${endpoint}`)
    .send({ name: "Unauthorized worker", role: "engineer", adapterType: "process", adapterConfig: { command: "/usr/bin/true" } });
  expect(response.status, JSON.stringify(response.body)).toBe(403);
  expect(await db.select().from(agents).where(eq(agents.companyId, f.companyId))).toHaveLength(1);
  expect(await db.select().from(approvals).where(eq(approvals.companyId, f.companyId))).toHaveLength(0);
});

it("denies self-configuration before changing the runtime", async () => {
  const f = await fixture();
  const response = await request(f.app).patch(`/api/agents/${f.agentId}`)
    .send({ adapterConfig: { filesystemScope: null, dangerouslyBypassApprovalsAndSandbox: true } });
  expect(response.status, JSON.stringify(response.body)).toBe(403);
  const [agent] = await db.select().from(agents).where(eq(agents.id, f.agentId));
  expect(agent.adapterConfig).toEqual({ command: "/usr/bin/true" });
});

it("preserves authenticated human configuration", async () => {
  const f = await fixture();
  const response = await request(f.app).patch(`/api/agents/${f.agentId}`).set("X-Test-Human", "yes")
    .send({ name: "Human-configured manager" });
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  expect(response.body.name).toBe("Human-configured manager");
});

it("preserves authenticated human creation", async () => {
  const f = await fixture();
  const response = await request(f.app).post(`/api/companies/${f.companyId}/agents`).set("X-Test-Human", "yes")
    .send({ name: "Human-created worker", role: "engineer", adapterType: "process", adapterConfig: { command: "/usr/bin/true" } });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  expect(await db.select().from(agents).where(eq(agents.companyId, f.companyId))).toHaveLength(2);
});
