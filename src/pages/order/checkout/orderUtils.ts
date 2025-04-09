//src/pages/order/checkout/orderUtils.ts
import {functions} from '@/lib/appwrite';

// Environment variable for function endpoints
const DISCOUNT_ORDER_FUNCTION = import.meta.env.VITE_APPWRITE_DISCOUNT_AND_ORDER_FUNCTION;

export interface OrderItem {
  id: string;
  title: string;
  image?: string;
  price: number;
  discount_price: number;
  quantity: number;
}

export interface OrderDetails {
  product_id: string;
  product_name: string;
  product_primary_image_url: string;
  product_price: number;
  product_discount_price: number;
  product_unit_ordered: number;
  customer_name: string;
  customer_address: string;
  phone_number: string;
  email_address: string;
}

export interface UserProfile {
  id: string; // This is the document ID in Appwrite
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

// Updated function to create orders securely via Appwrite Function
export async function createServerOrder(
  userId: string,
  cartItems: OrderItem[],
  userProfile: UserProfile,
  discountCode: string | null
): Promise<string> {
  try {
    // Calculate cartSubtotal from cart items
    const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.discount_price * item.quantity), 0);
    
    // Prepare payload for the combined function with 'create' operation
    const payload = {
      userId,
      cartItems,
      userProfile,
      discountCode: discountCode || '', // Ensure the field exists as an empty string if not provided
      cartSubtotal // Add cartSubtotal to the payload
    };

    const execution = await functions.createExecution(
      DISCOUNT_ORDER_FUNCTION,
      JSON.stringify(payload),
      false, // synchronous execution
      '/?operation=create'  // include query param in the path
    );
    
    
    if (execution.status === 'completed') {
      const response = JSON.parse(execution.responseBody);
      
      // First, log the raw response to debug
      console.log("Raw response from function:", response);
      
      if (response.success === true && response.orderId) {
        return response.orderId;
      } else if (response.isValid === true) {
        // This is a validation response, not an order creation response
        console.error("Received validation response instead of order creation response:", response);
        throw new Error("Server returned validation result instead of processing the order");
      } else {
        // Generic error handling
        throw new Error(response.message || 'Failed to create order');
      }
    } else {
      const errorDetails = {
        status: execution.status,
        responseStatusCode: execution.responseStatusCode,
        errors: execution.errors || 'No error output available',
        functionId: execution.functionId,
        responseBody: execution.responseBody || 'No response body'
      };
      
      console.error("Order creation function failed:", errorDetails);
      throw new Error(execution.errors || `Order creation function failed with status: ${execution.status}`);
    }
  } catch (error) {
    console.error('Error creating order through Appwrite function:', error);
    throw error;
  }
}
  
// Helper functions to work with the optimized order structure
  
// Function to parse the comma-separated product IDs back into an array
export function parseProductIds(productIdsString: string): string[] {
  return productIdsString.split(',').filter(id => id.trim() !== '');
}
  
// Function to parse the orderDetails JSON string and return the structured data
export function parseOrderDetails(orderDetailsString: string): {
  customer: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  order_date: string;
  products: Array<{
    id: string;
    name: string;
    image: string[];
    price: number;
    discount_price: number;
    quantity: number;
    subtotal: number;
  }>;
  order_summary: {
    items_count: number;
    subtotal: number;
    discount_code: string;
    discount_type: string;
    discount_rate: number;
    discount_amount: number;
    total: number;
  };
} {
  try {
    return JSON.parse(orderDetailsString);
  } catch (error) {
    console.error('Error parsing order details:', error);
    throw error;
  }
}
  
// Function to get customer information from parsed order details
export function getCustomerInfo(parsedOrderDetails: ReturnType<typeof parseOrderDetails>) {
  return parsedOrderDetails.customer;
}
  
// Function to get products from parsed order details
export function getOrderProducts(parsedOrderDetails: ReturnType<typeof parseOrderDetails>) {
  return parsedOrderDetails.products;
}
  
// Function to get order summary from parsed order details
export function getOrderSummary(parsedOrderDetails: ReturnType<typeof parseOrderDetails>) {
  return parsedOrderDetails.order_summary;
}