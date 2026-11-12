// ============================================================
// delivery.config.js — Backend delivery charge configuration
//
// HOW TO ADD A NEW CATEGORY:
//   1. Add  newCategory: <amount>  to DELIVERY_CHARGES below.
//   2. That's it — getDeliveryCharge() picks it up automatically.
//
// The backend recalculates delivery from actual product data —
// the frontend-supplied total is never trusted.
// ============================================================

// Charge per category (₹). Keys must match product.category (lowercase).
export const DELIVERY_CHARGES = {
  crochet:          99,
  bouquets:        199,
  'quiling frames': 199,
  // Add future categories here, e.g.:
  // 'some category': 299,
};

// Returns the single delivery charge for the entire order.
// Rule: apply the HIGHEST charge among all categories in the cart.
// Quantity never multiplies the charge — it is charged once per order.
export const getDeliveryCharge = (products) => {
  if (!products || !products.length) return 0;

  let highest = 0;

  for (const product of products) {
    // Normalize category to lowercase for a reliable lookup
    const categoryKey = product.category?.toLowerCase().trim();
    const charge = DELIVERY_CHARGES[categoryKey];

    // Only update if this category has a configured charge
    if (charge !== undefined && charge > highest) {
      highest = charge;
    }
  }

  // If no category matched (unknown product type), return 0
  return highest;
};
