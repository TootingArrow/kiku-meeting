"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const fadeUpTransition = {
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.07 },
  },
};

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 10 },
};

function EarLogo() {
  return (
    <div className="flex items-center justify-center text-4xl select-none">
      👂
    </div>
  );
}

function generateMeetingCode() {
  const parts = Array.from({ length: 3 }, () =>
    Math.random().toString(36).substring(2, 5)
  );
  return parts.join("-");
}

function shakeAnimation(isShaking: boolean) {
  return isShaking
    ? { x: [-8, 8, -8, 8, -6, 6, -4, 4, 0] }
    : { x: 0 };
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [activeModal, setActiveModal] = useState<"join" | "create" | null>(null);
  const [meetingCode, setMeetingCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState(false);

  // Load saved name from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("kiku_username");
    if (saved) setName(saved);
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim()) {
      localStorage.setItem("kiku_username", value.trim());
    }
  };

  const triggerNameError = () => {
    setNameError(true);
    setTimeout(() => setNameError(false), 1000);
  };

  const triggerJoinCodeError = () => {
    setJoinCodeError(true);
    setTimeout(() => setJoinCodeError(false), 1000);
  };

  const openJoin = () => {
    if (!name.trim()) {
      triggerNameError();
      return;
    }
    setActiveModal("join");
  };

  const openCreate = () => {
    if (!name.trim()) {
      triggerNameError();
      return;
    }
    setMeetingCode(generateMeetingCode());
    setActiveModal("create");
  };

  const closeModal = () => {
    setActiveModal(null);
    setJoinCode("");
    setCopied(false);
    setJoinCodeError(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`kiku.app/${meetingCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      if (data.roomId) {
        router.push(`/room/${data.roomId}?name=${encodeURIComponent(name.trim())}`);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = () => {
    if (!joinCode.trim()) {
      triggerJoinCodeError();
      return;
    }
    router.push(`/room/${joinCode.trim()}?name=${encodeURIComponent(name.trim())}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <motion.div
        className="flex w-full max-w-md flex-col items-center gap-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} transition={fadeUpTransition}>
          <EarLogo />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-4xl font-bold tracking-tight text-gray-900"
          variants={fadeUp}
          transition={fadeUpTransition}
        >
          Kiku
        </motion.h1>

        {/* Form */}
        <motion.div
          className="w-full space-y-6"
          variants={fadeUp}
          transition={fadeUpTransition}
        >
          <motion.div
            animate={shakeAnimation(nameError)}
            transition={{ duration: 0.5 }}
          >
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your name"
              className={`w-full rounded-lg border px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${
                nameError
                  ? "border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-red-200"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
            />
          </motion.div>

          <div className="flex gap-4">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={openJoin}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Join Meeting
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={openCreate}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
            >
              Create Meeting
            </motion.button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-sm text-gray-400"
          variants={fadeUp}
          transition={fadeUpTransition}
        >
          By Masashi K.
        </motion.p>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeModal}
            />

            {/* Modal */}
            <motion.div
              className="relative z-10 w-full max-w-sm rounded-2xl bg-gray-100 p-6 shadow-xl"
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {activeModal === "join" && (
                <div className="flex flex-col gap-5">
                  <motion.div
                    animate={shakeAnimation(joinCodeError)}
                    transition={{ duration: 0.5 }}
                  >
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Enter meeting code"
                      className={`w-full rounded-lg border bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${
                        joinCodeError
                          ? "border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      }`}
                    />
                  </motion.div>
                  <div className="flex gap-4">
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={closeModal}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={handleJoin}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Join
                    </motion.button>
                  </div>
                </div>
              )}

              {activeModal === "create" && (
                <div className="flex flex-col gap-5">
                  {/* Meeting code display */}
                  <div className="flex items-center gap-3 rounded-lg bg-gray-200/70 px-4 py-3">
                    <span className="flex-1 text-base font-medium text-gray-800">
                      kiku.app/{meetingCode}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="text-gray-500 transition-colors hover:text-gray-700"
                      title="Copy link"
                    >
                      {copied ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={closeModal}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={handleStart}
                      disabled={isLoading}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isLoading ? "Starting..." : "Start"}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
