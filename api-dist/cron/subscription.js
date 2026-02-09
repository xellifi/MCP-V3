var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/cron/subscription.ts
var subscription_exports = {};
__export(subscription_exports, {
  default: () => handler
});
module.exports = __toCommonJS(subscription_exports);

// api/cron/shared.ts
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);

// api/cron/subscription.ts
async function handler(req, res) {
  console.log("[Subscription Expiry Cron] Starting...");
  console.log("[Subscription Expiry Cron] Time:", (/* @__PURE__ */ new Date()).toISOString());
  let expiredCount = 0;
  let checkedCount = 0;
  try {
    const now = /* @__PURE__ */ new Date();
    const { data: expiredSubs, error: fetchError } = await supabase.from("user_subscriptions").select("id, user_id, package_id, billing_cycle, next_billing_date").eq("status", "Active").neq("billing_cycle", "Lifetime").not("next_billing_date", "is", null).lt("next_billing_date", now.toISOString());
    if (fetchError) {
      console.error("[Subscription Expiry Cron] Error fetching subscriptions:", fetchError.message);
      return res.status(500).json({ error: fetchError.message });
    }
    checkedCount = expiredSubs?.length || 0;
    console.log(`[Subscription Expiry Cron] Found ${checkedCount} expired subscriptions`);
    for (const sub of expiredSubs || []) {
      try {
        const { error: updateError } = await supabase.from("user_subscriptions").update({
          status: "expired",
          updated_at: now.toISOString()
        }).eq("id", sub.id);
        if (updateError) {
          console.error(`[Subscription Expiry Cron] Failed to update ${sub.id}:`, updateError.message);
          continue;
        }
        expiredCount++;
        console.log(`[Subscription Expiry Cron] \u2713 Expired subscription ${sub.id} for user ${sub.user_id}`);
      } catch (err) {
        console.error(`[Subscription Expiry Cron] Error updating ${sub.id}:`, err.message);
      }
    }
    console.log(`[Subscription Expiry Cron] Complete. Checked: ${checkedCount}, Expired: ${expiredCount}`);
    return res.status(200).json({
      success: true,
      summary: `Checked: ${checkedCount}, Expired: ${expiredCount}`,
      checked: checkedCount,
      expired: expiredCount
    });
  } catch (error) {
    console.error("[Subscription Expiry Cron] Exception:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
