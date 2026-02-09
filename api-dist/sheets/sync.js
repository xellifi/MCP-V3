var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/sheets/sync.ts
var sync_exports = {};
__export(sync_exports, {
  default: () => handler
});
module.exports = __toCommonJS(sync_exports);
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { action, webhookUrl, spreadsheetId, sheetName, rowData, data, orderId, newStatus, updatedAt, workspaceId } = req.body;
    if (action === "updateStatus" || action === "updatePaymentStatus" || action === "deleteOrder") {
      console.log(`[Sheets Sync] Processing action: ${action} for order: ${orderId}`);
      let targetWebhookUrl2 = webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;
      if (!targetWebhookUrl2 && (workspaceId || orderId)) {
        console.log("[Sheets Sync] No webhook URL provided, looking up...");
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
          const supabase = createClient(supabaseUrl, supabaseKey);
          let wsId = workspaceId;
          if (!wsId && orderId) {
            console.log("[Sheets Sync] Getting workspace from order:", orderId);
            const { data: order } = await supabase.from("orders").select("workspace_id, source, metadata").eq("id", orderId).single();
            wsId = order?.workspace_id;
          }
          if (wsId) {
            console.log("[Sheets Sync] Looking up webhook URL for workspace:", wsId);
            const { data: workspace } = await supabase.from("workspaces").select("google_webhook_url").eq("id", wsId).single();
            if (workspace?.google_webhook_url) {
              targetWebhookUrl2 = workspace.google_webhook_url;
              console.log("[Sheets Sync] \u2713 Found webhook URL from workspace");
            } else {
              console.log("[Sheets Sync] Workspace has no google_webhook_url, checking flows...");
              const { data: flows } = await supabase.from("flows").select("nodes").eq("workspace_id", wsId).limit(10);
              let foundSheetName = null;
              if (flows) {
                console.log("[Sheets Sync] Checking", flows.length, "flows for Google Sheets nodes");
                for (const flow of flows) {
                  const nodes = flow.nodes || [];
                  console.log("[Sheets Sync] Flow has", nodes.length, "nodes");
                  for (const node of nodes) {
                    const nodeData = node.data || {};
                    const isSheetNode = node.type === "sheetsNode" || nodeData.nodeType === "sheetsNode" || (nodeData.label || "").toLowerCase().includes("sheet") || (nodeData.label || "").toLowerCase().includes("google");
                    if (isSheetNode) {
                      console.log("[Sheets Sync] Found sheets node:", node.type, nodeData.label);
                      const possibleWebhookUrl = nodeData.webhookUrl || // Direct on data
                      nodeData.config?.webhookUrl || // In config object
                      node.config?.webhookUrl;
                      const possibleSheetName = nodeData.sheetName || nodeData.config?.sheetName || node.config?.sheetName;
                      if (possibleWebhookUrl) {
                        targetWebhookUrl2 = possibleWebhookUrl;
                        foundSheetName = possibleSheetName || null;
                        console.log("[Sheets Sync] \u2713 Found webhook URL from flow Google Sheets node");
                        console.log("[Sheets Sync] \u2713 Sheet name from node config:", foundSheetName || "(not set)");
                        break;
                      } else {
                        console.log("[Sheets Sync] Sheets node found but no webhookUrl, keys:", Object.keys(nodeData));
                      }
                    }
                  }
                  if (targetWebhookUrl2)
                    break;
                }
              }
              if (foundSheetName && !sheetName) {
                req.foundSheetName = foundSheetName;
              }
            }
          } else {
            console.log("[Sheets Sync] Could not determine workspace ID");
          }
        } catch (err) {
          console.error("[Sheets Sync] Error looking up webhook URL:", err);
        }
      }
      if (!targetWebhookUrl2) {
        console.log("[Sheets Sync] No webhook URL configured, skipping status update");
        return res.status(200).json({ success: false, message: "No webhook configured" });
      }
      if (!orderId || !newStatus) {
        return res.status(400).json({ error: "Missing orderId or newStatus" });
      }
      console.log("[Sheets Sync] ========== SENDING STATUS UPDATE ==========");
      console.log("[Sheets Sync] Order ID:", orderId);
      console.log("[Sheets Sync] New Status:", newStatus);
      const effectiveSheetName = sheetName || req.foundSheetName || "Orders";
      console.log("[Sheets Sync] Sheet Name:", effectiveSheetName);
      console.log("[Sheets Sync] Webhook URL:", targetWebhookUrl2.substring(0, 60) + "...");
      const requestBody = {
        action,
        orderId,
        sheetName: effectiveSheetName
      };
      if (action === "updateStatus" || action === "updatePaymentStatus") {
        requestBody.newStatus = newStatus;
        requestBody.updatedAt = updatedAt || (/* @__PURE__ */ new Date()).toISOString();
      }
      console.log("[Sheets Sync] Request body:", JSON.stringify(requestBody));
      const response = await fetch(targetWebhookUrl2, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const responseText = await response.text();
      console.log("[Sheets Sync] ========== APPS SCRIPT RESPONSE ==========");
      console.log("[Sheets Sync] Status:", response.status);
      console.log("[Sheets Sync] Response:", responseText);
      let responseData = {};
      try {
        responseData = JSON.parse(responseText);
        if (responseData.error) {
          console.error("[Sheets Sync] \u274C Apps Script error:", responseData.error);
        } else if (responseData.success) {
          console.log("[Sheets Sync] \u2713 Action successful:", action);
        }
      } catch (e) {
        console.log("[Sheets Sync] Response is not JSON");
      }
      if (!response.ok) {
        throw new Error(`Apps Script error: ${responseText}`);
      }
      return res.status(200).json({ success: true, action, details: responseData });
    }
    const submissionData = rowData || data;
    if (!submissionData) {
      return res.status(400).json({ error: "Missing data" });
    }
    console.log("[Sheets Sync] Sheet name:", sheetName);
    console.log("[Sheets Sync] Data keys:", Object.keys(submissionData));
    if (spreadsheetId) {
      console.log("[Sheets Sync] Syncing to spreadsheet:", spreadsheetId);
    }
    const targetWebhookUrl = webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (targetWebhookUrl) {
      console.log("[Sheets Sync] Calling webhook:", targetWebhookUrl.substring(0, 60) + "...");
      const payload = {
        sheetName: sheetName || "Sheet1",
        rowData: submissionData
      };
      if (spreadsheetId) {
        payload.spreadsheetId = spreadsheetId;
      }
      const response = await fetch(targetWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      console.log("[Sheets Sync] Webhook response:", responseText);
      if (!response.ok) {
        throw new Error(`Apps Script error: ${responseText}`);
      }
      console.log("[Sheets Sync] \u2713 Data synced via Apps Script");
      return res.status(200).json({ success: true, method: "apps_script" });
    }
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (serviceEmail && privateKey) {
      const accessToken = await getGoogleAccessToken(serviceEmail, privateKey);
      if (accessToken) {
        const rowValues = Object.values(submissionData);
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName || "Sheet1")}!A:Z:append?valueInputOption=USER_ENTERED`;
        const response = await fetch(appendUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            values: [rowValues]
          })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "Google Sheets API error");
        }
        console.log("[Sheets Sync] \u2713 Data synced via Sheets API");
        return res.status(200).json({ success: true, method: "sheets_api" });
      }
    }
    console.log("[Sheets Sync] \u26A0 No sync method configured. Data not sent to sheets.");
    console.log("[Sheets Sync] To enable sync, set either:");
    console.log("  - GOOGLE_SHEETS_WEBHOOK_URL (Apps Script Web App)");
    console.log("  - GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY");
    return res.status(200).json({
      success: false,
      message: "No sync method configured. See server logs for setup instructions.",
      data_received: Object.keys(submissionData)
    });
  } catch (error) {
    console.error("[Sheets Sync] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
async function getGoogleAccessToken(email, privateKey) {
  try {
    const now = Math.floor(Date.now() / 1e3);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })).toString("base64url");
    const crypto = await import("crypto");
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(privateKey.replace(/\\n/g, "\n"), "base64url");
    const jwt = `${header}.${payload}.${signature}`;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    if (!response.ok) {
      console.error("[Sheets Sync] Token exchange failed:", await response.text());
      return null;
    }
    const tokenData = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("[Sheets Sync] Error getting access token:", error);
    return null;
  }
}
