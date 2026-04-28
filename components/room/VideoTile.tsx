"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { Participant as LiveKitParticipant, Track } from "livekit-client";
import { MicIcon } from "./ControlBar";

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

function StatusOverlay({ micOff, cameraOff, color, initial }: { micOff: boolean; cameraOff: boolean; color: string; initial: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.30)",
          backdropFilter: "blur(3px)",
        }}
      />
      <div className="relative flex items-center gap-3">
        {micOff && (
          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white">
            <MicIcon muted={true} />
          </div>
        )}
        {cameraOff && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-lg"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>
        )}
      </div>
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
  const [trackVersion, setTrackVersion] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);

  // Refs for manual video track management without triggering re-renders
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const videoTrackRef = useRef<any>(null);
  const attachedTrackSidRef = useRef<string | null>(null);

  const audioRef = useCallback((node: HTMLAudioElement | null) => {
    audioElRef.current = node;
  }, []);

  const tryAttachVideo = useCallback((el: HTMLVideoElement, track: any) => {
    const sid = track?.sid ?? null;
    if (sid && sid === attachedTrackSidRef.current) return; // already attached

    // Detach previous track
    if (videoTrackRef.current && attachedTrackSidRef.current) {
      videoTrackRef.current.detach(el);
    }

    if (track) {
      track.attach(el);
      videoTrackRef.current = track;
      attachedTrackSidRef.current = sid;
      setHasVideo(true);
    } else {
      videoTrackRef.current = null;
      attachedTrackSidRef.current = null;
      setHasVideo(false);
    }
  }, []);

  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    videoElRef.current = node;
    // Try immediate attachment if both element and track are ready
    if (node && videoTrackRef.current) {
      tryAttachVideo(node, videoTrackRef.current);
    }
  }, [tryAttachVideo]);

  useEffect(() => {
    if (isSpeaking && participant.micOn) {
      setMicPulse(true);
      const t = setTimeout(() => setMicPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [isSpeaking, participant.micOn]);

  // Listen for track publish/unpublish events
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

  // Sync video track — robust against race between element ref and track availability
  useEffect(() => {
    const el = videoElRef.current;
    const lk = participant.livekitParticipant;
    if (!el || !lk) return;

    const videoPub = lk.getTrackPublication(Track.Source.Camera);
    const track = videoPub?.track;
    tryAttachVideo(el, track);
  }, [participant.livekitParticipant, trackVersion, tryAttachVideo]);

  // Poll for video element readiness when track exists but element doesn't yet
  useEffect(() => {
    const lk = participant.livekitParticipant;
    if (!lk) return;

    const videoPub = lk.getTrackPublication(Track.Source.Camera);
    const track = videoPub?.track;
    if (!track) return;

    if (videoElRef.current) return; // element already ready

    let attempts = 0;
    const interval = setInterval(() => {
      const el = videoElRef.current;
      if (el) {
        tryAttachVideo(el, track);
        clearInterval(interval);
      }
      if (++attempts > 30) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [participant.livekitParticipant, trackVersion, tryAttachVideo]);

  // Detach video track on unmount
  useEffect(() => {
    return () => {
      const el = videoElRef.current;
      const track = videoTrackRef.current;
      if (track && el) {
        track.detach(el);
      }
    };
  }, []);

  // Attach/detach audio track (remote only)
  useEffect(() => {
    const el = audioElRef.current;
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
  }, [participant.livekitParticipant, participant.isLocal, trackVersion]);

  const isActiveSpeaker = isSpeaking && participant.micOn;
  const showInitials = !hasVideo && !participant.cameraOn;
  const showOverlay = !participant.cameraOn || !participant.micOn;
  const videoVisible = hasVideo || participant.cameraOn;

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
          style={{ borderRadius: "50%" }}
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
            {/* Background gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${participant.color}33, ${participant.color}66)`,
              }}
            />

            {/* Video element — keep srcObject alive so frame freezes when camera off */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                opacity: videoVisible ? 1 : 0,
                filter: participant.cameraOn ? "none" : "grayscale(100%) brightness(0.65)",
                transition: "filter 0.5s ease, opacity 0.3s ease",
                transform: participant.isLocal ? "scaleX(-1)" : "scaleX(1)",
              }}
            />

            {/* Initials — only when camera was never on and no track */}
            {showInitials && (
              <span
                className="relative z-10 font-semibold text-white drop-shadow-lg select-none"
                style={{ fontSize: BASE_SIZE * 0.22 }}
              >
                {participant.initials}
              </span>
            )}

            {/* Status overlay — translucent overlay for mic/camera off */}
            {showOverlay && (
              <StatusOverlay
                micOff={!participant.micOn}
                cameraOff={!participant.cameraOn}
                color={participant.color}
                initial={participant.name ? participant.name.charAt(0).toUpperCase() : "?"}
              />
            )}

            {/* Speaking indicator dot (hidden on small sidebar tiles) */}
            {isActiveSpeaker && !isSidebar && (
              <motion.div
                className="absolute top-4 right-4 z-10 w-4 h-4 rounded-full bg-blue-500 shadow-sm"
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
          <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap">
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
