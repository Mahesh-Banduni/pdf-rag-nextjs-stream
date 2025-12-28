'use client';

import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import StreamChatProvider from '../components/StreamChatProvider'
import Header from './Header';

export default function HomePage({ chatChannelId }) {
  const { user } = useUser();
  return (
    <>
      {/* Show landing page when signed out */}
      <SignedOut>
        <Header/>
        <main className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-6 text-center relative overflow-hidden">
          {/* Hero Section */}
          <div className="max-w-3xl space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
              Your <span className="text-indigo-400">AI-Powered</span> PDF Assistant
            </h1>

            <p className="text-gray-300 text-base sm:text-lg md:text-xl leading-relaxed">
              Upload, read, and ask questions about your PDFs instantly.  
              Get concise, intelligent answers — powered by advanced AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <SignInButton mode="modal" redirecturl="/">
                <button className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl shadow-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 w-full sm:w-auto">
                  Try Now
                </button>
              </SignInButton>
            </div>
          </div>

          {/* Decorative Background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          </div>

          {/* Footer */}
          <footer className="absolute bottom-6 text-sm text-gray-400">
            © {new Date().getFullYear()} AI PDF RAG · All rights reserved.
          </footer>
        </main>
      </SignedOut>

      {/* Show PDF RAG app when signed in */}
      <SignedIn>
        <StreamChatProvider />
      </SignedIn>
    </>
  );
}
