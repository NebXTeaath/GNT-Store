// src/pages/repairPage/history/TrackRepairHistory.tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, Search, Wrench, Loader2 } from "lucide-react"; // Added Loader2
import { useLocation, useNavigate } from "react-router-dom"; // Added useNavigate
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { RepairHistorySkeleton } from "@/components/pages/repairPage/history/RepairHistorySkeleton";
import {
    fetchUserRepairRequestsRpc,
    FetchedSupabaseRepairRequest,
    getStatusColor,
    formatRepairStatus,
    formatDate,
} from "@/lib/pages/repairPage/history/repairHistoryService";
import { toast } from "sonner";
import { RepairDetailsModal } from "@/components/pages/repairPage/history/RepairDetailsPopup";
import { Pagination } from "@/components/pages/searchPage/search/Pagination"; // Ensure path is correct
import SEO from '@/components/seo/SEO';
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 5;

export default function TrackHistory() {
    const { user, isLoadingAuth, isAuthenticated, openLoginModal } = useAuth(); // Get auth state/modal opener
    const location = useLocation();
    const navigate = useNavigate(); // Added useNavigate
    const siteUrl = window.location.origin;
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedRepair, setSelectedRepair] = useState<FetchedSupabaseRepairRequest | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

    // --- Authentication Check Effect ---
    useEffect(() => {
        if (isLoadingAuth) return; // Wait for auth check

        if (!isAuthenticated) {
            console.log('[TrackRepairHistory] Not authenticated, opening login modal.');
            openLoginModal(location.pathname + location.search); // Open modal
        }
        // No need to refetch here unless explicitly desired after auth confirmation
    }, [isLoadingAuth, isAuthenticated, openLoginModal, location.pathname, location.search]);
    // --- End Authentication Check Effect ---

    // --- TanStack Query ---
    const {
        data: queryData,
        isLoading: isLoadingRepairs,
        isFetching: isFetchingRepairs, // Use this for subtle loading indicators if needed
        error: queryError,
        isError: isQueryError,
        refetch,
    } = useQuery({
        queryKey: ['repairRequests', user?.id, currentPage, ITEMS_PER_PAGE],
        queryFn: () => fetchUserRepairRequestsRpc(currentPage, ITEMS_PER_PAGE),
        enabled: !!user?.id && isAuthenticated && !isLoadingAuth, // Enable only if authenticated
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: true,
        placeholderData: (prevData) => prevData,
        retry: 1,
    });

    const repairRequests: FetchedSupabaseRepairRequest[] = queryData?.requests ?? [];
    const totalRepairCount: number = queryData?.totalCount ?? 0;

    // Effects
    useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
    useEffect(() => { setCurrentPage(1); }, [searchTerm]); // Reset page on search
    useEffect(() => { if (isQueryError && queryError) { console.error("Repair request query error:", queryError); toast.error(`Failed to load repair history: ${queryError.message}`); } }, [isQueryError, queryError]);

    // Handlers
    const handleOpenDetails = (repair: FetchedSupabaseRepairRequest) => { setSelectedRepair(repair); setIsDetailsOpen(true); };
    const handlePageChange = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); };

    // Filtering (Client-side on current page)
    const filteredRequests = repairRequests.filter((request) => {
        const lowerTerm = searchTerm.toLowerCase();
        return (request.product_description?.toLowerCase().includes(lowerTerm) ?? false) || (request.id?.toLowerCase().includes(lowerTerm) ?? false);
    });
    const paginatedRequests = filteredRequests; // Display filtered results of current page
    const totalPages = Math.ceil(totalRepairCount / ITEMS_PER_PAGE);

    // Loading State
    const isLoading = isLoadingAuth || (isAuthenticated && isLoadingRepairs);

    // Animation Variants
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
    const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } };

    // SEO Data
    const pageTitle = "Repair History | GNT Store";
    const pageDescription = "Track the status of your repair requests.";
    const canonicalUrl = `${siteUrl}${location.pathname}`;

    // Render Loading state
    if (isLoading) {
        return (
            <div className="bg-[#0f1115] min-h-screen">
                <SEO title="Loading Repair History..." noIndex={true} description={""} />
                <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                    <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold text-white mb-6 flex items-center gap-2"><Wrench className="h-7 w-7" /> Repair History</motion.h1>
                    <RepairHistorySkeleton />
                </div>
            </div>
        );
    }

    // Render null if modal/redirect is happening
    if (!isAuthenticated) {
        return null;
    }

    // Authenticated Render
    return (
        <div className="bg-[#0f1115] min-h-screen">
            <SEO title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} noIndex={true} ogData={{ title: pageTitle, description: pageDescription, url: canonicalUrl, type: 'website', image: `${siteUrl}/favicon/og-image.png` }} />
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold text-white mb-6 flex items-center gap-2"><Wrench className="h-7 w-7" /> Repair History</motion.h1>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
                    <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /> <Input type="text" placeholder="Search by ID or description..." className="pl-10 bg-[#2a2d36] border-[#3f4354] text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /> </div>
                </motion.div>

                {isQueryError ? (
                    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center"> <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" /> <p className="text-red-300">{queryError?.message || "Failed to load repair history."}</p> <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4 border-red-500 text-red-300 hover:bg-red-800/50"> Try Again </Button> </motion.div>
                ) : totalRepairCount === 0 ? (
                    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-[#2a2d36]"> <Wrench className="h-12 w-12 mx-auto text-gray-500 mb-4" /> <h3 className="text-xl font-medium mb-2">No repairs found</h3> <p className="text-gray-400">You haven't submitted any repair requests yet.</p> </motion.div>
                ) : paginatedRequests.length === 0 && searchTerm ? (
                     <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-[#2a2d36]"> <Wrench className="h-12 w-12 mx-auto text-gray-500 mb-4" /> <h3 className="text-xl font-medium mb-2">No repairs match search</h3> <p className="text-gray-400">Try a different term.</p> </motion.div>
                ) : (
                    <>
                        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6">
                            {paginatedRequests.map((request) => (
                                <motion.div key={request.id} variants={itemVariants}>
                                    <Card className="bg-[#1a1c23] border-[#2a2d36] overflow-hidden cursor-pointer hover:border-[#5865f2]/80 group" onClick={() => handleOpenDetails(request)} role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && handleOpenDetails(request)}>
                                         <div className={`border-l-4 ${getStatusColor(request.status)} transition-colors duration-200 ease-in-out`}>
                                            <div className="p-4 sm:p-6">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs"> <span className="bg-[#2a2d36] px-2 py-0.5 text-gray-300 rounded whitespace-nowrap">{request.product_type || 'N/A'}</span> <span className="text-gray-400 truncate">ID: {request.id.substring(0, 8)}...</span> </div>
                                                        <h3 className="text-lg font-semibold text-white mb-1 sm:mb-2 line-clamp-2" title={request.product_description}>{request.product_description || "Device Repair"}</h3>
                                                         <p className="text-xs text-gray-400">Submitted: {formatDate(request.creation_date)}</p>
                                                    </div>
                                                     <div className="flex flex-col items-start sm:items-end flex-shrink-0 mt-2 sm:mt-0">
                                                         <div className="flex items-center gap-2"> <p className="text-sm text-gray-400">Status:</p> <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(request.status)}`}>{formatRepairStatus(request.status)}</span> </div>
                                                         {request.estimated_completion && request.status !== 'completed' && request.status !== 'cancelled' && ( <p className="text-xs text-gray-400 mt-1">ETA: {formatDate(request.estimated_completion)}</p> )}
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                        {totalPages > 1 && ( <div className="mt-8 flex justify-center"> <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} /> </div> )}
                    </>
                )}
            </div>
            {/* Modal */}
            {selectedRepair && ( <RepairDetailsModal repair={selectedRepair} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} /> )}
        </div>
    );
}