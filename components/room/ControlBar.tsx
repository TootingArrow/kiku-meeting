"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface ControlBarProps {
  onLeave: () => void;
  micMuted: boolean;
  cameraOff: boolean;
  screenSharing?: boolean;
  screenShareDisabled?: boolean;
  hovered?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
}

function MicIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" x2="23" y1="1" y2="23" />
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function CameraIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" x2="23" y1="1" y2="23" />
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function ScreenShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

function ScreenShareStopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" x2="23" y1="1" y2="23" />
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

function ChatIcon({ unread }: { unread: boolean }) {
  return (
    <div className="relative">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {unread && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
      )}
    </div>
  );
}

function NotebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function ControlBar({ onLeave, micMuted, cameraOff, screenSharing = false, screenShareDisabled = false, hovered = false, onToggleMic, onToggleCamera, onToggleScreenShare }: ControlBarProps) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showScreenShareConfirm, setShowScreenShareConfirm] = useState(false);

  const iconButtonClass =
    "flex items-center justify-center w-11 h-11 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-gray-200/50 text-gray-600 transition-all hover:bg-white hover:shadow-md hover:text-gray-900";

  const activeButtonClass =
    "flex items-center justify-center w-11 h-11 rounded-full bg-blue-50 backdrop-blur-md shadow-sm border border-blue-200 text-blue-600 transition-all hover:bg-blue-100 hover:shadow-md";

  const disabledButtonClass =
    "flex items-center justify-center w-11 h-11 rounded-full bg-gray-100 backdrop-blur-md shadow-sm border border-gray-200/50 text-gray-400 cursor-not-allowed";

  const leaveButtonClass =
    "flex items-center justify-center w-11 h-11 rounded-full bg-red-500 backdrop-blur-md shadow-sm text-white transition-all hover:bg-red-600 hover:shadow-md";

  const handleScreenShareClick = () => {
    if (screenSharing) {
      setShowScreenShareConfirm(true);
    } else {
      onToggleScreenShare();
    }
  };

  const confirmStopScreenShare = () => {
    setShowScreenShareConfirm(false);
    onToggleScreenShare();
  };

  return (
    <>
      <motion.div
        className="mx-auto flex items-center justify-center"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
      >
        <div
          className="flex items-center gap-2 rounded-full backdrop-blur-xl px-3 py-2 shadow-lg border border-white/30 transition-colors"
          style={{ backgroundColor: hovered ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.10)" }}
        >
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onToggleMic}
          className={micMuted ? activeButtonClass : iconButtonClass}
          title={micMuted ? "Unmute" : "Mute"}
        >
          <MicIcon muted={micMuted} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onToggleCamera}
          className={cameraOff ? activeButtonClass : iconButtonClass}
          title={cameraOff ? "Turn camera on" : "Turn camera off"}
        >
          <CameraIcon off={cameraOff} />
        </motion.button>

        <motion.button
          whileTap={{ scale: screenShareDisabled ? 1 : 0.93 }}
          onClick={screenShareDisabled ? undefined : handleScreenShareClick}
          className={screenShareDisabled ? disabledButtonClass : screenSharing ? activeButtonClass : iconButtonClass}
          title={screenShareDisabled ? "Someone else is presenting" : screenSharing ? "Stop sharing" : "Share screen"}
        >
          {screenSharing ? <ScreenShareStopIcon /> : <ScreenShareIcon />}
        </motion.button>

        <div className="w-px h-6 bg-gray-300/50 mx-1" />

        <motion.button
          whileTap={{ scale: 0.93 }}
          className={iconButtonClass}
          title="Chat"
        >
          <ChatIcon unread={false} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.93 }}
          className={iconButtonClass}
          title="Notes"
        >
          <NotebookIcon />
        </motion.button>

        <div className="w-px h-6 bg-gray-300/50 mx-1" />

        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setShowLeaveConfirm(true)}
          className={leaveButtonClass}
          title="Leave call"
        >
          <LeaveIcon />
        </motion.button>
        </div>
      </motion.div>

      {/* Leave confirmation */}
      {showLeaveConfirm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowLeaveConfirm(false)}
          />
          <motion.div
            className="relative z-10 rounded-2xl bg-white p-6 shadow-xl w-80 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Leave meeting?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to leave this call?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onLeave}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Leave
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Stop screen share confirmation */}
      {showScreenShareConfirm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowScreenShareConfirm(false)}
          />
          <motion.div
            className="relative z-10 rounded-2xl bg-white p-6 shadow-xl w-80 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Stop sharing?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to stop sharing your screen?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowScreenShareConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmStopScreenShare}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Stop sharing
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

    </>
  );
}
