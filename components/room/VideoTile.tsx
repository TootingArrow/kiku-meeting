"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { Participant as LiveKitParticipant, Track } from "livekit-client";

export interface Participant {
  id: string;
  name: string;
  initials: string;
  color: string;
  isLocal: boolean;
  cameraOn: boolean;
  micOn: boolean;
  livekitParticipant?: LiveKitParticipant;
}

interface VideoTileProps {
  participant: Participant;
  isSpeaking: boolean;
  floatAnimation: {
    x: number[];
    y: number[];
    duration: number;
  };
  position: { left: string; top: string };
  size?: number;
  isSidebar?: boolean;
}

const DEFAULT_SIZE = 270;

function MicOffBadge() {
  return (
    <div className="absolute bottom-3 left-3 z-20 w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center shadow-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" x2="23" y1="1" y2="23" />
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      </svg>
    </div>
  );
}

function MicOffOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/15">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
        <line x1="1" x2="23" y1="1" y2="23" />
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    </div>
  );
}

export function VideoTile({
  participant,
  isSpeaking,
  floatAnimation,
  position,
  size,
  isSidebar = false,
}: VideoTileProps) {
  const BASE_SIZE = size || DEFAULT_SIZE;
  const [micPulse, setMicPulse] = useState(false);
  const [hasHadVideo, setHasHadVideo] = useState(false);
  const [trackVersion, setTrackVersion] = useState(0);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [audioNode, setAudioNode] = useState<HTMLAudioElement | null>(null);

  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    setVideoNode(node);
  }, []);

  const audioRef = useCallback((node: HTMLAudioElement | null) => {
    setAudioNode(node);
  }, []);

  useEffect(() => {
    if (isSpeaking && participant.micOn) {
      setMicPulse(true);
      const t = setTimeout(() => setMicPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [isSpeaking, participant.micOn]);

  useEffect(() => {
    if (participant.cameraOn) {
      setHasHadVideo(true);
    }
  }, [participant.cameraOn]);

  // Listen for track publish/unpublish events to re-attach tracks
  useEffect(() => {
    const lk = participant.livekitParticipant;
    if (!lk) return;

    const handleTrackChange = () => {
      setTrackVersion((v) => v + 1);
    };

    lk.on("trackPublished", handleTrackChange);
    lk.on("trackUnpublished", handleTrackChange);
    lk.on("trackSubscribed", handleTrackChange);
    lk.on("trackUnsubscribed", handleTrackChange);

    return () => {
      lk.off("trackPublished", handleTrackChange);
      lk.off("trackUnpublished", handleTrackChange);
      lk.off("trackSubscribed", handleTrackChange);
      lk.off("trackUnsubscribed", handleTrackChange);
    };
  }, [participant.livekitParticipant]);

  // Attach/detach video track — re-runs when tracks change or video element becomes available
  useEffect(() => {
    const el = videoNode;
    const lk = participant.livekitParticipant;
    if (!el || !lk) return;

    const videoPub = lk.getTrackPublication(Track.Source.Camera);
    const videoTrack = videoPub?.track;

    if (videoTrack) {
      videoTrack.attach(el);
      return () => {
        videoTrack.detach(el);
      };
    }
  }, [participant.livekitParticipant, trackVersion, videoNode]);

  // Attach/detach audio track (remote only) — re-runs when tracks change or audio element becomes available
  useEffect(() => {
    const el = audioNode;
    const lk = participant.livekitParticipant;
    if (!el || !lk || participant.isLocal) return;

    const audioPub = lk.getTrackPublication(Track.Source.Microphone);
    const audioTrack = audioPub?.track;

    if (audioTrack) {
      audioTrack.attach(el);
      return () => {
        audioTrack.detach(el);
      };
    }
  }, [participant.livekitParticipant, participant.isLocal, trackVersion, audioNode]);

  const isActiveSpeaker = isSpeaking && participant.micOn;
  const showVideo = participant.cameraOn || hasHadVideo;
  const showInitials = !participant.cameraOn && !hasHadVideo;

  return (
    <motion.div
      layout
      className={isSidebar ? "relative" : "absolute"}
      style={isSidebar ? undefined : { left: position.left, top: position.top }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        ...(isSidebar ? {} : { x: "-50%", y: "-50%" }),
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{
        layout: { type: "spring", stiffness: 200, damping: 25 },
        opacity: { duration: 0.35 },
        scale: { type: "spring", stiffness: 300, damping: 25 },
      }}
    >
      {/* Floating wrapper */}
      <motion.div
        animate={{
          x: floatAnimation.x,
          y: floatAnimation.y,
        }}
        transition={{
          x: {
            duration: floatAnimation.duration,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          },
          y: {
            duration: floatAnimation.duration * 0.8,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          },
        }}
      >
        <motion.div
          className="relative"
          animate={{
            scale: isActiveSpeaker ? 1.12 : 1,
            boxShadow: isActiveSpeaker
              ? "0 0 0 4px rgba(59, 130, 246, 0.4), 0 20px 50px rgba(0,0,0,0.12)"
              : "0 0 0 0px rgba(59, 130, 246, 0), 0 10px 30px rgba(0,0,0,0.08)",
          }}
          transition={{
            scale: { type: "spring", stiffness: 300, damping: 25 },
            boxShadow: { duration: 0.4, ease: "easeOut" },
          }}
          style={{ borderRadius: "50%" }}
        >
          {/* Video circle */}
          <div
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              width: BASE_SIZE,
              height: BASE_SIZE,
              borderRadius: "50%",
              background: participant.color,
            }}
          >
            {/* Background layer */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${participant.color}33, ${participant.color}66)`,
              }}
            >
              {showInitials && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 40% 40%, ${participant.color}44, transparent 50%),
                                 radial-gradient(circle at 60% 60%, ${participant.color}33, transparent 40%)`,
                  }}
                />
              )}
            </div>

            {/* Video element - always mounted once stream has been attached */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover z-10"
              style={{
                opacity: showVideo ? 1 : 0,
                filter: participant.cameraOn ? "none" : "grayscale(100%) brightness(0.75)",
                transition: "filter 0.5s ease, opacity 0.3s ease",
                transform: participant.isLocal ? "scaleX(-1)" : "scaleX(1)",
              }}
            />

            {/* Initials - only when camera was never on */}
            {showInitials && (
              <span
                className="relative z-10 font-semibold text-white drop-shadow-lg select-none"
                style={{ fontSize: BASE_SIZE * 0.22 }}
              >
                {participant.initials}
              </span>
            )}

            {/* Camera off overlay */}
            {!participant.cameraOn && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/20">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-80"
                >
                  <line x1="1" x2="23" y1="1" y2="23" />
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
            )}

            {/* Mic muted overlay - prominent when camera is still on */}
            {!participant.micOn && participant.cameraOn && <MicOffOverlay />}

            {/* Mic muted badge */}
            {!participant.micOn && <MicOffBadge />}

            {/* Speaking indicator dot (hidden on small sidebar tiles) */}
            {isActiveSpeaker && !isSidebar && (
              <motion.div
                className="absolute top-4 right-4 z-20 w-4 h-4 rounded-full bg-blue-500 shadow-sm"
                animate={micPulse ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.4 }}
              />
            )}
          </div>

          {/* Hidden audio element for remote participants */}
          {!participant.isLocal && (
            <audio
              ref={audioRef}
              autoPlay
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
            />
          )}

          {/* Name tag */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-base font-medium text-gray-600">
              {participant.name}
              {participant.isLocal && (
                <span className="ml-1.5 text-sm text-gray-400">(you)</span>
              )}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
