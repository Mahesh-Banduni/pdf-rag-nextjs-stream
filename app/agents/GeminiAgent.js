// lib/ai/GeminiAgent.js
import { GeminiResponseHandler } from './GeminiResponseHandler.js';
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerClient } from '../lib/serverClient.js';

const serverClient = getServerClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY2);
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const index = pinecone.index("pdfragstream");

// Embed text using Gemini embeddings
async function embedText(text) {
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const embeddingResponse = await embeddingModel.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    });
    const embedding = embeddingResponse.embedding.values;
    if (!embedding) throw new Error('Failed to get embedding from Gemini');
    return embedding;
  } catch (err) {
    console.error('Embedding Error:', err);
    throw new Error(err.message || 'Embedding request to Gemini failed');
  }
}

// Query Pinecone with channel filter
async function queryVectors(vector, channelId) {
  try {
    const searchResponse = await index.query({
      vector,
      topK: 5,
      includeMetadata: true,
      filter: channelId ? { channelId } : undefined,
    });
    return searchResponse.matches || [];
  } catch (err) {
    console.error('Pinecone Error:', err.response?.data || err.message);
    throw new Error('Failed to query Pinecone index');
  }
}

export class GeminiAgent {
  constructor({ serverClient, botUserId, channelType, channelId, memory, model, user_id, onComplete }) {
    this.serverClient = serverClient;
    this.botUserId = botUserId;
    this.channel = { type: channelType, id: channelId };
    this.memory = memory;
    this.model = model;
    this.handlers = [];
    this.user_id=user_id,
    this.onComplete = onComplete
  }

  _buildMessagesForGemini(recent, prompt) {
    const system = prompt || "You are a professional assistant. Reply politely and concisely.";
    const messages = [{ role: 'system', content: [{ type: 'text', text: system }] }];

    for (const m of recent) {
      messages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: [{ type: 'text', text: m.content }]
      });
    }

    return messages;
  }

  async handleIncomingMessage({ text, userId, replyToMessageId, edited, previousBotResponse  }) {
    if (!text || !text.trim()) return;

    // ✅ Ensure we get a real Stream Channel with real methods
    const channelObj = this.serverClient.channel(this.channel.type, this.channel.id);
    await channelObj.watch(); // <- REQUIRED so updateMessage & partialUpdateMessage exist!

    try {
      this.memory.addMessage({ role: 'user', content: text });
    } catch (e) {}

    const mem = this.memory.getMessages();
    const recent = mem.map(m => ({ role: m.role, content: m.content }));
    if (!recent.length || recent[recent.length - 1].content !== text) {
      recent.push({ role: 'user', content: text });
    }

    const queryVector = await embedText(text);
    const matches = await queryVectors(queryVector, this.channel.id);
    const context = matches.map((m) => ({ text: m.metadata?.text || '' }));

    const limitedContext = context.map((c) => c.text).join('\n---\n').slice(0, 6000);

    const prompt = `You are an AI assistant helping users with information from their uploaded PDFs. Use the provided context to answer the question accurately.

    PDF Context:
    ${limitedContext}

    Instructions:
      1. Answer the question using primarily the following PDF context:\n${limitedContext}\n\n
      2. If the answer is not contained within either the conversation history or PDF context, ONLY respond with: "I'm your AI Powered PDF assistant — I don't have that particular information available. I'd be happy to assist you with content from your uploaded documents."
      3. Be concise and to the point.
      4. Use proper grammar and punctuation.
      5. Do not fabricate information.
      6. If someone asks for a list or if the answer is a list, provide a bulleted list format.
      7. Prioritize information from the PDF context when available, but use conversation history to maintain context and continuity.
      8. If the user is asking about your capabilities or what you can do, you can respond helpfully while maintaining your role as a PDF assistant.
      9. Maintain a friendly and helpful tone throughout the conversation.
    `;

    // Create placeholder message
    let placeholder;
    let sendRes=null;
    let previousBotResponse1=null;
    try {
      if(!edited && !previousBotResponse){
        // Helper to fetch last bot reply for this message
        async function fetchPreviousBotResponse(cid, botUserId) {
          try {
          const res = await serverClient.queryChannels({ cid: `messaging:${cid}` });
          if (!res.length) {
            return null;
          }
          let channel1 = res[0];
            const result = await channel1.query({
              messages: { limit: 50 }
            });
          
            const all = result.messages || [];
            previousBotResponse1 = all.find( m => m.user?.id === botUserId && m.replyToMessageId === replyToMessageId );
            return all.find(
              m => m.user?.id === botUserId && m.replyToMessageId === replyToMessageId
            );
          } catch (err) {
            console.error('Failed to fetch previous messages:', err);
            return null;
          }
        }
      
        // If message is NOT edited but is a reply, check if bot already responded
        if (!edited && replyToMessageId) {
          previousBotResponse1= await fetchPreviousBotResponse(this.channel.id, this.botUserId);
        }

      if(!previousBotResponse1){
          sendRes = await channelObj.sendMessage({
            text: 'Thinking...',
            ai_generated: true,
            user: { id: this.botUserId },
            generating: true,
            replyToMessageId: replyToMessageId
          });
        }
      }
      else if(edited && previousBotResponse){
        sendRes = previousBotResponse;
      }
      placeholder = sendRes?.message || sendRes;
    } catch (err) {
      console.error('Failed to create placeholder message', err);
      throw err;
    }

    // Show typing indicator
    try {
      await channelObj.sendEvent({
        type: 'ai_indicator.update',
        ai_state: 'AI_STATE_THINKING',
        message_id: placeholder.id
      });
    } catch (e) {}

    // Start streaming
    const handler = new GeminiResponseHandler({
      messages: this._buildMessagesForGemini(recent, prompt),
      model: this.model,
      apiKey: process.env.GEMINI_API_KEY2,
      baseUrl: process.env.GEMINI_BASE_URL,
      channelObj,
      channelMessage: placeholder,
      memory: this.memory,
      botUserId: this.botUserId,
      serverClient: this.serverClient,
      user_id: this.user_id,
      onComplete: this.onComplete
    });

    const completionPromise = new Promise((resolve) => {
      handler.onComplete = (finalText) => {
        resolve({
          status: 'done',
          message: finalText,
          message_id: placeholder?.id
        });
      };
    });

    handler.run().catch(err => console.error('GeminiResponseHandler.run error', err));
    this.handlers.push(handler);
    return completionPromise;
  }
}
