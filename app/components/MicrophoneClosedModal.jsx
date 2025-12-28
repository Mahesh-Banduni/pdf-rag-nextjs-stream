import { Circle, Mic, X, MicOff } from 'lucide-react';
import { useState } from 'react';

export default function MicrophoneCloseModal({
  microphonePermissionStatus,
  setMicrophonePermissionStatus,
  showMicrophoneCloseModal,
  setShowMicrophoneCloseModal
}) {
  return (
    <>
      {showMicrophoneCloseModal && (
        <div>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-500 flex items-center justify-center p-2 sm:p-6"
            onClick={() => setShowMicrophoneCloseModal(false)}
          >
            <div
              className="
                relative flex flex-col bg-white dark:bg-slate-900 
                w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl
                h-auto max-h-[80vh]
                rounded-2xl p-6 sm:p-6 gap-4
                shadow-lg overflow-y-auto
              "
              onClick={(e) => e.stopPropagation()}
            >
              <div className=" border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                  Microphone access required
                </h3>
                <button
                  onClick={() => setShowMicrophoneCloseModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base">
                Please allow microphone access in your browser settings.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
