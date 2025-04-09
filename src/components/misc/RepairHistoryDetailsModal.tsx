//src/pages/repairPage/history/RepairHistoryDetailsModal.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RepairRequest, getStatusColor } from "@/pages/repairPage/history/repairHistoryService";

interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface RepairDetailsModalProps {
  repair: RepairRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RepairDetailsModal = ({ repair, open, onOpenChange }: RepairDetailsModalProps) => {
  // Parse the shipping address
  let shippingAddress: ShippingAddress;
  try {
    shippingAddress = JSON.parse(repair.shippingAddress);
  } catch (e) {
    // Fallback if parsing fails
    shippingAddress = {
      name: "Name not available",
      email: "Email not available",
      phone: "Phone not available",
      address: "Address not available"
    };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 bg-[#1a1c23] border border-[#2a2d36] text-white max-h-[90vh] flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2a2d36]">
            <h2 className="text-xl font-semibold">Repair Details</h2>
          </div>

          {/* Scrollable content */}
          <ScrollArea className="max-h-[calc(80vh-132px)] overflow-y-auto">
            <div className="px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-medium">Request {repair.$id}</h3>
                <Badge className={getStatusColor(repair.status)}>
                  {repair.status.charAt(0).toUpperCase() + repair.status.slice(1)}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1 mb-4">
                <Calendar className="h-3.5 w-3.5" />
                <span>Submitted on {new Date(repair.creationDate).toLocaleDateString()}</span>
              </div>            
              <div className="bg-[#2a2d36] p-4 rounded-md mb-6">
                <h4 className="font-medium mb-2">Device Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Product Type:</span>
                    <span>{repair.productType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model / Description:</span>
                    <span>{repair.productModel || repair.productDescription || "Not specified"}</span>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <h4 className="font-medium mb-2">Issue Description</h4>
                <p className="text-gray-300 text-sm">{repair.productDescription}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[#2a2d36] p-4 rounded-md">
                  <h4 className="font-medium mb-3">Shipping Address</h4>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-300">
                      {shippingAddress.name}<br />
                      {shippingAddress.address}
                    </p>
                  </div>
                </div>

                <div className="bg-[#2a2d36] p-4 rounded-md">
                  <h4 className="font-medium mb-3">Repair Status</h4>
                  {repair.technician ? (
                    <div className="text-sm text-gray-300">
                      <p className="mb-1">Assigned to: {repair.technician}</p>
                      {repair.estimatedCompletion && (
                        <div className="flex items-center gap-2 text-[#5865f2]">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {repair.status === "completed" 
                              ? "Completed on: " 
                              : "Est. completion: "}
                            {new Date(repair.estimatedCompletion).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 italic">
                      Awaiting technician assignment
                    </p>
                  )}
                </div>
              </div>

              {repair.notes && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Technician Notes</h4>
                  <div className="bg-[#2a2d36] p-4 rounded-md text-sm text-gray-300">
                    {repair.notes}
                  </div>
                </div>
              )}

              {repair.lastUpdated && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mt-4">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last updated: {new Date(repair.lastUpdated).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-6 border-t border-[#2a2d36]">
            <div className="flex justify-end gap-3">
              <Button size="sm" className="bg-[#5865f2] hover:bg-[#4752c4] text-white">
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
