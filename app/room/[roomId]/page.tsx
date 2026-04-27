"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { VideoTile } from "@/components/room/VideoTile";
import { ControlBar } from "@/components/room/ControlBar";
import { DeviceTestModal } from "@/components/room/DeviceTestModal";
import { SettingsPanel } from "@/components/room/SettingsPanel";
import { LoadingScreen } from "@/components/room/LoadingScreen";
import { ErrorScreen } from "@/components/room/ErrorScreen";

const FLOAT_CONFIGS = [
  { x: [-10, 10, -10], y: [-7, 8, -7], duration: 16 },
  { x: [9, -12, 9], y: [6, -9, 6], duration: 19 },
  { x: [-7, 13, -7], y: [-8, 6, -8], duration: 13 },
  { x: [8, -10, 8], y: [-5, 7, -5], duration: 15 },
];

const SUBTLE_FLOAT_CONFIGS = [
  { x: [-5, 5, -5], y: [-4, 4, -4], duration: 14 },
  { x: [4, -6, 4], y: [3, -5, 3], duration: 17 },
  { x: [-6, 7, -6], y: [-5, 4, -5], duration: 12 },
  { x: [5, -5, 5], y: [-3, 6, -3], duration: 15 },
];

// Stable slot positions — each participant keeps their slot forever
const SLOT_POSITIONS = [
  { left: "50%", top: "45%" },
  { left: "32%", top: "42%" },
  { left: "68%", top: "42%" },
  { left: "28%", top: "35%" },
  { left: "65%", top: "32%" },
  { left: "46%", top: "62%" },
  { left: "25%", top: "30%" },
  { left: "60%", top: "28%" },
  { left: "35%", top: "60%" },
  { left: "70%", top: "58%" },
  { left: "20%", top: "25%" },
  { left: "80%", top: "25%" },
  { left: "20%", top: "65%" },
  { left: "80%", top: "65%" },
  { left: "50%", top: "25%" },
  { left: "50%", top: "68%" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getColor(seed: string): string {
  const colors = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => v.toString().padStart(2, "0"))
    .join(":");
}

function ScreenShareView({ sharer }: { sharer: { livekitParticipant?: import("livekit-client").Participant } }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    const lk = sharer.livekitParticipant;
    if (!el || !lk) return;

    const pub = lk.getTrackPublication(Track.Source.ScreenShare);
    const track = pub?.track;
    if (track) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
  }, [sharer.livekitParticipant]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 h-full w-full object-contain z-10 rounded-xl"
    />
  );
}

function MeetingTimer({ startTime, hovered = false }: { startTime: number; hovered?: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div
      className="flex items-center justify-center h-11 px-4 rounded-full backdrop-blur-xl shadow-lg border border-white/40 transition-colors"
      style={{ backgroundColor: hovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}
    >
      <span className="font-mono text-sm text-gray-600 tracking-wider">
        {formatDuration(elapsed)}
      </span>
    </div>
  );
}

function MeetingContent({
  roomId,
  startTime,
  userName,
  onUserNameChange,
}: {
  roomId: string;
  startTime: number;
  userName: string;
  onUserNameChange: (name: string) => void;
}) {
  const router = useRouter();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [screenSharerId, setScreenSharerId] = useState<string | null>(null);
  const [copiedRoomId, setCopiedRoomId] = useState(false);

  useEffect(() => {
    const sharer = participants.find((p) => p.isScreenShareEnabled);
    setScreenSharerId(sharer ? sharer.identity : null);
  }, [participants]);

  const speakerId =
    participants.find((p) => p.isSpeaking)?.identity ||
    (localParticipant?.isSpeaking ? localParticipant.identity : null) ||
    null;

  const handleOpenScreenShare = useCallback(() => {
    if (localParticipant?.isScreenShareEnabled) {
      localParticipant.setScreenShareEnabled(false);
    } else {
      localParticipant?.setScreenShareEnabled(true).catch(() => {
        // User cancelled native picker — do nothing
      });
    }
  }, [localParticipant]);

  const handleCopyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedRoomId(true);
      setTimeout(() => setCopiedRoomId(false), 2000);
    } catch {
      // ignore
    }
  }, [roomId]);

  const someoneIsSharing = screenSharerId !== null;

  // Filter out local participant from remote list to prevent ghost duplicates
  const participantData = participants
    .filter((p) => !p.isLocal)
    .map((p) => ({
      id: p.identity,
      name: p.name || p.identity,
      initials: getInitials(p.name || p.identity),
      color: getColor(p.identity),
      isLocal: p.isLocal,
      cameraOn: p.isCameraEnabled,
      micOn: p.isMicrophoneEnabled,
      livekitParticipant: p,
    }));

  const localParticipantData = localParticipant
    ? {
        id: localParticipant.identity,
        name: localParticipant.name || localParticipant.identity,
        initials: getInitials(localParticipant.name || localParticipant.identity),
        color: getColor(localParticipant.identity),
        isLocal: true,
        cameraOn: localParticipant.isCameraEnabled,
        micOn: localParticipant.isMicrophoneEnabled,
        livekitParticipant: localParticipant,
      }
    : null;

  const allParticipants = localParticipantData
    ? [localParticipantData, ...participantData.filter((p) => p.id !== localParticipantData.id)]
    : participantData;

  // Stable slot assignment: each ID keeps its slot forever
  const positions = useMemo(() => {
    const slotMap = new Map<string, number>();
    const currentIds = allParticipants.map((p) => p.id);
    for (const id of currentIds) {
      let slot = 0;
      const used = new Set(slotMap.values());
      while (used.has(slot)) slot++;
      slotMap.set(id, slot);
    }
    return allParticipants.map((p) => {
      const slot = slotMap.get(p.id) ?? 0;
      return SLOT_POSITIONS[slot % SLOT_POSITIONS.length];
    });
  }, [allParticipants]);

  const handleToggleMic = useCallback(async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    } catch (err) {
      console.error("Failed to toggle microphone:", err);
    }
  }, [localParticipant]);

  const handleToggleCamera = useCallback(async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
    } catch (err) {
      console.error("Failed to toggle camera:", err);
    }
  }, [localParticipant]);

  const screenSharer = allParticipants.find((p) => p.id === screenSharerId);

  return (
    <>
      {/* Room ID badge */}
      <motion.button
        onClick={handleCopyRoomId}
        className="absolute top-5 left-5 z-30 rounded-full bg-white/80 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-gray-500 shadow-sm border border-gray-100 cursor-pointer hover:bg-white transition-colors"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        title="Click to copy"
      >
        {copiedRoomId ? "Copied!" : roomId}
      </motion.button>

      {/* Screen share banner */}
      {someoneIsSharing && localParticipant?.isScreenShareEnabled && (
        <motion.div
          className="fixed top-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-lg"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
        >
          You are sharing your screen
        </motion.div>
      )}

      {/* Screen Share Active Layout - Keynote Mode */}
      {someoneIsSharing && (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-white pb-36 pt-20 px-6">
          {localParticipant?.isScreenShareEnabled && (
            <motion.button
              className="absolute top-5 right-5 z-30 flex items-center gap-2 rounded-full bg-gray-900/80 backdrop-blur-md px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-gray-900 transition-colors"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => {
                if (localParticipant?.isScreenShareEnabled) {
                  localParticipant.setScreenShareEnabled(false);
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              Exit presentation
            </motion.button>
          )}

          {/* Top row participants - extra bottom padding so names don't overlap */}
          <div className="flex items-center justify-center gap-10 mb-6 pb-10">
            <AnimatePresence>
              {allParticipants.slice(0, Math.ceil(allParticipants.length / 2)).map((participant, i) => (
                <VideoTile
                  key={participant.id}
                  participant={participant}
                  isSpeaking={speakerId === participant.id}
                  floatAnimation={SUBTLE_FLOAT_CONFIGS[i % SUBTLE_FLOAT_CONFIGS.length]}
                  position={{ left: "0", top: "0" }}
                  size={130}
                  isSidebar
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Actual screen share container */}
          <div className="w-full max-w-5xl aspect-video rounded-2xl bg-gray-900 border border-gray-800 shadow-xl flex items-center justify-center relative overflow-hidden">
            {screenSharer ? (
              <ScreenShareView sharer={screenSharer} />
            ) : (
              <div className="relative z-10 flex flex-col items-center gap-3 text-gray-400">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="17" y2="21" />
                </svg>
                <span className="text-sm font-medium">Waiting for screen share...</span>
              </div>
            )}
          </div>

          {/* Bottom row participants - extra top padding so names don't overlap */}
          {allParticipants.length > Math.ceil(allParticipants.length / 2) && (
            <div className="flex items-center justify-center gap-10 mt-6 pt-10">
              <AnimatePresence>
                {allParticipants.slice(Math.ceil(allParticipants.length / 2)).map((participant, i) => {
                  const idx = i + Math.ceil(allParticipants.length / 2);
                  return (
                    <VideoTile
                      key={participant.id}
                      participant={participant}
                      isSpeaking={speakerId === participant.id}
                      floatAnimation={SUBTLE_FLOAT_CONFIGS[idx % SUBTLE_FLOAT_CONFIGS.length]}
                      position={{ left: "0", top: "0" }}
                      size={130}
                      isSidebar
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Normal floating layout */}
      {!someoneIsSharing && (
        <div className="absolute inset-0">
          <AnimatePresence>
            {allParticipants.map((participant, i) => (
              <VideoTile
                key={participant.id}
                participant={participant}
                isSpeaking={speakerId === participant.id}
                floatAnimation={FLOAT_CONFIGS[i % FLOAT_CONFIGS.length]}
                position={positions[i]}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom bar: settings (left), controls (center), timer (right) */}
      <BottomBar
        userName={userName}
        onUserNameChange={onUserNameChange}
        startTime={startTime}
        onLeave={() => router.push("/")}
        micMuted={!localParticipant?.isMicrophoneEnabled}
        cameraOff={!localParticipant?.isCameraEnabled}
        screenSharing={localParticipant?.isScreenShareEnabled || false}
        screenShareDisabled={someoneIsSharing && !localParticipant?.isScreenShareEnabled}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleOpenScreenShare}
      />
    </>
  );
}

interface BottomBarProps {
  userName: string;
  onUserNameChange: (name: string) => void;
  startTime: number;
  onLeave: () => void;
  micMuted: boolean;
  cameraOff: boolean;
  screenSharing?: boolean;
  screenShareDisabled?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
}

function BottomBar({
  userName,
  onUserNameChange,
  startTime,
  onLeave,
  micMuted,
  cameraOff,
  screenSharing = false,
  screenShareDisabled = false,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
}: BottomBarProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="fixed bottom-6 left-0 right-0 z-40 px-6 flex items-end justify-between pointer-events-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="pointer-events-auto">
        <SettingsPanel
          userName={userName}
          onUserNameChange={onUserNameChange}
          hovered={hovered}
        />
      </div>
      <div className="pointer-events-auto">
        <ControlBar
          onLeave={onLeave}
          micMuted={micMuted}
          cameraOff={cameraOff}
          screenSharing={screenSharing}
          screenShareDisabled={screenShareDisabled}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          hovered={hovered}
        />
      </div>
      <div className="pointer-events-auto">
        <MeetingTimer startTime={startTime} hovered={hovered} />
      </div>
    </div>
  );
}

function sanitizeRoomId(id: string): string | null {
  if (!id || typeof id !== "string") return null;
  const cleaned = id.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeName(name: string): string {
  if (!name || typeof name !== "string") return "Anonymous";
  return name.trim().slice(0, 100) || "Anonymous";
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawName = searchParams.get("name") || "Anonymous";
  const userName = sanitizeName(rawName);

  const [roomId, setRoomId] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showDeviceTest, setShowDeviceTest] = useState(true);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState<number>(0);
  const [displayName, setDisplayName] = useState(userName);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const hasConnected = useRef(false);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    params.then((p) => {
      const id = sanitizeRoomId(p.roomId);
      if (id) {
        setRoomId(id);
      } else {
        setError("Invalid room ID");
      }
    });
  }, [params]);

  const fetchToken = useCallback(async () => {
    if (!roomId) return;

    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!url) {
      setError(
        "LiveKit server URL is missing. Please restart the dev server after creating .env.local."
      );
      return;
    }

    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, name: displayName }),
      });
      const data = await res.json();
      if (data.token) {
        setLivekitUrl(url);
        setToken(data.token);
      } else {
        setError(data.error || "Failed to get meeting token");
      }
    } catch {
      setError("Failed to connect to meeting");
    }
  }, [roomId, displayName]);

  const handleJoinFromTest = useCallback((micId: string, cameraId: string) => {
    setShowDeviceTest(false);
    setSelectedMic(micId);
    setSelectedCamera(cameraId);
    fetchToken();
  }, [fetchToken]);

  const handleDisconnected = useCallback(() => {
    setIsInMeeting(false);
    if (hasConnected.current) {
      router.push("/");
    }
  }, [router]);

  const handleConnected = useCallback(() => {
    hasConnected.current = true;
    setIsInMeeting(true);
    const now = Date.now();
    startTimeRef.current = now;
    setMeetingStartTime(now);
  }, []);

  const handleUserNameChange = useCallback((name: string) => {
    setDisplayName(name);
    localStorage.setItem("kiku_username", name);
  }, []);

  // Show browser confirmation prompt when closing tab during an active meeting
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isInMeeting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isInMeeting]);

  if (error) {
    return <ErrorScreen message={error} onRetry={() => setError(null)} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Device Test Modal */}
      <DeviceTestModal
        isOpen={showDeviceTest}
        userName={displayName}
        onJoin={handleJoinFromTest}
      />

      {/* Loading while fetching token */}
      {!token && !showDeviceTest && <LoadingScreen />}

      {/* LiveKit Room */}
      {token && livekitUrl && (
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={token}
          connect={true}
          audio={selectedMic ? { deviceId: selectedMic } : true}
          video={selectedCamera ? { deviceId: selectedCamera } : true}
          connectOptions={{ autoSubscribe: true }}
          onConnected={handleConnected}
          onDisconnected={handleDisconnected}
        >
          <MeetingContent
            roomId={roomId}
            startTime={meetingStartTime || startTimeRef.current}
            userName={displayName}
            onUserNameChange={handleUserNameChange}
          />
        </LiveKitRoom>
      )}
    </div>
  );
}
