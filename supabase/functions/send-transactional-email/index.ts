// supabase/functions/send-transactional-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmailWithMailgun } from './services/mailgun.ts';
import { buildOrderEmail } from './templates/order.ts';
import { buildRepairEmail } from './templates/repair.ts';
import { EmailPayload, OrderData, RepairData, BuiltEmailData } from './types.ts';

// --- Configuration ---
const TEST_MODE = false; // Set to false in production to actually send emails

// --- Main Request Handler ---
serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // --- Payload Validation ---
    let payload: EmailPayload;
    try {
        payload = await req.json();
        // Basic structure check
        if (!payload || typeof payload !== 'object' || !payload.type || !payload.trigger || !payload.data || typeof payload.data !== 'object' || !payload.data.id || !payload.data.user_id) {
             throw new Error("Invalid payload structure. Missing required fields (type, trigger, data.id, data.user_id).");
        }
         console.log(`Received payload: type=${payload.type}, trigger=${payload.trigger}, id=${payload.data.id}`);
    } catch (e) {
        console.error("Invalid request body:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: `Bad Request: ${errorMessage}` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // --- Supabase Admin Client (for fallback profile lookup) ---
     // Ensure Env Vars are loaded (consider adding checks earlier if needed)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) {
         console.error("Missing Supabase URL or Service Role Key environment variables.");
         return new Response(JSON.stringify({ error: 'Server configuration error.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAdmin: SupabaseClient = createClient( supabaseUrl, supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } } );

    // --- Main Processing Logic ---
    try {
        let emailData: BuiltEmailData;
        let recipientEmail: string | undefined | null = null;
        let recipientName: string = 'Customer'; // Default name
        const userId = payload.data.user_id; // User ID from the payload

        // --- Build Email Based on Type ---
        if (payload.type === 'order') {
            console.log("Building order email...");
            emailData = buildOrderEmail(payload.data as OrderData, payload.trigger);
            recipientEmail = emailData.recipientEmail; // Get email from primary source (order_details)
            recipientName = emailData.recipientName;
        } else if (payload.type === 'repair') {
            console.log("Building repair email...");
            emailData = buildRepairEmail(payload.data as RepairData, payload.trigger);
            recipientEmail = emailData.recipientEmail; // Get email from primary source (shipping_address)
            recipientName = emailData.recipientName;
        } else {
            // Should not happen if initial validation is correct, but good practice
            throw new Error(`Unsupported payload type: ${payload.type}`);
        }

        // --- Fallback: Fetch Email from User Profile if Missing ---
        if (!recipientEmail && userId) {
            console.warn(`Primary email missing for ${payload.type} ${payload.data.id}. Attempting profile lookup for user ${userId}...`);
            try {
                const { data: profile, error: profileError } = await supabaseAdmin
                    .from('user_profiles')
                    .select('email, name') // Select email and name
                    .eq('user_id', userId)
                    .maybeSingle();

                if (profileError) {
                     console.error(`Error fetching profile for user ${userId}:`, profileError);
                     // Decide whether to fail or proceed without email
                } else if (profile?.email) {
                    recipientEmail = profile.email;
                    // Update emailData only if the email was actually missing
                    if (!emailData.recipientEmail) emailData.recipientEmail = profile.email;
                    // Update name only if it was the generic default
                    if (emailData.recipientName === 'Valued Customer' || emailData.recipientName === 'Customer') {
                        emailData.recipientName = profile.name || emailData.recipientName; // Use profile name if available
                    }
                    console.log(`Found fallback email from profile: ${recipientEmail}`);
                } else {
                    console.warn(`Could not find profile or email in profile for user ${userId}`);
                }
            } catch(profileLookupError) {
                 console.error(`Exception during profile lookup for user ${userId}:`, profileLookupError);
            }
        }

        // --- Final Check and Send ---
        if (!recipientEmail) {
            // Log the failure but return a 200 OK to the trigger function
            // This prevents the original DB operation from potentially failing if email is non-critical
            console.error(`Cannot send email: Recipient email ultimately missing for ${payload.type} ID ${payload.data.id}.`);
            return new Response(JSON.stringify({ success: false, message: 'Email send failed: Missing recipient email.' }), {
                status: 200, // Acknowledge trigger processed, but email failed internally
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // --- Send the Email or Log in Test Mode ---
        if (TEST_MODE) {
            console.log(`[TEST MODE] Email would have been sent with the following details:`);
            console.log(`- Type: ${payload.type}`);
            console.log(`- Trigger: ${payload.trigger}`);
            console.log(`- Recipient: ${recipientEmail}`);
            console.log(`- Subject: ${emailData.subject}`);
            console.log(`- Content Preview: ${emailData.htmlContent.substring(0, 100)}...`);
            
            // Return success response for test mode
            return new Response(JSON.stringify({
                success: true,
                testMode: true,
                message: `Test mode: Email not actually sent to ${recipientEmail}`,
                emailDetails: {
                    type: payload.type,
                    trigger: payload.trigger,
                    recipient: recipientEmail,
                    subject: emailData.subject
                }
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else {
            // Normal production mode - actually send the email
            console.log(`Sending ${payload.type} email (${payload.trigger}) to ${recipientEmail} for ID ${payload.data.id}`);
            await sendEmailWithMailgun(recipientEmail, emailData.subject, emailData.htmlContent);
        }

        console.log(`Transactional email request successful for ${payload.type} ID ${payload.data.id}`);
        return new Response(JSON.stringify({ success: true, message: `Email sent successfully to ${recipientEmail}` }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // Catch errors from template building or sending
        let msg = 'Internal Server Error processing email request.';
        if (error instanceof Error) {
            msg = error.message; // Use specific error message
        }
        console.error(`Error processing ${payload?.type ?? 'unknown'} email request (ID: ${payload?.data?.id ?? 'N/A'}):`, error);

        // Return a server error status
        return new Response(JSON.stringify({ success: false, error: msg }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});