// src/pages/checkout/CartDetailsSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CartDetailsSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
      <main className="container mx-auto px-4 py-8">
        {/* Checkout Steps Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center">
                <span className="text-sm font-bold">1</span>
              </div>
              <div className="ml-2 text-sm font-medium">Cart Details</div>
            </div>
            <div className="mx-4 h-1 w-16 bg-[#2a2d36]">
              <div className="h-1 w-0 bg-[#5865f2]"></div>
            </div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-[#2a2d36] flex items-center justify-center">
                <span className="text-sm font-bold">2</span>
              </div>
              <div className="ml-2 text-sm font-medium text-gray-400">Order Summary</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="lg:w-2/3">
            <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
            <div className="mb-4 text-sm text-gray-400">
              <Skeleton className="h-4 w-24 bg-[#2a2d36]" />
            </div>
            
            <div className="space-y-4">
              {/* Skeleton cart items */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4"
                >
                  <Skeleton className="w-24 h-24 bg-[#2a2d36] rounded-md" />
                  <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start w-full">
                    <div className="text-center sm:text-left mb-4 sm:mb-0">
                      <Skeleton className="h-6 w-40 bg-[#2a2d36]" />
                      <Skeleton className="h-4 w-16 mt-1 bg-[#2a2d36]" />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-8 w-8 bg-[#2a2d36] rounded-md" />
                        <Skeleton className="h-6 w-8 bg-[#2a2d36]" />
                        <Skeleton className="h-8 w-8 bg-[#2a2d36] rounded-md" />
                      </div>
                      <Skeleton className="h-6 w-24 bg-[#2a2d36]" />
                      <Skeleton className="h-8 w-8 bg-[#2a2d36] rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <Button
                variant="link"
                className="text-gray-400 hover:text-white px-0"
                disabled
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3 mt-8 lg:mt-0">
            <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <Skeleton className="h-4 w-16 bg-[#2a2d36]" />
                </div>
                
                {/* Discount Code Input Skeleton */}
                <div className="flex flex-col gap-2">
                  <span className="text-gray-400">Discount Code</span>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1 bg-[#2a2d36]" />
                    <Skeleton className="h-10 w-20 bg-[#2a2d36]" />
                  </div>
                  <Skeleton className="h-4 w-32 bg-[#2a2d36]" />
                </div>
                
                <div className="pt-3 border-t border-[#2a2d36]">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <Skeleton className="h-6 w-20 bg-[#2a2d36]" />
                  </div>
                </div>
              </div>
              
              <Skeleton className="w-full h-12 bg-[#2a2d36] rounded-md mt-6" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};