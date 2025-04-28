import React from 'react';
import TestimonialCarousel from './Components/TestimonialCarousel';
import { repairTestimonials } from './testimonialData';
import { Star, MessageCircle } from 'lucide-react';

const RepairTestimonials: React.FC = () => {
  return (
    <section className="py-12">
      <div className="mb-10">
        <div className="flex items-center justify-center mb-4">
          <MessageCircle className="text-indigo-500 mr-2" size={20} />
          <h2 className="text-2xl font-bold text-white">Our Repair Success Stories</h2>
        </div>
        <p className="text-gray-400 text-center max-w-2xl mx-auto">
          See how we've helped customers across India restore their gaming devices to peak performance
        </p>
      </div>
      
      <TestimonialCarousel
        testimonials={repairTestimonials}
        title="Repair Testimonials"
        subtitle="Real customer experiences with our repair services"
        autoplayDelay={5000}
      />
      
      <div className="mt-12 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-gray-800 rounded-xl p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-medium text-white">Our Service Commitment</h3>
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
            <span>Quick turnaround time with most repairs completed within 48-72 hours</span>
          </li>
          <li className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center flex-shrink-0 mr-3">
              ✓
            </div>
            <span>30-day Support on all repair services</span>
          </li>
          <li className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center flex-shrink-0 mr-3">
              ✓
            </div>
            <span>Transparent pricing with no hidden costs</span>
          </li>
          <li className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center flex-shrink-0 mr-3">
              ✓
            </div>
            <span>Genuine parts and professional technicians</span>
          </li>
          <li className="flex items-start">
            <div className="h-6 w-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center flex-shrink-0 mr-3">
              ✓
            </div>
            <span>Free diagnostic assessment on all devices</span>
          </li>
        </ul>
      </div>
    </section>
  );
};

export default RepairTestimonials;