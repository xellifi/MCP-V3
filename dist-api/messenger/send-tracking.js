// Transpiled from TypeScript by esbuild
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

// api/messenger/send-tracking.ts
var send_tracking_exports = {};
__export(send_tracking_exports, {
  default: () => handler
});
module.exports = __toCommonJS(send_tracking_exports);
var STATUS_CONFIG = {
  confirmed: {
    emoji: "\u2705",
    title: "Order Confirmed!",
    message: "Great news! Your order has been confirmed and is being prepared.",
    buttonTitle: "\u{1F4CB} View Order",
    color: "blue"
  },
  shipped: {
    emoji: "\u{1F4E6}",
    title: "Order Shipped!",
    message: "Your order is on its way!",
    buttonTitle: "\u{1F4CD} Track Order",
    color: "purple"
  },
  delivered: {
    emoji: "\u{1F389}",
    title: "Order Delivered!",
    message: "Your order has been delivered. Enjoy your purchase!",
    buttonTitle: "\u{1F4CB} View Order",
    color: "green"
  },
  cancelled: {
    emoji: "\u274C",
    title: "Order Cancelled",
    message: "Your order has been cancelled. If you have questions, please contact us.",
    buttonTitle: "\u{1F4CB} View Details",
    color: "red"
  }
};
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !supabaseKey) {
      console.error("[SendOrderNotification] Missing Supabase credentials");
      return res.status(500).json({ error: "Server configuration error" });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const {
      subscriberId,
      pageId,
      orderId,
      customerName,
      items,
      total,
      status,
      carrier,
      trackingNumber,
      trackingUrl,
      notes,
      workspaceId
    } = req.body;
    if (!subscriberId || !pageId || !orderId || !status) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["subscriberId", "pageId", "orderId", "status"]
      });
    }
    if (status === "shipped" && (!carrier || !trackingNumber)) {
      return res.status(400).json({
        error: "Missing shipping fields",
        required: ["carrier", "trackingNumber"]
      });
    }
    console.log(`[SendOrderNotification] Sending ${status} notification for order:`, orderId);
    const { data: page, error: pageError } = await supabase.from("connected_pages").select("page_id, page_access_token, name").eq("page_id", pageId).maybeSingle();
    if (pageError || !page) {
      console.error("[SendOrderNotification] Page not found:", pageError?.message);
      return res.status(404).json({ error: "Page not found" });
    }
    const pageAccessToken = page.page_access_token;
    const itemsList = (items || []).map(
      (item) => `\u2022 ${item.productName} \xD7 ${item.quantity}`
    ).join("\n");
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.APP_URL || "https://your-app.vercel.app";
    const orderUrl = `${baseUrl}/track/${orderId}`;
    const config = STATUS_CONFIG[status];
    let message = "";
    if (status === "shipped") {
      message = `${config.emoji} ${config.title}

Hi ${customerName}! ${config.message}

\u{1F194} Order: #${orderId.slice(-8).toUpperCase()}
\u{1F69A} Carrier: ${carrier}
\u{1F4CB} Tracking #: ${trackingNumber}

\u{1F6CD}\uFE0F Items:
${itemsList}

\u{1F4B0} Total: \u20B1${(total || 0).toLocaleString()}
${notes ? `
\u{1F4DD} Note: ${notes}` : ""}

Track your package using the tracking number above or tap the button below.`;
    } else if (status === "cancelled") {
      message = `${config.emoji} ${config.title}

Hi ${customerName}, ${config.message}

\u{1F194} Order: #${orderId.slice(-8).toUpperCase()}

\u{1F6CD}\uFE0F Items:
${itemsList}

\u{1F4B0} Amount: \u20B1${(total || 0).toLocaleString()}

If you need assistance, please don't hesitate to reach out.`;
    } else {
      message = `${config.emoji} ${config.title}

Hi ${customerName}! ${config.message}

\u{1F194} Order: #${orderId.slice(-8).toUpperCase()}

\u{1F6CD}\uFE0F Items:
${itemsList}

\u{1F4B0} Total: \u20B1${(total || 0).toLocaleString()}

${status === "confirmed" ? "We will notify you once your order is shipped." : "Thank you for shopping with us! \u{1F49D}"}`;
    }
    const messagePayload = {
      recipient: { id: subscriberId },
      messaging_type: "MESSAGE_TAG",
      tag: "POST_PURCHASE_UPDATE",
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: message,
            buttons: [
              {
                type: "web_url",
                url: orderUrl,
                title: config.buttonTitle,
                webview_height_ratio: "full",
                messenger_extensions: false
              }
            ]
          }
        }
      }
    };
    console.log("[SendOrderNotification] Sending to Messenger...");
    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messagePayload)
      }
    );
    const fbResult = await fbResponse.json();
    if (!fbResponse.ok) {
      console.error("[SendOrderNotification] Facebook API error:", fbResult);
      return res.status(500).json({
        error: "Failed to send message",
        details: fbResult.error?.message || "Unknown error"
      });
    }
    console.log("[SendOrderNotification] \u2713 Message sent:", fbResult.message_id);
    const { data: existingOrder, error: fetchError } = await supabase.from("orders").select("metadata").eq("id", orderId).single();
    if (fetchError) {
      console.error("[SendOrderNotification] Failed to fetch order:", fetchError.message);
    }
    const updatedMetadata = {
      ...existingOrder?.metadata || {},
      notifications: {
        ...existingOrder?.metadata?.notifications || {},
        [status]: {
          sentAt: (/* @__PURE__ */ new Date()).toISOString(),
          messageId: fbResult.message_id
        }
      }
    };
    if (status === "shipped") {
      updatedMetadata.tracking = {
        carrier,
        trackingNumber,
        trackingUrl: trackingUrl || null,
        notes,
        notifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const { error: updateError } = await supabase.from("orders").update({
      status,
      // Update the actual status column
      metadata: updatedMetadata,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", orderId);
    if (updateError) {
      console.error("[SendOrderNotification] Failed to update order:", updateError.message);
    } else {
      console.log("[SendOrderNotification] \u2713 Order metadata updated");
    }
    return res.status(200).json({
      success: true,
      messageId: fbResult.message_id,
      orderId,
      status,
      ...status === "shipped" ? { carrier, trackingNumber } : {}
    });
  } catch (error) {
    console.error("[SendOrderNotification] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
}
