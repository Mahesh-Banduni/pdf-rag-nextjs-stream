import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from '../../lib/prisma';
import { getServerClient } from '../../lib/serverClient';

const serverClient = getServerClient();

// Initialize Gemini Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY2);

// Initialize Pinecone client
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index("pdfragstream");

// ----------------- Helper: Extract text from PDF buffer -----------------
async function extractTextFromPDFBuffer(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const tempDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const tempPath = path.join(tempDir, crypto.randomUUID() + ".pdf");
  fs.writeFileSync(tempPath, buffer);

  const loader = new PDFLoader(tempPath, { splitPages: true });
  const pdfDocs = await loader.load();
  fs.unlinkSync(tempPath);

  return pdfDocs;
}

// ----------------- Helper: Generate a title using Gemini -----------------
async function generatePdfTitle(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are an assistant that generates concise and descriptive titles for documents.
      Based on the following content, suggest a suitable title for the PDF (max 10 words):
      ---
      ${text.slice(0, 3000)} 
      ---
    `;
    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();
    return title.replace(/^["']|["']$/g, ""); // remove quotes if any
  } catch (err) {
    console.error("Error generating title:", err);
    return "Untitled Document";
  }
}

// ----------------- API route -----------------
export async function POST(req) {
  try {
    const formData = await req.formData();
    const input = formData.get("input")?.toString() || "";
    const uploadedFile = formData.get("file");
    const fileJson = formData.get("file_json"); // <-- new
    const user_id = formData.get("user_id");
    const chatChannelId = formData.get("chatChannelId")?.toString() || "unknown";
    const channelId = chatChannelId.replace(/^messaging:/, "");

    let file = uploadedFile;

    // ✅ If no File object was uploaded, but a JSON file was provided
    if (!file && fileJson) {
      const parsed = JSON.parse(fileJson)[0]; // expects array of 1 or more
      const response = await fetch(parsed.asset_url);
      const buffer = await response.arrayBuffer();
      file = new File([buffer], parsed.title, {
        type: parsed.mime_type || "application/pdf",
      });
    }

    if (!file) {
      return NextResponse.json({ message: "No input or file provided" }, { status: 400 });
    }

    let docs = [];

    // Handle PDF file
    if (file instanceof File && file.type === "application/pdf") {
      const pdfDocs = await extractTextFromPDFBuffer(file);
      docs.push(...pdfDocs);
    }

    // Handle raw text input
    if (input) docs.push(new Document({ pageContent: input }));

    if (!docs.length) {
      return NextResponse.json({ message: "Unable to process file or text" }, { status: 400 });
    }

    // Generate PDF title
    const combinedText = docs.slice(0, 3).map(d => d.pageContent).join("\n").slice(0, 8000);
    const pdfTitle = await generatePdfTitle(combinedText);

    // Split into chunks
    const splitter = new CharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });
    const chunks = await splitter.splitDocuments(docs);

    // Generate embeddings using Gemini
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const vectors = [];

    for (const chunk of chunks) {
      const response = await embeddingModel.embedContent({
        content: { parts: [{ text: chunk.pageContent }] },
        outputDimensionality: 768,
      });

      vectors.push({
        id: crypto.randomUUID(),
        values: response.embedding.values,
        metadata: {
          text: chunk.pageContent,
          title: pdfTitle,
          channelId: channelId,
        },
      });
    }

    // Upload vectors to Pinecone
    await index.upsert(vectors);

    const vectorIds = vectors.map(v => v.id);

// -----------------------------------------
// ✅ Create channel if not exists & append PDF metadata
// -----------------------------------------
const channel = serverClient.channel('messaging', channelId, {
  source: "user",
  source_detail: { user_id },
});

// Make sure channel is initialized
await channel.watch();

// Get existing pdf_docs if present
const existingPdfDocs = channel.data?.channel_detail?.pdf_docs || [];

const newPdfDoc = {
  pdf_id: crypto.randomUUID(),
  filename: pdfTitle,
  vector_ids: vectorIds,
  uploaded_by_user_id: user_id,
  uploaded_at: new Date().toISOString(),
};

// Append new doc to existing array
await channel.updatePartial({
  set: {
    channel_detail: {
      pdf_docs: [...existingPdfDocs, newPdfDoc],
    },
  },
});

    // Upload PDF file storage
    // if(file && !fileJson){
    // const uploadForm = new FormData();
    // uploadForm.append("file", file);

    // const uploadRes = await fetch(`${process.env.NEXTAUTH_URL}/api/pdf/upload`, {
    //   method: "POST",
    //   body: uploadForm,
    // });
    // const uploaded = await uploadRes.json();

    // // Save database record
    // const pdf = await prisma.pdf.create({
    //   data: {
    //     title: pdfTitle,
    //     vectorIds,
    //     chatChannelId,
    //     fileURL: uploaded.fileUrl
    //   },
    // });
    // }

    return NextResponse.json({});

  } catch (err) {
    console.error("Upload to Pinecone error:", err);
    return NextResponse.json("Something went wrong.", { status: 500 });
  }
}
