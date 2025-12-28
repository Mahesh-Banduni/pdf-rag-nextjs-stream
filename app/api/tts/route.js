import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import wav from "wav";
import { PassThrough } from "stream";

/**
 * Converts raw PCM data into a valid WAV file stream.
 */
function pcmToWav(pcmBuffer, channels = 1, sampleRate = 24000, bitDepth = 16) {
  const writer = new wav.Writer({
    channels,
    sampleRate,
    bitDepth,
  });

  const stream = new PassThrough();
  writer.pipe(stream);
  writer.write(pcmBuffer);
  writer.end();

  return stream;
}

export async function POST(req) {
  try {
    const { text, voice } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing text input" }, { status: 400 });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY1,
    });

    // 🧠 Call Gemini TTS model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Charon" },
          },
        },
      },
    });

    const inlineData = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!inlineData?.data) {
      console.error("Gemini TTS: No audio data found", response);
      return NextResponse.json({ error: "No audio data returned" }, { status: 500 });
    }

    const audioBuffer = Buffer.from(inlineData.data, "base64");

    // 🧩 Convert PCM → playable WAV stream
    const wavStream = pcmToWav(audioBuffer);

    // ✅ Send back a real WAV file
    return new NextResponse(wavStream, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": 'inline; filename="output.wav"',
      },
    });
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
