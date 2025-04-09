//src\pages\support.tsx
"use client"
//
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, Send, ArrowLeft } from "lucide-react";
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



// Get the admin's WhatsApp number from the environment variable
const adminWhatsAppNumber = import.meta.env.VITE_ADMIN_WHATSAPP;

export default function SupportPage() {
  const [contactReason, setContactReason] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // ----- Scroll to Top on Mount -----
useEffect(() => {
  window.scrollTo({ top: 0, behavior: "smooth" });
}, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Format the message for WhatsApp
    const message = formatMessageForWhatsApp();

    // Simulate API call
    setTimeout(() => {
      // Open WhatsApp with pre-populated message to the admin's number
      window.open(
        `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`,
        "_blank"
      );

      setIsSubmitting(false);
      setIsSubmitted(true);

      // Reset form
      setContactReason("");
      setTitle("");
      setDescription("");
    }, 1000);
  };

  // Format message for WhatsApp
  const formatMessageForWhatsApp = () => {
    let message = "Hello GNT Store Support,\n\n";
    message += `Contact Reason: ${contactReason}\n`;

    if (contactReason !== "Others" && title) {
      message += `Title: ${title}\n`;
    }

    message += `\nDescription:\n${description}\n\n`;
    message += "Thank you.";
    return message;
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-[#5865f2]" />
            Support
          </h1>
          <p className="text-gray-400 mt-2">
            Need help? Contact our support team and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {isSubmitted ? (
            <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-[#5865f2]/20 flex items-center justify-center">
                  <HelpCircle className="h-8 w-8 text-[#5865f2]" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Support Request Sent</h2>
              <p className="text-gray-400 mb-6">
                Your support request has been sent via WhatsApp. Our team will respond to your inquiry as soon as possible.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => setIsSubmitted(false)} className="bg-[#5865f2] hover:bg-[#4752c4]">
                  Submit Another Request
                </Button>
                <Button asChild variant="outline" className="text-[#000000] border-[#2a2d36] hover:bg-[#cfcfcf]">
                  <Link to="/">Return to Home</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-[#1a1c23] border border-[#2a2d36] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">Contact Support</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="contact-reason">Reason for Contact</Label>
                  <Select value={contactReason} onValueChange={setContactReason} required>
                    <SelectTrigger className="bg-[#2a2d36] border-[#3f4354]">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1c23] border-[#3f4354]">
                      <SelectItem value="Order Related" className="text-white hover:text-black">Order Related</SelectItem>
                      <SelectItem value="Repair Related" className="text-white hover:text-black">Repair Related</SelectItem>
                      <SelectItem value="Product Inquiry" className="text-white hover:text-black">Product Inquiry</SelectItem>
                      <SelectItem value="Delivery Related" className="text-white hover:text-black">Delivery Related</SelectItem>
                      <SelectItem value="Others" className="text-white hover:text-black">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {contactReason && contactReason !== "Others" && (
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Brief summary of your inquiry"
                      className="bg-[#2a2d36] border-[#3f4354]"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please provide details about your inquiry..."
                    className="bg-[#2a2d36] border-[#3f4354]"
                    rows={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
                  disabled={isSubmitting || !contactReason || !description}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Send className="mr-2 h-4 w-4" />
                      Send via WhatsApp
                    </span>
                  )}
                </Button>

                <div className="text-xs text-gray-400 text-center">
                  By clicking "Send via WhatsApp", you'll be redirected to WhatsApp to send your support request directly to our team.
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
