// supabase/functions/orders/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.49.4'; // Use PostgrestError
import { corsHeaders } from '../_shared/cors.ts';

// Keep necessary interfaces for payload and potential GET response
interface OrderItem { id: string; title: string; price: number; discount_price: number; quantity: number; image?: string; slug?: string; }
interface UserProfileAddress { line1: string; line2?: string; city: string; state: string; zip: string; country: string; }
interface UserProfile { id: string; name: string; email: string; phone: string; address: UserProfileAddress; }
interface OrderPayload { cartItems: OrderItem[]; userProfile: UserProfile; discountCode?: string | null; }

// Interface for the RPC response
interface CreateOrderRpcResponse {
    success: boolean;
    message: string;
    order_id: string | null; // UUID can be null on failure
    final_total: number | null;
}

// Ensure env vars are correctly named and fetched
const supabaseUrl = Deno.env.get('MY_SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('MY_SUPABASE_ANON_KEY') ?? '';
// IMPORTANT: Use SERVICE_ROLE_KEY for the client calling the SECURITY DEFINER function
const supabaseServiceRoleKey = Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? '';


serve(async (req: Request) => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

    // --- Environment Variable Check ---
     if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
        console.error(`[orders] Missing environment variables: URL=${!!supabaseUrl}, ANON_KEY=${!!supabaseAnonKey}, SERVICE_KEY=${!!supabaseServiceRoleKey}`);
        return new Response(JSON.stringify({ error: 'Server configuration error (missing env vars)' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Auth Check (User making the request) ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create a client with USER credentials to get the user ID
    const supabaseUserClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
    });

    let userId: string;
    try {
        const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("User not found or session invalid");
        userId = user.id;
        console.log(`[orders] Authenticated User ID: ${userId}`);
    } catch (error) {
        // Handle Auth Error
        const errorMessage = (error instanceof Error) ? error.message : 'Authentication error';
        console.error('[orders] Auth Error:', errorMessage, error);
        const status = (errorMessage.includes("invalid") ? 401 : 500);
        return new Response(JSON.stringify({ error: status === 401 ? 'Unauthorized' : 'Authentication failed' }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Create Admin Client (for calling the SECURITY DEFINER RPC) ---
    // Use the Service Role Key here
    const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });


    // --- Main Logic ---
    try {
        switch (req.method) {
            // --- GET Orders (No change needed here, using user client) ---
            case 'GET': {
                console.log(`[orders GET] User: ${userId}. Fetching orders...`);
                const url = new URL(req.url);
                const page = parseInt(url.searchParams.get('page') || '1', 10);
                const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
                const offset = (page - 1) * pageSize;

                const { data: orders, error, count } = await supabaseUserClient // Use USER client
                    .from('orders')
                    .select('*', { count: 'exact' })
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .range(offset, offset + pageSize - 1);

                if (error) {
                    console.error(`[orders GET] Error fetching orders for user ${userId}:`, error);
                    throw error; // Let generic handler catch
                }

                console.log(`[orders GET] Success for user ${userId}. Found ${count ?? 0} total orders, returning page ${page}.`);
                return new Response(JSON.stringify({ orders: orders ?? [], totalCount: count ?? 0 }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // --- POST Order (Call RPC) ---
            case 'POST': {
                let payload: OrderPayload;
                try {
                    payload = await req.json();
                     console.log(`[orders POST] User: ${userId}. Received order payload.`);
                     // Add more detailed logging of payload if needed for debugging
                     // console.log("[orders POST] Payload details:", JSON.stringify(payload));
                } catch (e) {
                    console.error('[orders POST] Invalid JSON payload:', e);
                    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                // Basic validation (RPC does more thorough validation)
                if (!payload.cartItems?.length || !payload.userProfile?.address) {
                     console.warn(`[orders POST] User: ${userId}. Missing cart items or user profile/address in payload.`);
                    return new Response(JSON.stringify({ error: 'Missing cart items or user profile/address' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                console.log(`[orders POST] User: ${userId}. Calling create_order_and_process RPC...`);

                // Call the RPC function using the ADMIN client
                const { data: rpcData, error: rpcError } = await supabaseAdmin
                    .rpc('create_order_and_process', {
                        p_user_id: userId,
                        p_cart_items: payload.cartItems, // Pass directly as JSON
                        p_user_profile: payload.userProfile, // Pass directly as JSON
                        p_discount_code: payload.discountCode || null
                    })
                    .single<CreateOrderRpcResponse>(); // Expect a single row response

                if (rpcError) {
                    // Error calling the RPC itself (e.g., function doesn't exist, wrong parameters)
                    console.error(`[orders POST] RPC call error for user ${userId}:`, rpcError);
                    return new Response(JSON.stringify({ error: 'Failed to process order (RPC call failed)', details: rpcError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                if (!rpcData) {
                     console.error(`[orders POST] RPC returned no data for user ${userId}.`);
                     return new Response(JSON.stringify({ error: 'Failed to process order (RPC returned no data)' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                console.log(`[orders POST] RPC response for user ${userId}:`, rpcData);

                // Check the success flag from the RPC function's response
                if (rpcData.success && rpcData.order_id) {
                    // Order created successfully by the RPC
                    return new Response(JSON.stringify({
                        success: true,
                        message: rpcData.message,
                        orderId: rpcData.order_id,
                        total: rpcData.final_total
                    }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                } else {
                    // Order creation failed within the RPC (validation error, etc.)
                    // The RPC function determined the appropriate error message.
                    // Return 400 Bad Request for validation/business logic errors.
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Order processing failed', // Generic error type
                        message: rpcData.message || 'Could not create order.' // Specific message from RPC
                    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
            }
            default:
                return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: { ...corsHeaders, Allow: 'GET, POST' } });
        }
    } catch (error) {
        // Generic fallback error handler
        let msg = 'Internal Server Error';
        let statusCode = 500;
        if (error instanceof PostgrestError) { // Catch specific DB errors if GET fails
            if (error && typeof error === 'object' && 'message' in error) {
                msg = (error as { message: string }).message;
            } else {
                msg = String(error);
            }
            if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string') {
                statusCode = parseInt((error as { code: string }).code) >= 500 ? 500 : 400; // Basic status mapping
            } else {
                statusCode = 500;
            }
        } else if (error instanceof Error) {
             msg = error.message;
             if(msg.toLowerCase().includes('unauthorized') || msg.includes("User not found")) statusCode = 401;
        }
        console.error(`[orders ${req.method}] Unhandled Error for User ${userId}:`, error); // Log the raw error
        return new Response(JSON.stringify({ success: false, error: msg, message: msg }), {
            status: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});