// src/pages/order/orderHistory/orderService.ts
import { databases, APPWRITE_DATABASE_ID } from "@/lib/appwrite";
import { Query } from "appwrite";

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  discount_price: number;
  quantity: number;
  subtotal: number;
}

interface OrderSummary {
  items_count: number;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_rate: number;  // Changed from optional to required
  discount_code: string;  // Changed from optional to 
  discount_amount?: number;
  discount_type?: string; // e.g., 'percentage' or 'fixed'
  total: number;
}

interface Customer {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface OrderDetails {
  customer: Customer;
  order_date: string;
  products: Product[];
  order_summary: OrderSummary;
}

export interface Order {
  id: string;
  userid: string;
  productids: string;
  orderdetails: OrderDetails;
  creationdate: string;
  datemodified: string;
  orderstatus: string;
  remark: string;
}

// Function to fetch all orders for a user
export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    if (!userId) throw new Error("User ID is required");
    
    // Try to fetch from Appwrite
    try {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        'orders',
        [Query.equal("userid", userId)]
      );
      
      // If we have documents, map them to our Order type
      if (response.documents && response.documents.length > 0) {
        return response.documents.map(doc => {
          // Parse orderdetails if it's a string
          let orderdetails: OrderDetails;
          if (typeof doc.orderdetails === 'string') {
            orderdetails = JSON.parse(doc.orderdetails);
          } else {
            orderdetails = doc.orderdetails;
          }
          
          // Ensure discount properties exist with default values if they don't
          if (!orderdetails.order_summary.discount_rate) {
            orderdetails.order_summary.discount_rate = 0;
          }
          
          if (!orderdetails.order_summary.discount_code) {
            orderdetails.order_summary.discount_code = '';
          }
          
          return {
            id: doc.$id,
            userid: doc.userid,
            productids: doc.productids,
            orderdetails,
            creationdate: doc.creationdate,
            datemodified: doc.datemodified,
            orderstatus: doc.orderstatus,
            remark: doc.remark
          };
        });
      }
    } catch (error) {
      console.error("Error fetching from Appwrite:", error);
      // If Appwrite fails, fall back to mock data (if available)
    }
    
    // Fall back to returning an empty array if no orders are found or Appwrite fails
    return [];
  } catch (error) {
    console.error("Error in getUserOrders:", error);
    throw error;
  }
};

// Format currency values for display
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount / 100); // Assuming amounts are stored in cents
};

// Get the color class for an order status
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'processing':
      return 'bg-amber-500 text-amber-50';
    case 'shipped':
      return 'bg-[#5865f2] text-white';
    case 'delivered':
      return 'bg-emerald-500 text-emerald-50';
    case 'cancelled':
      return 'bg-red-500 text-red-50';
    case 'pending':
      return 'bg-yellow-500 text-yellow-50';
    default:
      return 'bg-gray-500 text-gray-50';
  }
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Get status icon based on order status
export const getStatusIcon = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'processing':
      return '⚙️';
    case 'shipped':
      return '🚚';
    case 'delivered':
      return '✅';
    case 'cancelled':
      return '❌';
    case 'pending':
      return '⏳';
    default:
      return '⏳';
  }
};