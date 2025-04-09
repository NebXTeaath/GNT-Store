// src/pages/repairPage/NewRequest.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react"; // Removed unused MapPin, X
import { toast } from "sonner";
// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
// Removed unused Dialog imports if SuccessConfirmation handles its own modal
// Custom components and context
import ProfilePreviewButton from "@/pages/Profile/ProfilePreviewButton";
import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import SuccessConfirmation from "@/pages/repairPage/SuccessConfirmation"; // Assuming this exists
import { databases, APPWRITE_DATABASE_ID } from "@/lib/appwrite";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/context/AuthContext";

// Types
interface NewRequestProps {
    onSuccessfulSubmission: (requestId: string) => void;
}
interface FormErrors {
    deviceType: boolean;
    deviceModel: boolean;
    issueDescription: boolean;
    termsAccepted: boolean;
}
interface TouchedFields {
    deviceType: boolean;
    deviceModel: boolean;
    issueDescription: boolean;
    termsAccepted: boolean;
}

export default function NewRequest({ onSuccessfulSubmission }: NewRequestProps) {
    const [repairForm, setRepairForm] = useState({ deviceType: "", deviceModel: "", issueDescription: "" });
    const [formErrors, setFormErrors] = useState<FormErrors>({ deviceType: false, deviceModel: false, issueDescription: false, termsAccepted: false });
    const [touched, setTouched] = useState<TouchedFields>({ deviceType: false, deviceModel: false, issueDescription: false, termsAccepted: false });
    const deviceModelInputRef = useRef<HTMLInputElement>(null);
    const issueDescriptionRef = useRef<HTMLTextAreaElement>(null);
    const termsRef = useRef<HTMLInputElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const [, setDeviceTypeSelectOpen] = useState(false); // Keep if needed for Select logic
    const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submittedRequestId, setSubmittedRequestId] = useState<string>("");
    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

    // ----- Context -----
    const { data: userProfileData, isLoading: isProfileLoading, isFetching: isProfileFetching } = useUserProfileQuery();
    const { user } = useAuth();

  // ----- Field Validation -----
  const handleBlur = (
    field: "deviceModel" | "deviceType" | "issueDescription" | "termsAccepted"
  ) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (
    field: "deviceModel" | "deviceType" | "issueDescription" | "termsAccepted"
  ): boolean => {
    let hasError = false;
    if (field === "deviceModel") {
      hasError = !repairForm.deviceModel.trim();
    } else if (field === "deviceType") {
      hasError = !repairForm.deviceType.trim();
    } else if (field === "issueDescription") {
      hasError = !repairForm.issueDescription.trim();
    } else if (field === "termsAccepted") {
      hasError = !acceptedTerms;
    }
    setFormErrors((prev) => ({ ...prev, [field]: hasError }));
    return !hasError;
  };

  const validateForm = (): boolean => {
    // Check device form fields
    const newErrors: FormErrors = {
      deviceModel: !repairForm.deviceModel.trim(),
      deviceType: !repairForm.deviceType.trim(),
      issueDescription: !repairForm.issueDescription.trim(),
      termsAccepted: !acceptedTerms,
    };
    setFormErrors(newErrors);

    setTouched({
      deviceModel: true,
      deviceType: true,
      issueDescription: true,
      termsAccepted: true,
    });

    // Scroll to the first error
    if (newErrors.deviceModel && deviceModelInputRef.current) {
      deviceModelInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      deviceModelInputRef.current.focus();
      return false;
    } else if (newErrors.deviceType) {
      // Instead of using a ref for the Select component, we handle this differently
      // Focus the form section containing the device type
      const deviceTypeElement = document.getElementById("deviceType");
      if (deviceTypeElement) {
        deviceTypeElement.scrollIntoView({ behavior: "smooth", block: "center" });
        deviceTypeElement.focus();
      }
      return false;
    } else if (newErrors.issueDescription && issueDescriptionRef.current) {
      issueDescriptionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      issueDescriptionRef.current.focus();
      return false;
    } else if (newErrors.termsAccepted && termsRef.current) {
      termsRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      termsRef.current.focus();
      return false;
    }

    // No field errors
    return true;
  };

  // ----- Persist Form Data Helper -----
  const persistFormState = (state: typeof repairForm) => {
    sessionStorage.setItem("newRepairFormState", JSON.stringify(state));
  };

  // ----- Handlers -----
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const newState = { ...repairForm, [name]: value };
    setRepairForm(newState);
    persistFormState(newState);

    if (touched[name as keyof TouchedFields]) {
      validateField(name as keyof TouchedFields);
    }
  };

  const handleDeviceTypeChange = (value: string): void => {
    const newState = { ...repairForm, deviceType: value };
    setRepairForm(newState);
    persistFormState(newState);
    if (touched.deviceType) {
      validateField("deviceType");
    }
  };


  // ----- Effects (Keep implementations) -----
    useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
    useEffect(() => { const saved = sessionStorage.getItem("newRepairFormState"); if(saved) setRepairForm(JSON.parse(saved)); }, []);

    // ----- Submit Logic -----
    const submitRepairRequest = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !user.$id) { toast.error("You must be logged in."); return; }

        // Calculate completeness *here* for the functional check
        const isProfileFetchComplete = !isProfileLoading && !isProfileFetching;
        const isProfileCompleteForSubmit = Boolean(
            userProfileData && userProfileData.name && userProfileData.email &&
            userProfileData.phone && userProfileData.address?.line1 &&
            userProfileData.address?.city && userProfileData.address?.state &&
            userProfileData.address?.zip // && userProfileData.address?.country // Add if needed
        );

        // Check profile completeness ONLY after fetch is complete
        if (isProfileFetchComplete && !isProfileCompleteForSubmit) {
            toast.error("Profile information incomplete", { description: "Please complete your profile via the button above before submitting." });
            profileRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        // Prevent submission if profile is still loading/fetching and no data yet
        if (!isProfileFetchComplete && !userProfileData) {
            toast.info("Please wait, loading profile information...");
            return;
        }
         // Check profileDocId after loading is complete (if needed by backend indirectly)
         if (isProfileFetchComplete && !userProfileData?.profileDocId) {
             toast.error("Profile Error", { description: "Could not find profile ID. Please refresh or contact support." });
             return;
         }

        // Validate local form fields
        if (!validateForm()) {
            toast.error("Please fill in all required fields", { description: "Check the highlighted fields and try again.", icon: <AlertCircle className="h-5 w-5 text-red-400" /> });
            return;
        }

        setIsSubmitting(true);
        try {
            const repairId = `RPR-${uuidv4().replace(/-/g, "")}`;
            const shippingAddress = JSON.stringify({
                name: userProfileData?.name || "",
                email: userProfileData?.email || "",
                phone: userProfileData?.phone || "",
                address: userProfileData?.address || {},
            });
            const payload = {
                userId: user.$id,
                creationDate: new Date().toISOString(),
                status: "pending",
                productType: repairForm.deviceType,
                // Combine model and description robustly
                 productDescription: `${repairForm.deviceModel || 'Unknown Model'} - ${repairForm.issueDescription || 'No description'}`,
                shippingAddress,
                 // Add productModel separately if your collection has a field for it
                 //productModel: repairForm.deviceModel || "" // Example
            };

            await databases.createDocument(APPWRITE_DATABASE_ID, "repairrequests", repairId, payload);

            setSubmittedRequestId(repairId);
            setShowConfirmation(true);
            toast.success("Repair request submitted successfully!", { description: `Your reference ID is ${repairId}`, icon: <CheckCircle className="h-5 w-5 text-green-500" /> });

            setRepairForm({ deviceType: "", deviceModel: "", issueDescription: "" });
            setAcceptedTerms(false);
            sessionStorage.removeItem("newRepairFormState");

        } catch (error) {
            console.error("Error submitting repair request:", error);
            toast.error("Failed to submit repair request", { description: "Please try again later or contact support", icon: <AlertCircle className="h-5 w-5 text-red-400" /> });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmationClose = (): void => {
        setShowConfirmation(false);
        if (submittedRequestId) {
            onSuccessfulSubmission(submittedRequestId);
        }
    };

  // ----- Render -----
  return (
    <div>
      <div className="max-w-4xl mx-auto p-4">
        {/* Success Confirmation Dialog */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <SuccessConfirmation requestId={submittedRequestId} onClose={handleConfirmationClose} />
          </div>
        )}

        {/* Repair Request Form */}
        <form className="space-y-6 mt-6" onSubmit={submitRepairRequest}>
          {/* Device Model & Type */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="deviceModel" className="flex items-center">
                Device Model/Specifications <span className="text-red-400 ml-1">*</span>
              </Label>
              <Input
                id="deviceModel"
                name="deviceModel"
                placeholder="e.g., PS5 Digital Edition, Alienware m15 R4"
                value={repairForm.deviceModel}
                onChange={handleInputChange}
                onBlur={() => handleBlur("deviceModel")}
                ref={deviceModelInputRef}
                className={`bg-[#2a2d36] w-full ${
                  formErrors.deviceModel && touched.deviceModel
                    ? "border-red-400 focus:ring-red-400"
                    : "border-[#3f4354]"
                }`}
                required
              />
              {formErrors.deviceModel && touched.deviceModel && (
                <p className="text-red-400 text-sm flex items-center mt-1">
                  <AlertCircle className="h-3 w-3 mr-1" /> Device model is required
                </p>
              )}
            </div>
            <div className="md:col-span-1 space-y-2">
              <Label htmlFor="deviceType" className="flex items-center">
                Device Type <span className="text-red-400 ml-1">*</span>
              </Label>
              <Select
                value={repairForm.deviceType}
                onValueChange={handleDeviceTypeChange}
                onOpenChange={(open) => {
                  setDeviceTypeSelectOpen(open);
                  if (!touched.deviceType) {
                    setTouched((prev) => ({ ...prev, deviceType: true }));
                    validateField("deviceType");
                  }
                }}
              >
                <SelectTrigger
                  id="deviceType"
                  className={`bg-[#2a2d36] w-full transition-colors ${
                    formErrors.deviceType && touched.deviceType
                      ? "border-red-400"
                      : "border-[#3f4354]"
                  }`}
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2d36] border-[#3f4354] text-white">
                  <SelectItem value="ps5">PlayStation 5</SelectItem>
                  <SelectItem value="ps4">PlayStation 4</SelectItem>
                  <SelectItem value="ps3">PlayStation 3</SelectItem>
                  <SelectItem value="xbox-series-x">Xbox Series X</SelectItem>
                  <SelectItem value="xbox-series-s">Xbox Series S</SelectItem>
                  <SelectItem value="nintendo-switch">Nintendo Switch</SelectItem>
                  <SelectItem value="gaming-pc">Gaming PC</SelectItem>
                  <SelectItem value="gaming-laptop">Gaming Laptop</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.deviceType && touched.deviceType && (
                <p className="text-red-400 text-sm flex items-center mt-1">
                  <AlertCircle className="h-3 w-3 mr-1" /> Device type is required
                </p>
              )}
            </div>
          </div>

          {/* Issue Description */}
          <div className="space-y-2">
            <Label htmlFor="issueDescription" className="flex items-center">
              Describe the Issue <span className="text-red-400 ml-1">*</span>
            </Label>
            <Textarea
              id="issueDescription"
              name="issueDescription"
              placeholder="Please provide details about the problem you're experiencing..."
              value={repairForm.issueDescription}
              onChange={handleInputChange}
              onBlur={() => handleBlur("issueDescription")}
              ref={issueDescriptionRef}
              className={`bg-[#2a2d36] ${
                formErrors.issueDescription && touched.issueDescription
                  ? "border-red-400 focus:ring-red-400"
                  : "border-[#3f4354]"
              }`}
              rows={4}
              required
            />
            {formErrors.issueDescription && touched.issueDescription && (
              <p className="text-red-400 text-sm flex items-center mt-1">
                <AlertCircle className="h-3 w-3 mr-1" /> Description of the issue is required
              </p>
            )}
          </div>

          {/* Contact Information Section - Simplified */}
          <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6 mb-6" ref={profileRef}>
                        <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center text-white">
                            Your Contact Information
                            {/* Removed conditional "Required" text - handled by button now */}
                             <span className="text-red-400 ml-1">*</span>
                        </h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Please ensure your profile details are up-to-date. We'll use this information to contact you about your repair.
                        </p>
                        {/* Let ProfilePreviewButton handle ALL display states */}
                        <ProfilePreviewButton />
                         {/* Removed conditional messages/styling */}
                    </div>

                    {/* Required Fields Note */}
                    <div className="text-xs text-gray-400 flex items-center"><span className="text-red-400 mr-1">*</span>Required fields</div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full bg-[#5865f2] hover:bg-[#4752c4] py-3 text-base"
                        disabled={isSubmitting || isProfileLoading || isProfileFetching} // Disable if profile is loading/fetching
                    >
                        {isSubmitting ? (
                            <> <Loader2 className="animate-spin h-5 w-5 mr-2" /> Submitting... </>
                        ) : (
                            "Submit Repair Request"
                        )}
                    </Button>
                </form>
            </div>
            {/* </div> */}
        </div>
    );
}