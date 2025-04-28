// src/components/global/Testimonials/Components/TestimonialCard.tsx
import React from 'react';
import { Star } from 'lucide-react';
import { Testimonial } from '../testimonialData';
import { cn } from '@/lib/utils';

interface TestimonialCardProps {
  testimonial: Testimonial;
  className?: string;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonial, className }) => {
  const { name, location, rating, content, date, service, device, productPurchased } = testimonial;

  // Generate stars based on rating
  const renderStars = () => {
    // ... (keep existing star rendering logic)
    return Array(5).fill(0).map((_, index) => (
        <Star
          key={index}
          size={16}
          className={cn(
            "inline-block",
            index < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-400"
          )}
        />
      ));
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    // ... (keep existing date formatting logic)
     const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
     return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  return (
    <div className={cn(
      "flex flex-col h-full rounded-xl p-6 transition-all duration-300 backdrop-blur-sm",
      "border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40",
      "hover:shadow-lg hover:shadow-indigo-500/10",
      className
    )}>
      <div className="flex items-center mb-4">
        {/* ... (keep name/location logic) ... */}
         <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
           {name.charAt(0)}
         </div>
         <div className="ml-3 flex-1">
           <h3 className="font-medium text-white">{name}</h3>
           <p className="text-xs text-gray-400">{location}</p>
         </div>
      </div>

      <div className="mb-2 flex items-center">
        <div className="flex mr-2">
          {renderStars()}
        </div>
        <span className="text-xs text-gray-400">{formatDate(date)}</span>
      </div>

      {/* --- MODIFICATION AREA START --- */}
      {(service || productPurchased) && (
        <div className="flex flex-wrap items-start gap-2 mb-3">
          <span className="inline-block px-2 py-1 text-xs rounded-full bg-indigo-700/30 text-indigo-300 border border-indigo-700/50">
            {service || `Purchased: ${productPurchased}`}
          </span>
          {device && (
            // Remove ml-2 as gap-2 handles spacing now
            <span className="inline-block px-2 py-1 text-xs rounded-full bg-purple-700/30 text-purple-300 border border-purple-700/50">
              {device}
            </span>
          )}
        </div>
      )}
      {/* --- MODIFICATION AREA END --- */}

      <p className="text-sm leading-relaxed text-gray-200 flex-grow">"{content}"</p>
    </div>
  );
};

export default TestimonialCard;