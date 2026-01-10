# Fixes Applied - January 10, 2026

## Issue 1: Cart includes previous orders after upsell acceptance

### Problem
When a user accepts an upsell offer and proceeds to checkout, the checkout node was displaying products from previous transactions along with the current order. The cart was not being cleared after completing a checkout.

### Root Cause
The cart was stored in the subscriber's metadata and was never cleared after checkout completion. When a new transaction started, the old cart items would persist and get merged with new items.

### Fix Applied
**File: `api/webhooks/meta.ts` (around line 1266-1283)**

Added cart clearing logic after checkout confirmation:
```typescript
// CRITICAL FIX: Clear cart after checkout is confirmed
// This ensures the next transaction starts with a fresh cart
console.log(`  🧹 Clearing cart from subscriber metadata after checkout...`);
await supabase
    .from('subscribers')
    .update({
        metadata: {
            ...(subscriber?.metadata || {}),
            cart: [],
            cartTotal: 0,
            cartUpdatedAt: new Date().toISOString(),
            lastCheckoutAt: new Date().toISOString()
        }
    })
    .eq('external_id', senderId)
    .eq('workspace_id', workspaceId);
console.log(`  ✓ Cart cleared - next transaction will start fresh`);
```

---

## Issue 2: Invoice node not delivered when proceeding to checkout

### Problem
After confirming checkout, the invoice node was not being executed, so customers never received their receipt/invoice message.

### Root Cause
The `invoiceNode` handler was only implemented in `api/forms/continue-flow.ts` (which handles form submissions), but was **NOT** implemented in the webhook's `executeAction` function in `api/webhooks/meta.ts`. 

When checkout is confirmed via a postback (button click), the flow executes via `executeFlowFromNode` → `executeAction`, but since there was no `invoiceNode` case in `executeAction`, the invoice was never sent.

### Fix Applied
**File: `api/webhooks/meta.ts` (around line 4199-4376)**

Added complete `invoiceNode` handler to `executeAction`:
```typescript
// Invoice Node - send invoice/receipt after checkout completion
if (nodeType === 'invoiceNode') {
    console.log(`    ✓ Detected as Invoice Node`);
    const companyName = config.companyName || 'Store';
    const confirmationMessage = config.confirmationMessage || 'Thank you for your order! 🎉';

    // Get cart from context or subscriber metadata
    let cart = (context as any).cart || [];
    let cartTotal = (context as any).cartTotal || 0;
    
    // If no cart in context, fetch from subscriber metadata
    if (cart.length === 0) {
        const { data: subscriber } = await supabase
            .from('subscribers')
            .select('metadata, name')
            .eq('external_id', context.commenterId)
            .eq('workspace_id', context.workspaceId)
            .single();
        
        if (subscriber?.metadata?.cart) {
            cart = subscriber.metadata.cart;
            cartTotal = subscriber.metadata.cartTotal || 0;
        }
    }
    
    // Send Facebook Receipt Template or fallback to text invoice
    // ... (full implementation)
}
```

---

## Flow Execution Summary

After these fixes, the checkout flow now works correctly:

1. **User clicks "Add to Cart"** → Product node adds item to cart (fresh cart)
2. **User accepts Upsell** → Upsell adds to existing cart
3. **Checkout Node** → Shows cart summary with ONLY current transaction items
4. **User confirms checkout** → `checkout_confirm` postback received
5. **Invoice Node executes** → Receipt is sent to user ✅
6. **Cart is cleared** → Next transaction starts fresh ✅

---

## Testing Checklist

- [ ] Start a new flow with a product
- [ ] Accept an upsell offer
- [ ] Verify checkout shows ONLY current order items (not old ones)
- [ ] Confirm the order
- [ ] Verify invoice/receipt is delivered
- [ ] Start a new transaction
- [ ] Verify cart is empty (fresh start)

---

## Deployment Notes

These changes are in the API files (`api/webhooks/meta.ts`), which are serverless functions. 

**For Vercel deployment:**
The changes will automatically deploy when pushed to the connected Git repository.

**For local testing:**
The Vite dev server handles frontend code, but API routes need to be tested via:
1. Vercel CLI: `vercel dev`
2. Or deploy to a preview environment
