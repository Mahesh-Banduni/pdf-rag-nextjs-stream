// app/api/transcribe/route.js
import { AssemblyAI } from "assemblyai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

export async function POST(req) {
  try {
    // --- 1. Parse the form data ---
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file uploaded" }, { status: 400 });
    }

    // --- 2. Convert the uploaded file into a Node.js Buffer ---
    // ✅ This guarantees the type AssemblyAI expects
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    // --- 3. Upload the audio file to AssemblyAI ---
    const uploadResponse = await client.files.upload(buffer);

    if (
      !uploadResponse ||
      !uploadResponse.upload_url ||
      typeof uploadResponse.upload_url !== "string" ||
      !uploadResponse.upload_url.startsWith("https://")
    ) {
      console.error("Upload response:", uploadResponse);
      throw new Error("Invalid upload URL received from AssemblyAI");
    }

    const audio_url = uploadResponse.upload_url;
    console.log("✅ Uploaded audio to:", audio_url);

    // --- 4. Create transcription job ---
    const transcript = await client.transcripts.create({
      audio_url,
      language_code: "en_us",
      punctuate: true,
    });

    // --- 5. Poll for result ---
    let result = await client.transcripts.get(transcript.id);
    while (result.status !== "completed" && result.status !== "error") {
      await new Promise((r) => setTimeout(r, 2000));
      result = await client.transcripts.get(transcript.id);
    }

    if (result.status === "error") {
      throw new Error(result.error || "Transcription failed");
    }

    console.log("🗣️ Transcript:", result.text);
    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error("❌ AssemblyAI error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
