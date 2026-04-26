import { Variants, Transition } from "framer-motion";

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};
export const fadeUpTransition: Transition = {
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

export const slideFromRight: Variants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 },
};
export const slideFromRightTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const slideFromLeft: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
};
export const slideFromLeftTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 28,
};

export const scaleIn: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.97, opacity: 0 },
};
export const scaleInTransition: Transition = {
  duration: 0.25,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.07 },
  },
};
