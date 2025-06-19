
import React from 'react';
import TestimonialCarousel from './Components/TestimonialCarousel';
import { productTestimonials } from './testimonialData';

const HomeTestimonialSection: React.FC = () => {
  return (
    <section id="testimonials" className="w-full py-16 bg-gradient-to-b from-[#0f1115] to-[#12141c]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm mb-4">
            Customer Experience
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Why Our Customers Trust Us
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Discover what makes GNT Store the preferred destination for gaming enthusiasts. 
            Read testimonials from customers across India.
          </p>
        </div>
        
        <TestimonialCarousel
          testimonials={productTestimonials}
          title="Customer Testimonials"
          subtitle="Hear what our customers have to say about their shopping experience"
          autoplayDelay={6000}
          className="mb-8"
        />
        
        <div className="flex flex-wrap justify-center items-center mt-12 gap-8 md:gap-16">
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-bold text-white mb-2">500+</span>
            <span className="text-gray-400 text-sm">Happy Customers</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-bold text-white mb-2">97%</span>
            <span className="text-gray-400 text-sm">Satisfaction Rate</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-bold text-white mb-2">24/7</span>
            <span className="text-gray-400 text-sm">Customer Support</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-bold text-white mb-2">10+</span>
            <span className="text-gray-400 text-sm">Cities Covered</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeTestimonialSection;