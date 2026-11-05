import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM } from './Config.mjs';

async function runDiagnostic() {
  const recipient = process.argv[2];
  if (!recipient) {
    console.error('Usage: node diagnostic.mjs <recipient-email>');
    process.exit(1);
  }

  console.log('--- Resend Diagnostic ---');
  console.log('RESEND_API_KEY configured:', !!RESEND_API_KEY);
  
  if (!RESEND_API_KEY) {
    console.log('? RESEND_API_KEY is not defined. Ensure your production environment provides it.');
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);
  const fromAddress = RESEND_FROM || 'Art Store <onboarding@resend.dev>';
  
  console.log('Sender (from):', fromAddress);
  console.log('Recipient (to):', recipient);
  console.log('-------------------------');
  console.log('Sending test email...');
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: recipient,
      subject: 'Art Store - Diagnostic Test',
      text: 'This is a test email to diagnose delivery issues.',
    });

    if (error) {
      console.log('? API Error Returned:');
      console.log(JSON.stringify(error, null, 2));
      process.exit(1);
    } else {
      console.log('? API Success (Email Accepted by Resend)');
      console.log('Resend Email ID:', data?.id);
      
      console.log('\nFetching delivery status from Resend API (waiting 3 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusRes = await resend.emails.get(data.id);
      if (statusRes.error) {
        console.log('? Could not fetch status:', statusRes.error);
      } else {
        console.log('Delivery Status:', statusRes.data?.last_event || statusRes.data?.status || 'Unknown');
        console.log('Full Status Data:', JSON.stringify(statusRes.data, null, 2));
      }
    }
  } catch (err) {
    console.log('? Exception Thrown during send:', err.message);
  }
}

runDiagnostic();
