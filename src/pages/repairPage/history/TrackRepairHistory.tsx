// src/pages/repairPage/history/TrackRepairHistory.tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query"; // Import useQuery
import { motion } from "framer-motion";
import { AlertCircle, Search, Wrench } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
// Removed profile query import if not needed
// import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import { RepairHistorySkeleton } from "@/pages/repairPage/history/RepairHistorySkeleton";
import {
    // Import the NEW service function and types
    fetchUserRepairRequestsRpc,
    FetchedSupabaseRepairRequest, // Use the specific type from the service
    getStatusColor,
    formatRepairStatus,
    formatDate, // Use the date formatter from the service
} from "@/pages/repairPage/history/repairHistoryService";
import { toast } from "sonner";
import { RepairDetailsModal } from "@/pages/repairPage/history/RepairDetailsPopup";
import { Pagination } from "@/pages/searchPage/search/Pagination";
import SEO from '@/components/seo/SEO';
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 5; // Keep page size consistent

export default function TrackHistory() {
    // Removed profile query call if not needed here
    const { user, isLoadingAuth } = useAuth(); // Get user and auth loading state
    const location = useLocation();
    const siteUrl = window.location.origin;
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedRepair, setSelectedRepair] = useState<FetchedSupabaseRepairRequest | null>(null); // Use correct type
    const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

    // --- TanStack Query for fetching Repair Requests ---
    const {
        data: queryData, // Contains { requests: [], totalCount: 0 }
        isLoading: isLoadingRepairs,
        isFetching: isFetchingRepairs, // Optional: show loading indicators during refetch
        error: queryError,
        isError: isQueryError,
        refetch, // Function to manually refetch
    } = useQuery({
        // Query key includes user ID (or null) and pagination params
        queryKey: ['repairRequests', user?.id, currentPage, ITEMS_PER_PAGE],
        // Query function uses the new RPC service
        queryFn: () => fetchUserRepairRequestsRpc(currentPage, ITEMS_PER_PAGE),
        // Only run the query if the user is authenticated and auth check is done
        enabled: !!user?.id && !isLoadingAuth,
        staleTime: 60 * 1000, // 1 minute stale time
        gcTime: 10 * 60 * 1000, // 10 minutes cache time
        refetchOnWindowFocus: true, // Refetch when window gains focus
        placeholderData: (prevData) => prevData, // Keep showing old data while fetching new page
        retry: 1, // Retry once on error
    });

    // Extract data safely from query result
    const repairRequests: FetchedSupabaseRepairRequest[] = queryData?.requests ?? [];
    const totalRepairCount: number = queryData?.totalCount ?? 0;

    // --- Effects ---
    useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
    // Reset to page 1 when search term changes
    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    // Handle potential query errors
    useEffect(() => {
        if (isQueryError && queryError) {
            console.error("Repair request query error:", queryError);
            toast.error(`Failed to load repair history: ${queryError.message}`);
        }
    }, [isQueryError, queryError]);

    // --- Handlers ---
    const handleOpenDetails = (repair: FetchedSupabaseRepairRequest) => { // Use correct type
        setSelectedRepair(repair);
        setIsDetailsOpen(true);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // --- Filtering (Client-side AFTER fetch - Consider Server-Side for performance) ---
    // Note: This filters only the *current page* of results fetched by the RPC.
    // For true global search/filter, the RPC needs `search_term` and `status` parameters.
    const filteredRequests = repairRequests.filter((request) => {
        const lowerTerm = searchTerm.toLowerCase();
        const descriptionMatch = request.product_description?.toLowerCase().includes(lowerTerm) ?? false;
        const idMatch = request.id?.toLowerCase().includes(lowerTerm) ?? false;
        // Add other searchable fields if needed (e.g., product_type)
        // const typeMatch = request.product_type?.toLowerCase().includes(lowerTerm) ?? false;
        return descriptionMatch || idMatch; // || typeMatch;
    });
    // Sorting is handled by the RPC's `ORDER BY creation_date DESC`

    // --- Pagination ---
    // Total pages calculated based on the *total count* from the RPC
    const totalPages = Math.ceil(totalRepairCount / ITEMS_PER_PAGE);

    // The items to display are the `filteredRequests` from the current fetched page
    const paginatedRequests = filteredRequests;

    // --- Loading State ---
    // Consider both auth loading and repair data loading for the initial skeleton state
    const isLoading = (isLoadingAuth || isLoadingRepairs) && !queryData;

    // --- Animation Variants (keep as is) ---
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
    const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } };

    // --- SEO Data (keep as is) ---
    const pageTitle = "Repair History | GNT Store";
    const pageDescription = "Track the status of your current and past repair requests at GNT Store.";
    const canonicalUrl = `${siteUrl}${location.pathname}`;

    return (
        <div className="bg-[#0f1115] min-h-screen">
            <SEO
                title={pageTitle}
                description={pageDescription}
                canonicalUrl={canonicalUrl}
                noIndex={true}
                ogData={{ /* ... as before ... */ }}
            />
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                    <Wrench className="h-7 w-7" /> Repair History
                </motion.h1>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input type="text" placeholder="Search by ID or description..." className="pl-10 bg-[#2a2d36] border-[#3f4354] text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </motion.div>

                {isLoading ? (
                    <RepairHistorySkeleton />
                ) : isQueryError ? (
                    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                        <p className="text-red-300">{queryError?.message || "Failed to load repair history."}</p>
                        <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4 border-red-500 text-red-300 hover:bg-red-800/50">
                            Try Again
                        </Button>
                    </motion.div>
                // Check if *after* loading, the user isn't authenticated (e.g., token expired)
                ) : !user ? (
                     <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-[#2a2d36]">
                        <Wrench className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-xl font-medium mb-2">Login Required</h3>
                        <p className="text-gray-400">Please log in to view your repair history.</p>
                        {/* Optional: Add a login button */}
                    </motion.div>
                ) : totalRepairCount === 0 ? ( // Check total count from RPC
                    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-[#2a2d36]">
                        <Wrench className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-xl font-medium mb-2">No repairs found</h3>
                        <p className="text-gray-400">{searchTerm ? "No repairs match your search." : "You haven't submitted any repair requests yet."}</p>
                    </motion.div>
                ) : paginatedRequests.length === 0 && searchTerm ? ( // Handle case where current page is empty due to filtering
                     <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-[#2a2d36]">
                         <Wrench className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                         <h3 className="text-xl font-medium mb-2">No repairs match your search</h3>
                         <p className="text-gray-400">Try a different search term or clear the search.</p>
                     </motion.div>
                ) : (
                    <>
                        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6">
                            {paginatedRequests.map((request) => (
                                <motion.div key={request.id} variants={itemVariants}>
                                    {/* Card Content */}
                                    <Card
                                        className="bg-[#1a1c23] border-[#2a2d36] overflow-hidden cursor-pointer hover:border-[#5865f2]/80 transition-colors duration-200 ease-in-out group"
                                        onClick={() => handleOpenDetails(request)} role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && handleOpenDetails(request)}
                                    >
                                         {/* Apply status color to border */}
                                         <div className={`border-l-4 ${getStatusColor(request.status)} transition-colors duration-200 ease-in-out`}>
                                            <div className="p-4 sm:p-6">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        {/* Request Details */}
                                                        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                                                            <span className="bg-[#2a2d36] px-2 py-0.5 text-gray-300 rounded whitespace-nowrap">
                                                                {request.product_type || 'N/A'}
                                                            </span>
                                                            <span className="text-gray-400 truncate">
                                                                ID: {request.id.substring(0, 8)}...
                                                            </span>
                                                        </div>
                                                        <h3 className="text-lg font-semibold text-white mb-1 sm:mb-2 line-clamp-2" title={request.product_description}>
                                                            {request.product_description || "Device Repair"}
                                                        </h3>
                                                         {/* Use formatDate from service */}
                                                         <p className="text-xs text-gray-400">
                                                            Submitted: {formatDate(request.creation_date)}
                                                        </p>
                                                    </div>
                                                     {/* Status */}
                                                     <div className="flex flex-col items-start sm:items-end flex-shrink-0 mt-2 sm:mt-0">
                                                         <div className="flex items-center gap-2">
                                                             <p className="text-sm text-gray-400">Status:</p>
                                                             {/* Use getStatusColor and formatRepairStatus from service */}
                                                             <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(request.status)}`}>
                                                                 {formatRepairStatus(request.status)}
                                                             </span>
                                                         </div>
                                                         {request.estimated_completion && request.status !== 'completed' && request.status !== 'cancelled' && (
                                                             <p className="text-xs text-gray-400 mt-1">
                                                                 ETA: {formatDate(request.estimated_completion)} {/* Use helper */}
                                                             </p>
                                                         )}
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                        {/* Pagination - Render based on totalPages */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex justify-center">
                                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* Modal */}
            {selectedRepair && (
                <RepairDetailsModal
                    // Pass the correct type here
                    repair={selectedRepair as FetchedSupabaseRepairRequest} // Cast might be needed if state type isn't inferred perfectly
                    open={isDetailsOpen}
                    onOpenChange={setIsDetailsOpen}
                />
            )}
        </div>
    );
}