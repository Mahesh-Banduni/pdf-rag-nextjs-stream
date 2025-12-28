// import 'dotenv/config';
// import { NextResponse } from 'next/server';
// import { getServerClient } from '../../../../lib/serverClient';
// import { Readable } from "stream";

// async function blobToStream(blob) {
//   const buffer = Buffer.from(await blob.arrayBuffer());
//   const readable = new Readable();
//   readable._read = () => {};
//   readable.push(buffer);
//   readable.push(null);
//   return readable;
// }

// const serverClient = getServerClient();

// export async function POST(req) {
//   try {
//     const body = await req.formData(); // ⬅️ Use formData if uploading files

//     const channelCid = body.get("channel_Cid")?.toString() || "";
//     const q = body.get("q")?.toString() || "";
//     const user_id = body.get("user_id")?.toString() || "";
//     const pdfBlob = body.get("file"); // Blob object from formData 

//     if (!channelCid) {
//       return NextResponse.json({ error: "channelCid required" }, { status: 400 });
//     }

//     const filter = { type: 'messaging', members: { $in: [user_id] }, channelCid: channelCid };
//     const sort = [{ last_message_at: -1 }];
    
//     const channel = await serverClient.queryChannels(filter, sort, {
//       watch: true, // this is the default
//       state: true,
//     });
//     console.log('CHannel', channel);

//      // 1️⃣ Upload PDF to Stream
//     if (pdfBlob) {
//       const stream = await blobToStream(pdfBlob);
//       const filename = pdfBlob.name || "document.pdf";
//       const mimeType = pdfBlob.type || "application/pdf";
    
//       const uploaded = await channel.sendFile(
//         stream,
//         filename,
//         mimeType,
//         { id: channel.created_by.id } // <-- MUST BE "id", not "user_id"
//       );
    
//       attachment = {
//         type: "file",
//         asset_url: uploaded.file,
//         title: filename,
//         mime_type: mimeType,
//       };
//     }


//     // 2️⃣ Send message with uploaded PDF as attachment
//     const res = await channel.sendMessage({
//       text: q || "New chat started",
//       user: { id: channel.created_by.id },
//       attachments: attachment ? [attachment] : []
//     });

//     console.log('response',res);

//     // const channel_cid = channelCid || null;
//     //         const payload = { channel_cid, channel_type: channel?.type || 'messaging', channel_id: channel_cid, message_text: q, user_id: channel.created_by.id, replyToMessageId: m.id };

//     //         { if(m.attachments && m.attachments.length) {const formData = new FormData();
//     //         formData.append('file_json', file);
//     //         formData.append('chatChannelId', channel_cid);
//     //         formData.append('user_id', userIdRef.current)

//     //         await fetch('/api/upload', { method: 'POST', body: formData });
//     //       }}
            
//     //         // Fire-and-forget; server will create bot reply into the channel
//     //         await fetch('/api/agents/query', {
//     //           method: 'POST',
//     //           headers: { 'Content-Type': 'application/json' },
//     //           body: JSON.stringify(payload),
//     //         }).catch(err => {
//     //           // log only
//     //           console.error('ai query call failed', err);
//     //         });
//     //         setIsAsking(false);
//     //          // Wait 5 seconds before continuing
//     //         await new Promise(resolve => setTimeout(resolve, 1000));
//     //       } catch (err) {
//     //         console.error('onMessageNew handler error', err);
//     //       }

//     return NextResponse.json({
//       res
//     });

//   } catch (error) {
//     console.error("new-chat error", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }


import 'dotenv/config';
import { NextResponse } from 'next/server';
import { getServerClient } from '../../../../lib/serverClient';
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

export async function POST(req) {
  try {
    const body = await req.formData();

    const channelCid = body.get("channel_Cid")?.toString() || "";
    const q = body.get("q")?.toString() || "";
    const user_id = body.get("user_id")?.toString() || "";
    const pdfBlob = body.get("file");

    if (!channelCid) {
      return NextResponse.json({ error: "channelCid is required" }, { status: 400 });
    }

    const filter = { 
      type: 'messaging', 
      members: { $in: [user_id] }, 
      cid: channelCid 
    };

    const sort = [{ last_message_at: -1 }];

    const channels = await serverClient.queryChannels(filter, sort, {
      watch: true,
      state: true,
    });

    if (!channels.length) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channel = channels[0];
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
        { id: user_id }
      );
    
      attachment = {
        type: "file",
        asset_url: uploaded.file,
        title: filename,
        mime_type: mimeType,
      };
    }

    // 2️⃣ Send message with uploaded PDF as attachment
    const res = await channel.sendMessage({
      text: q || "New chat started",
      user: { id: user_id },
      attachments: attachment ? [attachment] : []
    });

    return NextResponse.json({ res });

  } catch (error) {
    console.error("new-chat error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
