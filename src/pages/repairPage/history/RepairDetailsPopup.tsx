// src/pages/repairPage/history/RepairDetailsPopup.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { RepairRequest } from "@/pages/repairPage/history/repairHistoryService";
import { Button } from "@/components/ui/button";
import { MapPin, Wrench, Clock,} from "lucide-react";
import { useIsMobile } from "@/components/global/Mobile/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

// Import the admin's WhatsApp number from the environment variable
const adminWhatsAppNumber = import.meta.env.VITE_ADMIN_WHATSAPP;

interface RepairDetailsModalProps {
  repair: RepairRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Create a new interface for the content component that excludes 'open'
interface RepairDetailsContentProps extends Omit<RepairDetailsModalProps, "open"> {
  isMobile: boolean;
}

// Define address interface based on your JSON structure
interface ShippingAddressData {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

const RepairDetailsContent = ({
  repair,
  isMobile,
}: RepairDetailsContentProps) => {
  // Format the repair submission date
  const submissionDate = new Date(repair.creationDate);
  const formattedSubmissionDate = submissionDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format the estimated completion date if available
  const formattedEstimatedCompletion = repair.estimatedCompletion 
    ? new Date(repair.estimatedCompletion).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // Format the last updated date if available
  const formattedLastUpdated = repair.lastUpdated
    ? new Date(repair.lastUpdated).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) + " at " +
      new Date(repair.lastUpdated).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
    
  // Parse shipping address JSON if it's a string
  const parseShippingAddress = (): ShippingAddressData | null => {
    try {
      if (typeof repair.shippingAddress === 'string') {
        return JSON.parse(repair.shippingAddress);
      } else if (typeof repair.shippingAddress === 'object') {
        return repair.shippingAddress as ShippingAddressData;
      }
      return null;
    } catch (e) {
      console.error("Failed to parse shipping address:", e);
      return null;
    }
  };
  
  const addressData = parseShippingAddress();
  
  // Format shipping address for display

  // Function to format repair details for WhatsApp
  const formatRepairDetailsForWhatsApp = () => {
    let message = "Repair Support Request\n\n";
    message += `Repair ID: ${repair.$id}\n`;
    message += `Submission Date: ${formattedSubmissionDate}\n`;
    message += `Status: ${formatRepairStatus(repair.status)}\n\n`;
    message += `Device: ${repair.productType}${repair.productModel ? ` - ${repair.productModel}` : ""}\n`;
    message += `Description: ${repair.productDescription}\n\n`;
    
    // Format shipping address for WhatsApp
    message += "Shipping Address:\n";
    if (addressData) {
      const { name, email, phone, address } = addressData;
      message += `${name}\n`;
      message += `${address.street}\n`;
      message += `${address.city}, ${address.state} ${address.zip}\n`;
      message += `${address.country}\n`;
      message += `Phone: ${phone}\n`;
      message += `Email: ${email}\n\n`;
    } else {
      message += `${repair.shippingAddress}\n\n`;
    }
    
    if (repair.technician) {
      message += `Assigned Technician: ${repair.technician}\n`;
    }
    
    if (formattedEstimatedCompletion && repair.status !== 'completed') {
      message += `Estimated Completion: ${formattedEstimatedCompletion}\n`;
    }
    
    if (repair.notes) {
      message += `\nNotes: ${repair.notes}\n`;
    }
    
    message += "\nPlease assist with this repair request.";
    return message;
  };

  // Handler for the "Need Help?" button click
  const handleNeedHelpClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const message = formatRepairDetailsForWhatsApp();
    window.open(
      `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  // Calculate the padding bottom for scrollable content based on whether it's mobile or not
  // This ensures content isn't hidden behind the sticky footer on mobile
  const contentPaddingBottom = isMobile ? "pb-24" : "";

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
        {/* Added padding bottom class to push content above the sticky footer */}
        <div className={`px-6 py-4 ${contentPaddingBottom}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-medium">Repair Request {repair.$id}</h3>
            <div className="text-right">
              <span
                className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  repair.status
                )}`}
              >
                {formatRepairStatus(repair.status)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1 mb-4">
            <span>Submitted on {formattedSubmissionDate}</span>
          </div>

          <div className="bg-[#2a2d36] rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-3">Device Information</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Type</span>
                <span className="font-medium">{repair.productType}</span>
              </div>
              {repair.productModel && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Model</span>
                  <span className="font-medium">{repair.productModel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium mb-3">Issue Description</h4>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {repair.productDescription}
            </p>
          </div>

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

          <div className="mt-6 pt-6 border-t border-[#2a2d36]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Shipping Address</h4>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  {addressData ? (
                    <div className="text-sm text-gray-300">
                      <p className="font-medium">{addressData.name}</p>
                      <p>{addressData.address.street}</p>
                      <p>{addressData.address.city}, {addressData.address.state} {addressData.address.zip}</p>
                      <p>{addressData.address.country}</p>
                      <p className="mt-2">Phone: {addressData.phone}</p>
                      <p>Email: {addressData.email}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {typeof repair.shippingAddress === 'string' 
                        ? repair.shippingAddress 
                        : 'Address not available'}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Repair Status</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-300">
                        <span className={getStatusColorText(repair.status)}>
                          {formatRepairStatus(repair.status)}
                        </span>
                      </p>
                      {formattedLastUpdated && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last updated: {formattedLastUpdated}
                        </p>
                      )}
                    </div>
                  </div>

                  {repair.technician && (
                    <div className="flex items-start gap-2">
                        <Wrench className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-300">
                          Assigned to: <span className="font-medium">{repair.technician}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {formattedEstimatedCompletion && repair.status !== 'completed' && (
                    <div className="flex items-start gap-2">
                      <Wrench className="h-4 w-4 text-gray-400 mt-0.5" />
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

            {repair.remark && (
              <div className="mt-6 bg-[#2a2d36] p-4 rounded-lg">
                <h4 className="font-medium mb-2">Additional Information</h4>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{repair.remark}</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer with WhatsApp redirect for "Need Help?" */}
      {isMobile ? (
        // Mobile: sticky footer to accommodate safe-area insets
        <div
          className="sticky bottom-0 z-10 p-6 border-t border-[#2a2d36] bg-[#1a1c23]"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 20px))" }}
        >
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
      ) : (
        // Desktop/Modal: normal footer (non-sticky)
        <div className="p-6 border-t border-[#2a2d36]">
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
      )}
    </div>
  );
};

export const RepairDetailsModal = ({
  repair,
  open,
  onOpenChange,
}: RepairDetailsModalProps) => {
  const isMobile = useIsMobile();

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="flex flex-col h-full bg-[#1a1c23] border-t border-[#2a2d36] text-white rounded-t-[10px]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-[#2a2d36]" />
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
        <RepairDetailsContent
          repair={repair}
          onOpenChange={onOpenChange}
          isMobile={false}
        />
      </DialogContent>
    </Dialog>
  );
};

// Helper functions
function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-orange-500/10 text-orange-500";
    case "received":
      return "bg-blue-500/10 text-blue-500";
    case "diagnosing":
      return "bg-indigo-500/10 text-indigo-500";
    case "repairing":
      return "bg-violet-500/10 text-violet-500";
    case "completed":
      return "bg-emerald-500/10 text-emerald-500";
    case "cancelled":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-gray-500/10 text-gray-500";
  }
}

function getStatusColorText(status: string): string {
  switch (status.toLowerCase()) {
    case "pending":
      return "text-orange-500";
    case "received":
      return "text-blue-500";
    case "diagnosing":
      return "text-indigo-500";
    case "repairing":
      return "text-violet-500";
    case "completed":
      return "text-emerald-500";
    case "cancelled":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

function formatRepairStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}