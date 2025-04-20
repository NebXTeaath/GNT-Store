// src/pages/repairPage/NewRequest.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfilePreviewButton from "@/pages/Profile/ProfilePreviewButton";
import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import SuccessConfirmation from "@/pages/repairPage/SuccessConfirmation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface NewRequestProps { onSuccessfulSubmission: (requestId: string) => void; }
interface FormErrors { deviceType: boolean; deviceModel: boolean; issueDescription: boolean; }
interface TouchedFields { deviceType: boolean; deviceModel: boolean; issueDescription: boolean; }

export default function NewRequest({ onSuccessfulSubmission }: NewRequestProps) {
    const [repairForm, setRepairForm] = useState({ deviceType: "", deviceModel: "", issueDescription: "" });
    const [formErrors, setFormErrors] = useState<FormErrors>({ deviceType: false, deviceModel: false, issueDescription: false });
    const [touched, setTouched] = useState<TouchedFields>({ deviceType: false, deviceModel: false, issueDescription: false });
    const deviceModelInputRef = useRef<HTMLInputElement>(null);
    const issueDescriptionRef = useRef<HTMLTextAreaElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submittedRequestId, setSubmittedRequestId] = useState<string>("");
    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
    const { data: userProfileData, isLoading: isProfileLoading, isFetching: isProfileFetching } = useUserProfileQuery();
    const { user, isAuthenticated } = useAuth();

    const validateField = useCallback((field: keyof FormErrors): boolean => { let hasError = false; if (field === "deviceModel") hasError = !repairForm.deviceModel.trim(); else if (field === "deviceType") hasError = !repairForm.deviceType.trim(); else if (field === "issueDescription") hasError = !repairForm.issueDescription.trim(); setFormErrors((prev) => ({ ...prev, [field]: hasError })); return !hasError; }, [repairForm]);
    const handleBlur = useCallback((field: keyof TouchedFields) => { setTouched((prev) => ({ ...prev, [field]: true })); validateField(field); }, [validateField]);
    const validateForm = useCallback((): boolean => { const newErrors: FormErrors = { deviceModel: !repairForm.deviceModel.trim(), deviceType: !repairForm.deviceType.trim(), issueDescription: !repairForm.issueDescription.trim() }; setFormErrors(newErrors); setTouched({ deviceModel: true, deviceType: true, issueDescription: true }); if (newErrors.deviceModel || newErrors.deviceType || newErrors.issueDescription) { const firstErrorField = Object.keys(newErrors).find(key => newErrors[key as keyof FormErrors]); const element = document.getElementById(firstErrorField || 'deviceModel'); element?.scrollIntoView({ behavior: "smooth", block: "center" }); (element?.querySelector('input, textarea, button[role="combobox"]') as HTMLElement)?.focus(); return false; } return true; }, [repairForm]);
    const persistFormState = (state: typeof repairForm) => { sessionStorage.setItem("newRepairFormState", JSON.stringify(state)); };
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; const newState = { ...repairForm, [name]: value }; setRepairForm(newState); persistFormState(newState); if (touched[name as keyof TouchedFields]) { validateField(name as keyof FormErrors); } };
    const handleDeviceTypeChange = (value: string): void => { const newState = { ...repairForm, deviceType: value }; setRepairForm(newState); persistFormState(newState); if (touched.deviceType) { validateField("deviceType"); } };

    useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
    useEffect(() => { const saved = sessionStorage.getItem("newRepairFormState"); if (saved) setRepairForm(JSON.parse(saved)); }, []);

    const submitRepairRequest = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); if (!isAuthenticated || !user) { toast.error("Login required."); return; }
        const isProfileFetchComplete = !isProfileLoading && !isProfileFetching; const isProfileComplete = !!(userProfileData?.name && userProfileData?.email && userProfileData?.phone && userProfileData.address?.line1 && userProfileData.address?.city && userProfileData.address?.state && userProfileData.address?.zip);
        if (!isProfileFetchComplete && !userProfileData) { toast.info("Loading profile..."); return; } if (isProfileFetchComplete && !isProfileComplete) { toast.error("Profile incomplete", { description: "Please complete your profile first." }); profileRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (!validateForm()) { toast.error("Please fill all required fields", { icon: <AlertCircle className="h-5 w-5 text-red-400" /> }); return; }
        setIsSubmitting(true);
        try {
             const shippingAddress = { name: userProfileData?.name || "", email: userProfileData?.email || user.email || "", phone: userProfileData?.phone || "", address: userProfileData?.address || {} };
             const payload = { user_id: user.id, status: "pending", product_type: repairForm.deviceType, product_description: `${repairForm.deviceModel.trim()} - ${repairForm.issueDescription.trim()}`, shipping_address: shippingAddress };
             const { data: newRequest, error } = await supabase.from('repairrequests').insert(payload).select().single();
             if (error) throw error; if (!newRequest) throw new Error("Failed to create request.");
             setSubmittedRequestId(newRequest.id); setShowConfirmation(true); toast.success("Repair request submitted!", { description: `Reference ID: #${newRequest.id.substring(0, 8)}...`, icon: <CheckCircle className="h-5 w-5 text-green-500" /> });
             setRepairForm({ deviceType: "", deviceModel: "", issueDescription: "" }); sessionStorage.removeItem("newRepairFormState");
        } catch (error: any) { console.error("Error submitting repair request:", error); toast.error("Failed to submit request", { description: error.message || "Please try again.", icon: <AlertCircle className="h-5 w-5 text-red-400" /> }); }
        finally { setIsSubmitting(false); }
    };
    const handleConfirmationClose = (): void => { setShowConfirmation(false); if (submittedRequestId) onSuccessfulSubmission(submittedRequestId); };

    return (
        <div>
            <div className="max-w-4xl mx-auto p-4">
                {showConfirmation && ( <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"> <SuccessConfirmation requestId={submittedRequestId} onClose={handleConfirmationClose} /> </div> )}
                <form className="space-y-6 mt-6" onSubmit={submitRepairRequest}>
                    <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Device Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3 space-y-2">
                                <Label htmlFor="deviceModel" className="flex items-center text-gray-300">Model/Specs <span className="text-red-400 ml-1">*</span></Label>
                                <Input id="deviceModel" name="deviceModel" placeholder="e.g., PS5 Digital, Alienware m15 R4" value={repairForm.deviceModel} onChange={handleInputChange} onBlur={() => handleBlur("deviceModel")} ref={deviceModelInputRef} className={`bg-[#2a2d36] w-full border ${formErrors.deviceModel && touched.deviceModel ? "border-red-400 focus:ring-red-400" : "border-[#3f4354]"}`} required />
                                {formErrors.deviceModel && touched.deviceModel && (<p className="text-red-400 text-sm flex items-center mt-1"><AlertCircle className="h-3 w-3 mr-1" /> Model/Specs required</p>)}
                            </div>
                            <div className="md:col-span-1 space-y-2">
                                <Label htmlFor="deviceType" className="flex items-center text-gray-300">Type <span className="text-red-400 ml-1">*</span></Label>
                                <Select value={repairForm.deviceType} onValueChange={handleDeviceTypeChange} >
                                    <SelectTrigger id="deviceType" className={`bg-[#2a2d36] w-full border ${formErrors.deviceType && touched.deviceType ? "border-red-400" : "border-[#3f4354]"}`} onBlur={()=>handleBlur("deviceType")}><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent className="bg-[#2a2d36] border-[#3f4354] text-white">
                                         <SelectItem value="ps5">PS5</SelectItem> <SelectItem value="ps4">PS4</SelectItem> <SelectItem value="ps3">PS3</SelectItem> <SelectItem value="xbox-series-x">Xbox Series X</SelectItem> <SelectItem value="xbox-series-s">Xbox Series S</SelectItem>
                                         <SelectItem value="nintendo-switch">Nintendo Switch</SelectItem> <SelectItem value="gaming-pc">Gaming PC</SelectItem> <SelectItem value="gaming-laptop">Gaming Laptop</SelectItem> <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.deviceType && touched.deviceType && (<p className="text-red-400 text-sm flex items-center mt-1"><AlertCircle className="h-3 w-3 mr-1" /> Type required</p>)}
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6">
                        <Label htmlFor="issueDescription" className="flex items-center text-gray-300 text-lg sm:text-xl font-semibold mb-3">Issue Description <span className="text-red-400 ml-1">*</span></Label>
                        <Textarea id="issueDescription" name="issueDescription" placeholder="Details about the problem..." value={repairForm.issueDescription} onChange={handleInputChange} onBlur={() => handleBlur("issueDescription")} ref={issueDescriptionRef} className={`bg-[#2a2d36] min-h-[100px] border ${formErrors.issueDescription && touched.issueDescription ? "border-red-400 focus:ring-red-400" : "border-[#3f4354]"}`} rows={4} required />
                        {formErrors.issueDescription && touched.issueDescription && (<p className="text-red-400 text-sm flex items-center mt-1"><AlertCircle className="h-3 w-3 mr-1" /> Description required</p>)}
                    </div>
                    <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-4 sm:p-6" ref={profileRef}>
                        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Contact Information <span className="text-red-400 ml-1">*</span></h2>
                        <p className="text-sm text-gray-400 mb-4">Ensure your profile is up-to-date.</p>
                        <ProfilePreviewButton />
                    </div>
                    <div className="text-xs text-gray-400"><span className="text-red-400 mr-1">*</span>Required fields</div>
                    <Button type="submit" className="w-full bg-[#5865f2] hover:bg-[#4752c4] py-3 text-base" disabled={isSubmitting || isProfileLoading || isProfileFetching}> {isSubmitting ? (<><Loader2 className="animate-spin h-5 w-5 mr-2" /> Submitting...</>) : ("Submit Repair Request")} </Button>
                </form>
            </div>
        </div>
    );
}