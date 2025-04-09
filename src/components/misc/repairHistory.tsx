//src/pages/repairPage/history/repairHistory.tsx
import React, { useState, useEffect } from "react";
import { Clock, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/context/UserProfileContext";
import { useAuth } from "@/context/AuthContext";
import { 
  RepairRequest, 
  getUserRepairRequests, 
  getStatusColor, 
  formatRepairStatus 
} from "@/pages/repairPage/history/repairHistoryService";
import { toast } from "sonner";

interface HistoryProps {
  onViewDetails?: (requestId: string) => void;
}

export default function History({ onViewDetails }: HistoryProps) {
  // States for history requests
  const [historyRequests, setHistoryRequests] = useState<RepairRequest[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Retrieve the user profile from the context
  const { userProfile } = useUserProfile();
  const { user } = useAuth();

  // Fetch history on component mount
  useEffect(() => {
    if (user?.$id) {
      fetchRepairHistory();
    }
  }, [user]);

  // Function to fetch repair history
  const fetchRepairHistory = async () => {
    if (!user?.$id) return;
    
    setIsHistoryLoading(true);
    
    try {
      const requests = await getUserRepairRequests(user.$id);
      setHistoryRequests(requests);
    } catch (error) {
      console.error("Error fetching repair history:", error);
      toast.error("Failed to load repair history. Please try again later.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Handle view details action
  const handleViewDetails = (requestId: string) => {
    if (onViewDetails) {
      onViewDetails(requestId);
    }
  };

  return (
    <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Repair History</h2>
      <p className="text-gray-400 mb-6">View your past repair requests and their details.</p>
      
      {isHistoryLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-[#2a2d36] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-6 w-1/3 bg-[#3f4354]" />
                <Skeleton className="h-6 w-20 rounded-full bg-[#3f4354]" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Skeleton className="h-4 w-2/3 bg-[#3f4354]" />
                <Skeleton className="h-4 w-2/3 bg-[#3f4354]" />
              </div>
              <Skeleton className="h-4 w-full bg-[#3f4354] mb-2" />
              <Skeleton className="h-4 w-5/6 bg-[#3f4354]" />
            </div>
          ))}
        </div>
      ) : historyRequests.length > 0 ? (
        <div className="space-y-4">
          {historyRequests.map((request) => (
            <Card key={request.$id} className="bg-[#2a2d36] border-[#3f4354] overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-64 bg-[#1a1c23] p-4 flex flex-col justify-between">
                  <div>
                    <Badge className={`mb-4 ${getStatusColor(request.status)}`}>
                      {formatRepairStatus(request.status)}
                    </Badge>
                    <h3 className="font-medium mb-1 text-sm">{request.productModel || request.productDescription}</h3>
                    <p className="text-xs text-gray-400">ID: {request.$id}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-400">
                      <Calendar className="h-4 w-4 mr-2" />
                      <p>{new Date(request.creationDate).toLocaleDateString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-[#3f4354] text-[#5865f2] hover:text-white hover:bg-[#5865f2] hover:border-[#5865f2]"
                      onClick={() => handleViewDetails(request.$id)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Issue Description</h4>
                  <p className="mb-4">{request.productDescription}</p>
                  
                  {request.technician && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-400">Technician:</span>
                      <span>{request.technician}</span>
                    </div>
                  )}
                  
                  {request.lastUpdated && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-400">Last Updated:</span>
                      <span>{new Date(request.lastUpdated).toLocaleString()}</span>
                    </div>
                  )}

                  {request.estimatedCompletion && request.status !== 'completed' && (
                    <div className="mt-4 bg-[#1a1c23] p-3 rounded-md inline-block">
                      <p className="text-xs text-gray-400">Estimated Completion</p>
                      <p className="text-sm font-medium text-[#5865f2]">
                        {new Date(request.estimatedCompletion).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No repair history found</h3>
          <p className="text-gray-400">You don't have any completed repair requests yet.</p>
        </div>
      )}
    </div>
  );
}
