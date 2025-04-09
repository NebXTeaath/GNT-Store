//src\pages\ProductDetails\skeletons\SimilarProductsSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export const SimilarProductsSkeleton = () => {
  return (
    <div className="mt-16 animate-fade-in">
      <Skeleton className="h-8 w-48 bg-[#2a2d36] mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array(5).fill(0).map((_, index) => (
          <div key={index} className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg overflow-hidden">
            <div className="aspect-square relative">
              <Skeleton className="w-full h-full bg-[#2a2d36]" />
            </div>
            <div className="p-4">
              <Skeleton className="h-6 w-full bg-[#2a2d36] mb-2" />
              <Skeleton className="h-6 w-2/3 bg-[#2a2d36] mb-2" />
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <Skeleton className="h-6 w-20 bg-[#2a2d36]" />
                  <Skeleton className="h-4 w-16 bg-[#2a2d36] mt-1" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};