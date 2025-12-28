import { Circle, Mic, X, MicOff, Info, Settings, ChevronDown, Check } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function SpeechModal({
  microphonePermissionStatus,
  onVoiceModeClick,
  micOpen,
  setMicOpen,
  handleClose,
  setShowMicrophoneCloseModal,
  audioRef,
  transcript,
  askingVoiceAssistant,
  isRecording,
  assistantVoiceType,
  setAssistantVoiceType,
}) {
  const availableVoices = {
    Charon: "Deep, calm and neutral",
    Puck: "Energetic and bright",
    Kore: "Firm, strong and confident",
    Autonoe: "Bright, clear and optimistic",
    Despina: "Smooth, warm and polished",
  };


  const [localVoice, setLocalVoice] = useState(assistantVoiceType);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);

  useEffect(() => {
    setAssistantVoiceType(localVoice);
  }, [localVoice, setAssistantVoiceType]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsOpen && settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (dropdownOpen) {
          setDropdownOpen(false);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        } else if (onVoiceModeClick) {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onVoiceModeClick, dropdownOpen, settingsOpen, handleClose]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  if (!onVoiceModeClick) return null;

  const clickInside = (e) => e.stopPropagation();

  const toggleMic = () => {
    if (microphonePermissionStatus) setMicOpen((v) => !v);
  };

  const selectVoice = (voice) => {
    setLocalVoice(voice);
    setDropdownOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[500] flex items-center justify-center p-3 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="relative bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between items-center w-full 
        max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl h-[85vh] sm:h-[75vh] md:h-[70vh] shadow-2xl overflow-hidden"
        onClick={clickInside}
      >
        {/* TOP RIGHT SETTINGS BUTTON */}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="absolute right-3 top-3 sm:right-5 sm:top-5 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
        </button>

        {/* SLIDING SETTINGS PANEL */}
        <div
        ref={settingsRef}
        // onClick={(e) =>{e.stopPropagation(); setSettingsOpen(false);}}
          className={`absolute top-0 right-0 h-full w-full sm:w-80 md:w-96 bg-white border-1 border-gray-300 shadow-2xl transform transition-transform duration-300 ease-in-out p-4 sm:p-6 z-[600] overflow-y-auto
            ${settingsOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Assistant Voice Settings</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors sm:hidden"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Modern Custom Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-gray-700">Voice Type</label>
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
              >
                <span className="font-medium text-gray-900">{localVoice}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-64 sm:max-h-80 overflow-y-auto">
                  {Object.keys(availableVoices).map((voice) => (
                    <button
                      key={voice}
                      onClick={() => selectVoice(voice)}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left ${
                        localVoice === voice ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{voice}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {availableVoices[voice]}
                        </div>
                      </div>
                      {localVoice === voice && (
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Voice Description Card */}
          <div className="bg-gradient-to-r from-slate-100 to-blue-200 text-z font-medium hover:from-slate-200 hover:to-blue-300 transition-all duration-200 p-4 rounded-xl border border-blue-100">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-slate-500 mt-1.5 flex-shrink-0"></div>
              <p className="font-semibold text-gray-800 text-sm">Current Voice</p>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed ml-4">
              {availableVoices[localVoice]}
            </p>
          </div>

          <button
            onClick={() => setSettingsOpen(false)}
            className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 text-white font-medium hover:from-slate-800 hover:to-slate-900 transition-all duration-200 shadow-lg shadow-slate-500/30 hidden sm:block"
          >
            Close Settings
          </button>
        </div>

        {/* Animated Pulse Circle */}
        <div className="flex-grow flex justify-center items-center w-full min-h-0 ">
          <div className="relative flex flex-col items-center justify-center p-1 bg-slate-700 rounded-full animate-pulse">
            <div className="flex items-center justify-center gap-1 h-32 w-32">
              {[...Array(7)].map((_, i) => (
                <span
                  key={i}
                  className={`block w-2 rounded bg-white animate-wave`}
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            {askingVoiceAssistant && (
              <p className="absolute bottom-[-2rem] text-gray-800 text-sm sm:text-base font-medium">Thinking...</p>
            )}
          </div>
          <audio ref={audioRef} autoPlay hidden />
        </div>

        {/* Microphone Permission Message */}
        {!microphonePermissionStatus && (
          <div className="inline-flex flex-wrap gap-2 justify-center items-center mb-3 sm:mb-4 text-center text-xs sm:text-sm text-gray-700 px-2">
            <p>Enable microphone access in Settings</p>
            <Info
              onClick={() => setShowMicrophoneCloseModal(true)}
              className="h-4 w-4 sm:h-5 sm:w-5 cursor-pointer flex-shrink-0 text-slate-600"
            />
          </div>
        )}

        {/* Transcript */}
        <div className="w-full mb-3 sm:mb-4 px-2">
          <p className="text-gray-700 text-center text-xs sm:text-sm leading-relaxed line-clamp-3 sm:line-clamp-2">
            <span className="font-semibold">Transcript:</span> {transcript || "..."}
          </p>
        </div>

        {/* Bottom Buttons */}
        <div className="flex justify-center gap-3 sm:gap-4 md:gap-6 pb-2 sm:pb-4 mt-2">
          <button
            disabled={!microphonePermissionStatus}
            onClick={toggleMic}
            className={`rounded-full p-3 sm:p-4 transition-all duration-200 ${
              micOpen && isRecording
                ? "bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 shadow-lg" 
                : "bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 shadow-lg"
            } ${!microphonePermissionStatus ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label={micOpen && isRecording ? "Mute microphone" : "Unmute microphone"}
          >
            {micOpen && isRecording ? (
              <Mic className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-700" />
            ) : (
              <MicOff className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-600" />
            )}
          </button>

          <button
            onClick={handleClose}
            className="rounded-full p-3 sm:p-4 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 transition-all duration-200 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 shadow-lg"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
}