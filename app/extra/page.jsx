"use client";
import { useState, useRef, useEffect } from "react";

export default function TTSPage() {
  const [text, setText] = useState("Say professionally: Have a wonderful day!");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  // Automatically play when new audioUrl is set
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      const playAudio = async () => {
        try {
          await audioRef.current.play();
        } catch (err) {
          console.warn("Autoplay blocked — manual play needed:", err);
        }
      };
      playAudio();
    }
  }, [audioUrl]);

  const handleSpeak = async () => {
    setLoading(true);
    setAudioUrl(null);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        console.error("TTS API error:", await res.text());
        alert("Failed to generate speech.");
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Optional: Auto-download
      const link = document.createElement("a");
      link.href = url;
      link.download = "output.wav";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("TTS Error:", err);
      alert("Error generating speech. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 space-y-4 text-center">
      <h1 className="text-2xl font-bold mb-4">🎙️ Gemini Text-to-Speech (MP3)</h1>

      <textarea
        className="w-full border rounded p-3 text-lg"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something for Gemini to speak..."
      />

      <button
        disabled={loading}
        onClick={handleSpeak}
        className={`px-6 py-3 rounded text-white font-semibold ${
          loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Generating..." : "Generate Speech"}
      </button>

      {audioUrl && (
        <div className="flex flex-col items-center space-y-2 mt-4">
          <audio ref={audioRef} src={audioUrl} controls autoPlay className="w-full hidden" />
        </div>
      )}
    </div>
  );
}
