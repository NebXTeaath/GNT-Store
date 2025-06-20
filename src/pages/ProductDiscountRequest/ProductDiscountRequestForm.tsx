// src/pages/ProductDiscountRequest/ProductDiscountRequestForm.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productDiscountRequestSchema, ProductDiscountRequestFormData } from '@/lib/types/ProductDiscountRequestTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import { useNavigate } from 'react-router-dom';
import ProfilePreviewButton from '@/components/global/Profile/ProfilePreviewButton';
import SuccessConfirmation from './SuccessConfirmation';

export default function ProductDiscountRequestForm() {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const { data: userProfile } = useUserProfileQuery();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState("");

  const form = useForm<ProductDiscountRequestFormData>({
    resolver: zodResolver(productDiscountRequestSchema),
    defaultValues: {
      product_type: undefined,
      ecom_site: undefined,
      product_url: '',
      current_price: undefined,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const watchedProductType = form.watch('product_type');
  const watchedEcomSite = form.watch('ecom_site');

  const onSubmit = async (data: ProductDiscountRequestFormData) => {
    if (!isAuthenticated || !user) {
      openLoginModal();
      return;
    }
    if (!userProfile || !userProfile.address) { 
        toast.error("Please complete your profile first."); 
        document.getElementById('profile-preview')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return; 
    }
    setIsSubmitting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('product-discount-request', { body: data });
      if (error || !response?.success) {
        throw new Error(error?.message || response?.error || 'Failed to submit request.');
      }
      
      form.reset();
      toast.success("Request Submitted!", {
        description: "We will review your request and get back to you.",
        duration: 5000,
      });

      setSubmittedRequestId(response.requestId || '');
      setShowConfirmation(true);
      
    } catch (err: any) {
      console.error("Error submitting discount request:", err);
      toast.error("Submission Failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    navigate(`/product-discount-request/history?refresh=${new Date().getTime()}`);
  };

  return (
    <>
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <SuccessConfirmation requestId={submittedRequestId} onClose={handleConfirmationClose} />
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="max-w-4xl mx-auto p-4 space-y-8">
          <Card className="bg-[#1a1c23] border-[#2a2d36] text-white">
            <CardHeader>
              <CardTitle className="text-white">1. Product Information</CardTitle>
              <CardDescription className="text-gray-400">Tell us about the product you want a discount on.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="product_type" className="text-gray-300">Product Type *</Label>
                  <Select 
                    value={watchedProductType || ''} 
                    onValueChange={(value) => form.setValue('product_type', value as any, { shouldValidate: true })}
                  >
                    <SelectTrigger id="product_type" className="bg-[#2a2d36] border-[#3f4354]">
                      <SelectValue placeholder="Select a product type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1c23] border-[#2a2d36] text-white">
                      <SelectItem value="PC Parts">PC Parts</SelectItem>
                      <SelectItem value="Laptops">Laptops</SelectItem>
                      <SelectItem value="Computer Accessories">Computer Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.product_type && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5"/>{form.formState.errors.product_type.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecom_site" className="text-gray-300">E-commerce Site *</Label>
                  <Select 
                    value={watchedEcomSite || ''} 
                    onValueChange={(value) => form.setValue('ecom_site', value as any, { shouldValidate: true })}
                  >
                    <SelectTrigger id="ecom_site" className="bg-[#2a2d36] border-[#3f4354]">
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1c23] border-[#2a2d36] text-white">
                      <SelectItem value="Amazon.in">Amazon.in</SelectItem>
                      <SelectItem value="Flipkart.in">Flipkart.in</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.ecom_site && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5"/>{form.formState.errors.ecom_site.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_url" className="text-gray-300">Product URL *</Label>
                <Input id="product_url" placeholder="https://www.amazon.in/dp/..." className="bg-[#2a2d36] border-[#3f4354]" {...form.register('product_url')} />
                {form.formState.errors.product_url && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5"/>{form.formState.errors.product_url.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_price" className="text-gray-300">Current Price on Site (₹) *</Label>
                <Input id="current_price" type="number" step="0.01" placeholder="e.g., 49999" className="bg-[#2a2d36] border-[#3f4354]" {...form.register('current_price')} />
                {form.formState.errors.current_price && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5"/>{form.formState.errors.current_price.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card id="profile-preview" className="bg-[#1a1c23] border-[#2a2d36] text-white">
            <CardHeader>
              <CardTitle className="text-white">2. Your Contact Information</CardTitle>
              <CardDescription className="text-gray-400">We'll use this to send you the offer. Please ensure it's correct.</CardDescription>
            </CardHeader>
            <CardContent>
                <ProfilePreviewButton />
            </CardContent>
             <CardFooter>
                  <Button type="submit" size="lg" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                      Submit Discount Request
                  </Button>
              </CardFooter>
          </Card>
        </div> 
      </form>
    </>
  );
}