// app/api/ai/new-chat/route.js
import 'dotenv/config';
import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/serverClient.js';
import { MemoryStore } from '../../../lib/memoryStore.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Readable } from "stream";

async function blobToStream(blob) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);
  return readable;
}

const serverClient = getServerClient();

// Initialize Gemini Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY1);

// ----------------- Helper: Generate a title using Gemini -----------------
async function generateChatChannelId(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are an assistant that generates short concise and descriptive titles for chat channel.
      Based on the following content, suggest a suitable short title for chat channel (max 5 words):
      ---
      ${text} 
      ---
    `;
    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();
    return title.replace(/^["']|["']$/g, ""); // remove quotes if any
  } catch (err) {
    console.error("Error generating title:", err);
  }
}

function randStr(len = 8) {
  const s = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += s[Math.floor(Math.random() * s.length)];
  return out;
}
function channelId() { return `ai_${randStr(8)}`; }
function botId() { return `ai_bot_${randStr(8)}`; }

export async function POST(req) {
  try {
    const body = await req.formData(); // ⬅️ Use formData if uploading files
    const creator_id = body.get("creator_id")?.toString() || "";
    const q = body.get("q")?.toString() || "";
    const pdfBlob = body.get("file"); // Blob object from formData

    if (!creator_id) {
      return NextResponse.json({ error: "creator_id required" }, { status: 400 });
    }

    const id = channelId();
    const botUserId = botId();
    let generatedTitle = await generateChatChannelId(q);

    let customTitle = generatedTitle.trim().length > 0 ? generatedTitle.trim() : "Recently Created Chat";

    await serverClient.upsertUser({ id: botUserId, name: "AI Assistant", role: "admin" });

    const channel = serverClient.channel("messaging", { 
      name: customTitle,
      members: [creator_id, botUserId],
      created_by: { id: creator_id }
    });

    await channel.create();
    await channel.watch();

    let attachment = null;

     // 1️⃣ Upload PDF to Stream
    if (pdfBlob) {
      const stream = await blobToStream(pdfBlob);
      const filename = pdfBlob.name || "document.pdf";
      const mimeType = pdfBlob.type || "application/pdf";
    
      const uploaded = await channel.sendFile(
        stream,
        filename,
        mimeType,
        { id: creator_id } // <-- MUST BE "id", not "user_id"
      );
    
      attachment = {
        type: "file",
        asset_url: uploaded.file,
        title: filename,
        mime_type: mimeType,
      };
    }

    // 2️⃣ Send message with uploaded PDF as attachment
    await channel.sendMessage({
      text: q || "New chat started",
      user: { id: creator_id },
      attachments: attachment ? [attachment] : []
    });

    return NextResponse.json({
      channel: { id, cid: `messaging:${id}` },
      botUserId
    });

  } catch (error) {
    console.error("new-chat error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

