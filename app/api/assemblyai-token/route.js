import { AssemblyAI } from "assemblyai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = new AssemblyAI({
        apiKey: process.env.ASSEMBLYAI_API_KEY,
      });

    const token = await client.streaming.createTemporaryToken({ expires_in_seconds: 600 });
    if (!token) throw new Error("Failed to get AssemblyAI token");

    return NextResponse.json({ token});
  } catch (err) {
    console.error("Token error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";

// export async function GET() {
//   try {

//     const url = new URL("https://streaming.assemblyai.com/v3/token");
//     url.search = new URLSearchParams({
//       expires_in_seconds: 60,
//     }).toString();

//     const response = await fetch(url, {
//       headers: {
//         Authorization: process.env.AssemblyAI_API_KEY,
//       },
//     });

//     const data = await response.json();
//     if (!response.ok) throw new Error(data.error || "Failed to create token");
//     return NextResponse.json(data);
//   } catch (err) {
//     console.error("Error generating token:", err);
//     return NextResponse.json(
//       { error: "Failed to get token" },
//       { status: 500 }
//     );
//   }
// }

