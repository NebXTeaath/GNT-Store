// src/pages/order/checkout/OrderSuccessConfirmation.tsx
"use client" // Required for Framer Motion hooks

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, CheckCheck, Home, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion"; // Import motion
import { showWhatsAppNotification } from "@/pages/order/checkout/WhatsAppNotification"; // Assuming this exists

// --- Animated Checkmark Component ---
interface CheckmarkProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        delay: i * 0.2,
        type: "spring",
        duration: 1.5,
        bounce: 0.2,
        ease: "easeInOut",
      },
      opacity: { delay: i * 0.2, duration: 0.2 },
    },
  }),
};

export function Checkmark({
  size = 100,
  strokeWidth = 2,
  color = "currentColor",
  className = "",
}: CheckmarkProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      initial="hidden"
      animate="visible"
      className={className}
    >
      <title>Animated Checkmark</title>
      <motion.circle
        cx="50"
        cy="50"
        r="40"
        stroke={color}
        variants={draw}
        custom={0} // Animation sequence order
        style={{
          strokeWidth,
          strokeLinecap: "round",
          fill: "transparent",
        }}
      />
      <motion.path
        d="M30 50L45 65L70 35" // Checkmark path
        stroke={color}
        variants={draw}
        custom={1} // Animation sequence order (after circle)
        style={{
          strokeWidth,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          fill: "transparent",
        }}
      />
    </motion.svg>
  );
}
// --- End Animated Checkmark Component ---


interface OrderSuccessConfirmationProps {
  orderId: string;
  onClose?: () => void;
  isModal?: boolean;
}

const OrderSuccessConfirmation = ({
  orderId,
  onClose,
  isModal = false,
}: OrderSuccessConfirmationProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Callback for any cleanup or additional actions on toast close.
  const handleConfirmationClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // When in modal mode, trigger the Sonner toast on mount.
  useEffect(() => {
    if (isModal) {
       // Ensure showWhatsAppNotification is correctly implemented elsewhere
      showWhatsAppNotification(handleConfirmationClose);
    }
  }, [isModal, handleConfirmationClose]); // Added handleConfirmationClose dependency

  if (isModal) {
    return (
      <div className="bg-[#1a1c23] border-[#2a2d36] text-white w-full max-w-md mx-auto rounded-lg p-6 shadow-xl">
        <div className="space-y-1 flex flex-col items-center mb-6">
          {/* Animated Checkmark for Modal */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1], // Smooth cubic bezier curve
              scale: {
                type: "spring",
                damping: 15,
                stiffness: 200,
              },
            }}
          >
            <div className="relative bg-green-500/10 p-2 rounded-full">
                 {/* Optional subtle glow effect similar to the example */}
                 <motion.div
                     className="absolute inset-0 blur-lg bg-green-500/20 rounded-full"
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{
                       delay: 0.2, // Delay slightly after the checkmark starts
                       duration: 0.8,
                       ease: "easeOut",
                     }}
                 />
              <Checkmark
                size={48} // Adjusted size (was h-10 w-10 => 40px, slightly increased)
                strokeWidth={3} // Adjusted stroke width
                color="rgb(74 222 128)" // Green color from Tailwind's green-400
                className="relative z-10" // Ensure checkmark is above the blur
              />
            </div>
          </motion.div>
          <motion.h2
            className="text-2xl font-bold mt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }} // Delay after checkmark animation starts
          >
            Order Placed!
          </motion.h2>
          <motion.p
            className="text-gray-400 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }} // Delay further
          >
            Your order has been submitted successfully.
          </motion.p>
        </div>

        <motion.div
           className="space-y-4 mb-6"
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.9, duration: 0.5 }} // Delay for details section
        >
          <div className="bg-[#2a2d36] p-4 rounded-lg border border-[#3f4354]">
            <p className="text-sm text-gray-400 mb-2">Your Order ID:</p>
            <div className="flex items-center justify-between">
              <p className="font-mono text-lg text-white">{orderId}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-gray-400 hover:text-white hover:bg-[#3f4354]"
                aria-label={copied ? "Order ID Copied" : "Copy Order ID"} // Accessibility
              >
                {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Please keep this ID for tracking your order status.
          </p>
        </motion.div>
      </div>
    );
  }

  // Full Page View
  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Animated Checkmark for Full Page */}
          <motion.div
            className="mb-6 flex justify-center"
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{
               duration: 0.4,
               ease: [0.4, 0, 0.2, 1],
               scale: {
                 type: "spring",
                 damping: 15,
                 stiffness: 200,
               },
             }}
          >
             <div className="relative">
                 {/* Optional subtle glow effect */}
                 <motion.div
                     className="absolute inset-0 blur-xl bg-[#5865f2]/20 rounded-full" // Use brand color for glow
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{
                       delay: 0.2,
                       duration: 0.8,
                       ease: "easeOut",
                     }}
                 />
                <Checkmark
                    size={80} // Original size (h-20 w-20)
                    strokeWidth={4} // Slightly thicker stroke for larger size
                    color="#5865f2" // Original color
                    className="relative z-10"
                />
            </div>
          </motion.div>

          <motion.h1
            className="text-3xl font-bold mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            >
            Order Placed Successfully!
          </motion.h1>
          <motion.p
            className="text-gray-400 mb-6"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.7, duration: 0.5 }}
          >
            Your order has been submitted and is being processed.
          </motion.p>

          <motion.div
             className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6 mb-8 max-w-md mx-auto"
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.9, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <p className="text-sm text-gray-400 mb-2">Your Order ID:</p>
            <div className="flex items-center justify-center space-x-2">
              <p className="font-mono text-lg text-white">{orderId}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-gray-400 hover:text-white hover:bg-[#3f4354]"
                aria-label={copied ? "Order ID Copied" : "Copy Order ID"}
              >
                {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            <Button asChild className="bg-[#5865f2] hover:bg-[#4752c4]">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-[#2a2d36] text-white hover:bg-[#2a2d36]">
              {/* Added text-white and hover:bg for better contrast in dark mode */}
              <Link to="/profile">
                <ShoppingBag className="mr-2 h-4 w-4" />
                View Your Profile
              </Link>
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default OrderSuccessConfirmation;