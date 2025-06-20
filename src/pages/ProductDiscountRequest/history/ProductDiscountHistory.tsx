// src/pages/ProductDiscountRequest/history/ProductDiscountHistory.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Tag, AlertCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchUserProductDiscountRequestsRpc} from "./productDiscountHistoryService";
import { FetchedProductDiscountRequest } from "@/lib/types/ProductDiscountRequestTypes";
import { ProductDiscountHistoryCard } from "./ProductDiscountHistoryCard";
import { ProductDiscountHistorySkeleton } from "./ProductDiscountHistorySkeleton";
import { ProductDiscountDetailsModal } from "./ProductDiscountDetailsPopup";
import { Pagination } from "@/components/pages/searchPage/search/Pagination";
import SEO from '@/components/seo/SEO';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 5;

export default function ProductDiscountHistory() {
  const location = useLocation();
  const { user, isLoadingAuth, isAuthenticated, openLoginModal } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<FetchedProductDiscountRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      openLoginModal(location.pathname);
    }
  }, [isLoadingAuth, isAuthenticated, openLoginModal, location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['productDiscountHistory', user?.id, currentPage],
    queryFn: () => fetchUserProductDiscountRequestsRpc(currentPage, ITEMS_PER_PAGE),
    enabled: !!user?.id && isAuthenticated && !isLoadingAuth,
  });

  const requests = data?.requests ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  useEffect(() => {
    if (isError) toast.error("Failed to load history", { description: (error as Error).message });
  }, [isError, error]);

  const handleOpenDetails = (request: FetchedProductDiscountRequest) => {
    setSelectedRequest(request);
    setIsDetailsOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  if (isLoadingAuth || (!data && isLoading)) {
    return (
        <div className="min-h-screen bg-[#0f1115]">
            <SEO title="Loading Request History..." noIndex={true} description="" />
            <div className="container mx-auto px-4 py-8">
                <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                    <Tag className="h-7 w-7" /> Discount Request History
                </motion.h1>
                <ProductDiscountHistorySkeleton />
            </div>
        </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
      <SEO title="Discount Request History | GNT Store" noIndex={true} description="Track your product discount requests." />
      <main className="container mx-auto px-4 py-8">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
            <Tag className="h-7 w-7" /> Discount Request History
        </motion.h1>

        {isError && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <p className="text-red-300">Could not fetch your request history.</p>
                <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4 border-red-500 text-red-300 hover:bg-red-800/50">Try Again</Button>
            </div>
        )}

        {!isError && totalCount === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#1a1c23] rounded-lg p-10 text-center">
                <Tag className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                <h3 className="text-xl font-medium mb-2">No History Found</h3>
                <p className="text-gray-400">You haven't requested any discounts yet.</p>
            </motion.div>
        )}

        {!isError && totalCount > 0 && (
            <>
                <motion.div initial="hidden" animate="visible" className="space-y-6">
                    {requests.map(req => <ProductDiscountHistoryCard key={req.id} request={req} onOpenDetails={() => handleOpenDetails(req)} />)}
                </motion.div>
                {totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    </div>
                )}
            </>
        )}
      </main>
      <ProductDiscountDetailsModal request={selectedRequest} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
    </div>
  );
}