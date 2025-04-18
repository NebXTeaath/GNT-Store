// src/pages/order/orderHistory/order-history.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Package, Clock } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/pages/order/orderHistory/OrderCard";
import { EmptyOrderState } from "@/pages/order/orderHistory/EmptyOrderState";
import { OrderHistorySkeleton } from "@/pages/order/orderHistory/OrderHistorySkeleton";
// Removed useUserProfileQuery if not directly needed for display logic here
// import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import { fetchUserOrdersRpc, Order } from "@/pages/order/orderHistory/orderService"; // Import RPC fetcher and Order type alias
import { FetchedSupabaseOrder } from "@/pages/order/checkout/orderUtils"; // Import correct type
import { toast } from "sonner";
// Removed Appwrite imports
// import { databases, APPWRITE_DATABASE_ID } from "@/lib/appwrite";
// import { Query } from "appwrite";
import { Pagination } from "@/pages/searchPage/search/Pagination";
import { useAuth } from "@/context/AuthContext";
import SEO from '@/components/seo/SEO';

const ITEMS_PER_PAGE = 5;

const OrderHistory = () => {
  // Removed profile query if not needed: useUserProfileQuery();
  const location = useLocation();
  const siteUrl = window.location.origin;
  const [activeTab, setActiveTab] = useState("active-orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { user, isLoadingAuth } = useAuth(); // Get loading state from auth

  // --- TanStack Query using the RPC fetcher ---
  const {
      data: queryData, // Contains { orders: [], totalCount: 0 }
      isLoading: isLoadingOrders, // Renamed to avoid conflict
      isFetching: isFetchingOrders, // Optional: for showing refetch indicators
      error: queryError, // Renamed to avoid conflict
      isError: isQueryError // Boolean flag for error state
    } = useQuery({
      // Query key includes user ID and current page for caching and refetching
      queryKey: ["orders", user?.id, currentPage, ITEMS_PER_PAGE],
      // Query function calls the RPC service
      queryFn: () => fetchUserOrdersRpc(currentPage, ITEMS_PER_PAGE),
      // Only run the query if the user is authenticated and auth isn't loading
      enabled: !!user?.id && !isLoadingAuth,
      // Optional: Keep data fresh for a while
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      placeholderData: (prevData) => prevData, // Keep previous data while fetching new page
      retry: 1 // Retry once on failure
  });

  // Extract orders and total count from queryData
  const orders: FetchedSupabaseOrder[] = queryData?.orders ?? [];
  const totalOrderCount: number = queryData?.totalCount ?? 0;

  // Filter orders based on search query and active tab
  const filteredOrders = orders?.filter((order) => {
    // Ensure order_details and products exist before searching
    const orderIdMatch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const productNameMatch = order.order_details?.products?.some(
      (product) => product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
    ) ?? false; // Check if product name exists

    const matchesSearch = orderIdMatch || productNameMatch;

    // Ensure order_status exists
    const status = order.order_status?.toLowerCase() ?? 'unknown';
    const isActiveOrder = ["pending", "processing", "shipped", "failed"].includes(status); // Include 'failed' in active? Or completed? Adjust as needed.
    const isCompletedOrder = ["delivered", "cancelled"].includes(status);

    if (activeTab === "active-orders") {
      return matchesSearch && isActiveOrder;
    } else { // completed-orders
      return matchesSearch && isCompletedOrder;
    }
  }) ?? []; // Default to empty array if orders is null/undefined

  // --- Pagination Logic ---
  // Calculate total pages based on the *total count from the RPC*, not the filtered length
  const totalPages = Math.ceil(totalOrderCount / ITEMS_PER_PAGE);

  // NOTE: The current implementation fetches ALL orders for the user via queryKey and then filters/slices locally.
  // For large order histories, it would be more efficient to pass search/status filters TO the RPC.
  // However, for simplicity with the current structure, we'll keep client-side filtering *after* the paginated fetch.
  // This means filtering/sorting only applies to the *current page* fetched.
  // To fix this, the RPC would need search/status parameters. We'll keep it simple for now.

  const sortedOrders = filteredOrders ? [...filteredOrders] : []; // No need to sort again if already sorted by DB
  const currentOrders = sortedOrders; // Display all fetched orders for the current page after filtering

  const handlePageChange = (page: number) => {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Effects ---
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  // Reset page to 1 when tab or search changes (client-side filtering doesn't strictly require this, but good UX)
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery]);

  // Handle potential query errors
  useEffect(() => {
      if (isQueryError && queryError) {
          console.error("Order query error:", queryError);
          toast.error(`Failed to load orders: ${queryError.message}`);
      }
  }, [isQueryError, queryError]);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

  // SEO Data
  const pageTitle = "Order History | GNT Store";
  const pageDescription = "View and track your current and past orders on GNT Store.";
  const canonicalUrl = `${siteUrl}${location.pathname}`;

  const isLoading = isLoadingOrders || isLoadingAuth; // Consider auth loading as well

  return (
    <div className="min-h-screen bg-[#0f1115]">
       <SEO
            title={pageTitle}
            description={pageDescription}
            canonicalUrl={canonicalUrl}
            noIndex={true} // Prevent indexing of personal order history
            ogData={{
                title: pageTitle,
                description: pageDescription,
                url: canonicalUrl,
                type: 'website',
                image: `${siteUrl}/favicon/og-image.png` // Ensure this path is correct
            }}
        />
      {/* Header can be added if needed */}
      {/* <header className="bg-[#1a1c23] border-b border-[#2a2d36]"> </header> */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Order History</h1>
          <p className="text-gray-400">View and track your current and past orders</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
                placeholder="Search orders by ID or product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#2a2d36] border-[#3f4354] text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2]"
            />
          </div>
        </motion.div>

        <Tabs defaultValue="active-orders" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <TabsList className="grid w-full grid-cols-2 bg-[#2a2d36] p-1">
                <TabsTrigger value="active-orders" className="data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-300 rounded-md">
                    <Clock className="h-4 w-4 mr-2" /> Active Orders
                </TabsTrigger>
                <TabsTrigger value="completed-orders" className="data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-300 rounded-md">
                    <Package className="h-4 w-4 mr-2" /> Completed Orders
                </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Content rendering based on loading and data state */}
          {isLoading ? (
              <OrderHistorySkeleton />
          ) : isQueryError ? (
             <div className="bg-[#1a1c23] rounded-lg p-10 text-center shadow-sm border border-red-500/30 text-red-400">
                 <h3 className="text-xl font-medium mb-2">Error Loading Orders</h3>
                 <p>Could not fetch your order history. Please try again later.</p>
                 {/* Optional: Add a retry button */}
             </div>
          ) : (
             <>
                <TabsContent value="active-orders">
                    {currentOrders.length > 0 ? (
                         <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                             {currentOrders.map((order) => ( <OrderCard key={order.id} order={order} /> ))}
                         </motion.div>
                    ) : (
                         <EmptyOrderState searchQuery={searchQuery} />
                    )}
                </TabsContent>
                <TabsContent value="completed-orders">
                     {currentOrders.length > 0 ? (
                         <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                             {currentOrders.map((order) => ( <OrderCard key={order.id} order={order} /> ))}
                         </motion.div>
                    ) : (
                         <EmptyOrderState searchQuery={searchQuery} />
                    )}
                </TabsContent>

                {/* Pagination - Render only if needed based on TOTAL count */}
                {totalPages > 1 && (
                  <div className="mt-8">
                      <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={handlePageChange}
                      />
                  </div>
                )}
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default OrderHistory;