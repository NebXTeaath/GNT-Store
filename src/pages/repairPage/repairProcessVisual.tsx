// src/pages/repairPage/repairProcessVisual.tsx
import React from "react";
import { ClipboardList, Search, Truck, Wrench, PackageCheck, ArrowRight } from "lucide-react";

const steps = [
  { icon: ClipboardList, text: "Create Request", description: "Submit your repair details." },
  { icon: Search, text: "Troubleshoot", description: "Our team analyzes the issue." },
  { icon: Truck, text: "Arrange Pickup", description: "(If needed) We collect your item." },
  { icon: Wrench, text: "Repair Item", description: "Expert technicians fix your device." },
  { icon: PackageCheck, text: "Ship Back", description: "Your repaired item is returned." },
];

export default function RepairProcessVisual() {
  return (
    <div className="bg-[#1a1b1e] p-6 rounded-lg mb-8 border border-gray-700 shadow-md">
      <h2 className="text-xl font-semibold mb-6 text-center text-white">Our Repair Process</h2>
      <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4 overflow-x-auto pb-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.text}>
            <div className="flex flex-col items-center text-center w-32 md:w-auto flex-shrink-0">
              <div className="bg-[#2f3555] p-3 rounded-full mb-2 text-white">
                <step.icon size={24} />
              </div>
              <p className="text-sm font-medium text-gray-200">{step.text}</p>
              <p className="text-xs text-gray-400 mt-1">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden md:flex items-center text-gray-500 mx-2 flex-shrink-0">
                 <ArrowRight size={20} />
              </div>
            )}
             {index < steps.length - 1 && ( <div className="md:hidden h-4 border-l border-gray-600 my-1"></div> )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}