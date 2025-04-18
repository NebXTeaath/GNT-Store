// supabase/functions/wishlist/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

// Interface for the final structure returned TO the frontend (should match RPC output)
interface WishlistItemResponse {
    id: string; // Product UUID
    title: string;
    price: number;
    discount_price: number;
    image: string;
    slug: string;
    wishlistRecordId: string; // Wishlist record ID (uuid)
    wishlistCreatedAt: string; // Wishlist created_at (iso string)
}

// --- Environment Variables ---
// Ensure these are set in your Supabase project settings -> Functions -> wishlist -> Environment variables
const supabaseUrl = Deno.env.get('MY_SUPABASE_URL');      // Use the actual names you've set
const supabaseAnonKey = Deno.env.get('MY_SUPABASE_ANON_KEY'); // Use the actual names you've set


// --- Request Handler ---
serve(async (req: Request) => {
    console.log(`[wishlist] Received request: ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        console.log("[wishlist] Handling OPTIONS request");
        return new Response('ok', { headers: corsHeaders });
    }

    // Check env vars (using corrected names from above)
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error(`[wishlist] Missing environment variables: URL=${supabaseUrl ? 'Set' : 'Missing'}, KEY=${supabaseAnonKey ? 'Set' : 'Missing'}`);
        return new Response(JSON.stringify({ error: 'Server configuration error (missing env vars)', details: { url_set: Boolean(supabaseUrl), key_set: Boolean(supabaseAnonKey) } }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('[wishlist] Missing or invalid Authorization header');
        return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let supabase: SupabaseClient;
    try {
        supabase = createClient( supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } } );
    } catch (e) {
        console.error('[wishlist] Error creating Supabase client:', e);
        return new Response(JSON.stringify({ error: 'Error initializing database connection' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    let userId = '[unknown]';
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("User not found or session invalid");
        userId = user.id;
        console.log(`[wishlist] Authenticated User ID: ${userId}`);
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : (error && typeof error === 'object' && 'message' in error) ? String((error as { message: unknown }).message) : String(error);
        console.error('[wishlist] Auth Error:', errorMessage, error); // Log full error
        const status = (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') ? error.status : (error instanceof Error && error.message.includes("invalid") ? 401 : 500);
        const message = status === 401 ? 'Unauthorized' : 'Authentication error';
        return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
        switch (req.method) {
            // --- GET Wishlist (using RPC) ---
            case 'GET': {
                console.log(`[wishlist GET] User: ${userId}. Fetching wishlist via RPC...`);

                // Call the RPC function
                const { data, error } = await supabase
                    .rpc('get_user_wishlist_details', { p_user_id: userId }) // Pass user ID
                    .returns<WishlistItemResponse[]>(); // Expect array matching interface

                console.log(`[wishlist GET] RPC Result - Error: ${JSON.stringify(error)}, Data Rows: ${data?.length ?? 'null'}`);

                if (error) {
                    console.error(`[wishlist GET] RPC error for User: ${userId}:`, error);
                    throw new Error(`Database RPC error: ${error.message}`); // Throw a generic error
                }

                // Data from RPC is already in the desired format
                const formattedWishlist = data ?? [];

                console.log(`[wishlist GET] RPC successful. Returning ${formattedWishlist.length} items.`);
                return new Response(
                    JSON.stringify(formattedWishlist),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }

            // --- POST (Add Item) ---
            // This logic remains the same as it interacts directly with the wishlists table
            case 'POST': {
                let product_uuid: string;
                try {
                    const body = await req.json() as { product_uuid: string };
                    product_uuid = body.product_uuid;
                } catch (parseError) {
                     console.error('[wishlist POST] JSON parsing error:', parseError);
                     return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                }

                console.log(`[wishlist POST] User: ${userId}, Product: ${product_uuid}`);
                if (!product_uuid) {
                    console.warn(`[wishlist POST] Invalid input`);
                    return new Response(JSON.stringify({ error: 'Missing product_uuid' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                }

                // --- Wishlist Limit Check (Example: Limit to 50 items) ---
                 const { count: currentCount, error: countError } = await supabase.from('wishlists').select('id', { count: 'exact', head: true }).eq('user_id', userId);
                 if (countError) { throw new Error('Failed to check wishlist count: ' + countError.message); }
                 if ((currentCount ?? 0) >= 50) { // Check count *before* checking existence for limit
                     const { data: existingItemCheck } = await supabase.from('wishlists').select('id').eq('user_id', userId).eq('product_uuid', product_uuid).maybeSingle();
                     if (!existingItemCheck) { // Only block if it's a *new* item and limit is reached
                         console.warn(`[wishlist POST] Wishlist limit reached for user ${userId}. Count: ${currentCount}`);
                         return new Response(JSON.stringify({ error: 'Wishlist is full (max 50 items)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                     }
                 }
                // --- Product Existence Check (using the VIEW is fine here) ---
                 const { data: productCheck, error: productCheckError } = await supabase.from('products').select('uuid').eq('uuid', product_uuid).maybeSingle();
                 if (productCheckError) { throw new Error('Failed to verify product existence: ' + productCheckError.message); }
                 if (!productCheck) {
                     console.warn(`[wishlist POST] Product not found: ${product_uuid} for User: ${userId}`);
                     return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                 }

                // Upsert and select 'id' to know if it was inserted or ignored
                // `ignoreDuplicates: false` will cause error 23505 if it exists, which we catch.
                // Use `ignoreDuplicates: true` if you just want it to succeed silently if it exists.
                const { data, error } = await supabase.from('wishlists')
                    .upsert({ user_id: userId, product_uuid: product_uuid }, { onConflict: 'user_id, product_uuid', ignoreDuplicates: false })
                    .select('id') // Select only the ID
                    .single(); // Expect one row (either existing or new)

                if (error) {
                    console.error(`[wishlist POST] Upsert error for User: ${userId}, Product: ${product_uuid}:`, error);
                    const pgError = error as PostgrestError;
                    // Handle FK violation (product deleted between check and insert)
                    if (pgError.code === '23503') return new Response(JSON.stringify({ error: 'Referenced product not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                    // Handle unique violation (item already exists)
                    if (pgError.code === '23505') {
                         console.log(`[wishlist POST] Item already existed for User: ${userId}, Product: ${product_uuid}`);
                         // Return a success (200 OK) indicating it already exists, but include wishlist ID if possible
                         const { data: existingData } = await supabase.from('wishlists').select('id').eq('user_id', userId).eq('product_uuid', product_uuid).single();
                         return new Response(JSON.stringify({ message: 'Item already in wishlist', id: existingData?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
                     }
                    throw pgError; // Rethrow other DB errors
                }

                // If upsert succeeded and returned data, it was newly inserted
                console.log(`[wishlist POST] Success (Inserted) for User: ${userId}, Product: ${product_uuid}, ID: ${data?.id}`);
                // Return the ID of the *new* wishlist item
                return new Response(JSON.stringify({ id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }); // 201 Created
            }

            // --- DELETE (Remove Item or Clear) ---
            // This logic remains the same
            case 'DELETE': {
                const url = new URL(req.url);
                const product_uuid = url.searchParams.get('product_uuid');
                const clearAll = url.searchParams.get('clear') === 'true';
                console.log(`[wishlist DELETE] User: ${userId}, Product: ${product_uuid ?? 'ALL'}, Clear: ${clearAll}`);

                let query = supabase.from('wishlists').delete({ count: 'exact' }).eq('user_id', userId);

                if (clearAll) {
                    console.log(`[wishlist DELETE] Clearing all items for User: ${userId}`);
                } else if (product_uuid) {
                     console.log(`[wishlist DELETE] Removing product ${product_uuid} for User: ${userId}`);
                    query = query.eq('product_uuid', product_uuid);
                } else {
                    console.warn(`[wishlist DELETE] Invalid params`);
                    return new Response(JSON.stringify({ error: 'Missing product_uuid or clear=true parameter' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                }

                const { error, count } = await query;

                if (error) {
                    console.error(`[wishlist DELETE] Error:`, error);
                    throw error as PostgrestError; // Rethrow DB errors
                }

                if (!clearAll && product_uuid && (count === null || count === 0)) {
                    console.warn(`[wishlist DELETE] Item not found for User: ${userId}, Product: ${product_uuid}`);
                    return new Response(JSON.stringify({ error: 'Wishlist item not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
                }

                console.log(`[wishlist DELETE] Success. Removed ${count ?? 0} items.`);
                return new Response(
                    JSON.stringify({ success: true, removedCount: count ?? 0 }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
                );
            }
            default:
                console.log(`[wishlist] Method Not Allowed: ${req.method}`);
                return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), { status: 405, headers: { ...corsHeaders, Allow: 'GET, POST, DELETE' }});
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