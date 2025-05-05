//src\pages\ProductDetails\skeletons\ProductDetailsSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export const ProductDetailsSkeleton = () => {
  return (
    <div className="space-y-6 lg:pl-4 xl:pl-8 animate-fade-in">
      <div>
        <Skeleton className="h-12 w-3/4 bg-[#2a2d36] mb-2" />
        <Skeleton className="h-12 w-2/3 bg-[#2a2d36] mb-2" />
        <Skeleton className="h-6 w-1/2 bg-[#2a2d36] mt-2" />
      </div>

      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-32 bg-[#2a2d36]" />
        <Skeleton className="h-6 w-24 bg-[#2a2d36]" />
      </div>

      <div>
        <Skeleton className="h-6 w-24 bg-[#2a2d36] mb-3" />
        <div className="flex items-center space-x-3 md:space-x-1">
          <Skeleton className="h-10 w-10 bg-[#2a2d36]" />
          <Skeleton className="h-8 w-12 bg-[#2a2d36]" />
          <Skeleton className="h-10 w-10 bg-[#2a2d36]" />
        </div>
      </div>

      <div className="flex space-x-4">
        <Skeleton className="h-14 md:h-16 flex-1 bg-[#2a2d36]" />
        <Skeleton className="h-14 md:h-16 w-14 md:w-16 bg-[#2a2d36]" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-full bg-[#2a2d36]" />
        <Skeleton className="h-4 w-full bg-[#2a2d36]" />
        <Skeleton className="h-4 w-full bg-[#2a2d36]" />
        <Skeleton className="h-4 w-3/4 bg-[#2a2d36]" />
        <Skeleton className="h-4 w-1/2 bg-[#2a2d36]" />
      </div>
    </div>
  );
};
