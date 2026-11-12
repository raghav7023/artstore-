// Re-export all email functions from emailService.js
export {
  sendOwnerOrderEmail,
  sendCustomerOrderEmail,
  sendOrderEmails,
  sendCustomOrderOwnerEmail,
  sendCustomOrderCustomerEmail,
  sendCustomOrderEmails,
} from './emailService.js';
