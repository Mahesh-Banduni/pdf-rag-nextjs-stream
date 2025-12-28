import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '../../lib/prisma';

export async function GET() {
  try {
    // Get the currently authenticated Clerk user
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const email =
      user.emailAddresses?.[0]?.emailAddress ||
      user.primaryEmailAddress?.emailAddress ||
      null;
    const name = user.firstName || user.fullName || null;
    const avatar = user.imageUrl || null;

    // Save or update the user in NeonDB via Prisma
    const dbUser = await prisma.user.upsert({
      where: { clerkId: user.id },
      update: { email, name, avatarUrl: avatar },
      create: { clerkId: user.id, email, name, avatarUrl: avatar },
    });

    return NextResponse.json({ ok: true, user: dbUser });
  } catch (err) {
    console.error('Error saving user:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
