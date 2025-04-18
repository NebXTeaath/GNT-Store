// supabase/functions/send-transactional-email/types.ts

// --- Data Structures from DB Trigger Payload ---

export interface AddressData {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }
  
  export interface CustomerData {
    name?: string;
    email?: string;
    phone?: string;
    // Address might be string (from older orders) or object
    address?: string | AddressData;
  }
  
  export interface ProductData {
    id?: string; // Product UUID
    name?: string;
    quantity?: number;
    price?: number; // Original price
    discount_price?: number; // Selling price
    subtotal?: number; // Calculated: discount_price * quantity
    image?: string; // URL (assuming string in JSON)
    slug?: string;
  }
  
  export interface OrderSummaryData {
    items_count?: number;
    subtotal?: number;
    discount_code?: string | null;
    discount_type?: 'percentage' | 'fixed' | string; // Allow string for flexibility
    discount_rate?: number;
    discount_amount?: number;
    total?: number;
  }
  
  export interface OrderDetailsData {
    customer?: CustomerData;
    products?: ProductData[];
    order_summary?: OrderSummaryData;
    order_date?: string; // ISO String timestamp
  }
  
  // Represents the `data` field in the payload when type is 'order'
  export interface OrderData {
    id: string; // Order UUID
    user_id: string;
    order_details: OrderDetailsData; // Nested JSONB data
    order_status: string;
    total_amount?: number; // Top-level total (should match summary.total)
    discount_code?: string | null;
    discount_amount?: number | null;
    remark?: string | null;
    created_at: string; // ISO String timestamp
    updated_at: string; // ISO String timestamp
  }
  
  // For Repairs
  export interface RepairAddressData {
    name?: string;
    email?: string;
    phone?: string;
    line1?: string; // Flattened for simplicity in trigger/payload
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    // Note: If shipping_address in DB is JSONB like orders.address, adjust accordingly
  }
  
  // Represents the `data` field in the payload when type is 'repair'
  export interface RepairData {
    id: string; // Repair UUID
    user_id: string;
    creation_date: string; // ISO String timestamp
    status: string;
    product_type: string;
    product_description: string;
    shipping_address: RepairAddressData; // Assuming flattened structure in trigger payload
    remark?: string | null;
    technician?: string | null;
    estimated_completion?: string | null; // ISO String timestamp or formatted string
    notes?: string | null;
    updated_at: string; // ISO String timestamp
  }
  
  // Represents the overall structure of the payload received from the DB trigger
  export interface EmailPayload {
    type: 'order' | 'repair';
    trigger: 'create' | 'update';
    data: OrderData | RepairData; // Union type
  }
  
  // Structure for the email data built by templates
  export interface BuiltEmailData {
      subject: string;
      htmlContent: string;
      recipientEmail: string;
      recipientName: string;
  }