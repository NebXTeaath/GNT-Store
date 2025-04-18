// supabase/functions/send-transactional-email/utils/helpers.ts

// Formats currency consistently (e.g., Rs. 1,199.00)
export function formatCurrency(amount: number | string | null | undefined): string {
    const num = Number(amount);
    // Handle potential NaN or null/undefined input gracefully
    if (isNaN(num) || amount === null || amount === undefined) {
      // Return a placeholder or default, ensure it matches your expectations
      return "Rs. --.--";
    }
    // Using Indian numbering system locale
    return "Rs. " + num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  // Returns inline CSS style string for order status badges
  export function getOrderStatusStyle(status: string | null | undefined): string {
    const s = status?.toLowerCase() ?? 'unknown';
    let style = "display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; line-height: 1; white-space: nowrap;"; // Added nowrap
    switch(s) {
      case "pending": style += "background-color:#FFF7ED; color:#F97316;"; break;
      case "processing": style += "background-color:#EFF6FF; color:#3B82F6;"; break;
      case "shipped": style += "background-color:#F5F3FF; color:#8B5CF6;"; break;
      case "delivered": style += "background-color:#ECFDF5; color:#10B981;"; break;
      case "cancelled": style += "background-color:#FEF2F2; color:#EF4444;"; break;
      case "failed": style += "background-color:#FEE2E2; color:#DC2626;"; break;
      default: style += "background-color:#F3F4F6; color:#6B7280;"; break; // Unknown/default
    }
    return style;
  }
  
  // Returns inline CSS style string for repair status text color
  export function getRepairStatusStyle(status: string | null | undefined): string {
    const s = status?.toLowerCase() ?? 'unknown';
    let style = "font-weight: 500;";
    switch(s) {
      case "pending": style += "color:#F97316;"; break;
      case "received": style += "color:#3B82F6;"; break;
      case "diagnosing": style += "color:#6366F1;"; break;
      case "repairing": style += "color:#8B5CF6;"; break;
      case "completed": style += "color:#10B981;"; break;
      case "cancelled": style += "color:#EF4444;"; break;
      default: style += "color:#6B7280;"; break;
    }
    return style;
  }
  
  // Capitalizes the first letter of a string safely
  export function capitalize(str: string | null | undefined): string {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // Formats a date string (ISO or other parsable format)
  export function formatDate(dateString: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
      if (!dateString) return 'N/A';
      try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
              return 'Invalid Date';
          }
          const defaultOptions: Intl.DateTimeFormatOptions = {
              day: '2-digit', month: 'short', year: 'numeric', // e.g., 18 Apr 2025
              // hour: '2-digit', minute: '2-digit', hour12: true,
              // timeZone: 'Asia/Kolkata' // Optional: Set timezone if needed
          };
          return date.toLocaleDateString("en-GB", { ...defaultOptions, ...options });
      } catch (e) {
          console.error("Error formatting date:", dateString, e);
          return 'Invalid Date';
      }
  }
  
  // Formats address data into a string or returns placeholder
  export function formatAddress(
      address: { line1?: string; line2?: string; city?: string; state?: string; zip?: string; country?: string; } | string | null | undefined,
      name?: string | null,
      phone?: string | null
   ): string {
      if (typeof address === 'string') { // Handle plain string address
          let result = address;
          if (name) result = `${name}<br>${result}`;
          if (phone) result += `<br>Phone: ${phone}`;
          return result;
      }
  
      if (!address || !address.line1) { // Check for essential parts
          let result = 'Address details not provided.';
          if (name) result = `${name}<br>${result}`;
          if (phone) result += `<br>Phone: ${phone}`;
          return result;
      }
  
      const parts: string[] = [];
      if (name) parts.push(`<p style="margin: 0 0 2px 0; font-weight: 500;">${name}</p>`);
      if (address.line1) parts.push(address.line1);
      if (address.line2) parts.push(address.line2);
      const cityStateZip = [address.city, address.state].filter(Boolean).join(', ') + (address.zip ? ` ${address.zip}` : '');
      if (cityStateZip) parts.push(cityStateZip);
      if (address.country) parts.push(address.country);
      if (phone) parts.push(`Phone: ${phone}`);
  
      return parts.join('<br>');
  }