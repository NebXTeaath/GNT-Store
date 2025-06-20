// src/pages/ProductDiscountRequest/history/ProductDiscountHistorySkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export const ProductDiscountHistorySkeleton = () => {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#1a1c23] rounded-lg p-6 shadow-sm border border-[#2a2d36]">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 bg-[#2a2d36]" />
                    <Skeleton className="h-5 w-24 bg-[#2a2d36]" />
                </div>
                <Skeleton className="h-7 w-3/4 bg-[#2a2d36]" />
                <Skeleton className="h-4 w-1/2 bg-[#2a2d36]" />
            </div>
            <div className="space-y-2 flex-shrink-0">
                <Skeleton className="h-8 w-24 bg-[#2a2d36] ml-auto" />
                <Skeleton className="h-6 w-20 bg-[#2a2d36] rounded-full ml-auto" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <Skeleton className="h-5 w-28 bg-[#2a2d36]" />
            <Skeleton className="h-9 w-28 bg-[#2a2d36]" />
          </div>
        </div>
      ))}
    </div>
  );
};