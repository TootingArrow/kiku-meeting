"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaDeviceSelect } from "@livekit/components-react";

interface SettingsPanelProps {
  userName: string;
  onUserNameChange: (name: string) => void;
  hovered?: boolean;
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function SettingsPanel({ userName, onUserNameChange, hovered = false }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(userName);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [canSetSinkId, setCanSetSinkId] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    devices: videoDevices,
    activeDeviceId: activeVideoDevice,
    setActiveMediaDevice: setVideoDevice,
  } = useMediaDeviceSelect({ kind: "videoinput" });

  const {
    devices: audioDevices,
    activeDeviceId: activeAudioDevice,
    setActiveMediaDevice: setAudioDevice,
  } = useMediaDeviceSelect({ kind: "audioinput" });

  // Check if browser supports setSinkId for speaker switching
  useEffect(() => {
    const audio = document.createElement("audio");
    setCanSetSinkId(typeof (audio as any).setSinkId === "function");
  }, []);

  // Enumerate audio output devices
  const enumerateSpeakers = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const speakers = devices.filter((d) => d.kind === "audiooutput");
      setSpeakerDevices(speakers);
      if (speakers.length > 0 && !selectedSpeaker) {
        setSelectedSpeaker(speakers[0].deviceId);
      }
    } catch {
      // ignore
    }
  }, [selectedSpeaker]);

  useEffect(() => {
    if (devicesOpen && canSetSinkId) {
      enumerateSpeakers();
    }
  }, [devicesOpen, canSetSinkId, enumerateSpeakers]);

  // Apply speaker selection to all audio elements
  useEffect(() => {
    if (!canSetSinkId || !selectedSpeaker) return;
    const applySinkId = () => {
      document.querySelectorAll("audio").forEach((el) => {
        try {
          (el as any).setSinkId(selectedSpeaker);
        } catch {
          // ignore
        }
      });
    };
    applySinkId();
    // Also apply when new audio elements are added
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLAudioElement) {
            try {
              (node as any).setSinkId(selectedSpeaker);
            } catch {
              // ignore
            }
          }
          if (node instanceof HTMLElement) {
            node.querySelectorAll("audio").forEach((el) => {
              try {
                (el as any).setSinkId(selectedSpeaker);
              } catch {
                // ignore
              }
            });
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selectedSpeaker, canSetSinkId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-16 left-0 z-[60] w-80 rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 p-5"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Settings</h3>

            {/* Username */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  onUserNameChange(e.target.value);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Devices */}
            <div className="mb-2">
              <button
                onClick={() => setDevicesOpen(!devicesOpen)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Audio & Video devices
                <ChevronDown open={devicesOpen} />
              </button>
              <AnimatePresence>
                {devicesOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2 space-y-3 pt-1">
                      {/* Camera */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Camera</label>
                        <select
                          value={activeVideoDevice}
                          onChange={(e) => setVideoDevice(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          {videoDevices.length === 0 && (
                            <option value="">No cameras found</option>
                          )}
                          {videoDevices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Microphone */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Microphone</label>
                        <select
                          value={activeAudioDevice}
                          onChange={(e) => setAudioDevice(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          {audioDevices.length === 0 && (
                            <option value="">No microphones found</option>
                          )}
                          {audioDevices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Speaker */}
                      {canSetSinkId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Speaker</label>
                          <select
                            value={selectedSpeaker}
                            onChange={(e) => setSelectedSpeaker(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            {speakerDevices.length === 0 && (
                              <option value="">Default speaker</option>
                            )}
                            {speakerDevices.map((d) => (
                              <option key={d.deviceId} value={d.deviceId}>
                                {d.label || "Unknown speaker"}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {!canSetSinkId && (
                        <div className="text-xs text-gray-400">
                          Speaker selection is managed by your browser.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-11 h-11 rounded-full backdrop-blur-xl shadow-lg border border-white/40 text-gray-600 transition-all hover:text-gray-900"
        style={{ backgroundColor: hovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}
        title="Settings"
      >
        <SettingsIcon />
      </button>
    </div>
  );
}
