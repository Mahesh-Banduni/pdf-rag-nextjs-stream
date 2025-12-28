// lib/agentCacheHelper.js
const AGENT_CACHE = new Map();

export function setAgent(key, agent) {
  AGENT_CACHE.set(key, agent);
}
export function getAgent(key) {
  return AGENT_CACHE.get(key);
}
export function hasAgent(key) {
  return AGENT_CACHE.has(key);
}
export function deleteAgent(key) {
  return AGENT_CACHE.delete(key);
}
export function listAgents() {
  return Array.from(AGENT_CACHE.keys());
}
