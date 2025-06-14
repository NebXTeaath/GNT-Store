// src/components/global/Testimonials/GameLoadTestimonials.tsx
import React from 'react';
import TestimonialCarousel from './Components/TestimonialCarousel';
import { gameLoadTestimonials } from './testimonialData'; // We will create this data next
import { Star, DownloadCloud } from 'lucide-react';

const GameLoadTestimonials: React.FC = () => {
  return (
    <section className="py-12">
      <div className="mb-10">
        <div className="flex items-center justify-center mb-4">
          <DownloadCloud className="text-indigo-500 mr-2" size={20} />
          <h2 className="text-2xl font-bold text-white">What Our Customers Are Saying</h2>
        </div>
        <p className="text-gray-400 text-center max-w-2xl mx-auto">
          See how we've helped gamers across India get their consoles loaded and ready for action in no time.
        </p>
      </div>
      
      <TestimonialCarousel
        testimonials={gameLoadTestimonials}
        title="Game Loading Success Stories"
        subtitle="Real experiences from gamers who used our service"
        autoplayDelay={5500}
      />
      
      <div className="mt-12 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-gray-800 rounded-xl p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-medium text-white">Our Service Promise</h3>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={18} className="text-yellow-400 fill-yellow-400" />
            ))}
          </div>
        </div>
        <ul className="space-y-3 text-gray-300">
          <li className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center flex-shrink-0 mr-3">
              ✓
            </div>
            <span>Fast and secure game installation by our trusted technicians.</span>
          </li>
          <li className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center flex-shrink-0 mr-3">
              ✓
            </div>
            <span>Safe pickup and delivery of your console, fully insured.</span>
          </li>
          <li className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center flex-shrink-0 mr-3">
              ✓
            </div>
            <span>100% authentic game files acquired directly from trusted channels.</span>
          </li>
          <li className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center flex-shrink-0 mr-3">
              ✓
            </div>
            <span>Post-service support to ensure all your games run perfectly.</span>
          </li>
        </ul>
      </div>
    </section>
  );
};

export default GameLoadTestimonials;