"use client";
import { useRouter } from "next/navigation";      

import React, { useEffect, useState, useRef } from 'react';
import { Sidebar as SidebarIcon, Edit} from "lucide-react";
import {
  ChannelList,
} from 'stream-chat-react';

import 'stream-chat-react/dist/css/v2/index.css';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import CustomChannelPreview from './CustomChannelPreview';
import Image from "next/image";
      
export default function SidebarMain({
  isMdDown,
  sidebarOpen,
  setSidebarOpen,
  user, activeChannel, setActiveChannel
}) {
  const router = useRouter();
  const SidebarContent = (
    <>
      {/* Header */}
    <div className="flex justify-between items-center p-3 sm:p-4">
          <div className="w-8 h-6 sm:w-10 sm:h-7 relative">
            <Image
              src="/images/Logo.png"
              alt="Logo"
              fill
              style={{ objectFit: "cover", objectPosition: "top" }}
              priority
            />
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-slate-600 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <SidebarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="px-2 sm:px-3 text-white">
          <button
            onClick={() => setActiveChannel(null)}
            className="cursor-pointer w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">New Chat</span>
          </button>
        </div>

        <h2 className="px-4 pt-3 pb-1 sm:px-5 sm:pt-4 sm:pb-2 text-md sm:text-lg font-bold text-white">
          Chats
        </h2>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent bg-slate-900">
          <ChannelList
            filters={{ members: { $in: [user.id] } }}
            sort={{ last_message_at: -1 }}
            options={{ limit: 20 }}
            Preview={(props) => (
              <CustomChannelPreview {...props} isMdDown={isMdDown} setActiveChannel={setActiveChannel} activeChannel={activeChannel} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
            )}
          />
        </div>

        <div className="p-3 sm:p-4 border-t border-slate-700 space-y-2">
          <nav className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">

            <SignedIn>
              <div className="flex items-center gap-2 sm:gap-3">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-7 h-7 sm:w-8 sm:h-8",
                    },
                  }}
                />

                {user && (
                  <div className="xs:flex flex-col">
                    <div className="text-white text-xs sm:text-sm font-medium">
                      {user.firstName
                        ? `${user.firstName} ${user.lastName || ""}`
                        : user.username || user.emailAddresses?.[0]?.emailAddress}
                    </div>
                    <div className="text-white text-[10px] sm:text-xs font-medium truncate max-w-[120px] sm:max-w-none">
                      {user.emailAddresses?.[0]?.emailAddress}
                    </div>
                  </div>
                )}
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal" redirectUrl="/">
                <button className="px-3 sm:px-4 py-1 border text-xs sm:text-sm border-white rounded-lg hover:bg-white hover:text-black transition">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </nav>
        </div>
        </>
      );
return (
    <>
      {/* Mobile Drawer */}
      {isMdDown ? (
        sidebarOpen && (
          <div className="fixed inset-0 z-[99] flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar modal"
            />

            {/* Drawer */}
            <div className="relative w-72 max-w-[100vw] h-full bg-slate-900 text-white flex flex-col overflow-y-auto transition-all duration-300 z-[100] shadow-2xl">
              {SidebarContent}
            </div>
          </div>
        )
      ) : (
        /* Desktop Sidebar */
        <div
          className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 bg-slate-900 text-white flex flex-col overflow-hidden`}
        >
          {SidebarContent}
        </div>
      )}
    </>
  );
}
