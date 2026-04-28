"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
}

function stripParenthetical(s: string): string {
  return s.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

interface DeviceTestModalProps {
  isOpen: boolean;
  userName: string;
  onJoin: (micId: string, cameraId: string) => void;
}

export function DeviceTestModal({ isOpen, userName, onJoin }: DeviceTestModalProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      // Request permission first so labels are available
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const allDevices = await navigator.mediaDevices.enumerateDevices();

      // Release the temporary stream so the camera isn't locked
      tempStream.getTracks().forEach((t) => t.stop());

      const mapped = allDevices.map((d) => ({
        deviceId: d.deviceId,
        label: d.label || (d.kind === "audioinput" ? "Microphone" : d.kind === "videoinput" ? "Camera" : "Speaker"),
        kind: d.kind as "audioinput" | "audiooutput" | "videoinput",
      }));

      setDevices(mapped);

      const mics = mapped.filter((d) => d.kind === "audioinput");
      const speakers = mapped.filter((d) => d.kind === "audiooutput");
      const cameras = mapped.filter((d) => d.kind === "videoinput");

      if (mics.length > 0 && !selectedMic) setSelectedMic(mics[0].deviceId);
      if (speakers.length > 0 && !selectedSpeaker) setSelectedSpeaker(speakers[0].deviceId);
      if (cameras.length > 0 && !selectedCamera) setSelectedCamera(cameras[0].deviceId);

      setIsLoadingDevices(false);
    } catch {
      setError("Please allow camera and microphone access in your browser settings.");
      setIsLoadingDevices(false);
    }
  }, [selectedMic, selectedSpeaker, selectedCamera]);

  // Get media stream with selected devices
  const getMedia = useCallback(async () => {
    if (!selectedCamera && !selectedMic) return;

    // Stop previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : false,
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraReady(mediaStream.getVideoTracks().length === 0);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Set up audio analyser
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(average / 255);
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      setError("Could not start the selected camera or microphone.");
    }
  }, [selectedCamera, selectedMic]);

  // Initial device enumeration
  useEffect(() => {
    if (!isOpen) return;
    enumerateDevices();
  }, [isOpen, enumerateDevices]);

  // Update stream when selection changes
  useEffect(() => {
    if (!isOpen || isLoadingDevices) return;
    getMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, selectedMic, isOpen, isLoadingDevices]);

  // Ensure video element gets the stream after it mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stream]);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  if (!isOpen) return null;

  const micDevices = devices.filter((d) => d.kind === "audioinput");
  const speakerDevices = devices.filter((d) => d.kind === "audiooutput");
  const cameraDevices = devices.filter((d) => d.kind === "videoinput");

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute inset-0 bg-black/50" />

        <motion.div
          className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-1">
            Check your audio and video
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Hello, {userName || "there"}!
          </p>

          {error ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-3xl">⚠️</div>
              <p className="text-sm text-gray-600 text-center">{error}</p>
              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => router.push("/")}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Back to menu
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => onJoin(selectedMic, selectedCamera)}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Join anyway
                </motion.button>
              </div>
            </div>
          ) : (
            <>
              {/* Camera preview */}
              <div
                className="relative mx-auto mb-6 flex items-center justify-center overflow-hidden rounded-2xl bg-gray-100"
                style={{ width: 280, height: 210 }}
              >
                {stream && stream.getVideoTracks().length > 0 ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedData={() => setCameraReady(true)}
                    className="h-full w-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    <span className="text-xs">No camera selected</span>
                  </div>
                )}
              </div>

              {/* Mic level */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Microphone level</span>
                  <span className="text-xs text-gray-400">{micLevel > 0.05 ? "Working" : "Silent"}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-blue-500"
                    animate={{ width: `${micLevel * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>

              {/* Device selectors */}
              <div className="flex flex-col gap-3 mb-6">
                {/* Camera */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Camera</label>
                  <select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {cameraDevices.length === 0 && (
                      <option value="">No cameras found</option>
                    )}
                    {cameraDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {stripParenthetical(d.label)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Microphone */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Microphone</label>
                  <select
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {micDevices.length === 0 && (
                      <option value="">No microphones found</option>
                    )}
                    {micDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {stripParenthetical(d.label)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speaker */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Speaker</label>
                  <select
                    value={selectedSpeaker}
                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {speakerDevices.length === 0 && (
                      <option value="">Default speaker</option>
                    )}
                    {speakerDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {stripParenthetical(d.label)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => router.push("/")}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Back to menu
                </motion.button>
                <motion.button
                  whileTap={{ scale: cameraReady || !stream || stream.getVideoTracks().length === 0 ? 0.93 : 1 }}
                  onClick={cameraReady || !stream || stream.getVideoTracks().length === 0 ? () => onJoin(selectedMic, selectedCamera) : undefined}
                  disabled={!cameraReady && stream !== null && stream.getVideoTracks().length > 0}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!cameraReady && stream !== null && stream.getVideoTracks().length > 0 ? "Loading camera..." : "Join meeting"}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
