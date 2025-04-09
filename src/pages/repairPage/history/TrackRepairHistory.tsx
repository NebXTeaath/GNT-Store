// src/pages/repairPage/history/TrackRepairHistory.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Search, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData'; // Import the TanStack hook
import { RepairHistorySkeleton } from "@/pages/repairPage/history/RepairHistorySkeleton";
import { RepairRequest, getUserRepairRequests, getStatusColor, formatRepairStatus } from "@/pages/repairPage/history/repairHistoryService"; // Assuming this service exists and is correct
import { toast } from "sonner";
import { RepairDetailsModal } from "@/pages/repairPage/history/RepairDetailsPopup";
import { Pagination } from "@/pages/searchPage/search/Pagination";

export default function TrackHistory() {
    // Use TanStack Query hook for profile data
    const { isLoading: isProfileLoading, isError: isProfileError } = useUserProfileQuery();
    const { user } = useAuth(); // Auth context still needed for user ID
    const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
    const [isLoadingRepairs, setIsLoadingRepairs] = useState<boolean>(false); // Renamed loading state
    const [repairError, setRepairError] = useState<string | null>(null); // Renamed error state
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const pageSize = 5;

    // State for the selected repair and modal visibility
    const [selectedRepair, setSelectedRepair] = useState<RepairRequest | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

    // Scroll to Top on Mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    // Fetch repair requests when component mounts or user changes
    useEffect(() => {
        const fetchRepairRequests = async () => {
            if (!user?.$id) {
                 console.log("TrackHistory: No user ID, skipping repair fetch.");
                 setRepairRequests([]); // Clear requests if user logs out
                 return;
            };

            console.log("TrackHistory: User ID found, fetching repairs...");
            setIsLoadingRepairs(true);
            setRepairError(null);
            try {
                const requests = await getUserRepairRequests(user.$id); // Assuming this function uses the user ID
                setRepairRequests(requests);
            } catch (err) {
                console.error("Error fetching repair requests:", err);
                const errorMessage = "Failed to fetch your repair requests. Please try again later.";
                setRepairError(errorMessage);
                toast.error(errorMessage);
            } finally {
                setIsLoadingRepairs(false);
            }
        };
        // Fetch repairs only if user ID is available
         fetchRepairRequests();

    }, [user?.$id]); // Depend directly on user.$id

    // Handle opening the details modal
    const handleOpenDetails = (repair: RepairRequest) => {
        setSelectedRepair(repair);
        setIsDetailsOpen(true);
    };

    // Filter repair requests based on search term
    const filteredRequests = repairRequests.filter((request) => {
        const lowerTerm = searchTerm.toLowerCase();
        // Ensure fields exist before calling toLowerCase
        return (
            request.$id?.toLowerCase().includes(lowerTerm) ||
            request.productDescription?.toLowerCase().includes(lowerTerm) ||
            (request.productModel?.toLowerCase()?.includes(lowerTerm) || false)
        );
    });

    // Sort requests by creation date (newest first)
    const sortedRequests = filteredRequests.slice().sort(
        (a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
    );

    // Reset current page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination logic
    const totalPages = Math.ceil(sortedRequests.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedRequests = sortedRequests.slice(startIndex, startIndex + pageSize);

    // Animation Variants (keep as is)
    const containerVariants = { /* ... */ };
    const itemVariants = { /* ... */ };

    // Combined loading state for skeleton UI
    const isAuthenticated = !!user; // Determine auth status based on user object
    const showSkeleton = isLoadingRepairs || (isAuthenticated && isProfileLoading); // Show skeleton if loading repairs OR if logged in and profile is still loading initially


    return (
        <div className="bg-[#0f1115] min-h-screen"> {/* Ensure minimum height */}
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                 {/* Header/Title can be added here */}
                  <motion.h1
                     initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                     className="text-3xl font-bold text-white mb-6 flex items-center gap-2"
                 >
                      <Wrench className="h-7 w-7" /> Repair History
                  </motion.h1>


                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-6"
                >
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by ID, description, or model..." // Updated placeholder
                            className="pl-10 bg-[#2a2d36] border-[#3f4354] text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </motion.div>

                {showSkeleton ? (
                    <RepairHistorySkeleton />
                ) : repairError ? ( // Check for repair fetch error first
                    <motion.div /* ... Error Display ... */ >
                         <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-8 max-w-md mx-auto">
                             <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                             <h3 className="text-lg font-medium text-white mb-2">Error Loading Repairs</h3>
                             <p className="text-gray-400">{repairError}</p>
                             {/* Optional: Add a retry button */}
                              {/* <Button onClick={() => fetchRepairRequests()} className="mt-4">Retry</Button> */}
                         </div>
                    </motion.div>
                 ) : isProfileError ? ( // Check for profile fetch error if repairs loaded okay
                     <motion.div /* ... Error Display ... */ >
                          <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-8 max-w-md mx-auto">
                              <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-white mb-2">Profile Error</h3>
                              <p className="text-gray-400">Could not load profile information, but repair history is available.</p>
                          </div>
                     </motion.div>
                ) : sortedRequests.length === 0 ? (
                    <motion.div /* ... No Requests Found Display ... */
                         className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-[#2a2d36]"
                    >
                        <div className="w-16 h-16 bg-[#2a2d36] rounded-full flex items-center justify-center mx-auto mb-6">
                             <Wrench className="h-8 w-8 text-[#5865f2]" />
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">
                             {searchTerm ? "No matching repairs found" : "No Repair Requests"}
                        </h3>
                         <p className="text-gray-400 max-w-md mx-auto mb-6">
                             {searchTerm
                                 ? `We couldn't find any repair requests matching "${searchTerm}". Try a different search term.`
                                 : "You haven't submitted any repair requests yet."}
                        </p>
                        {/* Consider linking to the new request page */}
                         {/* <Button onClick={() => navigate('/repair/new-request')} className="bg-[#5865f2] hover:bg-[#4752c4] text-white">Submit New Request</Button> */}
                     </motion.div>
                ) : (
                    // Display repair requests list and pagination
                    <>
                        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6">
                            {paginatedRequests.map((request) => (
                                <motion.div key={request.$id} variants={itemVariants}>
                                    <Card
                                        className="bg-[#1a1c23] border-[#2a2d36] overflow-hidden cursor-pointer hover:border-[#5865f2]/80 transition-colors duration-200 ease-in-out group" // Added group for potential hover effects
                                        onClick={() => handleOpenDetails(request)}
                                        role="button" // Accessibility
                                        tabIndex={0} // Accessibility
                                        onKeyPress={(e) => e.key === 'Enter' && handleOpenDetails(request)} // Accessibility
                                    >
                                        {/* Optional: Subtle gradient or indicator */}
                                         {/* <div className={`h-1 bg-gradient-to-r ${getStatusGradient(request.status)}`}></div> */}
                                        <div className={`border-l-4 ${getStatusColor(request.status)} transition-colors duration-200 ease-in-out`}> {/* Status color border */}
                                            <div className="p-4 sm:p-6"> {/* Adjusted padding */}
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1 min-w-0"> {/* Prevent overflow */}
                                                        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                                                             <span className="bg-[#2a2d36] px-2 py-0.5 text-gray-300 rounded whitespace-nowrap">
                                                                 {request.productType || 'N/A'}
                                                             </span>
                                                             <span className="text-gray-400 truncate">ID: {request.$id}</span>
                                                        </div>
                                                        <h3 className="text-lg font-semibold text-white mb-1 sm:mb-2 line-clamp-1" title={request.productModel || "Device Repair"}>
                                                            {request.productModel || "Device Repair"}
                                                        </h3>
                                                        <p className="text-sm text-gray-300 line-clamp-2 mb-2" title={request.productDescription}>
                                                            {request.productDescription}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            Submitted: {new Date(request.creationDate).toLocaleDateString()} {new Date(request.creationDate).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-start sm:items-end flex-shrink-0 mt-2 sm:mt-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm text-gray-400">Status:</p>
                                                            {/* Using simplified status display */}
                                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(request.status)}`}>
                                                                {formatRepairStatus(request.status)}
                                                             </span>
                                                        </div>
                                                         {/* Optional: Add Estimated Completion Date if available */}
                                                         {/* {request.estimatedCompletion && <p className="text-xs text-gray-400 mt-2">Est. Completion: {new Date(request.estimatedCompletion).toLocaleDateString()}</p>} */}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                        {totalPages > 1 && (
                            <div className="mt-8 flex justify-center"> {/* Centered pagination */}
                                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Details Modal */}
            {selectedRepair && (
                <RepairDetailsModal
                     repair={selectedRepair}
                     open={isDetailsOpen}
                     onOpenChange={setIsDetailsOpen}
                 />
            )}
        </div>
    );
}


