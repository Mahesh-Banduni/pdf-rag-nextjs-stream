import 'dotenv/config';
import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/serverClient.js';
import { MemoryStore } from '../../../lib/memoryStore.js';
import { GeminiAgent } from '../../../agents/GeminiAgent.js';

export const config = {
  api: {
    bodyParser: true,
  },
};

const serverClient = getServerClient();

export async function POST(req) {
  try {
    const body = await req.json();
    const { channel_cid, message_text, user_id, replyToMessageId, edited } = body;

    if (!channel_cid) {
      return NextResponse.json({ error: 'channel_cid required' }, { status: 400 });
    }
    if (!message_text?.trim()) {
      return NextResponse.json({ error: 'message_text required' }, { status: 400 });
    }

    // Parse CID: "type:id"
    const match = channel_cid.match(/^([^:]+):(.+)$/);
    if (!match) {
      return NextResponse.json({ error: `Invalid channel_cid format: "${channel_cid}"` }, { status: 400 });
    }

    const channel_type = match[1];
    const cid_id = match[2];

    // Fetch channel
    let channel;
    try {
      const res = await serverClient.queryChannels({ cid: channel_cid });
      if (!res.length) {
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }
      channel = res[0];
    } catch (e) {
      console.error('Channel query error', e);
      return NextResponse.json({ error: 'Channel not found or inaccessible' }, { status: 404 });
    }

    // Identify bot in channel
    const members = channel?.state?.members ?? {};
    const botUserId = Object.keys(members).find(id => id.startsWith('ai_bot_'));

    if (!botUserId) {
      return NextResponse.json(
        { error: 'No bot user found in this channel. Ensure /api/ai/new-chat was used.' },
        { status: 404 }
      );
    }

    const memory = new MemoryStore(channel_type, cid_id, 20);

    const agent = new GeminiAgent({
      serverClient,
      botUserId,
      channelType: channel_type,
      channelId: cid_id,
      memory,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      user_id
    });

    let previousBotResponse = null;

    // Helper to fetch last bot reply for this message
    async function fetchPreviousBotResponse() {
      try {
      const res = await serverClient.queryChannels({ cid: channel_cid });
      if (!res.length) {
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }
      let channel1 = res[0];
        const result = await channel1.query({
          messages: { limit: 50 }
        });

        const all = result.messages || [];
        return all.find(
          m => m.user?.id === botUserId && m.replyToMessageId === replyToMessageId
        );
      } catch (err) {
        console.error('Failed to fetch previous messages:', err);
        return null;
      }
    }

    // // If message is NOT edited but is a reply, check if bot already responded
    // if (!edited && replyToMessageId) {
    //   previousBotResponse = await fetchPreviousBotResponse();
    //   if (previousBotResponse) {
    //     return NextResponse.json({
    //       message: 'Bot has already responded to this message'
    //     });
    //   }
    // }

    // If edited, fetch old bot response
    if (edited && replyToMessageId) {
      previousBotResponse = await fetchPreviousBotResponse();
    }

    // Process the message
    const result = await agent.handleIncomingMessage({
      text: message_text,
      userId: user_id,
      replyToMessageId,
      edited,
      previousBotResponse
    });

    return NextResponse.json({
      message: "done",
      ai_response: result.message,
      message_id: result.message_id
    });

  } catch (err) {
    console.error('ai query error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
