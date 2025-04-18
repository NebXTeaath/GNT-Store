// supabase/functions/cart/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

// Interface for the final structure returned TO the frontend (should match RPC output)
interface CartItemResponse {
    id: string; // Product UUID
    title: string;
    price: number; // Ensure frontend handles potential nulls if DB allows
    discount_price: number; // Ensure frontend handles potential nulls if DB allows
    quantity: number;
    image: string;
    slug: string;
}

// --- Request Handler ---
serve(async (req: Request) => {
    // ... (Keep CORS handling, env var checks, auth header validation, Supabase client creation) ...
    console.log(`[cart] Received request: ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        console.log("[cart] Handling OPTIONS request");
        return new Response('ok', { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('MY_SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('MY_SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error(`[cart] Missing environment variables: URL=${supabaseUrl ? 'Set' : 'Missing'}, KEY=${supabaseAnonKey ? 'Set' : 'Missing'}`);
        return new Response(JSON.stringify({ error: 'Server configuration error (missing env vars)', details: { url_set: Boolean(supabaseUrl), key_set: Boolean(supabaseAnonKey) } }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('[cart] Missing or invalid Authorization header');
        return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let supabase: SupabaseClient;
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } });
    } catch (e) {
        console.error('[cart] Error creating Supabase client:', e);
        return new Response(JSON.stringify({ error: 'Error initializing database connection' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let userId = '[unknown]';
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("User not found or session invalid");
        userId = user.id;
        console.log(`[cart] Authenticated User ID: ${userId}`);
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : (error && typeof error === 'object' && 'message' in error) ? String((error as { message: unknown }).message) : String(error);
        console.error('[cart] Auth Error:', errorMessage, error);
        const status = (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') ? error.status : (error instanceof Error && error.message.includes("invalid") ? 401 : 500);
        const message = status === 401 ? 'Unauthorized' : 'Authentication error';
        return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Main Logic ---
    try {
        switch (req.method) {
            // --- GET Cart ---
            case 'GET': {
                console.log(`[cart GET] User: ${userId}. Fetching cart via RPC...`);

                // Call the RPC function
                const { data, error } = await supabase
                    .rpc('get_user_cart_details', { p_user_id: userId }) // Pass user ID as parameter
                    .returns<CartItemResponse[]>(); // Specify the expected return type

                console.log(`[cart GET] RPC Result - Error: ${JSON.stringify(error)}, Data Rows: ${data?.length ?? 'null'}`);

                if (error) {
                    // Handle potential RPC errors (e.g., function not found, permission denied)
                    console.error(`[cart GET] RPC error for User: ${userId}:`, error);
                    // You might want more specific error handling based on RPC error codes if needed
                    throw new Error(`Database RPC error: ${error.message}`);
                }

                // Data from RPC should already be in the correct format.
                // Handle null data explicitly (though RPC usually returns empty array if no rows)
                const formattedCart = data ?? [];

                console.log(`[cart GET] RPC successful. Returning ${formattedCart.length} items.`);
                return new Response(
                    JSON.stringify(formattedCart),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }

            // --- POST (Add/Upsert Item) ---
            // NOTE: POST, PATCH, DELETE logic remains the same as they interact directly
            // with the 'carts' table and don't rely on the implicit join.
            case 'POST': {
                // ... (Keep existing POST logic - it should still work) ...
                let requestBody: { product_uuid: string, quantity: number };
                try {
                    requestBody = await req.json() as { product_uuid: string, quantity: number };
                } catch (parseError) {
                    console.error('[cart POST] JSON parsing error:', parseError);
                    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                }
                const { product_uuid, quantity } = requestBody;
                console.log(`[cart POST] User: ${userId}, Product: ${product_uuid}, Qty: ${quantity}`);
                if (!product_uuid || quantity == null || quantity <= 0 || quantity > 99) {
                    console.warn(`[cart POST] Invalid input for User: ${userId}`);
                    return new Response(JSON.stringify({ error: 'Invalid product UUID or quantity (1-99)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                }
                // --- Cart Limit Check ---
                const { count: currentCount, error: countError } = await supabase.from('carts').select('product_uuid', { count: 'exact', head: true }).eq('user_id', userId);
                if (countError) { throw new Error('Failed to check cart count: ' + countError.message); }
                const { data: existingItem, error: checkError } = await supabase.from('carts').select('product_uuid').eq('user_id', userId).eq('product_uuid', product_uuid).maybeSingle();
                if (checkError) { throw new Error('Failed to check existing item: ' + checkError.message); }
                if (!existingItem && (currentCount ?? 0) >= 20) {
                    console.warn(`[cart POST] Cart limit reached for user ${userId}. Count: ${currentCount}`);
                    return new Response(JSON.stringify({ error: 'Cart is full (max 20 unique items)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                }
                // --- Product Existence Check (using the VIEW is fine here) ---
                const { data: productCheck, error: productCheckError } = await supabase.from('products').select('uuid').eq('uuid', product_uuid).maybeSingle();
                 if (productCheckError) { throw new Error('Failed to verify product existence: ' + productCheckError.message); }
                if (!productCheck) {
                    console.warn(`[cart POST] Product not found: ${product_uuid} for User: ${userId}`);
                    return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                }
                // --- Upsert ---
                const { data, error } = await supabase.from('carts').upsert({ user_id: userId, product_uuid: product_uuid, quantity: quantity }, { onConflict: 'user_id, product_uuid' }).select().single();
                if (error) {
                    console.error(`[cart POST] Upsert error for User: ${userId}, Product: ${product_uuid}:`, error);
                    const pgError = error as PostgrestError;
                    if (pgError.code === '23514') return new Response(JSON.stringify({ error: 'Quantity must be between 1 and 99.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                    // FK violation 23503 *could* still happen if product is deleted between check and upsert, but less likely.
                    if (pgError.code === '23503') return new Response(JSON.stringify({ error: 'Referenced product not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                    throw pgError;
                }
                console.log(`[cart POST] Upsert successful for User: ${userId}, Product: ${product_uuid}`);
                return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 });
            }

            // --- PATCH (Update Quantity) ---
            case 'PATCH': {
                 // ... (Keep existing PATCH logic - it should still work) ...
                 let requestBody: { product_uuid: string, quantity: number };
                 try { requestBody = await req.json(); } catch (e) { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                 const { product_uuid, quantity } = requestBody;
                 console.log(`[cart PATCH] User: ${userId}, Product: ${product_uuid}, Qty: ${quantity}`);
                 if (!product_uuid || quantity == null || quantity <= 0 || quantity > 99) { return new Response(JSON.stringify({ error: 'Invalid product UUID or quantity (1-99)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                 const { data, error, count } = await supabase.from('carts').update({ quantity: quantity, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('product_uuid', product_uuid).select().maybeSingle();
                 if (error) {
                     const pgError = error as PostgrestError;
                     if (pgError.code === '23514') return new Response(JSON.stringify({ error: 'Quantity must be between 1 and 99.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                     throw pgError;
                 }
                 if (!data && (count === null || count === 0)) { return new Response(JSON.stringify({ error: 'Cart item not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                 console.log(`[cart PATCH] Update successful for User: ${userId}, Product: ${product_uuid}`);
                 return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }

            // --- DELETE (Remove Item or Clear Cart) ---
            case 'DELETE': {
                 // ... (Keep existing DELETE logic - it should still work) ...
                 const url = new URL(req.url);
                 const product_uuid = url.searchParams.get('product_uuid');
                 const clearAll = url.searchParams.get('clear') === 'true';
                 console.log(`[cart DELETE] User: ${userId}, Product: ${product_uuid ?? 'ALL'}, Clear: ${clearAll}`);
                 let query = supabase.from('carts').delete({ count: 'exact' }).eq('user_id', userId);
                 if (clearAll) { console.log(`[cart DELETE] Clearing all items for User: ${userId}`); }
                 else if (product_uuid) { console.log(`[cart DELETE] Removing product ${product_uuid} for User: ${userId}`); query = query.eq('product_uuid', product_uuid); }
                 else { return new Response(JSON.stringify({ error: 'Missing product_uuid or clear=true parameter' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                 const { error, count } = await query;
                 if (error) { throw error as PostgrestError; }
                 if (!clearAll && product_uuid && (count === null || count === 0)) { return new Response(JSON.stringify({ error: 'Cart item not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}); }
                 console.log(`[cart DELETE] Success for User: ${userId}. Removed ${count ?? 0} items.`);
                 return new Response(JSON.stringify({ success: true, removedCount: count ?? 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }

            default:
                console.log(`[cart] Method Not Allowed: ${req.method}`);
                return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: { ...corsHeaders, Allow: 'GET, POST, PATCH, DELETE' }});
        }
    } catch (error) {
        // Generic error handler for unexpected issues within the main try block
        let errorMessage = 'Internal Server Error';
        let statusCode = 500;

        // Attempt to get a more specific message and status
        const postgrestError = error as PostgrestError;
        if (error instanceof PostgrestError || ('code' in postgrestError && typeof postgrestError.code === 'string')) {
            errorMessage = postgrestError.message || 'Database Error';
            // Basic mapping for common PostgREST errors, can be expanded
            if (postgrestError.code === 'PGRST301') { // Eg: JWT expired or invalid
                 statusCode = 401;
                 errorMessage = 'Unauthorized or Session Expired';
            } else if (postgrestError.code.startsWith('23')) { // Integrity constraint violations
                 statusCode = 400; // Bad Request often fits
                 errorMessage = `Database constraint violation: ${postgrestError.details || postgrestError.message}`;
            } else if (postgrestError.code === '42P01') { // Undefined table
                 statusCode = 500; // Config error
                 errorMessage = `Server Configuration Error: Table not found (${postgrestError.message})`;
            } else if (postgrestError.code === '42703') { // Undefined column
                 statusCode = 500; // Config error
                 errorMessage = `Server Configuration Error: Column not found (${postgrestError.message})`;
            }
            // Add more specific PostgrestError code handling if needed
        } else if (error instanceof Error) {
            errorMessage = error.message;
            // Check for common JS error messages if needed
            if (error.message.includes('not found')) statusCode = 404;
            else if (error.message.includes('permission') || error.message.includes('access') || error.message.includes('Unauthorized')) statusCode = 403; // Or 401
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && typeof error === 'object' && 'message' in error) {
             errorMessage = String((error as { message: unknown }).message);
             if ('status' in error && typeof error.status === 'number') {
                 statusCode = error.status;
             }
        }

        // Log the full error structure for detailed debugging
        console.error(`[cart ${req.method}] Unhandled Error for User ${userId}:`, JSON.stringify(error, null, 2)); // Log full error object

        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        );
    }
});