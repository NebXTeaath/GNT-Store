// src/pages/GameLoadService/GameLoadServiceForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gameLoadServiceSchema, GameLoadServiceFormData } from '@/lib/types/GameLoadServiceTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, PlusCircle, Bot, Loader2, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useUserProfileQuery } from '@/components/global/hooks/useUserProfileData';
import { useNavigate } from 'react-router-dom';
import ProfilePreviewButton from '@/components/global/Profile/ProfilePreviewButton';
import AIHelpInstructions from '@/components/pages/repairPage/AIHelpInstructions';
import { copyToClipboard } from '@/lib/utils';
import { formatCurrencyWithSeparator } from '@/lib/currencyFormat';

export default function GameLoadServiceForm() {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const { data: userProfile } = useUserProfileQuery();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIHelp, setShowAIHelp] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const form = useForm<GameLoadServiceFormData>({
    resolver: zodResolver(gameLoadServiceSchema),
    defaultValues: {
      consoleType: 'PS5',
      availableStorage: 500,
      storageUnit: 'GB',
      games: [{ value: '' }],
      addStorage: false,
    },
    mode: 'onChange',
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "games",
  });

  const persistFormState = (data: Partial<GameLoadServiceFormData>) => {
    sessionStorage.setItem('gameLoadFormState', JSON.stringify(data));
  };

  // Load state from sessionStorage on component mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('gameLoadFormState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        // Ensure consoleType and storageUnit have valid values
        const sanitizedState = {
          ...parsedState,
          consoleType: parsedState.consoleType && ['PS4', 'PS5'].includes(parsedState.consoleType) 
            ? parsedState.consoleType 
            : 'PS5',
          storageUnit: parsedState.storageUnit && ['GB', 'TB'].includes(parsedState.storageUnit) 
            ? parsedState.storageUnit 
            : 'GB',
        };
        form.reset(sanitizedState);
      } catch (error) {
        console.error('Error parsing saved form state:', error);
        sessionStorage.removeItem('gameLoadFormState');
      }
    }
  }, [form]);

  const watchedGames = form.watch('games');
  const consoleType = form.watch('consoleType');
  const storageUnit = form.watch('storageUnit');
  const addStorage = form.watch('addStorage');

  const isAddButtonDisabled =
    fields.length >= 10 ||
    (fields.length > 0 && watchedGames[fields.length - 1]?.value.trim() === '');

  // Subscribe to form changes to persist them
  useEffect(() => {
    const subscription = form.watch((value) => {
      // The `value` here is the entire form state
      persistFormState({
        ...value,
        games: value.games?.filter((game): game is { value: string } => !!game?.value?.trim()) || [],
      });
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const handleShowAIPrompt = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please fill out the form correctly to generate the AI prompt.");
      return;
    }
    const formData = form.getValues();
    const gameListString = formData.games.map(g => g.value).filter(g => g.trim()).map(g => `- ${g}`).join('\n');
    const prompt = `Act as a helpful gaming expert at GNT Store. My console is a ${formData.consoleType} with ${formData.availableStorage} ${formData.storageUnit} of free space. Please provide a rough size estimate in GB for each of the following games and a total estimated size. Include a small buffer for updates and saves.\n\nGames List:\n${gameListString}`;
    setAiPrompt(prompt);
    setShowAIHelp(true);
    copyToClipboard(prompt).then(() => toast.success("Prompt copied to clipboard!"));
  };

  const onSubmit = async (data: GameLoadServiceFormData) => {
    if (!isAuthenticated || !user) {
      openLoginModal();
      return;
    }
    if (!userProfile) { toast.error("Please complete your profile first."); return; }
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        games: data.games.map(g => g.value).filter(g => g.trim()),
      };
      const { error } = await supabase.functions.invoke('console-games-addon-service', { body: payload });
      if (error) throw error;
      toast.success("Service Request Submitted!", {
        description: "We will contact you shortly to arrange for pickup.",
        duration: 5000,
      });
      form.reset();
      sessionStorage.removeItem('gameLoadFormState');
      navigate('/game-load/history');
    } catch (err: any) {
      console.error("Error submitting service request:", err);
      toast.error("Submission Failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const storageAddonPrice = consoleType === 'PS4' ? 2499 : 5999;
  const gameLoadPrice = consoleType === 'PS4' ? 6999 : 9999;
  const totalPrice = gameLoadPrice + (addStorage ? storageAddonPrice : 0);

  return (
    <>
      {showAIHelp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <AIHelpInstructions aiPrompt={aiPrompt} onClose={() => setShowAIHelp(false)} />
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="mb-8"></div>
        <div className="max-w-4xl mx-auto p-4 space-y-8">
          <Card className="bg-[#1a1c23] border-[#2a2d36] text-white">
            <CardHeader>
              <CardTitle className="text-white">1. Console & Storage</CardTitle>
              <CardDescription className="text-gray-400">Select your console and enter its available storage.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="consoleType" className="text-gray-300">Console Type *</Label>
                {/* FIXED: Use value prop with fallback and proper validation */}
                <Select 
                  value={consoleType || 'PS5'} 
                  onValueChange={(value) => {
                    if (value === 'PS4' || value === 'PS5') {
                      form.setValue('consoleType', value, { shouldValidate: true, shouldDirty: true });
                    }
                  }}
                >
                  <SelectTrigger id="consoleType" className="bg-[#2a2d36] border-[#3f4354]">
                    <SelectValue placeholder="Select a console" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1c23] border-[#2a2d36] text-white">
                    <SelectItem value="PS5">PlayStation 5</SelectItem>
                    <SelectItem value="PS4">PlayStation 4</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.consoleType && <p className="text-sm text-red-500">{form.formState.errors.consoleType.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="availableStorage" className="text-gray-300">Available Storage *</Label>
                <div className="flex gap-2">
                  <Input
                    id="availableStorage"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 612.5"
                    className="bg-[#2a2d36] border-[#3f4354] placeholder:text-gray-500"
                    {...form.register('availableStorage')}
                  />
                  {/* ALSO FIXED: Use value prop with fallback for storageUnit Select */}
                  <Select 
                    value={storageUnit || 'GB'} 
                    onValueChange={(value) => {
                      if (value === 'GB' || value === 'TB') {
                        form.setValue('storageUnit', value, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[80px] bg-[#2a2d36] border-[#3f4354]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1c23] border-[#2a2d36] text-white">
                      <SelectItem value="GB">GB</SelectItem>
                      <SelectItem value="TB">TB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.formState.errors.availableStorage && <p className="text-sm text-red-500">{form.formState.errors.availableStorage.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1c23] border-[#2a2d36] text-white">
            <CardHeader>
              <CardTitle className="text-white">2. Game Selection & Storage Check</CardTitle>
              <CardDescription className="text-gray-400">List your games, then use the Estimation button to check the size.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    placeholder={`Game #${index + 1}`}
                    className="bg-[#2a2d36] border-[#3f4354] placeholder:text-gray-500"
                    {...form.register(`games.${index}.value` as const)}
                  />
                  {fields.length > 1 && (<Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>)}
                </div>
              ))}
              {form.formState.errors.games?.[fields.length -1]?.value && <p className="text-sm text-red-500">{form.formState.errors.games[fields.length - 1]?.value?.message}</p>}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: '' })}
                disabled={isAddButtonDisabled}
                className="bg-transparent border-gray-600 hover:bg-[#2a2d36] hover:text-white disabled:opacity-50"
              >
                <PlusCircle className="mr-2 h-4 w-4" />Add Game
              </Button>

              <div className="pt-4">
                <Button type="button" onClick={handleShowAIPrompt} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
                  <Bot className="mr-2 h-4 w-4" />Get Storage Estimation
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1a1c23] border-[#2a2d36] text-white">
              <CardHeader>
                  <CardTitle className="text-white">3. Confirm & Submit</CardTitle>
                  <CardDescription className="text-gray-400">Review your details, add-ons, and final price.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">Contact & Shipping Details</h3>
                      <ProfilePreviewButton />
                  </div>
                  <Separator className="bg-gray-700" />
                  <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Service Summary</h3>
                      <div className="text-lg space-y-2">
                          <div className="flex justify-between"><span>Base Service ({consoleType}):</span> <span>{formatCurrencyWithSeparator(gameLoadPrice)}</span></div>
                          <div className="flex items-center space-x-3 p-3 rounded-md bg-slate-800/50">
                              <Checkbox 
                                id="addStorage" 
                                checked={addStorage} 
                                onCheckedChange={(checked) => form.setValue('addStorage', !!checked, { shouldValidate: true, shouldDirty: true })} 
                                className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" 
                              />
                              <Label htmlFor="addStorage" className="text-base cursor-pointer text-gray-300">
                                  Optional Storage Add-on (+{formatCurrencyWithSeparator(storageAddonPrice)})
                              </Label>
                          </div>
                          <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-700"><span>Total Price:</span> <span>{formatCurrencyWithSeparator(totalPrice)}</span></div>
                      </div>
                  </div>
              </CardContent>
              <CardFooter>
                  <Button type="submit" size="lg" className="w-full bg-[#5865f2] hover:bg-[#4752c4]" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                      Submit Service Request
                  </Button>
              </CardFooter>
          </Card>
        </div> 
      </form>
    </>
  );
}