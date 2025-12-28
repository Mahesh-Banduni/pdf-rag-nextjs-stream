// app/api/ai/stop/route.js
import 'dotenv/config';
import { NextResponse } from 'next/server';
import { getAgent, deleteAgent } from '../../../lib/agentCacheHelper.js';
import { getServerClient } from '../../../lib/serverClient.js';

const serverClient = getServerClient();

export async function POST(req) {
  try {
    const body = await req.json();
    const { channel_id, channel_type = 'messaging' } = body;
    if (!channel_id) return NextResponse.json({ error: 'channel_id required' }, { status: 400 });

    // normalize id
    const id = channel_id.includes(':') ? channel_id.split(':')[1] : channel_id;
    const agentKey = `${channel_type}:${id}`;
    const agent = getAgent(agentKey);
    if (!agent) return NextResponse.json({ message: 'No agent found' });

    try {
      await agent.dispose();
    } catch (e) { console.warn('agent.dispose error', e); }

    // best-effort remove bot from channel
    try {
      const channel = serverClient.channel(channel_type, id);
      await channel.removeMembers([agent.botUserId]);
    } catch (e) { console.warn('remove bot failed', e); }

    deleteAgent(agentKey);
    return NextResponse.json({ message: 'Agent stopped and cleaned' });
  } catch (err) {
    console.error('stop agent error', err);
    return NextResponse.json({ error: err?.message || 'Failed to stop agent' }, { status: 500 });
  }
}
