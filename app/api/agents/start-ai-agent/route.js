import 'dotenv/config';
import { StreamChat } from 'stream-chat';
import { NextResponse } from 'next/server';
import { setAgent, hasAgent } from '../../../lib/agentCacheHelper.js';
import { MemoryStore } from '../../../lib/memoryStore.js';
import {GeminiAgent} from '../../../agents/GeminiAgent.js'; // <-- if default export

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

if (!STREAM_API_KEY || !STREAM_API_SECRET) {
  console.warn('STREAM_API_KEY or STREAM_API_SECRET missing in env.');
}

let serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

// small random id generator
function randStr(len = 6) {
  const s = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += s[Math.floor(Math.random() * s.length)];
  return out;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { channel_id, channel_type = 'messaging', creator_id } = body;
    if (!channel_id) {
      return NextResponse.json({ error: 'Missing channel_id' }, { status: 400 });
    }

    let channel_id_updated = channel_id;
    if (channel_id.includes(':')) {
      const parts = channel_id.split(':');
      if (parts.length > 1) channel_id_updated = parts[1];
    }

    const agentKey = `${channel_type}:${channel_id_updated}`;
    if (hasAgent(agentKey)) {
      return NextResponse.json({ message: 'Agent already running', agentKey });
    }

    const botUserId = `ai_bot_${randStr(6)}`;

    try {
      await serverClient.upsertUser({
        id: botUserId,
        name: 'AI Assistant',
        role: 'admin',
      });
    } catch (e) {
      console.warn('upsertUser failed', e?.message || e);
    }

    const channel = serverClient.channel(channel_type, channel_id_updated);

    try {
      await channel.addMembers([botUserId]);
    } catch (e) {
      console.warn('addMembers failed', e?.message || e);
    }

    try {
      await channel.watch();
    } catch (e) {
      console.warn('channel.watch failed', e?.message || e);
    }

    const memory = new MemoryStore(channel_type, channel_id_updated, 20);

    const agent = new GeminiAgent({
      serverClient,
      botUserId,
      channelType: channel_type,
      channelId: channel_id_updated,
      memory,
      model: GEMINI_MODEL,
      persona: {
        systemPrompt: "You are a professional assistant. Reply politely and concisely. Keep answers clear and formal.",
      },
    });

    await agent.init();

    try {
      const welcomeText = await agent.generateWelcomeMessage({ userName: creator_id || 'there' });
      await channel.sendMessage({
        text: welcomeText,
        user: { id: botUserId },
        ai_generated: true,
      });
    } catch (err) {
      console.warn('welcome generation failed', err);
      await channel.sendMessage({
        text: "Hello. How may I assist you today?",
        user: { id: botUserId },
        ai_generated: true,
      });
    }

    setAgent(agentKey, agent);

    return NextResponse.json({ message: 'Agent started', agentKey, botUserId });
  } catch (err) {
    console.error('start AI error', err);
    return NextResponse.json({ error: err?.message || 'Failed to start agent' }, { status: 500 });
  }
}
