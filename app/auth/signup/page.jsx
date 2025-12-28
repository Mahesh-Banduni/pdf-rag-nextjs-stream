'use client';

import { SignUp, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    // run only when signed in and user exists
    if (!isSignedIn || !user) return;

    // guard so we call backend once per browser (avoid race/loop)
    const key = `clerk_user_saved_${user.id}`;
    if (typeof window !== 'undefined' && window.localStorage.getItem(key)) {
      // already saved in this browser
      return;
    }

    // fire-and-forget call to backend that upserts the user into Postgres
    (async () => {
      try {
        const resp = await fetch('/api/auth', { method: 'GET' });
        if (!resp.ok) {
          const payload = await resp.json().catch(() => ({}));
          console.error('Failed saving user to DB', resp.status, payload);
        } else {
          // mark saved in localStorage so we don't call repeatedly
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, '1');
          }
        }
      } catch (err) {
        console.error('Error calling /api/auth', err);
      }
    })();
  }, [isSignedIn, user]);

  return (
    <main className="flex justify-center items-center h-screen">
      <SignUp
        routing="path"
        path="/auth/signup"
        signInUrl="/auth/signin"
        afterSignUpUrl="/welcome"
        appearance={{
          elements: {
            card: 'shadow-lg p-4 rounded-2xl',
          },
        }}
      />
    </main>
  );
}
