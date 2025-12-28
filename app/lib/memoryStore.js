// lib/memoryStore.js
export class MemoryStore {
  constructor(channelType, channelId, limit = 20) {
    this.key = `${channelType}:${channelId}`;
    this.limit = limit;
    if (!global.__AI_MEMORY) global.__AI_MEMORY = new Map();
    if (!global.__AI_MEMORY.has(this.key)) global.__AI_MEMORY.set(this.key, []);
  }

  _arr() { return global.__AI_MEMORY.get(this.key) || []; }

  addMessage(msg) {
    // msg = { role: 'user' | 'assistant', content: '...' }
    const a = this._arr();
    a.push(msg);
    while (a.length > this.limit) a.shift();
    global.__AI_MEMORY.set(this.key, a);
  }

  getMessages() { return this._arr().slice(); }

  clear() { global.__AI_MEMORY.set(this.key, []); }
}
