
import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const index = pinecone.index("pdfragstream");

export async function DELETE(req) {
  try {
    const { vectorIds } = await req.json();  
    await index.deleteMany(vectorIds);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Error deleting vectors:", err);
    return new Response(JSON.stringify({ error: "Failed to delete vectors" }), { status: 500 });
  }
}