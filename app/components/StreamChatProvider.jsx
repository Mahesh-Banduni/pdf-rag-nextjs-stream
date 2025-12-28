// app/components/StreamChatProvider.jsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Sidebar as SidebarIcon, Edit, MessageSquare, Plus, Send, FileText, X, Square, Voice } from "lucide-react";
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel,
  Window,
  ChannelHeader,
  MessageInput,
  MessageList,
  Thread,
  ChannelList,
  useChatContext
} from 'stream-chat-react';
import Header from './Header'

import 'stream-chat-react/dist/css/v2/index.css';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import CustomChannelPreview from './CustomChannelPreview';
import Image from "next/image";
import SidebarMain from './SidebarMain';
import SpeechModal from './SpeechModal';
import { AssemblyAI, StreamingTranscriber } from "assemblyai";
import MicrophoneCloseModal from './MicrophoneClosedModal';

export default function StreamChatProvider() {
  let { user } = useUser();
  const [client, setClient] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [ready, setReady] = useState(false);
  // keep a ref for user id to access inside handler closure
  const userIdRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMdDown, setIsMdDown] = useState(false);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [generativeClicked, setGenerativeClicked] = useState(false);
  const [voiceModeClick, setVoiceModeClick] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [micOpen, setMicOpen] = useState(false);
  const [microphonePermissionStatus, setMicrophonePermissionStatus] = useState(false);
  const [showMicrophoneCloseModal, setShowMicrophoneCloseModal] = useState(false);
  const [voiceAssistantInput, setVoiceAssistantInput] = useState(null);
  const [loadingVoiceResponse, setLoadingVoiceResponse] = useState(false);
  const [askingVoiceAssistant, setAskingVoiceAssistant] = useState(false);
  const audioRef = useRef(null);
  const voicePauseTimeout = useRef(null);
  const [assistantVoiceType, setAssistantVoiceType] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("assistant_voice_type") || "Charon";
    }
    return "Charon";
  });

  const socket = useRef(null);
  const audioContext = useRef(null);
  const mediaStream = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState({});

  const [transcript, setTranscript] = useState("");
  // PDF Management
  const [pdf, setPdf] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const textInputAreaRef = useRef(null);
  const processorRef = useRef(null);
  const cancelRecordingRef = useRef(false);

  useEffect(() => {
    if (assistantVoiceType) {
      localStorage.setItem("assistant_voice_type", assistantVoiceType);
    }
  }, [assistantVoiceType]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMdDown(mq.matches);
    const handler = (e) => setIsMdDown(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

   useEffect(() => {
    // Check screen width on initial load
    const mq = window.matchMedia("(max-width: 768px)"); // mobile breakpoint
    setSidebarOpen(!mq.matches); // If mobile, close sidebar (false). If desktop, open (true).
  }, []);

  // Sidebar modal closes with backdrop or Esc (for mobile)
  useEffect(() => {
    if (!isMdDown || !sidebarOpen) return;
    const onKeyDown = e => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMdDown, sidebarOpen]);

  useEffect(() => {
    let mounted = true;
    let chatClient = null;

    async function init() {
      try {
        if (!user?.id) return;

        const res = await fetch(`/api/stream/user/token?userId=${user.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Token generation failed');

        const { token, apiKey } = json;
        chatClient = new StreamChat(apiKey);

        await chatClient.connectUser({ id: user.id, name: user.firstName || user.username || user.id }, token);

        // preload channels for display
        await chatClient.queryChannels(
          { members: { $in: [user.id] } },
          { last_message_at: -1 },
          { watch: true, state: true, limit: 20 }
        );

        if (!mounted) return;

        setClient(chatClient);
        userIdRef.current = user.id;
        setReady(true);

        // Add listener: when current user sends a message, call server /api/ai/query
        const onMessageNew = async (event) => {
          // try {
          //   const m = event?.message;
          //   if (!m) return;
          //   // Only send to server when this is a message from the current logged in user
          //   if (!userIdRef.current) return;
          //   if (m.user?.id !== userIdRef.current) return;
          //   // Skip AI messages
          //   if (m?.ai_generated) return;
          //   // Some messages are partial or system; ensure text exists
          //   const text = m.text || (m.attachments && m.attachments.length ? JSON.stringify(m.attachments) : '');
          //   const file = m.attachments && m.attachments.length ? JSON.stringify(m.attachments) : '';
          //   if (!text || !text.trim()) return;

          //   // send to server for AI processing
          //   // Provide channel cid or channel_id in server format (messaging:<id>)
          //   // We use event.message.cid (stream returns like "messaging:ai_xyz")
          //   const channel_cid = m.cid || (event.cid) || null;
          //   const payload = { channel_cid, channel_type: event.channel?.type || 'messaging', channel_id: channel_cid, message_text: text, user_id: userIdRef.current, replyToMessageId: m.id };

          //   { if(m.attachments && m.attachments.length) {const formData = new FormData();
          //   formData.append('file_json', file);
          //   formData.append('chatChannelId', channel_cid);
          //   formData.append('user_id', userIdRef.current)

          //   await fetch('/api/upload', { method: 'POST', body: formData });
          // }}
            
          //   // Fire-and-forget; server will create bot reply into the channel
          //   await fetch('/api/agents/query', {
          //     method: 'POST',
          //     headers: { 'Content-Type': 'application/json' },
          //     body: JSON.stringify(payload),
          //   }).catch(err => {
          //     // log only
          //     console.error('ai query call failed', err);
          //   });
          //   setIsAsking(false);
          //    // Wait 5 seconds before continuing
          //   await new Promise(resolve => setTimeout(resolve, 1000));
          // } catch (err) {
          //   console.error('onMessageNew handler error', err);
          // }
        };

        // Add listener: when current user edits a message
        const onMessageUpdated = async (event) => {
          try {
            const m = event?.message;
            if (!m) return;
          
            // Only process if the current logged-in user edited their own message
            if (!userIdRef.current) return;
            if (m.user?.id !== userIdRef.current) return;
          
            // Skip AI messages
            if (m?.ai_generated) return;
          
            const text = m.text?.trim();
            if (!text) return;
          
            const channel_cid = m.cid || event.cid || null;
            const payload = {
              channel_cid,
              channel_type: event.channel?.type || 'messaging',
              channel_id: channel_cid,
              message_text: text,
              user_id: userIdRef.current,
              replyToMessageId: m.id,
              edited: true, // ← mark as edited
            };
          
            // Send again to AI server for updated response
            await fetch('/api/agents/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }).catch(err => console.error('AI edit query failed', err));
          
          } catch (err) {
            console.error('onMessageUpdated handler error', err);
          }
        };

        chatClient.on('message.new', onMessageNew);
        chatClient.on('message.updated', onMessageUpdated);

        // keep cleanup
        return () => {
          chatClient.off('message.new', onMessageNew);
          chatClient.off('message.updated', onMessageUpdated);
        };

      } catch (err) {
        console.error('Stream init failed:', err);
      }
    }

    init();

    return () => {
      mounted = false;
      chatClient?.disconnectUser();
    };

  },[user?.id]);

  const fetchLatestMessage = async() => {
    const res = await fetch(`/api/stream/user/token?userId=${user.id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Token generation failed');
    const { token, apiKey } = json;
    let chatClient = new StreamChat(apiKey);
    await chatClient.connectUser({ id: user.id, name: user.firstName || user.username || user.id }, token);
    const allChannels = await chatClient.queryChannels(
      { members: { $in: [user.id] } },
      { last_message_at: -1 },
      { watch: true, state: true, limit: 20 }
    );
    const latestChannel = allChannels.sort((a, b) => {
      const dateA = new Date(a.data.updated_at || a.data.created_at);
      const dateB = new Date(b.data.updated_at || b.data.created_at);
      return dateB - dateA;
    });
    const latestChannel2 = latestChannel[0];
    setActiveChannel(latestChannel2);
    const recentMessage = latestChannel2.state.messageSets
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return {recentMessage, latestChannel2};
  }

  const handleUploadPDF = async (channel_Cid) => {
    try {
    const formData = new FormData();

    if (pdf) formData.append('file', pdf);
    formData.append('chatChannelId', channel_Cid);
    formData.append('user_id', userIdRef.current); 
    await fetch('/api/upload', { method: 'POST', body: formData });
    }
    catch(err) {
      console.error("Error uploading PDF",err);
    }
  }

  const handleQuery = async (q, messageId, channel_Cid) => {
    const payload = { channel_cid: channel_Cid, channel_type: 'messaging', channel_id: channel_Cid, message_text: q, user_id: userIdRef.current, replyToMessageId: messageId };

    try{
     const res = await fetch('/api/agents/query', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload),
     });
     const response = await res.json();
     return response;
     }catch(err){
       console.error('ai query call failed', err);
     }
  }

  const askQuestion = async (customQ = null) => {
    let newChatChannel = null;
    const q = (customQ || question).trim();
    if (!q) return;
    let fileResponse = null;
    let newChannel;

    try {
      if (newChatChannel === null && userIdRef.current !== null) {
      if (!client || !user?.id) return;

      const formData = new FormData();
      if(pdf){
        formData.append('file', pdf);
      }
      formData.append('creator_id', user.id);
      formData.append('channel_type', 'messaging');
      formData.append('q', q);
        
      try {
        const res = await fetch('/api/agents/new-chat', {
          method: 'POST',
          body: formData
        });
      
        const data = await res.json();
        if (!res.ok) {
          console.error('Failed to create new AI chat', data);
          return;
        }
      } catch (err) {
        console.error('createNewChat error', err);
      }
    }
    } catch (err) {
      console.error('Error generating response',err);
      setIsAsking(false);
      setQuestion(null);
      setActiveChannel(newChannel);
    } finally {
      setIsAsking(false);
      fileResponse=null;
      setQuestion('');
      setPdf(null);
      const {recentMessage, latestChannel2} = await fetchLatestMessage();
      if(pdf){
      await handleUploadPDF(latestChannel2.cid);
      }
      const response = await handleQuery(q, recentMessage.messages[0].id, latestChannel2.cid);
      setGenerativeClicked(false);
      return response;
    }
  };

  const handleQuestion = async (customQ = null) => {
    if (!activeChannel) {
      return;
    }

    const channel_Cid = activeChannel.cid;
    const q = (customQ || question).trim();
    const formData = new FormData();

    if (pdf) formData.append('file', pdf);
    formData.append('channel_Cid', channel_Cid);
    formData.append('user_id', userIdRef.current);
    formData.append('q', q);

    try {
      const res = await fetch('/api/stream/message/create', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      const messageId = data.res?.message?.id;
      setQuestion('');
      setPdf(null);
      if(pdf){
        await handleUploadPDF(channel_Cid);
      }
      const response = await handleQuery(data.res?.message?.text, messageId, channel_Cid);
      return response;
    } catch (err) {
      console.error('createNewChat error', err);
    } finally {
      setIsAsking(false);
      setGenerativeClicked(false);
    }
  };

  const handleSpeak = async () => {
    setLoadingVoiceResponse(true);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voiceAssistantInput, voice: assistantVoiceType }),
      });

      if (!res.ok) {
        console.error("TTS API error:", await res.text());
        alert("Failed to generate speech.");
        setAskingVoiceAssistant(false);
        return;
      }

      setAskingVoiceAssistant(false);

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);

      // 🎧 Auto play (hidden audio element)
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play().catch(() => {
          console.warn("Autoplay blocked — user interaction needed.");
        });
      }

      // 🧹 Clean up
      setTimeout(() => URL.revokeObjectURL(audioUrl), 100000);
    } catch (err) {
      console.error("TTS Error:", err);
      alert("Error generating speech.");
    } finally {
      setTranscript('');
      setVoiceAssistantInput(null);
      setLoadingVoiceResponse(false);
      startRecording();
    }
  };

  const handleVoicePause = async() => {
    if (!transcript) return;
    let response='';
    setQuestion(transcript);
    if (activeChannel === null) {
      response = await askQuestion(transcript);
    } else {
      response = await handleQuestion(transcript);
    }
    if(!response || response === null || response === ''){
      setVoiceAssistantInput("I'm sorry, I couldn't process your request. Please try again.");
      return;
    }
    if(response?.ai_response){
      setVoiceAssistantInput(response?.ai_response);
    }
  }

  const handleInput = (e) => {
    const textarea = textInputAreaRef.current;
    textarea.style.height = "auto"; // reset
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px"; // 160px ~ max-h-40
    setQuestion(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if(activeChannel !== null){
        handleQuestion();
      }
      else {
        setIsAsking(true);
        setGenerativeClicked(true);
        askQuestion();
      }
    }
  };

  const handleMicToggle = async () => {
    try {
      // Check microphone permission status
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

      if (permissionStatus.state === 'denied') {
        console.error('❌ Microphone permission denied by user');
        setMicrophonePermissionStatus(false);
        return;
      }

      if (!micOpen) {
        // Try to open the microphone
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicStream(stream);
          setMicOpen(true);
          setMicrophonePermissionStatus(true);
          console.log('🎤 Microphone access granted');
        } catch (err) {
          console.error('❌ Microphone access denied:', err);
          setMicrophonePermissionStatus(false);
        }
      } else {
        // Turn off microphone
        stopMic();
      }

      // Optional: Listen for permission changes
      permissionStatus.onchange = () => {
        console.log('Microphone permission changed to', permissionStatus.state);
        setMicrophonePermissionStatus(permissionStatus.state === 'granted');
      };
    } catch (err) {
      console.error('⚠️ Could not query microphone permission:', err);
    }
  };

  // Function to stop mic stream
  const stopMic = () => {
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      setMicStream(null);
      setTranscript('');
    }
    setMicOpen(false);
    console.log('🔇 Microphone stopped');
  };

  // Handle close button click
  const handleClose = () => {
    cancelRecordingRef.current = true; 
    setVoiceModeClick(false);
    stopMic();
    stopRecording();
  };

  useEffect(() => {
    if (micOpen) {
      startRecording();
    }
    else stopRecording();
    return () => stopRecording();
  }, [micOpen, voiceModeClick]);

  useEffect(() => {
    if (voiceAssistantInput !== null) {
      handleSpeak();
    }
  }, [voiceAssistantInput])

  // Call this whenever transcript updates
  useEffect(() => {
    if (!transcript.trim()) return;

    // Clear existing timeout
    if (voicePauseTimeout.current) clearTimeout(voicePauseTimeout.current);

    // Set new timeout (e.g., 7000ms after user stops speaking)
    voicePauseTimeout.current = setTimeout(() => {
      setAskingVoiceAssistant(true);
      stopRecording();
      handleVoicePause();
    }, 7000);

    return () => clearTimeout(voicePauseTimeout.current);
  }, [transcript]);

  const getToken = async () => {
    try {
      const res = await fetch('/api/assemblyai-token');
      const data = await res.json();
      if (!data?.token) {
        alert('Failed to get token');
        return null;
      }
      return data.token;
    } catch (err) {
      console.error('Failed to fetch AssemblyAI token:', err);
      return null;
    }
  };

  const startRecording = async () => {
    cancelRecordingRef.current = false; 
    const token = await getToken();
    if (!token) return;

    const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&formatted_finals=true&token=${token}`;
    socket.current = new WebSocket(wsUrl);

    const turns = {};

    socket.current.onopen = async () => {
      if (cancelRecordingRef.current || !voiceModeClick || !micOpen) {
        console.log("⛔ Recording canceled before WebSocket fully connected");
        socket.current.close();
        socket.current = null;
        return;
      }
      console.log('✅ WebSocket connected');
      setIsRecording(true);

      mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new AudioContext({ sampleRate: 16000 });

      await audioContext.current.audioWorklet.addModule('/processor.js');

      const source = audioContext.current.createMediaStreamSource(mediaStream.current);
      const processor = new AudioWorkletNode(audioContext.current, 'processor');

      // Send each audio chunk to the websocket
      processor.port.onmessage = (event) => {
        const input = event.data;
        if (!socket.current || socket.current.readyState !== WebSocket.OPEN) return;

        const buffer = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          buffer[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
        }
        socket.current.send(buffer.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.current.destination);

      processorRef.current = processor;

    };

    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'Turn') {
        const { turn_order, transcript } = message;
        turns[turn_order] = transcript;

        const ordered = Object.keys(turns)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => turns[k])
          .join(' ');
        setTranscript(ordered);
        setTranscripts({ ...turns });
      }
    };

    socket.current.onerror = (err) => {
      console.error('WebSocket error:', err);
      stopRecording();
    };

    socket.current.onclose = (event) => {
      console.log('🔒 WebSocket closed');
      socket.current = null;
    };
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }

    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }

    if (socket.current) {
      try {
        socket.current.send(JSON.stringify({ type: 'Terminate' }));
      } catch {}
      socket.current.close();
      socket.current = null;
    }
  };

  useEffect(() => {
    if(activeChannel) {
      setActiveChannel(activeChannel);
    }
    else {
      setActiveChannel(null);
    }
  },
  [activeChannel]);

  const letters = ['P', 'D', 'F', ' ', 'R', 'A', 'G'];

  if (!ready || !client) {
    return  <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <div className="flex flex-col items-center gap-8">
        {/* Letter blocks with staggered blinking animation */}
        <div className="flex gap-2 sm:gap-3 md:gap-4">
          {letters.map((letter, index) => (
            <div
              key={index}
              className={`${
                letter === ' ' ? 'w-3 sm:w-4' : 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20'
              } ${
                letter !== ' ' && 'bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg shadow-xl flex items-center justify-center font-bold text-white text-xl sm:text-2xl md:text-3xl'
              }`}
              style={{
                animation: letter !== ' ' ? `blink 1.4s ease-in-out ${index * 0.2}s infinite` : 'none'
              }}
            >
              {letter !== ' ' && letter}
            </div>
          ))}
        </div>
        
        {/* Animated loading bar */}
        <div className="w-48 sm:w-64 md:w-80 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-slate-500 to-slate-700 rounded-full animate-pulse"
               style={{
                 animation: 'slideBar 1.5s ease-in-out infinite'
               }}
          ></div>
        </div>
        
        {/* Loading text */}
        <p className="text-slate-600 text-sm sm:text-base md:text-lg font-medium animate-pulse">
          Loading...
        </p>
      </div>
      
      <style>{`
        @keyframes blink {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.95);
          }
        }
        
        @keyframes slideBar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  }

  return (
    <Chat client={client} theme="messaging light">
      <div className='h-screen flex flex-row'>
      <SidebarMain isMdDown={isMdDown} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} activeChannel={activeChannel} setActiveChannel={setActiveChannel}/>

      {/* CHAT WINDOW */}
      <div className='flex-1 flex flex-col'>
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} isMdDown={isMdDown}/>
          <div className="relative h-[90%] bg-slate-50">
            {activeChannel ? 
            <Channel channel={activeChannel}>
              <Window>
                <div className="flex flex-col h-full bg-slate-50">
                  <MessageList />
                  <div className="sticky bottom-3">
                    <div className={`border border-slate-200 w-full dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 ${isMdDown ? "p-2 mt-6" : "p-6 mt-6"} flex justify-center bottom-0`}>
                <div className="flex flex-col w-full justify-center items-start">
                    {pdf && (
                      <div className="w-fit mb-3 flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg text-sm">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="flex-1 truncate">{pdf.name}</span>
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                        ) : (
                          <button onClick={() => setPdf(null)} className="hover:text-red-500 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3 text-sm w-full justify-center">
                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setPdf(file);
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 bg-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
                          title="Upload PDF"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                        
                      <div className="flex-1 relative">
                        <textarea
                          ref={textInputAreaRef}
                          value={question}
                          onChange={handleInput}
                          onKeyDown={handleKeyDown}
                          disabled={generativeClicked}
                          placeholder="Ask a question..."
                          rows="1"
                          className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl
                                      focus:outline-none focus:ring-1 focus:ring-slate-500
                                      resize-none disabled:opacity-50
                                      max-h-40 overflow-y-auto"
                        />
                      </div>
                      <div className='flex flex-row gap-1.5'>
                        <button
                          onClick={() => {
                            handleQuestion();
                            setIsAsking(true);
                            setGenerativeClicked(true);
                          }}
                          disabled={!question}
                          className="cursor-pointer p-3 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
                        >
                          {isAsking || ( pdf && generativeClicked)? <Square className="w-5 h-5 fill-slate-700 animate-pulse" /> : <Send className="w-5 h-5" />}
                        </button>
                        {!question && <button onClick={()=>{setVoiceModeClick(true);handleMicToggle();}} title="Use voice mode" className="flex items-center justify-center cursor-pointer p-3 bg-slate-200 hover:bg-slate-300 rounded-xl">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="icon">
                            <path d="M7.167 15.416V4.583a.75.75 0 0 1 1.5 0v10.833a.75.75 0 0 1-1.5 0Zm4.166-2.5V7.083a.75.75 0 0 1 1.5 0v5.833a.75.75 0 0 1-1.5 0ZM3 11.25V8.75a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-1.5 0Zm12.5 0V8.75a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-1.5 0Z">
                            </path>
                          </svg>
                        </button>}
                      </div>
                    </div>
                  </div>
                </div>
                    {/* <MessageInput /> */}
                  </div>
                </div>
              </Window>
            </Channel>
            :
            <>
            <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto w-full ">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                Start a New Conversation
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Ask questions about your uploaded PDFs
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Summarize this document', 'What are the key points?', 'Explain the main concepts'].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuestion(prompt);
                      setTimeout(() => textareaRef.current?.focus(), 100);
                    }}
                    className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className={`border border-slate-200 w-full dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 ${isMdDown ? "p-2 mt-6" : "p-6 mt-6"} flex justify-center bottom-0`}>
                <div className="flex flex-col w-full justify-center items-start">
                    {pdf && (
                      <div className="w-fit mb-3 flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg text-sm">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="flex-1 truncate">{pdf.name}</span>
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                        ) : (
                          <button onClick={() => setPdf(null)} className="hover:text-red-500 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3 text-sm w-full justify-center">
                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setPdf(file);
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 bg-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
                          title="Upload PDF"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                        
                      <div className="flex-1 relative">
                        <textarea
                          ref={textInputAreaRef}
                          value={question}
                          onChange={handleInput}
                          onKeyDown={handleKeyDown}
                          disabled={generativeClicked}
                          placeholder="Ask a question..."
                          rows="1"
                          className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl
                                      focus:outline-none focus:ring-1 focus:ring-slate-500
                                      resize-none disabled:opacity-50
                                      max-h-40 overflow-y-auto"
                        />
                      </div>
                      <div className='flex flex-row gap-1.5'>
                        <button
                          onClick={() => {askQuestion();setIsAsking(true);setGenerativeClicked(true);}}
                          disabled={!question}
                          className="cursor-pointer p-3 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
                        >
                          {isAsking || ( pdf && generativeClicked)? <Square className="w-5 h-5 fill-slate-700 animate-pulse" /> : <Send className="w-5 h-5" />}
                        </button>
                        {!question && <button onClick={()=>{setVoiceModeClick(true);handleMicToggle();}} title="Use voice mode"  className="flex items-center justify-center cursor-pointer p-3 bg-slate-200 hover:bg-slate-300 rounded-xl">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="icon">
                            <path d="M7.167 15.416V4.583a.75.75 0 0 1 1.5 0v10.833a.75.75 0 0 1-1.5 0Zm4.166-2.5V7.083a.75.75 0 0 1 1.5 0v5.833a.75.75 0 0 1-1.5 0ZM3 11.25V8.75a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-1.5 0Zm12.5 0V8.75a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-1.5 0Z">
                            </path>
                          </svg>
                        </button>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
}
          </div>
      </div>
      </div>
      <SpeechModal assistantVoiceType={assistantVoiceType} setAssistantVoiceType={setAssistantVoiceType} transcript={transcript} isRecording={isRecording} microphonePermissionStatus={microphonePermissionStatus} onVoiceModeClick={voiceModeClick} setVoiceModeClick={setVoiceModeClick} micOpen={micOpen} setMicOpen={setMicOpen} handleClose={handleClose} setShowMicrophoneCloseModal={setShowMicrophoneCloseModal} audioRef={audioRef} askingVoiceAssistant={askingVoiceAssistant} />
      <MicrophoneCloseModal microphonePermissionStatus={microphonePermissionStatus} setMicrophonePermissionStatus={setMicrophonePermissionStatus} showMicrophoneCloseModal={showMicrophoneCloseModal} setShowMicrophoneCloseModal={setShowMicrophoneCloseModal} />
    </Chat>
  );
}
