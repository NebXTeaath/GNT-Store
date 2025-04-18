// supabase/functions/send-transactional-email/services/mailgun.ts

// Access environment variables securely
const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');
const SENDER_NAME = Deno.env.get('SENDER_NAME');
const MAILGUN_API_URL = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;

// Sends email using the Mailgun API
export async function sendEmailWithMailgun(to: string, subject: string, html: string): Promise<void> {
  // Validate configuration first
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !SENDER_EMAIL || !SENDER_NAME) {
    console.error("Mailgun configuration missing in environment variables.");
    throw new Error("Mailgun configuration missing."); // Fail fast
  }

  // Construct form data for Mailgun API
  const formData = new FormData();
  formData.append('from', `${SENDER_NAME} <${SENDER_EMAIL}>`);
  formData.append('to', to); // Mailgun handles multiple recipients if needed, but we send one at a time
  formData.append('subject', subject);
  formData.append('html', html);
  // Optional: Add a plain text version for better deliverability
  // formData.append('text', convertHtmlToText(html)); // Implement or use a library for this
  formData.append('o:tag', 'gnt-transactional'); // Add tags for tracking in Mailgun
  formData.append('o:tracking', 'yes'); // Enable open/click tracking if desired
  formData.append('o:tracking-clicks', 'htmlonly');
  formData.append('o:tracking-opens', 'yes');

  console.log(`Attempting to send email via Mailgun to: ${to}, Subject: ${subject}`);

  try {
    const res = await fetch(MAILGUN_API_URL, {
      method: 'POST',
      headers: {
        // Use Basic Authentication for Mailgun API
        'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
      },
      body: formData
    });

    const responseText = await res.text(); // Read response text regardless of status

    if (!res.ok) {
      // Log detailed error from Mailgun
      console.error(`Mailgun API Error (${res.status}) for recipient ${to}:`, responseText);
      // Throw a more specific error
      throw new Error(`Mailgun API failed with status ${res.status}: ${responseText}`);
    }

    console.log(`Mailgun send successful for recipient ${to}. Response:`, responseText);
    // Success, no return value needed (void)

  } catch (error) {
    // Catch fetch errors or errors thrown above
    console.error(`Error during Mailgun API call to ${to}:`, error);
    // Re-throw the error so the main handler knows it failed
    throw error;
  }
}

// Basic placeholder for HTML to text conversion (replace with a better method if needed)
// function convertHtmlToText(html: string): string {
//   try {
//     // Very basic conversion - removes tags
//     let text = html.replace(/<style([\s\S]*?)<\/style>/gi, '');
//     text = text.replace(/<script([\s\S]*?)<\/script>/gi, '');
//     text = text.replace(/<\/div>/ig, '\n');
//     text = text.replace(/<\/li>/ig, '\n');
//     text = text.replace(/<li>/ig, '  *  ');
//     text = text.replace(/<\/ul>/ig, '\n');
//     text = text.replace(/<\/p>/ig, '\n');
//     text = text.replace(/<br\s*\/?>/ig, '\n');
//     text = text.replace(/<[^>]+>/ig, '');
//     text = text.replace(/ /g, ' ');
//     // Decode HTML entities
//     // This requires a more robust approach or library in Deno if complex entities are used
//     text = text.replace(/</g, '<').replace(/>/g, '>').replace(/&/g, '&');
//     // Collapse multiple newlines
//     text = text.replace(/\n\s*\n/g, '\n\n');
//     return text.trim();
//   } catch (e) {
//     console.warn("Failed to convert HTML to text, sending empty text version.", e);
//     return ""; // Return empty string if conversion fails
//   }
// }