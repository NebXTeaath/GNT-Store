//src\pages\ProductDetails\skeletons\ProductImageSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export const ProductImageSkeleton = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative overflow-visible -mx-4 md:mx-0 md:px-8">
        <div className="aspect-square relative overflow-hidden rounded-xl bg-[#1a1c23]">
          <Skeleton className="w-full h-full bg-[#2a2d36]" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        {Array(4).fill(0).map((_, index) => (
          <div key={index} className="aspect-square relative overflow-hidden rounded-lg bg-[#1a1c23]">
            <Skeleton className="w-full h-full bg-[#2a2d36]" />
          </div>
        ))}
      </div>
    </div>
  );
};
