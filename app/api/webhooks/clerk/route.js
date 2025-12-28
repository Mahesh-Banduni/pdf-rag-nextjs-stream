import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) throw new Error('Missing CLERK_WEBHOOK_SECRET');

  // Await headers() in Next.js app router
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // Read the raw request body
  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { type: eventType, data } = evt;

  try {
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const email =
        data.email_addresses?.[0]?.email_address ||
        data.primary_email_address?.email_address ||
        null;
      const firstName = data.first_name || null;
      const lastName = data.last_name || null;
      const avatar = data.profile_image_url || null;
      const clerkId = data.id;

      // Upsert user safely
      const existingUser = await prisma.user.findUnique({ where: { clerkId } });

      if (existingUser) {
        await prisma.user.update({
          where: { clerkId },
          data: { email, firstName, lastName, avatarUrl: avatar },
        });
        console.log(`🔄 Clerk user ${clerkId} updated`);
      } else {
        try {
          const response = await prisma.user.create({
            data: { clerkId, email, firstName, lastName, avatarUrl: avatar },
          });
          const user = await fetch(`${process.env.NEXTAUTH_URL}/api/stream/user/create`,{
            method: 'POST',
            body: JSON.stringify({ userId: clerkId, name: firstName+' '+lastName })
          });
 
          // console.log("user",user);
          // console.log(`✅ Clerk user ${clerkId} created.`,response);
        } catch (createErr) {
          if (createErr.code === 'P2002') {
            console.warn(`User with email ${email} already exists, skipping create`);
          } else {
            throw createErr;
          }
        }
      }
    } else if (eventType === 'user.deleted') {
      const clerkId = data.id;
      try {
        await prisma.user.delete({ where: { clerkId } });
        console.log(`🗑️ Clerk user ${clerkId} deleted`);
      } catch (deleteErr) {
        if (deleteErr.code === 'P2025') {
          console.warn(`User ${clerkId} not found, skipping delete`);
        } else {
          throw deleteErr;
        }
      }
    }
  } catch (err) {
    console.error('Error processing webhook:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
