// supabase/functions/send-transactional-email/templates/repair.ts
import { RepairData, BuiltEmailData, RepairAddressData } from '../types.ts';
import { getRepairStatusStyle, capitalize, formatDate, formatAddress } from '../utils/helpers.ts';

// Access environment variables needed for the template
const SUPPORT_WHATSAPP_NUMBER = Deno.env.get('SUPPORT_WHATSAPP_NUMBER');
const STORE_NAME = Deno.env.get('SENDER_NAME') || 'GNT Service'; // Use sender name as store name fallback

export function buildRepairEmail(repair: RepairData, trigger: 'create' | 'update'): BuiltEmailData {
    const addressData = repair.shipping_address || {}; // Expecting flattened structure now

    // --- Extract and validate essential data ---
    const recipientEmail = addressData.email || '';
    if (!recipientEmail) {
        const repairIdShort = repair.id?.substring(0, 8) ?? 'N/A';
        throw new Error(`Missing recipient email for repair ${repairIdShort}`);
    }
    const recipientName = addressData.name || 'Customer';
    const repairId = repair.id;
    const repairIdShort = repairId?.substring(0, 8) ?? 'N/A';
    const repairStatus = repair.status || "unknown";
    const isCreation = trigger === 'create';

    const productType = repair.product_type || 'N/A';
    const productDescription = repair.product_description || 'N/A';
    const assignedTechnician = repair.technician;
    const estimatedCompletion = repair.estimated_completion ? formatDate(repair.estimated_completion) : null; // Format date
    const notes = repair.notes;

    // --- Build HTML Content ---

    // Format address using helper (pass flattened address data)
    const addressHtml = formatAddress(addressData, addressData.name, addressData.phone);

    // WhatsApp Link
    const whatsappMessage = `Need help with my repair request #${repairIdShort}`;
     const whatsappLink = SUPPORT_WHATSAPP_NUMBER
        ? `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`
        : '#';

    // --- Email Subject ---
    const subject = isCreation
        ? `Your ${STORE_NAME} Repair Request Received (#${repairIdShort})`
        : `Your ${STORE_NAME} Repair Update: ${capitalize(repairStatus)} (#${repairIdShort})`;

    // --- Final HTML Content (using more inline styles similar to the old template) ---
    const htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f2f5;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #f7f7f7; padding: 20px 24px; border-bottom: 1px solid #e0e0e0; text-align: center;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #333333;">Repair Request ${isCreation ? 'Confirmation' : 'Update'}</h2>
            </div>
            <div style="padding: 24px; font-size: 14px; line-height: 1.6; color: #333;">
                <p style="font-size: 16px; margin-bottom: 20px; color: #111;">Hi ${recipientName},</p>
                <p style="margin-bottom: 24px;">${isCreation
                    ? 'We have received your repair request. Here are the details:'
                    : 'Here is the latest update on your repair request:'}</p>

                <div style="border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 24px; padding: 16px;">
                    <p style="margin: 5px 0;"><strong style="font-weight: 600; color: #1f2937;">Request ID:</strong> ${repairId}</p>
                    <p style="margin: 5px 0;"><strong style="font-weight: 600; color: #1f2937;">Product Type:</strong> ${productType}</p>
                    <p style="margin: 5px 0;"><strong style="font-weight: 600; color: #1f2937;">Issue Description:</strong> ${productDescription}</p>
                    <p style="margin-top: 10px;"><strong style="font-weight: 600; color: #1f2937;">Status:</strong> <span style="${getRepairStatusStyle(repairStatus)}">${capitalize(repairStatus)}</span></p>
                    ${assignedTechnician ? `<p style="margin: 5px 0;"><strong style="font-weight: 600; color: #1f2937;">Assigned Technician:</strong> ${assignedTechnician}</p>` : ''}
                    ${estimatedCompletion && repairStatus.toLowerCase() !== 'completed' ? `<p style="margin: 5px 0;"><strong style="font-weight: 600; color: #1f2937;">Estimated Completion:</strong> ${estimatedCompletion}</p>` : ''}
                    ${notes ? `<div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;"><strong style="font-weight: 600; color: #1f2937;">Notes:</strong><br>${notes.replace(/\n/g, '<br>')}</div>` : ''}
                </div>

                <h3 style="font-size: 16px; margin: 0 0 8px; font-weight: 600; color: #1f2937;">Your Contact / Pickup Address</h3>
                <div style="margin-bottom: 24px; padding: 16px; background-color: #f9f9f9; border-radius: 6px; line-height: 1.5; color: #4b5563;">
                    ${addressHtml}
                </div>

                <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <a href="${whatsappLink}" target="_blank" style="background-color: #25D366; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; display: inline-block;">Need Help? (WhatsApp)</a>
                </div>
            </div>
            <div style="background-color: #f7f7f7; padding: 16px 24px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #6b7280;">
                Thank you for choosing ${STORE_NAME}!
            </div>
        </div>
    </body>
    </html>`;

    return { subject, htmlContent, recipientEmail, recipientName };
}