// supabase/functions/validate-discount/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

interface DiscountCodeRecord { id: string; discount_code: string; type: 'percentage' | 'fixed'; rate: number; is_active: boolean; expiry_date: string | null; min_purchase: number | null; max_discount_value: number | null; user_usage_limit: number; total_usage_limit: number | null; }
interface ValidationPayload { discountCode: string; cartSubtotal: number; }
function formatCurrency(amount: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
    const authHeader = req.headers.get('Authorization'); if (!authHeader || !authHeader.startsWith('Bearer ')) { return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const supabaseUserClient: SupabaseClient = createClient( Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } } );
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(); if (userError || !user) { return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const userId = user.id;
    const supabaseAdmin: SupabaseClient = createClient( Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { global: { headers: corsHeaders }, auth: { autoRefreshToken: false, persistSession: false } } );

    let payload: ValidationPayload;
    try { payload = await req.json(); } catch (e) { return new Response(JSON.stringify({ isValid: false, message: 'Invalid request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
    const { discountCode, cartSubtotal } = payload; if (!discountCode || typeof cartSubtotal !== 'number') { return new Response(JSON.stringify({ isValid: false, message: 'Missing required fields: discountCode (string), cartSubtotal (number)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }

    try {
        const { data: codeData, error: codeError } = await supabaseAdmin.from('discount_codes').select('*').eq('discount_code', discountCode).maybeSingle(); if (codeError) throw codeError; if (!codeData) return new Response(JSON.stringify({ isValid: false, message: 'Discount code not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        const code = codeData as DiscountCodeRecord; let invalidReason: string | null = null;
        if (!code.is_active) invalidReason = 'This discount code is inactive';
        else if (code.expiry_date && new Date(code.expiry_date) < new Date()) invalidReason = 'This discount code has expired';
        else if (code.min_purchase != null && cartSubtotal < code.min_purchase) invalidReason = `Minimum purchase of ${formatCurrency(code.min_purchase)} required`;
        else { const { count: userUsage, error: usageError } = await supabaseAdmin.from('discount_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('discount_code_used', code.discount_code); if (usageError) throw usageError; if ((userUsage ?? 0) >= code.user_usage_limit) invalidReason = 'You have reached the usage limit for this discount code'; else if (code.total_usage_limit !== null) { const { count: totalUsage, error: totalUsageError } = await supabaseAdmin.from('discount_usage').select('*', { count: 'exact', head: true }).eq('discount_code_used', code.discount_code); if (totalUsageError) throw totalUsageError; if ((totalUsage ?? 0) >= code.total_usage_limit) invalidReason = 'This discount code has reached its total usage limit'; } }
        if (invalidReason) { return new Response(JSON.stringify({ isValid: false, message: invalidReason }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
        let calculatedDiscount = code.type === 'percentage' ? cartSubtotal * code.rate : code.rate;
        const finalDiscountAmount = parseFloat(Math.min(calculatedDiscount, code.max_discount_value ?? Number.MAX_VALUE, cartSubtotal).toFixed(2));
        return new Response(JSON.stringify({ isValid: true, discountCode: code.discount_code, rate: code.rate, type: code.type, calculatedDiscountAmount: finalDiscountAmount, message: 'Discount code is valid!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } catch (error) { let msg = 'Internal Server Error'; if (error instanceof Error) msg = error.message; console.error('Error validating discount code:', error); return new Response(JSON.stringify({ isValid: false, message: 'An error occurred during validation', error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
});