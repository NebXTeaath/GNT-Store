//src/pages/order/orderHistory/OrderHistorySkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export const OrderHistorySkeleton = () => {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-[#1a1c23] rounded-lg p-6 shadow-sm border border-[#2a2d36]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Skeleton className="h-6 w-24 bg-[#2a2d36]" />
              <Skeleton className="h-6 w-20 rounded-full bg-[#2a2d36]" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 bg-[#2a2d36]" />
              <Skeleton className="h-6 w-24 mt-1 bg-[#2a2d36]" />
            </div>
          </div>
          <Skeleton className="h-4 w-32 mb-4 bg-[#2a2d36]" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-md bg-[#2a2d36]" />
              <Skeleton className="h-4 w-20 bg-[#2a2d36]" />
            </div>
            <Skeleton className="h-9 w-28 bg-[#2a2d36]" />
          </div>
        </div>
      ))}
    </div>
  );
};