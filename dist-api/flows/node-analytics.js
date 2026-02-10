// Transpiled from TypeScript by esbuild
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

// api/flows/node-analytics.ts
var node_analytics_exports = {};
__export(node_analytics_exports, {
  default: () => handler
});
module.exports = __toCommonJS(node_analytics_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { flowId } = req.query;
    if (!flowId || typeof flowId !== "string") {
      return res.status(400).json({ error: "Missing flowId" });
    }
    const { data, error } = await supabase.from("node_analytics").select("node_id, sent_count, delivered_count, subscriber_count, error_count").eq("flow_id", flowId);
    if (error) {
      console.error("[Node Analytics] Error:", error);
      return res.status(500).json({ error: "Failed to fetch analytics" });
    }
    const analyticsMap = {};
    data?.forEach((item) => {
      analyticsMap[item.node_id] = {
        sent: item.sent_count || 0,
        delivered: item.delivered_count || 0,
        subscribers: item.subscriber_count || 0,
        errors: item.error_count || 0
      };
    });
    return res.status(200).json(analyticsMap);
  } catch (error) {
    console.error("[Node Analytics] Exception:", error);
    return res.status(500).json({ error: error.message });
  }
}
