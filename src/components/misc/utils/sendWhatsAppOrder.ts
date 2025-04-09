// src/utils/sendWhatsAppOrder.ts

/**
 * Sends the order details to the admin via WhatsApp by opening a new browser tab.
 *
 * @param order - Object containing order details and a preformatted text message.
 */
export const sendOrderToWhatsApp = (order: {
  items: { name: string; quantity: number; price: number }[];
  total: number;
  address: string;
  orderText: string;
}) => {
  // Retrieve the admin's WhatsApp number from environment variables.
  const adminPhone = import.meta.env.VITE_ADMIN_WHATSAPP;
  if (!adminPhone) {
    console.error('Admin WhatsApp number not defined in environment variables.');
    return;
  }

  // Remove '+' and spaces from the phone number to ensure proper formatting.
  const formattedPhone = adminPhone.replace(/\+|\s/g, '');
  // Encode the order text to safely include it in the URL.
  const encodedMessage = encodeURIComponent(order.orderText);
  // Construct the WhatsApp URL with the pre-filled message.
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  // Open WhatsApp in a new tab. If the browser blocks this popup, allow popups for your site.
  window.open(whatsappUrl, '_blank');
};
