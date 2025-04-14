// src/pages/order/orderHistory/order-history.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Package, Clock } from "lucide-react";
import { useLocation } from "react-router-dom"; // Import useLocation
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/pages/order/orderHistory/OrderCard";
import { EmptyOrderState } from "@/pages/order/orderHistory/EmptyOrderState";
import { OrderHistorySkeleton } from "@/pages/order/orderHistory/OrderHistorySkeleton";
import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import { databases, APPWRITE_DATABASE_ID } from "@/lib/appwrite";
import { Order } from "@/pages/order/orderHistory/orderService";
import { toast } from "sonner";
import { Query } from "appwrite";
import { Pagination } from "@/pages/searchPage/search/Pagination";
import { useAuth } from "@/context/AuthContext";
import SEO from '@/components/seo/SEO'; // Import SEO component

const ITEMS_PER_PAGE = 5;

// Fetch orders from Appwrite database
const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    if (!userId) throw new Error("User ID is required");
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      'orders',
      [Query.equal("userid", userId)]
    );

    return response.documents.map(doc => ({
      id: doc.$id,
      userid: doc.userid,
      productids: doc.productids,
      orderdetails: typeof doc.orderdetails === 'string'
        ? JSON.parse(doc.orderdetails)
        : doc.orderdetails,
      creationdate: doc.creationdate,
      datemodified: doc.datemodified,
      orderstatus: doc.orderstatus,
      remark: doc.remark
    }));
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

const OrderHistory = () => {
  useUserProfileQuery(); // Keep profile query if needed elsewhere on the page
  const location = useLocation(); // For canonical URL
  const siteUrl = window.location.origin; // Get base URL
  const [activeTab, setActiveTab] = useState("active-orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const { data: orders, isLoading, error } = useQuery({ queryKey: ["orders", user?.$id], queryFn: () => getUserOrders(user?.$id || ""), enabled: !!user?.$id });

  // Filter orders
  const filteredOrders = orders?.filter((order) => {  const orderIdMatch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const productNameMatch = order.orderdetails.products.some(
      (product) => product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesSearch = orderIdMatch || productNameMatch;
    const isActiveOrder = ["pending", "processing", "shipped"].includes(order.orderstatus.toLowerCase());
    const isCompletedOrder = ["delivered", "cancelled"].includes(order.orderstatus.toLowerCase());

    if (activeTab === "active-orders") {
      return matchesSearch && isActiveOrder;
    } else {
      return matchesSearch && isCompletedOrder;
    } });
  const sortedOrders = filteredOrders ? [...filteredOrders].sort((a, b) => new Date(b.orderdetails.order_date).getTime() - new Date(a.orderdetails.order_date).getTime()) : [];
  const totalPages = Math.ceil((sortedOrders?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentOrders = sortedOrders?.slice(startIndex, startIndex + ITEMS_PER_PAGE) || [];

  const handlePageChange = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // Effects
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery]);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) { setCurrentPage(1); } }, [sortedOrders, currentPage, totalPages]);
  useEffect(() => { if (error) { toast.error("Failed to load your orders. Please try again later."); } }, [error]);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

  // SEO Data
  const pageTitle = "Order History | GNT Store";
  const pageDescription = "View and track your current and past orders on GNT Store.";
  const canonicalUrl = `${siteUrl}${location.pathname}`; // Use current path

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
                image: `${siteUrl}/favicon/og-image.png`
            }}
        />
      <header className="bg-[#1a1c23] border-b border-[#2a2d36]"> {/* Header content if any */} </header>
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Order History</h1>
          <p className="text-gray-400">View and track your current and past orders</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="mb-6">
          <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /> <Input placeholder="Search orders by ID or product name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[#2a2d36] border-[#3f4354] text-white focus-visible:ring-[#5865f2] focus-visible:ring-offset-0 focus-visible:border-[#5865f2]" /> </div>
        </motion.div>
        <Tabs defaultValue="active-orders" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <TabsList className="grid w-full grid-cols-2 bg-[#2a2d36] p-1"> <TabsTrigger value="active-orders" className="data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-300 rounded-md"> <Clock className="h-4 w-4 mr-2" /> Active Orders </TabsTrigger> <TabsTrigger value="completed-orders" className="data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-300 rounded-md"> <Package className="h-4 w-4 mr-2" /> Completed Orders </TabsTrigger> </TabsList>
          </motion.div>
          <TabsContent value="active-orders">
            {orders === undefined || isLoading ? ( <OrderHistorySkeleton /> ) : sortedOrders && sortedOrders.length > 0 ? ( <> <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6"> {currentOrders.map((order) => ( <OrderCard key={order.id} order={order} /> ))} </motion.div> {totalPages > 1 && ( <div className="mt-8"> <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} /> </div> )} </> ) : ( <EmptyOrderState searchQuery={searchQuery} /> )}
          </TabsContent>
          <TabsContent value="completed-orders">
            {orders === undefined || isLoading ? ( <OrderHistorySkeleton /> ) : sortedOrders && sortedOrders.length > 0 ? ( <> <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6"> {currentOrders.map((order) => ( <OrderCard key={order.id} order={order} /> ))} </motion.div> {totalPages > 1 && ( <div className="mt-8"> <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} /> </div> )} </> ) : ( <EmptyOrderState searchQuery={searchQuery} /> )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default OrderHistory;