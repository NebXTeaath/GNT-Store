// src/pages/repairPage/history/TrackRepairHistory.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Search, Wrench } from "lucide-react";
import { useLocation } from "react-router-dom"; // Import useLocation
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import { RepairHistorySkeleton } from "@/pages/repairPage/history/RepairHistorySkeleton";
import { RepairRequest, getUserRepairRequests, getStatusColor, formatRepairStatus } from "@/pages/repairPage/history/repairHistoryService";
import { toast } from "sonner";
import { RepairDetailsModal } from "@/pages/repairPage/history/RepairDetailsPopup";
import { Pagination } from "@/pages/searchPage/search/Pagination";
import SEO from '@/components/seo/SEO'; // Import SEO component

export default function TrackHistory() {
    const { isLoading: isProfileLoading, isError: isProfileError } = useUserProfileQuery();
    const { user } = useAuth();
    const location = useLocation(); // For canonical URL
    const siteUrl = window.location.origin; // Get base URL
    const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
    const [isLoadingRepairs, setIsLoadingRepairs] = useState<boolean>(false);
    const [repairError, setRepairError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const pageSize = 5;
    const [selectedRepair, setSelectedRepair] = useState<RepairRequest | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

    // Effects
    useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
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
    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    // Handlers
    const handleOpenDetails = (repair: RepairRequest) => { setSelectedRepair(repair); setIsDetailsOpen(true); };

    // Filtering and Sorting
    const filteredRequests = repairRequests.filter((request) => {
        const lowerTerm = searchTerm.toLowerCase();
        // Ensure fields exist before calling toLowerCase
        return (
            request.$id?.toLowerCase().includes(lowerTerm) ||
            request.productDescription?.toLowerCase().includes(lowerTerm) ||
            (request.productModel?.toLowerCase()?.includes(lowerTerm) || false)
        );
    });
    const sortedRequests = filteredRequests.slice().sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

    // Pagination
    const totalPages = Math.ceil(sortedRequests.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedRequests = sortedRequests.slice(startIndex, startIndex + pageSize);

    // Animation Variants
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
    const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } };

    // Loading State
    const isAuthenticated = !!user;
    const showSkeleton = isLoadingRepairs || (isAuthenticated && isProfileLoading);

    // SEO Data
    const pageTitle = "Repair History | GNT Store";
    const pageDescription = "Track the status of your current and past repair requests at GNT Store.";
    const canonicalUrl = `${siteUrl}${location.pathname}`; // Use current path

    return (
        <div className="bg-[#0f1115] min-h-screen">
             <SEO
                title={pageTitle}
                description={pageDescription}
                canonicalUrl={canonicalUrl}
                noIndex={true} // Prevent indexing of personal repair history
                ogData={{
                    title: pageTitle,
                    description: pageDescription,
                    url: canonicalUrl,
                    type: 'website',
                    image: `${siteUrl}/favicon/og-image.png`
                }}
            />
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                 <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-3xl font-bold text-white mb-6 flex items-center gap-2"> <Wrench className="h-7 w-7" /> Repair History </motion.h1>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="mb-6">
                    <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /> <Input type="text" placeholder="Search by ID, description, or model..." className="pl-10 bg-[#2a2d36] border-[#3f4354] text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /> </div>
                </motion.div>

                {showSkeleton ? ( <RepairHistorySkeleton /> ) : repairError ? ( <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center"> <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" /> <p className="text-red-300">{repairError}</p> </motion.div> ) : isProfileError ? ( <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center"> <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" /> <p className="text-red-300">Error loading profile data. Cannot fetch repairs.</p> </motion.div> ) : sortedRequests.length === 0 ? ( <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-[#2a2d36]"> <Wrench className="h-12 w-12 mx-auto text-gray-500 mb-4" /> <h3 className="text-xl font-medium mb-2">No repairs found</h3> <p className="text-gray-400">{searchTerm ? "No repairs match your search." : "You haven't submitted any repair requests yet."}</p> </motion.div> ) : (
                    <>
                        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6">
                            {paginatedRequests.map((request) => (
                                <motion.div key={request.$id} variants={itemVariants}>
                                    <Card className="bg-[#1a1c23] border-[#2a2d36] overflow-hidden cursor-pointer hover:border-[#5865f2]/80 transition-colors duration-200 ease-in-out group" onClick={() => handleOpenDetails(request)} role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && handleOpenDetails(request)}>
                                        <div className={`border-l-4 ${getStatusColor(request.status)} transition-colors duration-200 ease-in-out`}>
                                            <div className="p-4 sm:p-6">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs"> <span className="bg-[#2a2d36] px-2 py-0.5 text-gray-300 rounded whitespace-nowrap"> {request.productType || 'N/A'} </span> <span className="text-gray-400 truncate">ID: {request.$id}</span> </div>
                                                        <h3 className="text-lg font-semibold text-white mb-1 sm:mb-2 line-clamp-1" title={request.productModel || "Device Repair"}> {request.productModel || "Device Repair"} </h3>
                                                        <p className="text-sm text-gray-300 line-clamp-2 mb-2" title={request.productDescription}> {request.productDescription} </p>
                                                        <p className="text-xs text-gray-400"> Submitted: {new Date(request.creationDate).toLocaleDateString()} {new Date(request.creationDate).toLocaleTimeString()} </p>
                                                    </div>
                                                    <div className="flex flex-col items-start sm:items-end flex-shrink-0 mt-2 sm:mt-0">
                                                        <div className="flex items-center gap-2"> <p className="text-sm text-gray-400">Status:</p> <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(request.status)}`}> {formatRepairStatus(request.status)} </span> </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                        {totalPages > 1 && ( <div className="mt-8 flex justify-center"> <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /> </div> )}
                    </>
                )}
            </div>
            {selectedRepair && ( <RepairDetailsModal repair={selectedRepair} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} /> )}
        </div>
    );
}