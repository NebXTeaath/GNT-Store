//src/pages/repairPage/history/repairHistoryService.ts
import { databases, APPWRITE_DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

// Use lowercase collection name to match the schema
const REPAIR_COLLECTION_ID = import.meta.env.VITE_APPWRITE_REPAIR_COLLECTION_ID || 'repairrequests';

export interface RepairRequest {
  $id: string;
  userId: string;
  creationDate: string;
  status: string;
  productType: string;
  // productModel is optional but likely not provided by the schema
  productModel?: string;
  productDescription: string;
  shippingAddress: string;
  // These fields might not exist per the schema but are defined in the interface
  lastUpdated?: string;
  technician?: string;
  estimatedCompletion?: string;
  notes?: string;
  remark?: string;
}

export async function getUserRepairRequests(userId: string): Promise<RepairRequest[]> {
  try {
    if (!userId) throw new Error("User ID is required");
    
    console.log(`Fetching repair requests for user: ${userId}`);
    
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      REPAIR_COLLECTION_ID,
      [Query.equal("userId", userId)]
    );
    
    console.log("Appwrite response:", response);
    
    return (response.documents as unknown) as RepairRequest[];
  } catch (error) {
    console.error("Error fetching repair requests:", error);
    throw error;
  }
}


/**
 * Fetches a single repair request by ID
 */
export async function getRepairRequestById(requestId: string): Promise<RepairRequest | null> {
  try {
    if (!requestId) throw new Error("Request ID is required");
    
    console.log(`Fetching repair request: ${requestId}`);
    
    try {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        REPAIR_COLLECTION_ID,
        [Query.equal("$id", requestId)]
      );
      
      if (response.documents && response.documents.length > 0) {
        // Explicitly cast the document to RepairRequest
        return (response.documents[0] as unknown) as RepairRequest;
      }
      return null;
    } catch (err) {
      console.log("Error in Appwrite query:", err);
      return null;
    }
  } catch (error) {
    console.error("Error fetching repair request:", error);
    return null;
  }
}

/**
 * Creates a new repair request
 */
export async function createRepairRequest(data: Omit<RepairRequest, '$id'>): Promise<RepairRequest> {
  try {
    console.log("Creating new repair request:", data);
    
    try {
      const response = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        REPAIR_COLLECTION_ID,
        ID.unique(),
        data
      );
      
      // Explicitly cast the response to RepairRequest
      return (response as unknown) as RepairRequest;
    } catch (err) {
      console.log("Error in Appwrite create:", err);
      throw err;
    }
  } catch (error) {
    console.error("Error creating repair request:", error);
    throw error;
  }
}

/**
 * Gets the appropriate status color classes
 */
export function getStatusColor(status: string): string {
  switch(status.toLowerCase()) {
    case "pending": return "bg-orange-500/10 text-orange-500";
    case "received": return "bg-blue-500/10 text-blue-500";
    case "diagnosing": return "bg-indigo-500/10 text-indigo-500";
    case "repairing": return "bg-violet-500/10 text-violet-500";
    case "completed": return "bg-emerald-500/10 text-emerald-500";
    case "cancelled": return "bg-red-500/10 text-red-500";
    default: return "bg-gray-500/10 text-gray-500";
  }
}

/**
 * Formats repair status text
 */
export function formatRepairStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
