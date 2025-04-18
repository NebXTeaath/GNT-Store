// src/pages/repairPage/history/RepairDetailsPopup.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
// Import the CORRECT type for the fetched repair request data
import {
    FetchedSupabaseRepairRequest,
    formatDate, // Import helper from service
    formatRepairStatus, // Import helper from service
    getStatusColor // Import helper from service
} from "@/pages/repairPage/history/repairHistoryService";
import { Button } from "@/components/ui/button";
import { MapPin, Wrench, Clock, Package } from "lucide-react"; // Added Package icon for fallback
import { useIsMobile } from "@/components/global/Mobile/use-mobile.tsx";
import { ScrollArea } from "@/components/ui/scroll-area";

// Import the admin's WhatsApp number
const adminWhatsAppNumber = import.meta.env.VITE_ADMIN_WHATSAPP;

// Define a more specific type for the shipping address JSONB content
// Adjust this based on the *actual* structure stored in your JSONB
interface ShippingAddressData {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string; // Or line1? Adjust based on your NewRequest form
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

interface RepairDetailsModalProps {
  // Use the correct type for the repair prop
  repair: FetchedSupabaseRepairRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RepairDetailsContentProps extends Omit<RepairDetailsModalProps, "open" | "repair"> {
  // Ensure the content component receives a non-null repair object
  repair: FetchedSupabaseRepairRequest;
  isMobile: boolean;
}

const RepairDetailsContent = ({
  repair,
  isMobile,
}: RepairDetailsContentProps) => {

  // Use the formatDate helper from the service
  const formattedSubmissionDate = formatDate(repair.creation_date);
  const formattedEstimatedCompletion = formatDate(repair.estimated_completion); // formatDate handles null/undefined
  const formattedLastUpdated = formatDate(repair.updated_at); // Format updated_at as well

  // Safely parse the shipping_address JSONB
  const parseShippingAddress = (): ShippingAddressData | null => {
    // Check if shipping_address exists and is an object (already parsed JSONB)
    if (repair.shipping_address && typeof repair.shipping_address === 'object') {
        // Directly return if it's already an object
        // Perform a basic check for expected structure if needed
        const data = repair.shipping_address as ShippingAddressData;
        if (data.address && typeof data.address === 'object') {
            return data;
        }
    }
    // If it's a string, try parsing (less likely with Supabase JSONB, but for safety)
    if (typeof repair.shipping_address === 'string') {
        try {
            const parsed = JSON.parse(repair.shipping_address);
            // Add structure validation if necessary
            if (parsed && typeof parsed === 'object' && parsed.address) {
                 return parsed as ShippingAddressData;
            }
        } catch (e) {
            console.error("Failed to parse shipping address string:", e, "Data:", repair.shipping_address);
            return null;
        }
    }
    // Return null if it's not a valid object or parsable string
    console.warn("Shipping address is not a valid object or could not be parsed:", repair.shipping_address);
    return null;
  };

  const addressData = parseShippingAddress();

  // Helper to construct address string safely
  const formatAddressString = (addr: ShippingAddressData['address'] | undefined): string => {
      if (!addr) return 'Address details missing.';
      const parts = [
          addr.street || addr.line1, // Use street or line1
          addr.line2,
          addr.city,
          addr.state,
          addr.zip,
          addr.country
      ].filter(Boolean); // Remove null/undefined/empty strings
      return parts.join(', ').trim() || 'Address details missing.';
  }

  // Function to format repair details for WhatsApp using FetchedSupabaseRepairRequest fields
  const formatRepairDetailsForWhatsApp = () => {
    let message = "Repair Support Request\n\n";
    message += `Repair ID: ${repair.id ?? 'N/A'}\n`; // Use 'id'
    message += `Submission Date: ${formattedSubmissionDate}\n`;
    message += `Status: ${formatRepairStatus(repair.status)}\n\n`; // Use helper
    message += `Device Type: ${repair.product_type ?? 'N/A'}\n`;
    // Include product_model if it exists in your type/table
    // message += `Device Model: ${repair.product_model ?? 'N/A'}\n`;
    message += `Description: ${repair.product_description ?? 'N/A'}\n\n`;

    message += "Shipping Address:\n";
    if (addressData) {
        message += `${addressData.name ?? 'N/A'}\n`;
        message += `${formatAddressString(addressData.address)}\n`; // Use helper
        message += `Phone: ${addressData.phone ?? 'N/A'}\n`;
        message += `Email: ${addressData.email ?? 'N/A'}\n\n`;
    } else {
        message += `Address details not available.\n\n`;
    }

    if (repair.technician) {
        message += `Assigned Technician: ${repair.technician}\n`;
    }

    if (repair.estimated_completion && repair.status !== 'completed' && repair.status !== 'cancelled') {
        message += `Estimated Completion: ${formattedEstimatedCompletion}\n`; // Use formatted date
    }

    if (repair.notes) {
        message += `\nNotes: ${repair.notes}\n`;
    }

    message += "\nPlease assist with this repair request.";
    return message;
  };

  // WhatsApp "Need Help?" button handler
  const handleNeedHelpClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!adminWhatsAppNumber) {
      console.error("Admin WhatsApp number (VITE_ADMIN_WHATSAPP) is not configured.");
      alert("Support contact is currently unavailable.");
      return;
    }
    const message = formatRepairDetailsForWhatsApp();
    window.open(
      `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const contentPaddingBottom = isMobile ? "pb-24" : ""; // Keep padding logic

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#2a2d36]">
        <h2 className="text-xl font-semibold">Repair Details</h2>
      </div>

      {/* Scrollable content */}
      <ScrollArea
        className={
          isMobile
            ? "flex-1 min-h-0 overflow-y-auto"
            : "max-h-[calc(80vh-132px)] overflow-y-auto"
        }
      >
        <div className={`px-6 py-4 ${contentPaddingBottom}`}>
          {/* Top Section - Use direct fields from 'repair' */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-medium">Repair #{repair.id?.substring(0, 8) ?? 'N/A'}</h3>
            <div className="text-right">
              {/* Status using helpers */}
              <span
                className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  repair.status
                )}`}
              >
                {formatRepairStatus(repair.status)}
              </span>
            </div>
          </div>

          {/* Submission Date using helper */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1 mb-4">
            <span>Submitted on {formattedSubmissionDate}</span>
          </div>

          {/* Device Information */}
          <div className="bg-[#2a2d36] rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-3">Device Information</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Type</span>
                <span className="font-medium">{repair.product_type ?? 'N/A'}</span>
              </div>
               {/* Add model if needed
               <div className="flex justify-between">
                 <span className="text-sm text-gray-400">Model</span>
                 <span className="font-medium">{repair.product_model ?? 'N/A'}</span>
               </div>
               */}
            </div>
          </div>

          {/* Issue Description */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Issue Description</h4>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {repair.product_description ?? 'No description provided.'}
            </p>
          </div>

          {/* Technician Notes */}
          {repair.notes && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Technician Notes</h4>
              <div className="bg-[#2a2d36] rounded-lg p-4">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                  {repair.notes}
                </p>
              </div>
            </div>
          )}

          {/* Status & Address Section */}
          <div className="mt-6 pt-6 border-t border-[#2a2d36]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping Address */}
              <div>
                <h4 className="font-medium mb-3">Shipping Address</h4>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  {addressData ? (
                    <div className="text-sm text-gray-300 break-words min-w-0"> {/* Added break-words */}
                      <p className="font-medium">{addressData.name ?? 'N/A'}</p>
                      <p>{formatAddressString(addressData.address)}</p> {/* Use helper */}
                      {addressData.phone && <p className="mt-2">Phone: {addressData.phone}</p>}
                      {addressData.email && <p>Email: {addressData.email}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Address details not available.</p>
                  )}
                </div>
              </div>
              {/* Repair Status */}
              <div>
                <h4 className="font-medium mb-3">Repair Status</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className={`text-sm font-medium ${getStatusColor(repair.status).split(' ')[1] ?? 'text-gray-300'}`}> {/* Apply text color class */}
                        {formatRepairStatus(repair.status)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                          Last updated: {formattedLastUpdated} {/* Show last updated time */}
                      </p>
                    </div>
                  </div>

                  {repair.technician && (
                    <div className="flex items-start gap-2">
                      <Wrench className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-300">
                          Assigned to: <span className="font-medium">{repair.technician}</span>
                        </p>
                      </div>
                    </div>
                  )}

                   {/* Use formattedEstimatedCompletion which handles null */}
                   {repair.estimated_completion && repair.status !== 'completed' && repair.status !== 'cancelled' && (
                     <div className="flex items-start gap-2">
                       <Wrench className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                       <div>
                         <p className="text-sm text-gray-300">
                           Estimated completion: <span className="font-medium">{formattedEstimatedCompletion}</span>
                         </p>
                       </div>
                     </div>
                   )}
                </div>
              </div>
            </div>

             {/* Additional Remark/Tracking Info */}
             {repair.remark && (
                <div className="mt-6 bg-[#2a2d36] p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Additional Information / Tracking</h4>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{repair.remark}</p>
                </div>
             )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
       <div className={`p-6 border-t border-[#2a2d36] ${isMobile ? 'sticky bottom-0 z-10 bg-[#1a1c23]' : ''}`}
            style={isMobile ? { paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 20px))" } : {}}>
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              size="sm"
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
              onClick={handleNeedHelpClick}
            >
              Need Help?
            </Button>
          </div>
      </div>
    </div>
  );
};

// Main Modal/Drawer Component (Handles Mobile/Desktop view)
export const RepairDetailsModal = ({
  repair,
  open,
  onOpenChange,
}: RepairDetailsModalProps) => {
  const isMobile = useIsMobile();

  // Handle case where the modal might be opened with a null repair prop
  if (!repair) {
    console.warn("RepairDetailsModal rendered without a repair object.");
    // Optionally render a placeholder or error within the modal/drawer structure
    // Or simply return null if the parent component should handle this case
    return null;
  }

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="flex flex-col h-full bg-[#1a1c23] border-t border-[#2a2d36] text-white rounded-t-[10px]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }} // Handle safe area
      >
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-[#2a2d36]" /> {/* Handle */}
        {/* Pass the non-null repair object */}
        <RepairDetailsContent
          repair={repair}
          onOpenChange={onOpenChange}
          isMobile={true}
        />
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 bg-[#1a1c23] border border-[#2a2d36] text-white max-h-[90vh] flex flex-col">
         {/* Pass the non-null repair object */}
        <RepairDetailsContent
          repair={repair}
          onOpenChange={onOpenChange}
          isMobile={false}
        />
      </DialogContent>
    </Dialog>
  );
};