// supabase/functions/send-transactional-email/templates/order.ts
import { OrderData, BuiltEmailData } from '../types.ts';
import { formatCurrency, getOrderStatusStyle, capitalize, formatDate, formatAddress } from '../utils/helpers.ts';

// Access environment variables needed for the template
const SUPPORT_WHATSAPP_NUMBER = Deno.env.get('SUPPORT_WHATSAPP_NUMBER');
const STORE_NAME = Deno.env.get('SENDER_NAME') || 'GNT Store'; // Use sender name as store name fallback

export function buildOrderEmail(order: OrderData, trigger: 'create' | 'update'): BuiltEmailData {
    const details = order.order_details || {};
    const customer = details.customer || {};
    const orderSummary = details.order_summary || {};
    const products = details.products || [];

    // --- Extract and validate essential data ---
    const recipientEmail = customer.email || '';
    if (!recipientEmail) {
        // Attempt to construct an error message even without email for logging
        const orderIdShort = order.id?.substring(0, 8) ?? 'N/A';
        throw new Error(`Missing recipient email for order ${orderIdShort}`);
    }
    const recipientName = customer.name || 'Valued Customer';
    const orderId = order.id;
    const orderIdShort = orderId?.substring(0, 8) ?? 'N/A'; // Use short ID for display
    const orderStatus = order.order_status || "unknown";
    const isCreation = trigger === 'create';

    // Format dates using the helper
    const formattedOrderDate = formatDate(details.order_date || order.created_at); // Fallback to created_at

    // --- Build HTML Content ---

    // Items Table Rows
    let itemsHtml = '';
    let calculatedSubtotal = 0; // Calculate subtotal from items if needed
    if (products.length > 0) {
        products.forEach(product => {
            const itemSubtotal = product.subtotal ?? ((product.discount_price ?? product.price ?? 0) * (product.quantity ?? 0));
            calculatedSubtotal += itemSubtotal;
            
            // COMMENTED OUT: Image handling code
            // const imageUrl = product.image || ''; // Handle missing image
            
            const productName = product.name || 'N/A';
            const productQty = product.quantity || 0;
            const productSubtotalFormatted = formatCurrency(itemSubtotal);

            // COMMENTED OUT: Image tag generation
            // Basic image placeholder logic if URL is empty
            /* 
            const imageTag = imageUrl
                ? `<img src="${imageUrl}" alt="${productName.substring(0, 30)}" width="60" height="60" style="width: 60px; height: 60px; object-fit: contain; border-radius: 4px; margin-right: 10px; border: 1px solid #eee; vertical-align: middle;">`
                : `<div style="width: 60px; height: 60px; background-color: #f3f4f6; border-radius: 4px; display: inline-block; text-align: center; line-height: 60px; color: #9ca3af; font-size: 10px; vertical-align: middle; margin-right: 10px; border: 1px solid #eee;">N/A</div>`;
            */

            itemsHtml += `
                <tr style="vertical-align: middle;">
                    <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: left;">
                        <!-- Image placeholder removed -->
                        <span>${productName}</span>
                    </td>
                    <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${productQty}</td>
                    <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; white-space: nowrap;">${productSubtotalFormatted}</td>
                </tr>`;
        });
    } else {
        itemsHtml = '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #666;">No items found in order details.</td></tr>';
    }

    // Order Summary Calculation & Formatting
    const summarySubtotal = orderSummary.subtotal ?? calculatedSubtotal; // Use summary if available, else calculated
    const discountAmount = orderSummary.discount_amount ?? 0;
    const summaryTotal = orderSummary.total ?? (summarySubtotal - discountAmount); // Use summary if available
    const discountCode = orderSummary.discount_code;
    const discountType = orderSummary.discount_type;
    const discountRate = orderSummary.discount_rate;

    const hasDiscount = discountCode && discountAmount > 0;
    let discountHtml = '';
    if (hasDiscount) {
        // Format discount info (e.g., "10%", "Rs. 50.00")
        const rateLabel = discountType === 'percentage' && discountRate ? `(${discountRate * 100}%)` : '';
        discountHtml = `
            <tr>
                <td colspan="2" style="padding: 5px 8px; text-align: right;">Discount (${discountCode} ${rateLabel}):</td>
                <td style="padding: 5px 8px; text-align: right; color: #10B981; white-space: nowrap;">-${formatCurrency(discountAmount)}</td>
            </tr>`;
    }

    // Address Formatting
    const shippingAddressHtml = formatAddress(customer.address, customer.name, customer.phone);

    // Delivery Info
    const deliveryInfo = orderStatus.toLowerCase() === 'delivered'
        ? `<span style="color:#10B981;">Delivered on ${formatDate(order.updated_at)}</span>` // Use updated_at for delivery
        : (order.remark || 'Tracking details will be updated soon.');

    // WhatsApp Link
    const whatsappMessage = `Need help with my ${STORE_NAME} order #${orderIdShort}`;
    const whatsappLink = SUPPORT_WHATSAPP_NUMBER
        ? `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`
        : '#'; // Fallback if number isn't set

    // --- Email Subject ---
    const subject = isCreation
        ? `Your ${STORE_NAME} Order #${orderIdShort} has been placed!`
        : `Your ${STORE_NAME} Order Update: ${capitalize(orderStatus)} (#${orderIdShort})`;


    // --- Final HTML Construction ---
    const htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; background-color: #f0f2f5; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
            .header { background-color: #1a1c23; padding: 20px 24px; border-bottom: 1px solid #3a3d4a; text-align: center; } /* Dark header */
            .header h2 { margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; } /* White text */
            .content { padding: 24px; font-size: 14px; line-height: 1.6; color: #333; }
            .content p { margin: 0 0 16px 0; }
            .greeting { font-size: 16px; margin-bottom: 20px; color: #111; }
            .order-box { border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 24px; }
            .order-info { padding: 12px 16px; background-color: #f9f9f9; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
            .order-info strong { font-weight: 600; color: #333; }
            .items-table { width: 100%; border-collapse: collapse; font-size: 14px; }
            .items-table th { padding: 10px 8px; border-bottom: 2px solid #e5e7eb; background-color: #f9fafb; text-align: left; color: #4b5563; font-weight: 600; }
            .items-table th:nth-child(2) { text-align: center; }
            .items-table th:nth-child(3) { text-align: right; }
            .items-table td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151; }
            /* COMMENTED OUT: CSS for image and text display
            .items-table td:nth-child(1) { display: flex; align-items: center; gap: 10px; } */
            .items-table td:nth-child(2) { text-align: center; }
            .items-table td:nth-child(3) { text-align: right; white-space: nowrap; font-weight: 500;}
            .summary-table { width: 100%; border-collapse: collapse; margin-top: 16px; text-align: right; font-size: 14px; border-top: 1px solid #e0e0e0; }
            .summary-table td { padding: 6px 16px; color: #4b5563; }
            .summary-table tr:last-child td { padding-top: 10px; padding-bottom: 10px; font-weight: bold; color: #111827; border-top: 1px solid #e0e0e0; font-size: 15px; }
            .address-section { width: 100%; font-size: 14px; border-spacing: 0; margin-top: 24px; }
            .address-section td { width: 50%; padding: 0 12px; vertical-align: top; }
            .address-section td:first-child { padding-left: 0; padding-right: 12px; }
            .address-section td:last-child { padding-right: 0; padding-left: 12px; border-left: 1px solid #e0e0e0; }
            .address-section h3 { font-size: 16px; margin: 0 0 8px; font-weight: 600; color: #1f2937;}
            .address-details { line-height: 1.5; color: #4b5563; }
            .help-section { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0; }
            .help-button { background-color: #25D366; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; display: inline-block; }
            .footer { background-color: #f7f7f7; padding: 16px 24px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>${isCreation ? 'Order Placed!' : 'Order Update'}</h2>
            </div>
            <div class="content">
                <p class="greeting">Hi ${recipientName},</p>
                <p>${isCreation
                    ? `Thank you for your order! We've received it (#${orderIdShort}) and will notify you again once it's processed and shipped.`
                    : `Here is the latest update on your ${STORE_NAME} order #${orderIdShort}:`}</p>

                <div class="order-box">
                    <div class="order-info">
                        <strong>Order ID:</strong> ${orderId}<br>
                        <strong>Order Date:</strong> ${formattedOrderDate}<br>
                        <strong>Status:</strong> <span style="${getOrderStatusStyle(orderStatus)}">${capitalize(orderStatus)}</span>
                    </div>
                    <div style="padding: 0;">
                        <h3 style="font-size: 16px; margin: 16px; font-weight: 600;">Items Ordered</h3>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        <table class="summary-table">
                            <tbody>
                                <tr>
                                    <td>Subtotal:</td>
                                    <td>${formatCurrency(summarySubtotal)}</td>
                                </tr>
                                ${discountHtml}
                                <tr>
                                    <td><strong>Total:</strong></td>
                                    <td><strong>${formatCurrency(summaryTotal)}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <table class="address-section">
                    <tr>
                        <td>
                            <h3>Shipping Address</h3>
                            <div class="address-details">${shippingAddressHtml}</div>
                        </td>
                        <td>
                            <h3>Delivery Information</h3>
                            <p class="address-details">${deliveryInfo}</p>
                        </td>
                    </tr>
                </table>

                <div class="help-section">
                    <a href="${whatsappLink}" target="_blank" class="help-button">Need Help? (WhatsApp)</a>
                </div>
            </div>
            <div class="footer">
                Thank you for shopping with ${STORE_NAME}!
            </div>
        </div>
    </body>
    </html>`;

    return { subject, htmlContent, recipientEmail, recipientName };
}