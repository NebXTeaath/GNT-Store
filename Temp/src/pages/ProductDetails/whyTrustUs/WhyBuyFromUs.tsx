import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import {
  WarrantyBadge,
  SecureDeliveryBadge,
  CustomerSupportBadge,
  AuthenticProductBadge,
} from './TrustBadge'; // Adjust import path if needed

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export interface WhyBuyFromUsProps {
  className?: string;
}

const WhyBuyFromUs: React.FC<WhyBuyFromUsProps> = ({ className }) => {
  return (
    <div className={className}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-8 mb-6"
      >
        <motion.h2
          variants={fadeIn}
          className="text-2xl md:text-3xl font-bold mb-6"
        >
          Why Buy From Us
        </motion.h2>

        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-2 gap-4" // Keeping the 2x2 layout
        >
          <motion.div variants={fadeIn} custom={0}>
            <WarrantyBadge theme="primary" size="md" />
          </motion.div>

          <motion.div variants={fadeIn} custom={1}>
            <SecureDeliveryBadge theme="primary" size="md" />
          </motion.div>

          <motion.div variants={fadeIn} custom={2}>
            <CustomerSupportBadge theme="primary" size="md" />
          </motion.div>

          <motion.div variants={fadeIn} custom={3}>
            <AuthenticProductBadge theme="primary" size="md" />
          </motion.div>
        </motion.div>

        <motion.p
          variants={fadeIn}
          className="text-center text-gray-300 text-sm mt-6"
        >
          GNT Store is India's trusted marketplace for gaming consoles & PC hardware.
          <br />
          {/* --- MODIFIED LINE --- */}
          <Link
            to="/#testimonials" // Link to homepage root with hash fragment
            className="text-[#5865f2] hover:text-[#4752c4] hover:underline transition-colors duration-200" // Added hover styles
          >
            Join our satisfied gamers nationwide.
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default WhyBuyFromUs;