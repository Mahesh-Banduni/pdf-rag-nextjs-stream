// agents/createAgent.js
import { GeminiAgent } from './GeminiAgent.js';

export function createAgentFromConfig(opts) {
  // For now we only support Gemini
  return new GeminiAgent(opts);
}
