"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ScreenSharePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "screen" | "window" | "tab") => void;
}

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

export function ScreenSharePicker({ isOpen, onClose, onSelect }: ScreenSharePickerProps) {
  const [activeTab, setActiveTab] = useState<"screen" | "window" | "tab">("screen");

  // Demo thumbnails
  const demoThumbnails = [
    { id: 1, label: "Your entire screen", type: "screen" as const },
    { id: 2, label: "Application window", type: "window" as const },
    { id: 3, label: "Browser tab", type: "tab" as const },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden"
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Choose what to share</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6">
              {(["screen", "window", "tab"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "screen" && "Your entire screen"}
                  {tab === "window" && "A window"}
                  {tab === "tab" && "A tab"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                {demoThumbnails
                  .filter((t) => t.type === activeTab)
                  .map((thumb) => (
                    <motion.button
                      key={thumb.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onSelect(thumb.type)}
                      className="group flex flex-col gap-3 rounded-lg border-2 border-transparent bg-white p-3 shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left"
                    >
                      {/* Thumbnail placeholder */}
                      <div className="aspect-video rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200">
                        {thumb.type === "screen" && (
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="14" x="2" y="3" rx="2" />
                            <line x1="8" x2="16" y1="21" y2="21" />
                            <line x1="12" x2="12" y1="17" y2="21" />
                          </svg>
                        )}
                        {thumb.type === "window" && (
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <line x1="3" x2="21" y1="9" y2="9" />
                          </svg>
                        )}
                        {thumb.type === "tab" && (
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7V4h16v3" />
                            <path d="M9 20h6" />
                            <path d="M12 4v16" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{thumb.label}</span>
                    </motion.button>
                  ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="share-audio"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="share-audio" className="text-sm text-gray-600">
                  Share tab audio
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onSelect(activeTab)}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Share
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
