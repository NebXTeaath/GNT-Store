// src/components/global/LoadingScreen.tsx
import React from 'react';
import { motion } from 'framer-motion';

// Animation variants for the container
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      duration: 0.3, 
      staggerChildren: 0.15,
    },
  },
  exit: { 
    opacity: 0, 
    transition: { 
      duration: 0.2 
    } 
  },
};

// Animation variants for each dot
const dotVariants = {
  hidden: { y: 0, opacity: 0 },
  visible: { 
    y: [0, -10, 0], 
    opacity: 1, 
    transition: { 
      duration: 0.6, 
      repeat: Infinity, 
      repeatType: "loop" as const, 
      ease: "easeInOut", 
    },
  },
};

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = ({ message = "Updating your Experience..." }: LoadingScreenProps) => {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 bg-[#1a1c23]/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"
    >
        {/* Logo */}
        <img src="/logo.svg" alt="GNT" className="w-80 h-25 mb-4" />


      <motion.div className="flex space-x-2">
        {[0, 1, 2].map((index) => (
          <motion.div 
            key={index} 
            variants={dotVariants}
            className="h-4 w-4 bg-[#5865f2] rounded-full"
          />
        ))}
      </motion.div>
      <p className="mt-6 text-base font-medium text-gray-300">{message}</p>
    </motion.div>
  );
};

export default LoadingScreen;