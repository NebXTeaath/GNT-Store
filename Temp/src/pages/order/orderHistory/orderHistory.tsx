// src/pages/order/orderHistory/order-history.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Package, Clock, AlertCircle, Loader2 } from "lucide-react"; // Added Loader2
import { useLocation, useNavigate } from "react-router-dom"; // Added useNavigate
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/components/pages/order/orderHistory/OrderCard";
import { EmptyOrderState } from "@/components/pages/order/orderHistory/EmptyOrderState";
import { OrderHistorySkeleton } from "@/components/pages/order/orderHistory/OrderHistorySkeleton";
import { fetchUserOrdersRpc, Order as FetchedSupabaseOrder } from "@/lib/pages/order/orderHistory/orderService"; // Use alias
import { Pagination } from "@/components/pages/searchPage/search/Pagination"; // Ensure path is correct
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import SEO from '@/components/seo/SEO';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
// Removed RepairDetailsModal import if not used here

const ITEMS_PER_PAGE = 5;

const OrderHistory = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Added useNavigate
  const siteUrl = window.location.origin;
  const [activeTab, setActiveTab] = useState("active-orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { user, isLoadingAuth, isAuthenticated, openLoginModal } = useAuth(); // Get auth state/modal opener

  // --- Authentication Check Effect ---
  useEffect(() => {
      if (isLoadingAuth) return; // Wait for auth check

      if (!isAuthenticated) {
          console.log('[OrderHistory] Not authenticated, opening login modal.');
          openLoginModal(location.pathname + location.search); // Open modal
      }
      // No need to refetch here, query 'enabled' flag handles it
  }, [isLoadingAuth, isAuthenticated, openLoginModal, location.pathname, location.search]);
  // --- End Authentication Check Effect ---


  // --- TanStack Query ---
  const {
      data: queryData,
      isLoading: isLoadingOrders,
      isFetching: isFetchingOrders,
      error: queryError,
      isError: isQueryError,
      refetch,
    } = useQuery({
      queryKey: ["orders", user?.id, currentPage, ITEMS_PER_PAGE],
      queryFn: () => fetchUserOrdersRpc(currentPage, ITEMS_PER_PAGE),
      enabled: !!user?.id && isAuthenticated && !isLoadingAuth, // Enable only if authenticated
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      placeholderData: (prevData) => prevData,
      retry: 1
  });

  const orders: FetchedSupabaseOrder[] = queryData?.orders ?? [];
  const totalOrderCount: number = queryData?.totalCount ?? 0;

  // --- Filtering (Client-side on current page) ---
  const filteredOrders = orders?.filter((order) => {
    const orderIdMatch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const productNameMatch = order.order_details?.products?.some( (product) => product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false ) ?? false;
    const matchesSearch = orderIdMatch || productNameMatch;
    const status = order.order_status?.toLowerCase() ?? 'unknown';
    const isActiveOrder = ["pending", "processing", "shipped", "failed"].includes(status);
    const isCompletedOrder = ["delivered", "cancelled"].includes(status);
    return matchesSearch && (activeTab === "active-orders" ? isActiveOrder : isCompletedOrder);
  }) ?? [];

  const totalPages = Math.ceil(totalOrderCount / ITEMS_PER_PAGE);
  const currentOrders = filteredOrders;

  const handlePageChange = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // Effects
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery]);
  useEffect(() => { if (isQueryError && queryError) { console.error("Order query error:", queryError); toast.error(`Failed to load orders: ${queryError.message}`); } }, [isQueryError, queryError]);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

  // SEO Data
  const pageTitle = "Order History | GNT Store";
  const pageDescription = "View and track your orders on GNT Store.";
  const canonicalUrl = `${siteUrl}${location.pathname}`;

  const isLoading = isLoadingAuth || (isAuthenticated && isLoadingOrders); // Combined loading

  // Render Loading state
  if (isLoading) {
      return ( <div className="min-h-screen bg-[#0f1115]"> <SEO title="Loading Orders..." noIndex={true} description={""} /> <main className="container mx-auto px-4 py-8"> <OrderHistorySkeleton /> </main> </div> );
  }

  // Render null if redirect/modal is happening
  if (!isAuthenticated) {
      return null;
  }

  // Authenticated Render
  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
       <SEO title={pageTitle} description={pageDescription} canonicalUrl={canonicalUrl} noIndex={true} ogData={{ title: pageTitle, description: pageDescription, url: canonicalUrl, type: 'website', image: `${siteUrl}/favicon/og-image.png` }} />
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Order History</h1>
          <p className="text-gray-400">View and track your current and past orders</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="mb-6">
          <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /> <Input placeholder="Search by ID or product name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[#2a2d36] border-[#3f4354] text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2]" /> </div>
        </motion.div>
        <Tabs defaultValue="active-orders" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <TabsList className="grid w-full grid-cols-2 bg-[#2a2d36] p-1">
                <TabsTrigger value="active-orders" className="data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-300 rounded-md"> <Clock className="h-4 w-4 mr-2" /> Active Orders </TabsTrigger>
                <TabsTrigger value="completed-orders" className="data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-300 rounded-md"> <Package className="h-4 w-4 mr-2" /> Completed Orders </TabsTrigger>
            </TabsList>
          </motion.div>

          {isQueryError ? (
             <div className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-red-500/30 text-red-400"> <h3 className="text-xl font-medium mb-2">Error Loading Orders</h3> <p>Could not fetch order history.</p> <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4 border-red-500 text-red-300 hover:bg-red-800/50">Retry</Button> </div>
          ) : totalOrderCount === 0 ? ( // Check total count first for empty state
              <div className="mt-10"> <EmptyOrderState /> </div> // Show general empty state if no orders ever
          ) : (
             <>
                <TabsContent value="active-orders">
                    {currentOrders.length > 0 ? ( <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6"> {currentOrders.map((order) => ( <OrderCard key={order.id} order={order} /> ))} </motion.div> ) : ( <EmptyOrderState searchQuery={searchQuery} /> )}
                </TabsContent>
                <TabsContent value="completed-orders">
                     {currentOrders.length > 0 ? ( <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6"> {currentOrders.map((order) => ( <OrderCard key={order.id} order={order} /> ))} </motion.div> ) : ( <EmptyOrderState searchQuery={searchQuery} /> )}
                </TabsContent>
                {totalPages > 1 && ( <div className="mt-8"> <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} /> </div> )}
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default OrderHistory;