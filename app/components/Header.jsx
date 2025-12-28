import { SignedIn, SignedOut, UserButton, SignInButton, useUser } from '@clerk/nextjs';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import Image from "next/image";

export default function Header({ onToggleSidebar, sidebarOpen, isMdDown }) {
  const { user } = useUser();

  return (
    <header
      className={`${user ? '' : 'absolute'} w-full z-50 bg-gray-900 hover:bg-gray-800 text-white border-b border-gray-800 shadow-md backdrop-blur-sm bg-opacity-95`}
    >
      <div className={`mx-auto flex items-center justify-between ${isMdDown? 'px-2':'px-5'} py-3`}>

        {/* Left Section: Logo + Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <SignedIn>
            {!sidebarOpen && (
              <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-slate-600 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </SignedIn>

          {/* Logo */}
          <div className={`${isMdDown ? 'w-12 h-9':'w-14 h-10'} relative`}>
            <Image
              src="/images/Logo.png"
              alt="Logo"
              fill
              style={{ objectFit: "cover", objectPosition: "top" }}
              priority
            />
          </div>

          {/* Brand */}
          <div className="flex flex-col">
            <Link
              href="/"
              className="text-lg font-semibold tracking-wide hover:text-gray-300 transition"
            >
              PDF RAG
            </Link>
            <h5 className="text-xs text-gray-300 -mt-1">Your AI Powered PDF Assistant</h5>
          </div>
        </div>

        {/* Right Section: Auth */}
        <nav className="flex items-center gap-4">
          {/* <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: 'w-8 h-8',
                },
              }}
            />
          </SignedIn> */}

          <SignedOut>
            <SignInButton mode="modal" redirectUrl="/">
              <button className="px-4 py-1 border border-white rounded-lg text-sm hover:bg-white hover:text-black transition">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}
