//src/pages/repairPage/history/repairHistoryIndex.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ClipboardList } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/context/UserProfileContext";
import TrackHistory from "@/pages/repairPage/history/TrackRepairHistory";
import { getRepairRequestById } from "@/pages/repairPage/history/repairHistoryService";

const RepairPage = () => {
  const [activeTab, setActiveTab] = useState("repair-history");
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  const handleViewDetails = async (requestId: string) => {
    setSelectedRepairId(requestId);
    
    // Fetch the repair details from Appwrite
    try {
      const repair = await getRepairRequestById(requestId);
      if (repair) {
        setSelectedRepair(repair);
        setIsModalOpen(true);
      } else {
        console.error("Repair request not found");
      }
    } catch (error) {
      console.error("Error fetching repair details:", error);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <div className="min-h-screen bg-[#0f1115]">
      <header className="bg-[#1a1c23] border-b border-[#2a2d36]">
        {/* Header content could go here */}
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Button asChild variant="ghost" className="text-gray-400 hover:text-white p-0">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Home
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Repair Center</h1>
          <p className="text-gray-400">Track and manage your device repair requests</p>
        </motion.div>

        <Tabs defaultValue="repair-history" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <TabsList className="grid w-full grid-cols-2 bg-[#2a2d36] p-1">
              
              <TabsTrigger 
                value="track-repair" 
                className="data-[state=active]:bg-[#1a1c23] data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-300 rounded-md"
              >
                <Clock className="h-4 w-4 mr-2" /> 
                Track Repairs
              </TabsTrigger>
            </TabsList>
          </motion.div>
          
          <TabsContent value="track-repair">
            <TrackHistory />
          </TabsContent>
        </Tabs>

        
      </main>
    </div>
  );
}

export default RepairPage;