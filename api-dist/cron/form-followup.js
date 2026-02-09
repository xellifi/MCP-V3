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

// api/cron/form-followup.ts
var form_followup_exports = {};
__export(form_followup_exports, {
  default: () => handler
});
module.exports = __toCommonJS(form_followup_exports);

// api/cron/shared.ts
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
async function sendFollowupMessage(userId, text, pageAccessToken, messageTag, button) {
  try {
    let messagePayload = { text };
    if (button && button.url && button.url.includes("http")) {
      messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text,
            buttons: [
              {
                type: "web_url",
                url: button.url,
                title: button.text,
                webview_height_ratio: "full"
              }
            ]
          }
        }
      };
    }
    const body = {
      recipient: { id: userId },
      message: messagePayload,
      access_token: pageAccessToken
    };
    if (messageTag) {
      body.messaging_type = "MESSAGE_TAG";
      body.tag = messageTag;
    }
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );
    const result = await response.json();
    if (result.error) {
      console.error("[Followup] Message error:", result.error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Followup] Send exception:", error.message);
    return false;
  }
}

// api/cron/form-followup.ts
var MAX_WINDOW_DAYS = 7;
async function handler(req, res) {
  console.log("[Form Followup Cron] Starting...");
  console.log("[Form Followup Cron] Time:", (/* @__PURE__ */ new Date()).toISOString());
  try {
    const now = /* @__PURE__ */ new Date();
    const minOpenTime = new Date(now.getTime() - MAX_WINDOW_DAYS * 24 * 60 * 60 * 1e3);
    const { data: pendingFollowups, error: fetchError } = await supabase.from("form_opens").select("*").is("submitted_at", null).gt("opened_at", minOpenTime.toISOString()).order("opened_at", { ascending: true }).limit(50);
    if (fetchError) {
      console.error("[Form Followup Cron] Error fetching form_opens:", fetchError.message);
    }
    console.log("[Form Followup Cron] Found", pendingFollowups?.length || 0, "potential follow-ups");
    let processedCount = 0;
    let sentCount = 0;
    for (const formOpen of pendingFollowups || []) {
      processedCount++;
      const { data: flow } = await supabase.from("flows").select("*").eq("id", formOpen.flow_id).single();
      if (!flow)
        continue;
      const nodes = flow.nodes || [];
      const configurations = flow.configurations || {};
      const followupNode = nodes.find((n) => n.type === "followupNode");
      if (!followupNode)
        continue;
      const config = configurations[followupNode.id] || {};
      const scheduledFollowups = config.scheduledFollowups || [];
      if (scheduledFollowups.length === 0) {
        const legacyMessage = config.followupMessage;
        if (legacyMessage) {
          scheduledFollowups.push({
            id: "legacy_0",
            type: "delay",
            delayMinutes: config.firstDelayMinutes || 30,
            scheduledTime: "09:00",
            scheduledDays: 0,
            messageTag: "",
            message: legacyMessage,
            enabled: true
          });
        }
      }
      if (scheduledFollowups.length === 0)
        continue;
      const sentFollowupIds = formOpen.sent_followup_ids || [];
      const openedAt = new Date(formOpen.opened_at);
      const minutesSinceOpen = (now.getTime() - openedAt.getTime()) / (60 * 1e3);
      for (const followup of scheduledFollowups) {
        if (!followup.enabled)
          continue;
        if (sentFollowupIds.includes(followup.id))
          continue;
        let shouldSend = false;
        let isOutside24hr = false;
        if (followup.type === "delay") {
          const tolerance = 0.5;
          shouldSend = minutesSinceOpen >= followup.delayMinutes - tolerance;
          isOutside24hr = followup.delayMinutes > 1380;
        } else {
          const targetDate = new Date(openedAt);
          targetDate.setDate(targetDate.getDate() + followup.scheduledDays);
          const [hours, minutes] = followup.scheduledTime.split(":").map(Number);
          targetDate.setHours(hours, minutes, 0, 0);
          shouldSend = now >= targetDate;
          isOutside24hr = followup.scheduledDays >= 1;
        }
        if (!shouldSend)
          continue;
        if (isOutside24hr && !followup.messageTag)
          continue;
        const { data: page } = await supabase.from("connected_pages").select("page_access_token").eq("page_id", formOpen.page_id).single();
        if (!page?.page_access_token)
          continue;
        let message = followup.message || "";
        message = message.replace(/{commenter_name}/g, formOpen.subscriber_name || "Friend");
        message = message.replace(/{followup_number}/g, String(sentFollowupIds.length + 1));
        if (!message.trim())
          continue;
        let buttonUrl = "";
        if (followup.buttonEnabled !== false && formOpen.form_id) {
          const vercelUrl = process.env.VERCEL_URL;
          const appUrl = process.env.APP_URL || process.env.VITE_APP_URL;
          const baseUrl = appUrl || (vercelUrl ? `https://${vercelUrl}` : "");
          if (baseUrl) {
            const params = new URLSearchParams({
              sid: formOpen.subscriber_id || "",
              sname: formOpen.subscriber_name || "",
              flowId: formOpen.flow_id || "",
              nodeId: formOpen.node_id || "",
              pageId: formOpen.page_id || ""
            });
            buttonUrl = `${baseUrl}/forms/${formOpen.form_id}?${params.toString()}`;
          }
        }
        const success = await sendFollowupMessage(
          formOpen.subscriber_id,
          message,
          page.page_access_token,
          isOutside24hr ? followup.messageTag : void 0,
          followup.buttonEnabled !== false ? {
            text: followup.buttonText || "Complete Order \u{1F6D2}",
            url: buttonUrl
          } : void 0
        );
        if (success) {
          const updatedIds = [...sentFollowupIds, followup.id];
          await supabase.from("form_opens").update({
            sent_followup_ids: updatedIds,
            followup_count: updatedIds.length,
            last_followup_at: (/* @__PURE__ */ new Date()).toISOString()
          }).eq("id", formOpen.id);
          sentFollowupIds.push(followup.id);
          sentCount++;
          console.log(`[Form Followup Cron] \u2713 Sent ${followup.id} to ${formOpen.subscriber_id}`);
        }
      }
    }
    let webviewProcessed = 0;
    let webviewSent = 0;
    try {
      const { data: pendingSessions, error: webviewError } = await supabase.from("webview_sessions").select("*").eq("status", "pending").eq("followup_enabled", true).order("shown_at", { ascending: true }).limit(50);
      if (!webviewError) {
        for (const session of pendingSessions || []) {
          webviewProcessed++;
          const shownAt = new Date(session.shown_at);
          const minutesSinceShown = (now.getTime() - shownAt.getTime()) / (60 * 1e3);
          const timeoutMinutes = session.followup_timeout_minutes || 5;
          if (minutesSinceShown < timeoutMinutes)
            continue;
          const { data: page } = await supabase.from("connected_pages").select("page_access_token").eq("page_id", session.page_id).single();
          if (!page?.page_access_token) {
            await supabase.from("webview_sessions").update({ status: "expired", updated_at: now.toISOString() }).eq("id", session.id);
            continue;
          }
          const followupMessage = "Hey! \u{1F44B} We noticed you were interested in our product. Still thinking about it?";
          const success = await sendFollowupMessage(
            session.psid,
            followupMessage,
            page.page_access_token
          );
          if (success) {
            await supabase.from("webview_sessions").update({
              status: "followup_sent",
              followup_sent_at: now.toISOString(),
              updated_at: now.toISOString()
            }).eq("id", session.id);
            webviewSent++;
          } else {
            await supabase.from("webview_sessions").update({ status: "expired", updated_at: now.toISOString() }).eq("id", session.id);
          }
        }
      }
    } catch (webviewErr) {
      console.error("[Webview Followup] Exception:", webviewErr.message);
    }
    console.log(`\u{1F4CA} [Summary] Order Form - ${processedCount} found (${sentCount} sent) : Webview - ${webviewProcessed} found (${webviewSent} sent)`);
    return res.status(200).json({
      success: true,
      summary: `Order Form - ${processedCount} : Webview - ${webviewProcessed}`,
      form: { processed: processedCount, sent: sentCount },
      webview: { processed: webviewProcessed, sent: webviewSent }
    });
  } catch (error) {
    console.error("[Form Followup Cron] Exception:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
