"use client";

import { motion } from "framer-motion";

interface ErrorScreenProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <motion.div
        className="flex flex-col items-center gap-5 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-4xl">⚠️</div>
        <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
        <p className="text-sm text-gray-500 max-w-xs">{message}</p>
        {onRetry && (
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={onRetry}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Try again
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
