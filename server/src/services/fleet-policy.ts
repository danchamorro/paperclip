/** Fixed fleet policy; no environment, grant or agent-provided override. */
export function requiresHumanAgentControl(actorType: string, action: string): boolean {
  return actorType === "agent" && (action === "agent_config:update" || action === "agents:create");
}
