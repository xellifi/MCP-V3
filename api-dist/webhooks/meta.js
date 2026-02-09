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

// api/webhooks/meta.ts
var meta_exports = {};
__export(meta_exports, {
  default: () => handler
});
module.exports = __toCommonJS(meta_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
var processingCache = /* @__PURE__ */ new Map();
var PROCESSING_TIMEOUT = 3e4;
var postbackProcessingCache = /* @__PURE__ */ new Map();
var POSTBACK_PROCESSING_TIMEOUT = 1e4;
async function saveOrUpdateSubscriber(workspaceId, pageId, userId, userName, source, pageAccessToken) {
  console.log(`    \u{1F464} Saving/updating subscriber: ${userName} (${userId})`);
  try {
    const { data: existingSubscriber, error: lookupError } = await supabase.from("subscribers").select("id, name, avatar_url, labels, source, metadata").eq("workspace_id", workspaceId).eq("external_id", userId).maybeSingle();
    if (lookupError) {
      console.log(`    \u26A0\uFE0F Subscriber lookup error (non-fatal):`, lookupError.message);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let avatarUrl = "";
    let email = "";
    if (pageAccessToken) {
      try {
        const picResponse = await fetch(
          `https://graph.facebook.com/${userId}/picture?type=large&redirect=false&access_token=${pageAccessToken}`
        );
        const picData = await picResponse.json();
        if (picData?.data?.url) {
          avatarUrl = picData.data.url;
          console.log(`    \u{1F4F7} Got profile picture URL for ${userName}`);
        }
      } catch (picError) {
        console.log(`    \u26A0\uFE0F Could not fetch profile picture for ${userId}`);
      }
      try {
        const emailResponse = await fetch(
          `https://graph.facebook.com/${userId}?fields=email&access_token=${pageAccessToken}`
        );
        const emailData = await emailResponse.json();
        if (emailData?.email) {
          email = emailData.email;
          console.log(`    \u{1F4E7} Got email for ${userName}: ${email}`);
        }
      } catch (emailError) {
        console.log(`    \u26A0\uFE0F Could not fetch email for ${userId}`);
      }
    }
    if (existingSubscriber) {
      const currentLabels = existingSubscriber.labels || [];
      const sourceLabel = source === "COMMENT" ? "Commenter" : source === "MESSAGE" ? "Messaged" : "Button Click";
      const updatedLabels = currentLabels.includes(sourceLabel) ? currentLabels : [...currentLabels, sourceLabel];
      const genericNames = ["Facebook User", "Messenger User", "Button Click User", "User", "Unknown User", ""];
      const currentName = existingSubscriber.name || "";
      const shouldUpdateName = !genericNames.includes(userName) || genericNames.includes(currentName);
      const updateData = {
        last_active_at: now,
        status: "SUBSCRIBED",
        labels: updatedLabels
      };
      if (pageId) {
        updateData.page_id = pageId;
      }
      if (shouldUpdateName && userName && !genericNames.includes(userName)) {
        updateData.name = userName;
      }
      if (avatarUrl && !existingSubscriber.avatar_url) {
        updateData.avatar_url = avatarUrl;
      }
      const { error: updateError } = await supabase.from("subscribers").update(updateData).eq("id", existingSubscriber.id);
      if (updateError) {
        console.error("    \u2717 Error updating subscriber:", updateError);
      } else {
        console.log(`    \u2713 Subscriber updated: ${existingSubscriber.name}`);
      }
    } else {
      const sourceLabel = source === "COMMENT" ? "Commenter" : source === "MESSAGE" ? "Messaged" : "Button Click";
      console.log(`    \u{1F4DD} Inserting new subscriber: workspace_id=${workspaceId}, page_id=${pageId}, external_id=${userId}`);
      const { data: insertData, error: insertError } = await supabase.from("subscribers").insert({
        workspace_id: workspaceId,
        page_id: pageId,
        external_id: userId,
        name: userName,
        email: email || null,
        platform: "FACEBOOK",
        avatar_url: avatarUrl,
        status: "SUBSCRIBED",
        tags: [],
        labels: [sourceLabel],
        source,
        last_active_at: now,
        metadata: {}
        // Initialize metadata column with empty object
      }).select();
      if (insertError) {
        if (insertError.code !== "23505") {
          console.error("    \u2717 Error creating subscriber:", insertError.message);
          console.error("    \u2717 Error code:", insertError.code);
          console.error("    \u2717 Error details:", insertError.details);
        } else {
          console.log("    \u2139\uFE0F Subscriber already exists (race condition), continuing...");
        }
      } else {
        console.log(`    \u2713 New subscriber created: ${userName} (ID: ${insertData?.[0]?.id || "unknown"})`);
      }
    }
  } catch (error) {
    console.error("    \u2717 Error in saveOrUpdateSubscriber:", error);
  }
}
async function updateSubscriberLabels(workspaceId, subscriberExternalId, addLabel, removeLabel) {
  if (!addLabel && !removeLabel)
    return;
  console.log(`    \u{1F3F7}\uFE0F Updating labels for subscriber ${subscriberExternalId}: add="${addLabel || ""}", remove="${removeLabel || ""}"`);
  try {
    const { data: subscriber, error: fetchError } = await supabase.from("subscribers").select("id, labels").eq("workspace_id", workspaceId).eq("external_id", subscriberExternalId).single();
    if (fetchError || !subscriber) {
      console.log("    \u26A0\uFE0F Subscriber not found for label update");
      return;
    }
    let labels = subscriber.labels || [];
    if (removeLabel) {
      labels = labels.filter((l) => l.toLowerCase() !== removeLabel.toLowerCase());
    }
    if (addLabel && !labels.some((l) => l.toLowerCase() === addLabel.toLowerCase())) {
      labels.push(addLabel);
    }
    const { error: updateError } = await supabase.from("subscribers").update({ labels }).eq("id", subscriber.id);
    if (updateError) {
      console.error("    \u2717 Error updating subscriber labels:", updateError);
    } else {
      console.log(`    \u2713 Labels updated: [${labels.join(", ")}]`);
    }
  } catch (error) {
    console.error("    \u2717 Error in updateSubscriberLabels:", error);
  }
}
async function incrementNodeAnalytics(flowId, nodeId, field) {
  try {
    const { data: existing } = await supabase.from("node_analytics").select("id, " + field).eq("flow_id", flowId).eq("node_id", nodeId).single();
    if (existing) {
      await supabase.from("node_analytics").update({
        [field]: (existing[field] || 0) + 1,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", existing.id);
    } else {
      await supabase.from("node_analytics").insert({
        flow_id: flowId,
        node_id: nodeId,
        [field]: 1
      });
    }
  } catch (error) {
    console.log(`    \u26A0\uFE0F Analytics update failed for ${nodeId}:`, error);
  }
}
async function createWebviewSession(pageType, externalId, workspaceId, flowId, nodeId, pageConfig, pageAccessToken, cart) {
  try {
    const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || "http://localhost:5173";
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    const { data, error } = await supabase.from("webview_sessions").insert({
      external_id: externalId,
      workspace_id: workspaceId,
      flow_id: flowId,
      current_node_id: nodeId,
      page_type: pageType,
      page_config: pageConfig,
      cart: cart || [],
      cart_total: (cart || []).reduce((sum, item) => sum + (item.productPrice || 0) * (item.quantity || 1), 0),
      page_access_token: pageAccessToken,
      expires_at: expiresAt.toISOString(),
      metadata: {}
    }).select("id").single();
    if (error || !data) {
      console.error("    \u2717 Error creating webview session:", error?.message || "No data returned");
      return null;
    }
    const sessionId = data.id;
    const webviewUrl = `${baseUrl}/wv/${pageType}/${sessionId}`;
    console.log(`    \u{1F310} Created webview session: ${sessionId}`);
    console.log(`    \u{1F517} Webview URL: ${webviewUrl}`);
    return webviewUrl;
  } catch (error) {
    console.error("    \u2717 Exception creating webview session:", error.message);
    return null;
  }
}
async function fetchUserName(userId, pageAccessToken) {
  try {
    const userResponse = await fetch(
      `https://graph.facebook.com/${userId}?fields=name&access_token=${pageAccessToken}`
    );
    const userData = await userResponse.json();
    if (userData?.name) {
      console.log(`    \u2713 Got user name from FB API: ${userData.name}`);
      return userData.name;
    }
  } catch (error) {
    console.log(`    \u26A0\uFE0F Could not fetch user name for ${userId}`);
  }
  return "Facebook User";
}
async function generateAIResponse(provider, prompt, context, workspaceId) {
  console.log(`    \u{1F916} Generating AI response using ${provider}...`);
  console.log(`    \u{1F4DD} AI Prompt: "${prompt}"`);
  console.log(`    \u{1F4AC} Comment context:`, context);
  try {
    let apiKey = null;
    let keySource = "none";
    console.log(`    \u{1F50D} Looking up API keys for workspaceId: ${workspaceId || "NOT PROVIDED"}`);
    if (workspaceId) {
      const { data: workspaceSettings, error: wsError } = await supabase.from("workspace_settings").select("openai_api_key, gemini_api_key").eq("workspace_id", workspaceId).maybeSingle();
      console.log(`    \u{1F50D} Workspace settings query result:`, {
        found: !!workspaceSettings,
        hasOpenAI: !!workspaceSettings?.openai_api_key,
        hasGemini: !!workspaceSettings?.gemini_api_key,
        error: wsError?.message || null
      });
      if (wsError) {
        console.log(`    \u26A0\uFE0F Workspace settings lookup failed: ${wsError.message}`);
      }
      if (workspaceSettings) {
        const ws = workspaceSettings;
        apiKey = provider === "openai" ? ws.openai_api_key : ws.gemini_api_key;
        if (apiKey) {
          keySource = "workspace_settings";
          console.log(`    \u2713 Found ${provider} key in workspace_settings`);
        } else {
          console.log(`    \u26A0\uFE0F workspace_settings exists but no ${provider} key found`);
        }
      }
    } else {
      console.log(`    \u26A0\uFE0F No workspaceId provided - skipping workspace_settings lookup`);
    }
    if (!apiKey) {
      const { data: adminSettings, error: adminError } = await supabase.from("admin_settings").select("openai_api_key, gemini_api_key").eq("id", 1).single();
      if (adminError) {
        console.log(`    \u26A0\uFE0F Admin settings lookup failed: ${adminError.message}`);
      }
      if (adminSettings) {
        apiKey = provider === "openai" ? adminSettings.openai_api_key : adminSettings.gemini_api_key;
        if (apiKey) {
          keySource = "admin_settings";
        }
      }
    }
    if (!apiKey) {
      console.error(`    \u2717 No ${provider} API key found in workspace_settings or admin_settings`);
      console.error(`    \u2139\uFE0F Please add your ${provider.toUpperCase()} API key in Settings page`);
      return null;
    }
    if (apiKey.length > 300) {
      console.error(`    \u2717 API key appears corrupted (length: ${apiKey.length}). Max expected ~200 chars.`);
      console.error(`    \u2139\uFE0F Please re-enter your ${provider.toUpperCase()} API key in Settings page`);
      return null;
    }
    if (provider === "openai" && !apiKey.startsWith("sk-")) {
      console.error(`    \u2717 Invalid OpenAI API key format. Should start with 'sk-'`);
      console.error(`    \u2139\uFE0F Current key starts with: ${apiKey.substring(0, 10)}...`);
      return null;
    }
    const maskedKey = apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
    console.log(`    \u{1F511} Using ${provider} API key from: ${keySource}`);
    console.log(`    \u{1F511} Key preview: ${maskedKey} (length: ${apiKey.length})`);
    console.log(`    \u2139\uFE0F Node requested provider: ${provider}`);
    const fullPrompt = `You are a helpful assistant replying to a Facebook comment on behalf of a business page.

Comment from ${context.commenterName}: "${context.commentText}"
Page Name: ${context.pageName}

Instructions: ${prompt || "Be friendly and helpful. Thank them for their comment and offer to help."}

Generate a personalized, conversational direct message reply. Keep it concise and friendly. Do not use hashtags or emojis unless appropriate. Do not start with "Thank you for reaching out" or similar generic phrases.`;
    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful business assistant responding to customer comments." },
            { role: "user", content: fullPrompt }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });
      const data = await response.json();
      console.log("    \u{1F916} OpenAI response status:", response.status);
      if (data.error) {
        console.error("    \u2717 OpenAI API error:", data.error.message);
        console.error("    \u2717 Error type:", data.error.type);
        console.error("    \u2717 Error code:", data.error.code);
        if (data.error.code === "invalid_api_key") {
          console.error("    \u2139\uFE0F HINT: Your API key is invalid. Please check:");
          console.error("       1. The key was copied correctly (no extra spaces)");
          console.error("       2. The key has not been revoked/regenerated");
          console.error("       3. Go to https://platform.openai.com/api-keys to verify");
        } else if (data.error.code === "insufficient_quota") {
          console.error("    \u2139\uFE0F HINT: Your OpenAI account has no credits. Add billing at https://platform.openai.com/account/billing");
        } else if (data.error.type === "invalid_request_error") {
          console.error("    \u2139\uFE0F HINT: The request format was invalid. Check the API key format.");
        }
        return null;
      }
      const generatedMessage = data.choices?.[0]?.message?.content?.trim();
      console.log(`    \u2713 Generated message: "${generatedMessage}"`);
      return generatedMessage || null;
    } else if (provider === "gemini") {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7
          }
        })
      });
      const data = await response.json();
      console.log("    \u{1F916} Gemini response:", JSON.stringify(data, null, 2));
      if (data.error) {
        console.error("    \u2717 Gemini API error:", data.error.message);
        return null;
      }
      const generatedMessage = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log(`    \u2713 Generated message: "${generatedMessage}"`);
      return generatedMessage || null;
    }
    return null;
  } catch (error) {
    console.error(`    \u2717 AI generation error: ${error.message}`);
    return null;
  }
}
async function handler(req, res) {
  const { method, query, body } = req;
  console.log("========== WEBHOOK REQUEST RECEIVED ==========");
  console.log("Method:", method);
  console.log("Query:", JSON.stringify(query));
  console.log("Body:", JSON.stringify(body, null, 2));
  console.log("==============================================");
  if (method === "GET") {
    return handleVerification(query, res);
  }
  if (method === "POST") {
    return handleWebhookEvent(body, res);
  }
  return res.status(405).json({ error: "Method Not Allowed" });
}
async function handleVerification(query, res) {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];
  console.log("\u{1F4CB} Webhook verification request");
  console.log("   Mode:", mode);
  console.log("   Token received:", token ? `${token.substring(0, 8)}...` : "MISSING");
  console.log("   Challenge:", challenge ? "present" : "MISSING");
  if (mode === "subscribe") {
    try {
      const { data, error } = await supabase.from("admin_settings").select("facebook_verify_token").eq("id", 1).single();
      if (error) {
        console.error("\u2717 Database error fetching verify token:", error.message);
        return res.status(500).json({ error: "Database error", details: error.message });
      }
      if (!data) {
        console.error("\u2717 No admin_settings record found");
        return res.status(500).json({ error: "No settings found" });
      }
      const storedToken = data.facebook_verify_token?.trim() || "";
      const receivedToken = token?.trim() || "";
      console.log("   Stored token:", storedToken ? `${storedToken.substring(0, 8)}...` : "EMPTY");
      console.log("   Tokens match:", storedToken === receivedToken);
      if (storedToken && receivedToken && storedToken === receivedToken) {
        console.log("\u2713 Verification successful - returning challenge");
        res.setHeader("Content-Type", "text/plain");
        return res.status(200).send(challenge);
      }
      console.log("\u2717 Verification token mismatch");
      console.log("   Expected:", storedToken || "(empty)");
      console.log("   Received:", receivedToken || "(empty)");
      return res.status(403).json({ error: "Verification failed - token mismatch" });
    } catch (err) {
      console.error("\u2717 Exception during verification:", err.message);
      return res.status(500).json({ error: "Server error", details: err.message });
    }
  }
  console.log("\u2717 Invalid mode:", mode);
  return res.status(400).json({ error: 'Invalid verification request - mode must be "subscribe"' });
}
async function handleWebhookEvent(eventData, res) {
  console.log("\n========== WEBHOOK EVENT RECEIVED ==========");
  try {
    for (const entry of eventData.entry || []) {
      const pageId = entry.id;
      for (const change of entry.changes || []) {
        if (change.field === "feed" && change.value) {
          await processComment(change.value, pageId);
        }
      }
      for (const messaging of entry.messaging || []) {
        console.log("\n--- Messenger Event ---");
        console.log("Event data:", JSON.stringify(messaging, null, 2));
        if (messaging.read) {
          console.log("\u2298 Skipping: Read receipt event");
          continue;
        }
        if (messaging.delivery) {
          console.log("\u2298 Skipping: Delivery receipt event");
          continue;
        }
        if (messaging.message?.is_echo) {
          console.log("\u2298 Skipping: Message echo (sent by page)");
          continue;
        }
        if (messaging.postback) {
          await processPostback(messaging, pageId);
        }
        if (messaging.message && messaging.message.text) {
          await processTextMessage(messaging, pageId);
        }
        if (messaging.customer_information) {
          await processCustomerInformation(messaging, pageId);
        }
      }
    }
    return res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("\u2717 Error processing webhook:", error);
    return res.status(200).send("EVENT_RECEIVED");
  }
}
async function processPostback(messagingEvent, pageId) {
  console.log("\n--- Processing Button Postback ---");
  console.log("Messaging event:", JSON.stringify(messagingEvent, null, 2));
  const senderId = messagingEvent.sender.id;
  const payload = messagingEvent.postback.payload;
  const mid = messagingEvent.postback.mid;
  const timestamp = messagingEvent.timestamp || Date.now();
  console.log(`Button clicked by user: ${senderId}`);
  console.log(`Button payload: ${payload}`);
  console.log(`Postback mid: ${mid || "none"}`);
  console.log(`Timestamp: ${timestamp}`);
  const postbackKey = mid ? `mid_${mid}` : `pb_${senderId}_${payload}_${Math.floor(timestamp / 1e4)}`;
  console.log(`Postback dedup key: ${postbackKey}`);
  const now = Date.now();
  const existingProcessing = postbackProcessingCache.get(postbackKey);
  if (existingProcessing && now - existingProcessing < POSTBACK_PROCESSING_TIMEOUT) {
    console.log("\u2713 SKIPPING: Duplicate detected (in-memory cache)");
    return;
  }
  postbackProcessingCache.set(postbackKey, now);
  const { data: existingLog } = await supabase.from("comment_automation_log").select("id, created_at").eq("comment_id", postbackKey).gte("created_at", new Date(Date.now() - 3e4).toISOString()).maybeSingle();
  if (existingLog) {
    console.log("\u2713 SKIPPING: Duplicate detected (database check)");
    console.log(`  Existing log ID: ${existingLog.id}`);
    return;
  }
  const { error: insertError } = await supabase.from("comment_automation_log").insert({
    comment_id: postbackKey,
    flow_id: payload.replace("FLOW_", "").replace("NEWFLOW_", "") || null,
    action_type: "dm_sent",
    success: true,
    error_message: null,
    facebook_response: { senderId, payload, mid, timestamp, type: "postback_dedup" }
  });
  if (insertError) {
    if (insertError.message.includes("duplicate") || insertError.code === "23505") {
      console.log("\u2713 SKIPPING: Duplicate detected (concurrent insert from another instance)");
      return;
    }
    console.log(`\u26A0\uFE0F Insert warning (continuing anyway): ${insertError.message}`);
  } else {
    console.log("\u2713 Postback logged, proceeding with execution...");
  }
  for (const [key, ts] of postbackProcessingCache.entries()) {
    if (now - ts > POSTBACK_PROCESSING_TIMEOUT) {
      postbackProcessingCache.delete(key);
    }
  }
  const { data: pageData, error: pageError } = await supabase.from("connected_pages").select("id, page_access_token, name, workspaces!inner(id)").eq("page_id", pageId).single();
  if (pageError || !pageData) {
    console.error("\u2717 Page not found or no access token");
    return;
  }
  const pageAccessToken = pageData.page_access_token;
  const workspaceId = pageData.workspaces.id;
  const pageName = pageData.name || "Page";
  const pageDbId = pageData.id;
  if (payload.startsWith("FLOW_")) {
    let flowId = payload.replace("FLOW_", "");
    let buttonAddLabel = "";
    let buttonRemoveLabel = "";
    if (flowId.includes("|ADD:")) {
      const parts = flowId.split("|");
      flowId = parts[0];
      for (const part of parts) {
        if (part.startsWith("ADD:")) {
          buttonAddLabel = part.replace("ADD:", "");
        } else if (part.startsWith("REM:")) {
          buttonRemoveLabel = part.replace("REM:", "");
        }
      }
    }
    console.log(`\u2713 Direct flow trigger detected: ${flowId}`);
    if (buttonAddLabel || buttonRemoveLabel) {
      console.log(`  \u{1F3F7}\uFE0F Button labels: add="${buttonAddLabel}", remove="${buttonRemoveLabel}"`);
    }
    const { data: flow, error: flowError } = await supabase.from("flows").select("*").eq("id", flowId).eq("status", "ACTIVE").single();
    if (flowError || !flow) {
      console.error("\u2717 Flow not found or not active:", flowId);
      return;
    }
    console.log(`\u2713 Flow found: "${flow.name}"`);
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    const configurations = flow.configurations || {};
    const startNode = nodes.find((n) => n.type === "startNode");
    if (!startNode) {
      console.error("\u2717 No Start node found in flow");
      return;
    }
    console.log(`\u2713 Starting flow from Start node: "${startNode.data?.label}"`);
    const timestamp2 = messagingEvent.timestamp || Date.now();
    const stablePostbackId = mid ? `postback_mid_${mid}` : `postback_${senderId}_${flowId}_${Math.floor(timestamp2 / 5e3)}`;
    const userName = await fetchUserName(senderId, pageAccessToken);
    if (buttonAddLabel || buttonRemoveLabel) {
      await updateSubscriberLabels(workspaceId, senderId, buttonAddLabel || void 0, buttonRemoveLabel || void 0);
    }
    await executeFlowFromNode(
      startNode,
      nodes,
      edges,
      configurations,
      {
        commenterId: senderId,
        commenterName: userName,
        commentText: `Clicked button: ${payload}`,
        pageId,
        pageName,
        postId: "",
        commentId: stablePostbackId,
        workspaceId,
        pageDbId
      },
      pageAccessToken,
      flow.id,
      stablePostbackId
    );
    await saveOrUpdateSubscriber(
      workspaceId,
      pageDbId,
      senderId,
      userName,
      "POSTBACK",
      pageAccessToken
    );
    return;
  }
  try {
    const parsedPayload = JSON.parse(payload);
    if (parsedPayload.action === "continue_flow") {
      console.log(`\u2713 Continue Flow payload detected from node: ${parsedPayload.nodeId}`);
      console.log(`  \u{1F6D2} Product: ${parsedPayload.productName} (\u20B1${parsedPayload.productPrice})`);
      const { data: flow, error: flowError } = await supabase.from("flows").select("*").eq("id", parsedPayload.flowId).single();
      if (flowError || !flow) {
        console.error("\u2717 Flow not found:", parsedPayload.flowId);
        return;
      }
      const nodes = flow.nodes || [];
      const edges = flow.edges || [];
      const configurations = flow.configurations || {};
      const sourceNode = nodes.find((n) => n.id === parsedPayload.nodeId);
      if (!sourceNode) {
        console.error("\u2717 Source node not found:", parsedPayload.nodeId);
        return;
      }
      const cartAction = parsedPayload.cartAction || "add";
      const cartItem = {
        nodeId: parsedPayload.nodeId,
        productId: parsedPayload.productId || "",
        productName: parsedPayload.productName || "Product",
        productPrice: parsedPayload.productPrice || 0,
        productImage: parsedPayload.productImage || "",
        quantity: 1
      };
      console.log(`  \u{1F4E6} Creating cart item: ${cartItem.productName} (\u20B1${cartItem.productPrice})`);
      console.log(`  \u{1F5BC}\uFE0F Product image URL: ${cartItem.productImage || "(none)"}`);
      if (!cartItem.productImage) {
        console.log(`  \u26A0\uFE0F WARNING: No productImage in payload! Check if Product node config has image set.`);
      }
      let cart = [];
      console.log(`  \u{1F50D} Looking up subscriber: external_id=${senderId}, workspace_id=${workspaceId}`);
      const { data: subscriber, error: subError } = await supabase.from("subscribers").select("id, metadata").eq("external_id", senderId).eq("workspace_id", workspaceId).single();
      if (subError) {
        console.log(`  \u26A0\uFE0F Subscriber lookup error: ${subError.message}`);
      } else if (subscriber) {
        console.log(`  \u2713 Found subscriber ID: ${subscriber.id}`);
        if (subscriber?.metadata?.cart) {
          cart = subscriber.metadata.cart;
          console.log(`  \u{1F4E6} Existing cart has ${cart.length} item(s)`);
        } else {
          console.log(`  \u{1F4E6} No existing cart in metadata`);
        }
      } else {
        console.log(`  \u26A0\uFE0F No subscriber found`);
      }
      cart = [cartItem];
      console.log(`  \u{1F6D2} Started fresh cart with: ${cartItem.productName}`);
      const cartTotal = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
      console.log(`  \u{1F4B0} Cart total: \u20B1${cartTotal}`);
      const userName = await fetchUserName(senderId, pageAccessToken);
      await saveOrUpdateSubscriber(
        workspaceId,
        pageDbId,
        senderId,
        userName,
        "POSTBACK",
        pageAccessToken
      );
      console.log(`  \u2713 Subscriber ensured exists`);
      const cartSessionId = `session_${Date.now()}`;
      console.log(`  \u{1F195} Starting new cart session: ${cartSessionId}`);
      console.log(`  \u{1F4DD} Saving FRESH cart to subscriber metadata...`);
      console.log(`  \u{1F4DD} Cart items:`, JSON.stringify(cart));
      const { data: updateData, error: updateError } = await supabase.from("subscribers").update({
        metadata: {
          // Keep other metadata but FULLY REPLACE cart-related fields
          email: subscriber?.metadata?.email,
          phone: subscriber?.metadata?.phone,
          address: subscriber?.metadata?.address,
          // Fresh cart data
          cart,
          cartTotal,
          cartSessionId,
          cartUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          // Clear any stale upsell/checkout data from previous transactions
          upsell_response: null,
          upsell_node_id: null,
          lastCheckoutAt: null
        }
      }).eq("external_id", senderId).eq("workspace_id", workspaceId).select();
      if (updateError) {
        console.error(`  \u274C Cart save error:`, updateError.message);
      } else {
        console.log(`  \u2713 Fresh cart saved successfully. Updated rows:`, updateData?.length || 0);
      }
      const timestamp2 = messagingEvent.timestamp || Date.now();
      const stableContinueFlowId = mid ? `continue_flow_mid_${mid}` : `continue_flow_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp2 / 5e3)}`;
      const outgoingEdges = edges.filter((e) => e.source === sourceNode.id);
      console.log(`  \u2192 Found ${outgoingEdges.length} outgoing edge(s) from Product node`);
      for (const edge of outgoingEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode) {
          console.log(`  \u2192 Continuing to: ${targetNode.data?.label || targetNode.id}`);
          await executeFlowFromNode(
            targetNode,
            nodes,
            edges,
            configurations,
            {
              commenterId: senderId,
              commenterName: userName,
              commentText: `Added to cart: ${cartItem.productName}`,
              pageId,
              pageName,
              postId: "",
              commentId: stableContinueFlowId,
              workspaceId,
              pageDbId,
              // Pass cart context for downstream nodes
              cart,
              cartTotal
            },
            pageAccessToken,
            flow.id,
            stableContinueFlowId
          );
        }
      }
      return;
    }
    if (parsedPayload.action === "upsell_accept" || parsedPayload.action === "downsell_accept") {
      const nodeType = parsedPayload.action === "upsell_accept" ? "upsell" : "downsell";
      console.log(`\u2713 ${nodeType} ACCEPT from node: ${parsedPayload.nodeId}`);
      console.log(`  \u{1F6D2} Product: ${parsedPayload.productName} (\u20B1${parsedPayload.productPrice})`);
      const { data: flow, error: flowError } = await supabase.from("flows").select("*").eq("id", parsedPayload.flowId).single();
      if (flowError || !flow) {
        console.error("\u2717 Flow not found:", parsedPayload.flowId);
        return;
      }
      const nodes = flow.nodes || [];
      const edges = flow.edges || [];
      const configurations = flow.configurations || {};
      const { data: subscriber } = await supabase.from("subscribers").select("metadata").eq("external_id", senderId).eq("workspace_id", workspaceId).single();
      let cart = subscriber?.metadata?.cart || [];
      console.log(`  \u{1F4E6} Existing cart from metadata: ${cart.length} items`);
      if (cart.length > 0) {
        cart.forEach((item, i) => {
          console.log(`    [${i}] ${item.productName} - \u20B1${item.productPrice}`);
        });
      } else {
        console.log(`  \u26A0\uFE0F Cart is empty in subscriber metadata!`);
      }
      const cartAction = parsedPayload.cartAction || "add";
      console.log(`  \u{1F527} Cart action from payload: "${cartAction}"`);
      const cartItem = {
        nodeId: parsedPayload.nodeId,
        productId: "",
        productName: parsedPayload.productName || "Product",
        productPrice: parsedPayload.productPrice || 0,
        productImage: parsedPayload.productImage || "",
        quantity: 1,
        isUpsell: nodeType === "upsell",
        isDownsell: nodeType === "downsell"
      };
      if (cartAction === "replace") {
        cart = [cartItem];
        console.log(`  \u{1F504} Cart replaced with: ${cartItem.productName}`);
      } else {
        cart.push(cartItem);
        console.log(`  \u2795 Added to cart: ${cartItem.productName} (${cart.length} items)`);
      }
      const cartTotal = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
      console.log(`  \u{1F4B0} Cart total: \u20B1${cartTotal}`);
      const upsellUserName = await fetchUserName(senderId, pageAccessToken);
      await saveOrUpdateSubscriber(
        workspaceId,
        pageDbId,
        senderId,
        upsellUserName,
        "POSTBACK",
        pageAccessToken
      );
      console.log(`  \u2713 Subscriber ensured exists before metadata update`);
      console.log(`  \u{1F4DD} Saving cart to subscriber metadata...`);
      const { data: updateData, error: updateError } = await supabase.from("subscribers").update({
        metadata: {
          ...subscriber?.metadata || {},
          cart,
          cartTotal,
          cartUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          upsell_response: "accepted",
          // Saved for Condition Node
          upsell_node_id: parsedPayload.nodeId
        }
      }).eq("external_id", senderId).eq("workspace_id", workspaceId).select();
      if (updateError) {
        console.error(`  \u274C Cart save error:`, updateError.message);
        console.error(`  \u274C Error details:`, JSON.stringify(updateError));
      } else {
        console.log(`  \u2713 Cart saved successfully. Rows updated: ${updateData?.length || 0}`);
        if (updateData?.length === 0) {
          console.log(`  \u26A0\uFE0F WARNING: No rows updated! Subscriber may not exist for external_id=${senderId}, workspace_id=${workspaceId}`);
        }
      }
      console.log(`  \u2713 Saved upsell_response: 'accepted' to subscriber metadata`);
      const outgoingEdges = edges.filter((e) => e.source === parsedPayload.nodeId);
      const timestamp2 = messagingEvent.timestamp || Date.now();
      const stableId = mid ? `upsell_mid_${mid}` : `upsell_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp2 / 5e3)}`;
      console.log(`  \u2192 Found ${outgoingEdges.length} outgoing edge(s) from ${nodeType} node`);
      for (const edge of outgoingEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode) {
          console.log(`  \u2192 Continuing to: ${targetNode.data?.label}`);
          await executeFlowFromNode(
            targetNode,
            nodes,
            edges,
            configurations,
            {
              commenterId: senderId,
              commenterName: upsellUserName,
              commentText: `Accepted ${nodeType}`,
              pageId,
              pageName,
              postId: "",
              commentId: stableId,
              workspaceId,
              pageDbId,
              cart,
              cartTotal,
              upsell_response: "accepted"
              // Pass to context for Condition Node
            },
            pageAccessToken,
            flow.id,
            stableId
          );
        }
      }
      return;
    }
    if (parsedPayload.action === "upsell_decline" || parsedPayload.action === "downsell_decline") {
      const nodeType = parsedPayload.action === "upsell_decline" ? "upsell" : "downsell";
      console.log(`\u2713 ${nodeType} DECLINE from node: ${parsedPayload.nodeId}`);
      const { data: flow, error: flowError } = await supabase.from("flows").select("*").eq("id", parsedPayload.flowId).single();
      if (flowError || !flow) {
        console.error("\u2717 Flow not found:", parsedPayload.flowId);
        return;
      }
      const nodes = flow.nodes || [];
      const edges = flow.edges || [];
      const configurations = flow.configurations || {};
      const { data: subscriber } = await supabase.from("subscribers").select("metadata").eq("external_id", senderId).eq("workspace_id", workspaceId).maybeSingle();
      const cart = subscriber?.metadata?.cart || [];
      const cartTotal = subscriber?.metadata?.cartTotal || 0;
      await supabase.from("subscribers").update({
        metadata: {
          ...subscriber?.metadata || {},
          upsell_response: "declined",
          // Saved for Condition Node
          upsell_node_id: parsedPayload.nodeId
        }
      }).eq("external_id", senderId).eq("workspace_id", workspaceId);
      console.log(`  \u2713 Saved upsell_response: 'declined' to subscriber metadata`);
      const outgoingEdges = edges.filter((e) => e.source === parsedPayload.nodeId);
      const userName = await fetchUserName(senderId, pageAccessToken);
      const timestamp2 = messagingEvent.timestamp || Date.now();
      const stableId = mid ? `decline_mid_${mid}` : `decline_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp2 / 5e3)}`;
      console.log(`  \u2192 Found ${outgoingEdges.length} outgoing edge(s) from ${nodeType} node`);
      for (const edge of outgoingEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode) {
          console.log(`  \u2192 Continuing to: ${targetNode.data?.label}`);
          await executeFlowFromNode(
            targetNode,
            nodes,
            edges,
            configurations,
            {
              commenterId: senderId,
              commenterName: userName,
              commentText: `Declined ${nodeType}`,
              pageId,
              pageName,
              postId: "",
              commentId: stableId,
              workspaceId,
              pageDbId,
              cart,
              cartTotal,
              upsell_response: "declined"
              // Pass to context for Condition Node
            },
            pageAccessToken,
            flow.id,
            stableId
          );
        }
      }
      return;
    }
    if (parsedPayload.action === "product_accept") {
      console.log(`\u2713 Product ACCEPT from node: ${parsedPayload.nodeId}`);
      console.log(`  \u{1F6D2} Product: ${parsedPayload.productName} (\u20B1${parsedPayload.productPrice})`);
      const { data: flow, error: flowError } = await supabase.from("flows").select("*").eq("id", parsedPayload.flowId).single();
      if (flowError || !flow) {
        console.error("\u2717 Flow not found:", parsedPayload.flowId);
        return;
      }
      const nodes = flow.nodes || [];
      const edges = flow.edges || [];
      const configurations = flow.configurations || {};
      const { data: subscriber } = await supabase.from("subscribers").select("metadata").eq("external_id", senderId).eq("workspace_id", workspaceId).single();
      let cart = subscriber?.metadata?.cart || [];
      console.log(`  \u{1F4E6} Existing cart from metadata: ${cart.length} items`);
      const cartItem = {
        nodeId: parsedPayload.nodeId,
        productId: "",
        productName: parsedPayload.productName || "Product",
        productPrice: parsedPayload.productPrice || 0,
        productImage: parsedPayload.productImage || "",
        quantity: 1,
        isProductWebview: true
      };
      cart.push(cartItem);
      console.log(`  \u2795 Added to cart: ${cartItem.productName} (${cart.length} items)`);
      const cartTotal = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
      console.log(`  \u{1F4B0} Cart total: \u20B1${cartTotal}`);
      const productUserName = await fetchUserName(senderId, pageAccessToken);
      await saveOrUpdateSubscriber(
        workspaceId,
        pageDbId,
        senderId,
        productUserName,
        "POSTBACK",
        pageAccessToken
      );
      await supabase.from("subscribers").update({
        metadata: {
          ...subscriber?.metadata || {},
          cart,
          cartTotal,
          cartUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          product_response: "accepted",
          product_node_id: parsedPayload.nodeId
        }
      }).eq("external_id", senderId).eq("workspace_id", workspaceId);
      console.log(`  \u2713 Saved product_response: 'accepted' to subscriber metadata`);
      const outgoingEdges = edges.filter((e) => e.source === parsedPayload.nodeId);
      const timestamp2 = messagingEvent.timestamp || Date.now();
      const stableId = mid ? `product_mid_${mid}` : `product_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp2 / 5e3)}`;
      console.log(`  \u2192 Found ${outgoingEdges.length} outgoing edge(s) from Product Webview node`);
      for (const edge of outgoingEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode) {
          console.log(`  \u2192 Continuing to: ${targetNode.data?.label}`);
          await executeFlowFromNode(
            targetNode,
            nodes,
            edges,
            configurations,
            {
              commenterId: senderId,
              commenterName: productUserName,
              commentText: `Accepted product`,
              pageId,
              pageName,
              postId: "",
              commentId: stableId,
              workspaceId,
              pageDbId,
              cart,
              cartTotal,
              product_response: "accepted"
            },
            pageAccessToken,
            flow.id,
            stableId
          );
        }
      }
      return;
    }
    if (parsedPayload.action === "product_decline") {
      console.log(`\u2713 Product DECLINE from node: ${parsedPayload.nodeId}`);
      const { data: flow, error: flowError } = await supabase.from("flows").select("*").eq("id", parsedPayload.flowId).single();
      if (flowError || !flow) {
        console.error("\u2717 Flow not found:", parsedPayload.flowId);
        return;
      }
      const nodes = flow.nodes || [];
      const edges = flow.edges || [];
      const configurations = flow.configurations || {};
      const { data: subscriber } = await supabase.from("subscribers").select("metadata").eq("external_id", senderId).eq("workspace_id", workspaceId).maybeSingle();
      const cart = subscriber?.metadata?.cart || [];
      const cartTotal = subscriber?.metadata?.cartTotal || 0;
      await supabase.from("subscribers").update({
        metadata: {
          ...subscriber?.metadata || {},
          product_response: "declined",
          product_node_id: parsedPayload.nodeId
        }
      }).eq("external_id", senderId).eq("workspace_id", workspaceId);
      console.log(`  \u2713 Saved product_response: 'declined' to subscriber metadata`);
      const outgoingEdges = edges.filter((e) => e.source === parsedPayload.nodeId);
      const userName = await fetchUserName(senderId, pageAccessToken);
      const timestamp2 = messagingEvent.timestamp || Date.now();
      const stableId = mid ? `product_decline_mid_${mid}` : `product_decline_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp2 / 5e3)}`;
      console.log(`  \u2192 Found ${outgoingEdges.length} outgoing edge(s) from Product Webview node`);
      for (const edge of outgoingEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode) {
          console.log(`  \u2192 Continuing to: ${targetNode.data?.label}`);
          await executeFlowFromNode(
            targetNode,
            nodes,
            edges,
            configurations,
            {
              commenterId: senderId,
              commenterName: userName,
              commentText: `Declined product`,
              pageId,
              pageName,
              postId: "",
              commentId: stableId,
              workspaceId,
              pageDbId,
              cart,
              cartTotal,
              product_response: "declined"
            },
            pageAccessToken,
            flow.id,
            stableId
          );
        }
      }
      return;
    }
    if (parsedPayload.action === "checkout_confirm") {
      console.log(`\u2713 Checkout CONFIRM from node: ${parsedPayload.nodeId}`);
      const { data: flow, error: flowError } = await supabase.from("flows").select("*").eq("id", parsedPayload.flowId).single();
      if (flowError || !flow) {
        console.error("\u2717 Could not find flow:", parsedPayload.flowId);
        return;
      }
      const nodes = flow.nodes || [];
      const edges = flow.edges || [];
      const configurations = flow.configurations || {};
      console.log(`  \u{1F50D} Looking up subscriber: external_id=${senderId}, workspace_id=${workspaceId}`);
      const { data: subscriber, error: subError } = await supabase.from("subscribers").select("id, metadata, name").eq("external_id", senderId).eq("workspace_id", workspaceId).single();
      if (subError) {
        console.error(`  \u274C Subscriber lookup error:`, subError.message);
        console.error(`  \u274C Error code:`, subError.code);
      } else if (!subscriber) {
        console.log(`  \u26A0\uFE0F No subscriber found!`);
      } else {
        console.log(`  \u2713 Found subscriber ID: ${subscriber.id}`);
        console.log(`  \u{1F4CB} Subscriber metadata type:`, typeof subscriber.metadata);
        console.log(`  \u{1F4CB} Subscriber metadata:`, JSON.stringify(subscriber.metadata));
      }
      const cart = subscriber?.metadata?.cart || [];
      const cartTotal = subscriber?.metadata?.cartTotal || 0;
      const customerName = subscriber?.name || await fetchUserName(senderId, pageAccessToken);
      console.log(`  \u{1F4E6} Cart from subscriber metadata: ${cart.length} items, \u20B1${cartTotal}`);
      if (cart.length > 0) {
        cart.forEach((item, i) => {
          console.log(`    [${i}] ${item.productName} - \u20B1${item.productPrice}`);
        });
      } else {
        console.log(`  \u26A0\uFE0F Cart is empty in subscriber metadata!`);
      }
      const outgoingEdges = edges.filter((e) => e.source === parsedPayload.nodeId);
      const timestamp2 = messagingEvent.timestamp || Date.now();
      const stableId = mid ? `checkout_mid_${mid}` : `checkout_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp2 / 5e3)}`;
      console.log(`  \u2192 ${outgoingEdges.length} outgoing edge(s) from Checkout node`);
      for (const edge of outgoingEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode) {
          console.log(`  \u2192 Continuing to: ${targetNode.data?.label}`);
          await executeFlowFromNode(
            targetNode,
            nodes,
            edges,
            configurations,
            {
              commenterId: senderId,
              commenterName: customerName,
              commentText: `Checkout confirmed`,
              pageId,
              pageName,
              postId: "",
              commentId: stableId,
              workspaceId,
              pageDbId,
              cart,
              cartTotal
            },
            pageAccessToken,
            flow.id,
            stableId
          );
        }
      }
      console.log(`  \u{1F9F9} Clearing cart from subscriber metadata after checkout...`);
      await supabase.from("subscribers").update({
        metadata: {
          ...subscriber?.metadata || {},
          cart: [],
          cartTotal: 0,
          cartUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastCheckoutAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }).eq("external_id", senderId).eq("workspace_id", workspaceId);
      console.log(`  \u2713 Cart cleared - next transaction will start fresh`);
      return;
    }
  } catch (e) {
  }
  if (payload.startsWith("NEWFLOW_")) {
    const flowName = payload.replace("NEWFLOW_", "");
    console.log(`\u2713 New Flow payload detected: "${flowName}"`);
    const { data: flows2, error: flowsError2 } = await supabase.from("flows").select("*").eq("workspace_id", workspaceId).eq("status", "ACTIVE");
    if (flowsError2 || !flows2) {
      console.error("\u2717 Error fetching flows:", flowsError2);
      return;
    }
    for (const flow of flows2) {
      const nodes = flow.nodes || [];
      const edges = flow.edges || [];
      const configurations = flow.configurations || {};
      const newFlowNode = nodes.find((n) => {
        const nodeLabel = n.data?.label || "";
        const nodeFlowName = n.data?.flowName || "";
        return (n.data?.isNewFlowNode || nodeLabel.toLowerCase().includes("new flow:")) && (nodeFlowName === flowName || nodeLabel.toLowerCase().includes(flowName.toLowerCase()));
      });
      if (newFlowNode) {
        console.log(`\u2713 Found matching New Flow node in flow "${flow.name}": "${newFlowNode.data?.label}"`);
        const timestamp2 = messagingEvent.timestamp || Date.now();
        const stableNewFlowId = mid ? `newflow_mid_${mid}` : `newflow_${senderId}_${flowName}_${Math.floor(timestamp2 / 5e3)}`;
        const userName = await fetchUserName(senderId, pageAccessToken);
        await executeFlowFromNode(
          newFlowNode,
          nodes,
          edges,
          configurations,
          {
            commenterId: senderId,
            commenterName: userName,
            commentText: `Clicked New Flow button: ${flowName}`,
            pageId,
            pageName,
            postId: "",
            commentId: stableNewFlowId
          },
          pageAccessToken,
          flow.id,
          stableNewFlowId
        );
        return;
      }
    }
    console.log(`\u2717 No matching New Flow node found for: "${flowName}"`);
    return;
  }
  const { data: flows, error: flowsError } = await supabase.from("flows").select("*").eq("workspace_id", workspaceId).eq("status", "ACTIVE");
  if (flowsError || !flows || flows.length === 0) {
    console.log("\u2717 No active flows found for this workspace");
    return;
  }
  console.log(`Found ${flows.length} active flow(s)`);
  for (const flow of flows) {
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    const configurations = flow.configurations || {};
    if (nodes.length === 0)
      continue;
    const startNodes = nodes.filter((n) => n.type === "startNode");
    for (const startNode of startNodes) {
      const config = configurations[startNode.id] || {};
      const keywords = config.keywords || [];
      const matchType = config.matchType || "exact";
      console.log(`Checking Start node "${startNode.data?.label}" with keywords:`, keywords);
      console.log(`Match type: ${matchType}`);
      let isMatch = false;
      if (matchType === "exact") {
        isMatch = keywords.some((kw) => kw.toUpperCase() === payload.toUpperCase());
      } else if (matchType === "contains") {
        isMatch = keywords.some(
          (kw) => payload.toUpperCase().includes(kw.toUpperCase()) || kw.toUpperCase().includes(payload.toUpperCase())
        );
      }
      if (isMatch) {
        console.log(`\u2713 Match found! Executing flow from Start node`);
        const timestamp2 = messagingEvent.timestamp || Date.now();
        const stableKeywordId = mid ? `keyword_mid_${mid}` : `keyword_${senderId}_${payload}_${Math.floor(timestamp2 / 5e3)}`;
        const userName = await fetchUserName(senderId, pageAccessToken);
        const entryLabel = config.entryLabel;
        if (entryLabel) {
          await updateSubscriberLabels(workspaceId, senderId, entryLabel);
        }
        await executeFlowFromNode(
          startNode,
          nodes,
          edges,
          configurations,
          {
            commenterId: senderId,
            commenterName: userName,
            commentText: `Clicked button: ${payload}`,
            pageId,
            postId: "",
            commentId: stableKeywordId
          },
          pageAccessToken,
          flow.id,
          stableKeywordId
        );
        return;
      }
    }
  }
  console.log("\u2717 No matching Start node found for payload:", payload);
}
async function processCustomerInformation(messagingEvent, pageId) {
  console.log("\n--- Processing Customer Information Form Submission ---");
  console.log("Messaging event:", JSON.stringify(messagingEvent, null, 2));
  const senderId = messagingEvent.sender.id;
  const customerInfo = messagingEvent.customer_information;
  console.log(`Customer form submitted by: ${senderId}`);
  console.log(`Customer info:`, JSON.stringify(customerInfo, null, 2));
  const shippingAddress = customerInfo.shipping_address || {};
  const buyerName = shippingAddress.name || "";
  const buyerPhone = shippingAddress.phone_number || "";
  const street1 = shippingAddress.street_1 || "";
  const street2 = shippingAddress.street_2 || "";
  const city = shippingAddress.city || "";
  const state = shippingAddress.state || "";
  const country = shippingAddress.country || "";
  const postalCode = shippingAddress.postal_code || "";
  const buyerAddress = [street1, street2, city, state, postalCode, country].filter(Boolean).join(", ");
  console.log(`  Name: ${buyerName}`);
  console.log(`  Phone: ${buyerPhone}`);
  console.log(`  Address: ${buyerAddress}`);
  const { data: page, error: pageError } = await supabase.from("connected_pages").select("*, workspaces!inner(id)").eq("page_id", pageId).single();
  if (pageError || !page) {
    console.error("\u2717 Page not found");
    return;
  }
  const workspaceId = page.workspaces.id;
  const pageAccessToken = page.page_access_token;
  const pageDbId = page.id;
  const { data: subscriber } = await supabase.from("subscribers").select("id, metadata").eq("external_id", senderId).eq("workspace_id", workspaceId).maybeSingle();
  if (!subscriber?.metadata?.checkoutFormState) {
    console.log("\u2717 No checkout form state found for subscriber");
    return;
  }
  const formState = subscriber.metadata.checkoutFormState;
  console.log(`  Form node: ${formState.formNodeId}`);
  console.log(`  Flow ID: ${formState.flowId}`);
  const updatedMetadata = {
    ...subscriber.metadata,
    checkoutFormState: null,
    // Clear form state
    buyerName,
    buyerPhone,
    buyerAddress,
    shippingAddress
    // Store full structured address
  };
  await supabase.from("subscribers").update({ metadata: updatedMetadata }).eq("id", subscriber.id);
  console.log("  \u2713 Customer information saved to subscriber metadata");
  await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: senderId },
      message: { text: formState.thankYouMessage || "\u2705 Thank you! Your information has been saved." },
      access_token: pageAccessToken
    })
  });
  const { data: flow } = await supabase.from("flows").select("*").eq("id", formState.flowId).single();
  if (flow) {
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    const configurations = flow.configurations || {};
    const outgoingEdges = edges.filter((e) => e.source === formState.formNodeId);
    const userName = await fetchUserName(senderId, pageAccessToken);
    for (const edge of outgoingEdges) {
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (targetNode) {
        console.log(`  \u2192 Continuing flow to: ${targetNode.data?.label}`);
        await executeFlowFromNode(
          targetNode,
          nodes,
          edges,
          configurations,
          {
            commenterId: senderId,
            commenterName: userName,
            commentText: "Customer information submitted",
            pageId,
            pageName: page.name || "Page",
            postId: "",
            commentId: `customer_info_${Date.now()}`,
            workspaceId,
            pageDbId,
            cart: subscriber.metadata?.cart || [],
            cartTotal: subscriber.metadata?.cartTotal || 0,
            buyerName,
            buyerPhone,
            buyerAddress
          },
          pageAccessToken,
          flow.id,
          `customer_info_complete_${Date.now()}`
        );
      }
    }
  }
  console.log("  \u2713 Customer information form processing complete");
}
async function processTextMessage(messagingEvent, pageId) {
  console.log("\n--- Processing Text Message ---");
  console.log("Messaging event:", JSON.stringify(messagingEvent, null, 2));
  const senderId = messagingEvent.sender.id;
  const messageText = messagingEvent.message.text;
  const mid = messagingEvent.message?.mid;
  console.log(`Message from user: ${senderId}`);
  console.log(`Message text: "${messageText}"`);
  console.log(`Message ID (mid): ${mid}`);
  if (mid) {
    const now = Date.now();
    const messageKey = `msg_${mid}`;
    const existingProcessing = postbackProcessingCache.get(messageKey);
    if (existingProcessing && now - existingProcessing < POSTBACK_PROCESSING_TIMEOUT) {
      console.log("\u2713 SKIPPING: Duplicate message detected (in-memory cache)");
      return;
    }
    postbackProcessingCache.set(messageKey, now);
    const { data: existingLog } = await supabase.from("comment_automation_log").select("id, created_at").eq("comment_id", messageKey).gte("created_at", new Date(Date.now() - 3e4).toISOString()).maybeSingle();
    if (existingLog) {
      console.log("\u2713 SKIPPING: Duplicate message detected (database check)");
      return;
    }
    const { error: insertError } = await supabase.from("comment_automation_log").insert({
      comment_id: messageKey,
      flow_id: null,
      action_type: "dm_sent",
      success: true,
      error_message: null,
      facebook_response: { senderId, messageText, mid, type: "message_dedup" }
    });
    if (insertError) {
      if (insertError.message.includes("duplicate") || insertError.code === "23505") {
        console.log("\u2713 SKIPPING: Duplicate detected (concurrent insert)");
        return;
      }
      console.log(`\u26A0\uFE0F Insert warning (continuing): ${insertError.message}`);
    } else {
      console.log("\u2713 Message logged, proceeding with execution...");
    }
  }
  if (senderId === pageId) {
    console.log("\u2713 IGNORING: Message from page itself");
    return;
  }
  const { data: page, error: pageError } = await supabase.from("connected_pages").select("*, workspaces!inner(id)").eq("page_id", pageId).single();
  if (pageError || !page) {
    console.error("\u2717 Page not found in connected_pages");
    return;
  }
  const workspaceId = page.workspaces.id;
  const pageAccessToken = page.page_access_token;
  const pageDbId = page.id;
  console.log(`\u2713 Page found - Workspace: ${workspaceId}`);
  const { data: subscriber } = await supabase.from("subscribers").select("id, metadata").eq("external_id", senderId).eq("workspace_id", workspaceId).maybeSingle();
  if (subscriber?.metadata?.checkoutFormState) {
    const formState = subscriber.metadata.checkoutFormState;
    console.log(`\u2713 User is filling checkout form - current field: ${formState.currentField}`);
    const collectedData = { ...formState.collectedData };
    let nextField = null;
    let formComplete = false;
    if (formState.currentField === "phone") {
      collectedData.phone = messageText;
      console.log(`  \u2713 Captured phone: ${messageText}`);
      if (formState.collectEmail)
        nextField = "email";
      else if (formState.collectAddress)
        nextField = "address";
      else if (formState.collectPaymentMethod)
        nextField = "payment";
      else
        formComplete = true;
    } else if (formState.currentField === "email") {
      collectedData.email = messageText;
      console.log(`  \u2713 Captured email: ${messageText}`);
      if (formState.collectAddress)
        nextField = "address";
      else if (formState.collectPaymentMethod)
        nextField = "payment";
      else
        formComplete = true;
    } else if (formState.currentField === "address") {
      collectedData.address = messageText;
      console.log(`  \u2713 Captured address: ${messageText}`);
      if (formState.collectPaymentMethod)
        nextField = "payment";
      else
        formComplete = true;
    }
    const updatedMetadata = {
      ...subscriber.metadata,
      checkoutFormState: formComplete ? null : {
        ...formState,
        currentField: nextField,
        collectedData
      },
      // Store collected data at root level for later use by Cart Sheet / Invoice nodes
      buyerPhone: collectedData.phone || subscriber.metadata?.buyerPhone,
      buyerEmail: collectedData.email || subscriber.metadata?.buyerEmail,
      buyerAddress: collectedData.address || subscriber.metadata?.buyerAddress,
      buyerPaymentMethod: collectedData.paymentMethod || subscriber.metadata?.buyerPaymentMethod
    };
    await supabase.from("subscribers").update({ metadata: updatedMetadata }).eq("id", subscriber.id);
    if (!formComplete && nextField) {
      await sendTypingIndicator(senderId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sendTypingIndicator(senderId, pageAccessToken, "typing_off");
      if (nextField === "email") {
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: formState.emailPrompt },
            access_token: pageAccessToken
          })
        });
        console.log("  \u2713 Email prompt sent");
      } else if (nextField === "address") {
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: formState.addressPrompt },
            access_token: pageAccessToken
          })
        });
        console.log("  \u2713 Address prompt sent");
      } else if (nextField === "payment") {
        const quickReplies = formState.paymentMethods.map((method) => ({
          content_type: "text",
          title: method,
          payload: JSON.stringify({
            action: "checkout_form_payment",
            method,
            nodeId: formState.formNodeId,
            flowId: formState.flowId
          })
        }));
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: {
              text: formState.paymentPrompt,
              quick_replies: quickReplies
            },
            access_token: pageAccessToken
          })
        });
        console.log("  \u2713 Payment options sent");
      }
      return;
    }
    if (formComplete) {
      console.log("  \u2713 Checkout form complete! Collected data:", collectedData);
      await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderId },
          message: { text: formState.thankYouMessage },
          access_token: pageAccessToken
        })
      });
      const { data: flow } = await supabase.from("flows").select("*").eq("id", formState.flowId).single();
      if (flow) {
        const nodes = flow.nodes || [];
        const edges = flow.edges || [];
        const configurations = flow.configurations || {};
        const formNode = nodes.find((n) => n.id === formState.formNodeId);
        if (formNode) {
          const outgoingEdges = edges.filter((e) => e.source === formState.formNodeId);
          const userName = await fetchUserName(senderId, pageAccessToken);
          for (const edge of outgoingEdges) {
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (targetNode) {
              console.log(`  \u2192 Continuing flow to: ${targetNode.data?.label}`);
              await executeFlowFromNode(
                targetNode,
                nodes,
                edges,
                configurations,
                {
                  commenterId: senderId,
                  commenterName: userName,
                  commentText: "Checkout form completed",
                  pageId,
                  pageName: page.name || "Page",
                  postId: "",
                  commentId: `checkout_form_${mid || Date.now()}`,
                  workspaceId,
                  pageDbId,
                  cart: subscriber.metadata?.cart || [],
                  cartTotal: subscriber.metadata?.cartTotal || 0,
                  buyerPhone: collectedData.phone,
                  buyerEmail: collectedData.email,
                  buyerAddress: collectedData.address,
                  buyerPaymentMethod: collectedData.paymentMethod
                },
                pageAccessToken,
                flow.id,
                `checkout_form_complete_${mid || Date.now()}`
              );
            }
          }
        }
      }
      return;
    }
  }
  const { data: flows, error: flowsError } = await supabase.from("flows").select("*").eq("workspace_id", workspaceId).eq("status", "ACTIVE");
  if (flowsError || !flows || flows.length === 0) {
    console.log("\u2717 No active flows found for this workspace");
    return;
  }
  console.log(`Found ${flows.length} active flow(s)`);
  for (const flow of flows) {
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    const configurations = flow.configurations || {};
    const startNodes = nodes.filter((n) => n.type === "startNode");
    for (const startNode of startNodes) {
      const config = configurations[startNode.id] || {};
      const keywords = config.keywords || [];
      const matchType = config.matchType || "exact";
      const configPageId = config.pageId;
      if (configPageId && configPageId !== pageDbId) {
        console.log(`\u2298 Skipping Start node - configured for different page`);
        continue;
      }
      console.log(`Checking Start node "${startNode.data?.label}" with keywords:`, keywords);
      console.log(`Match type: ${matchType}`);
      let isMatch = false;
      const messageUpper = messageText.toUpperCase().trim();
      if (matchType === "exact") {
        isMatch = keywords.some((kw) => kw.toUpperCase().trim() === messageUpper);
      } else if (matchType === "contains") {
        isMatch = keywords.some(
          (kw) => messageUpper.includes(kw.toUpperCase().trim()) || kw.toUpperCase().trim().includes(messageUpper)
        );
      }
      if (isMatch) {
        console.log(`\u2713 Match found! Executing flow from Start node`);
        const userName = await fetchUserName(senderId, pageAccessToken);
        const entryLabel = config.entryLabel;
        if (entryLabel) {
          await updateSubscriberLabels(workspaceId, senderId, entryLabel);
        }
        await incrementNodeAnalytics(flow.id, startNode.id, "subscriber_count");
        console.log(`    \u{1F4CA} Analytics: Incremented subscriber_count for start node ${startNode.id}`);
        await executeFlowFromNode(
          startNode,
          nodes,
          edges,
          configurations,
          {
            commenterId: senderId,
            commenterName: userName,
            commentText: messageText,
            message: messageText,
            pageId,
            postId: "",
            commentId: messagingEvent.message.mid,
            // Use message ID as reference
            workspaceId,
            pageDbId
          },
          pageAccessToken,
          flow.id,
          messagingEvent.message.mid
        );
        await saveOrUpdateSubscriber(
          workspaceId,
          pageDbId,
          senderId,
          userName,
          "MESSAGE",
          pageAccessToken
        );
        return;
      }
    }
  }
  console.log("\u2717 No matching Start node found for message:", messageText);
  console.log("\u{1F916} Checking for AI Node fallback...");
  console.log(`\u{1F916} Current page: ${pageDbId}`);
  for (const flow of flows) {
    const nodes = flow.nodes || [];
    const configurations = flow.configurations || {};
    const startNodes = nodes.filter(
      (n) => n.type === "startNode" || n.data?.nodeType === "startNode" || (n.data?.label?.toLowerCase() || "").includes("start")
    );
    let flowMatchesPage = false;
    for (const startNode of startNodes) {
      const startConfig = configurations[startNode.id] || startNode.data || {};
      if (startConfig.pageId === pageDbId) {
        flowMatchesPage = true;
        break;
      }
    }
    if (!flowMatchesPage) {
      console.log(`\u{1F916} Skipping flow "${flow.name}" - not configured for current page`);
      continue;
    }
    console.log(`\u{1F916} Flow "${flow.name}" matches current page`);
    const aiNodes = nodes.filter(
      (n) => n.type === "aiNode" || n.data?.nodeType === "aiNode" || (n.data?.label?.toLowerCase() || "").includes("ai agent")
    );
    for (const aiNode of aiNodes) {
      const config = configurations[aiNode.id] || {};
      if (!config.enabled)
        continue;
      if (config.triggerOn && config.triggerOn !== "no_match")
        continue;
      console.log(`\u{1F916} Found AI Node "${aiNode.data?.label}" with no_match trigger`);
      try {
        const provider = config.provider || "openai";
        const aiModel = config.model || (provider === "openai" ? "gpt-4o-mini" : "gemini-pro");
        const instructions = config.instructions || "You are a helpful sales assistant.";
        const memoryLines = config.memoryLines || 20;
        const temperature = config.temperature || 0.7;
        const maxTokens = config.maxTokens || 500;
        const fallbackMessage = config.fallbackMessage || "Sorry, I couldn't process your request. Please try again later.";
        let subscriber2 = null;
        const { data: existingSub, error: subError } = await supabase.from("subscribers").select("*").eq("workspace_id", workspaceId).eq("external_id", senderId).maybeSingle();
        if (subError) {
          console.log(`\u{1F916} Subscriber lookup error: ${subError.message}`);
        }
        subscriber2 = existingSub;
        console.log(`\u{1F916} Subscriber found: ${!!subscriber2}, ID: ${subscriber2?.id || "N/A"}`);
        if (!subscriber2) {
          const userName = await fetchUserName(senderId, pageAccessToken);
          console.log(`\u{1F916} Creating new subscriber for: ${userName}`);
          const { data: newSub, error: createError } = await supabase.from("subscribers").insert({
            workspace_id: workspaceId,
            page_id: pageDbId,
            external_id: senderId,
            // Use external_id to match saveOrUpdateSubscriber
            name: userName,
            source: "AI_AGENT",
            metadata: { ai_chat_history: [] }
          }).select().single();
          if (createError) {
            console.log(`\u{1F916} Create subscriber error: ${createError.message}`);
          }
          subscriber2 = newSub;
        }
        const chatHistory = subscriber2?.metadata?.ai_chat_history || [];
        const recentHistory = chatHistory.slice(-memoryLines);
        console.log(`\u{1F916} Chat history loaded: ${chatHistory.length} total messages, using ${recentHistory.length} for context`);
        if (recentHistory.length > 0) {
          console.log(`\u{1F916} Recent history:`, recentHistory.map((m) => `[${m.role}] ${m.content.substring(0, 50)}...`));
        }
        const contextMessages = recentHistory.map((msg) => ({
          role: msg.role === "ai" ? "assistant" : "user",
          content: msg.content
        }));
        contextMessages.push({ role: "user", content: messageText });
        let apiKey = null;
        let keySource = "none";
        console.log(`\u{1F916} Looking up ${provider} API key for workspace: ${workspaceId}`);
        const { data: workspaceSettings, error: wsError } = await supabase.from("workspace_settings").select("openai_api_key, gemini_api_key").eq("workspace_id", workspaceId).maybeSingle();
        if (wsError) {
          console.log(`\u{1F916} Workspace settings lookup error: ${wsError.message}`);
        }
        if (workspaceSettings) {
          apiKey = provider === "openai" ? workspaceSettings.openai_api_key : workspaceSettings.gemini_api_key;
          if (apiKey) {
            keySource = "workspace_settings";
            console.log(`\u{1F916} Found ${provider} key in workspace_settings`);
          }
        }
        if (!apiKey) {
          const { data: adminSettings } = await supabase.from("admin_settings").select("openai_api_key, gemini_api_key").eq("id", 1).single();
          if (adminSettings) {
            apiKey = provider === "openai" ? adminSettings.openai_api_key : adminSettings.gemini_api_key;
            if (apiKey) {
              keySource = "admin_settings";
              console.log(`\u{1F916} Found ${provider} key in admin_settings`);
            }
          }
        }
        if (!apiKey) {
          console.error(`\u{1F916} No ${provider} API key found in workspace_settings or admin_settings`);
          console.error(`\u{1F916} Sending fallback message instead`);
          await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: fallbackMessage },
              access_token: pageAccessToken
            })
          });
          return;
        }
        const maskedKey = apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
        console.log(`\u{1F916} Using ${provider} API key from: ${keySource} (${maskedKey})`);
        let aiResponse = null;
        const quickActions = config.quickActions || [];
        let quickActionHints = "";
        if (quickActions.length > 0) {
          quickActionHints = "\n\n*** BUTTON TRIGGERS ***\nYou can trigger buttons by including these tags at the end of your response:";
          for (const action of quickActions) {
            quickActionHints += `
- Include [${action.trigger}] to show button "${action.buttonText}"`;
          }
        }
        const systemPrompt = `${instructions}${quickActionHints}

You are responding to a Facebook Messenger user. Keep your responses conversational, helpful, and concise. 
Do not use markdown formatting. Be friendly and professional.`;
        if (provider === "openai") {
          const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: aiModel,
              messages: [
                { role: "system", content: systemPrompt },
                ...contextMessages
              ],
              max_tokens: maxTokens,
              temperature
            })
          });
          const openaiData = await openaiResponse.json();
          console.log("\u{1F916} OpenAI response:", JSON.stringify(openaiData, null, 2));
          if (openaiData.error) {
            console.error("\u{1F916} OpenAI API error:", openaiData.error.message);
            aiResponse = null;
          } else {
            aiResponse = openaiData.choices?.[0]?.message?.content?.trim();
          }
        } else if (provider === "gemini") {
          const geminiContents = contextMessages.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
          }));
          if (geminiContents.length > 0 && geminiContents[0].role === "user") {
            geminiContents[0].parts[0].text = `${systemPrompt}

User: ${geminiContents[0].parts[0].text}`;
          }
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: {
                maxOutputTokens: maxTokens,
                temperature
              }
            })
          });
          const geminiData = await geminiResponse.json();
          console.log("\u{1F916} Gemini response:", JSON.stringify(geminiData, null, 2));
          if (geminiData.error) {
            console.error("\u{1F916} Gemini API error:", geminiData.error.message);
            aiResponse = null;
          } else {
            aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          }
        }
        let responseText = aiResponse || fallbackMessage;
        console.log(`\u{1F916} Sending AI response: "${responseText.substring(0, 100)}..."`);
        const matchedButtons = [];
        for (const action of quickActions) {
          const triggerPattern = new RegExp(`\\[${action.trigger}\\]`, "gi");
          if (triggerPattern.test(responseText)) {
            console.log(`\u{1F916} Found quick action trigger: [${action.trigger}]`);
            responseText = responseText.replace(triggerPattern, "").trim();
            matchedButtons.push({
              type: "web_url",
              title: action.buttonText,
              url: action.buttonUrl
            });
          }
        }
        responseText = responseText.replace(/\s+/g, " ").trim();
        if (matchedButtons.length > 0) {
          console.log(`\u{1F916} Sending message with ${matchedButtons.length} button(s)`);
          await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: {
                attachment: {
                  type: "template",
                  payload: {
                    template_type: "button",
                    text: responseText.substring(0, 640),
                    // Facebook limit
                    buttons: matchedButtons.slice(0, 3)
                    // Max 3 buttons
                  }
                }
              },
              access_token: pageAccessToken
            })
          });
        } else {
          await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: responseText },
              access_token: pageAccessToken
            })
          });
        }
        const updatedHistory = [
          ...chatHistory,
          { role: "user", content: messageText, timestamp: (/* @__PURE__ */ new Date()).toISOString() },
          { role: "ai", content: responseText, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
        ].slice(-memoryLines * 2);
        console.log(`\u{1F916} Saving ${updatedHistory.length} messages to chat history for subscriber ${subscriber2?.id}`);
        if (subscriber2?.id) {
          const { error: saveError } = await supabase.from("subscribers").update({
            metadata: {
              ...subscriber2?.metadata,
              ai_chat_history: updatedHistory,
              ai_last_interaction: (/* @__PURE__ */ new Date()).toISOString()
            }
          }).eq("id", subscriber2.id);
          if (saveError) {
            console.error(`\u{1F916} Error saving chat history: ${saveError.message}`);
          } else {
            console.log("\u{1F916} \u2713 Chat history saved successfully");
          }
        } else {
          console.log("\u{1F916} \u26A0\uFE0F Skipping chat history save - no valid subscriber ID");
        }
        console.log("\u{1F916} AI response sent and conversation saved");
        return;
      } catch (aiError) {
        console.error("\u{1F916} AI Node error:", aiError.message);
      }
    }
  }
}
async function processComment(value, pageId) {
  console.log("\n--- Processing Feed Event ---");
  console.log("Raw value object:", JSON.stringify(value, null, 2));
  const itemType = value.item;
  const verb = value.verb;
  console.log(`Item type: ${itemType}, Verb: ${verb}`);
  if (itemType !== "comment") {
    console.log(`\u2298 Skipping: Not a comment event (item: ${itemType})`);
    return;
  }
  if (verb === "remove" || verb === "delete") {
    console.log(`\u2298 Skipping: Comment deletion event (verb: ${verb})`);
    return;
  }
  const commentId = value.comment_id;
  const postId = value.post_id;
  const message = value.message;
  const fromId = value.from?.id;
  const fromName = value.from?.name;
  const parentId = value.parent_id || null;
  if (!commentId) {
    console.log("\u2298 Skipping: No comment_id found");
    console.log("Available fields:", Object.keys(value));
    return;
  }
  console.log(`Comment ID: ${commentId}`);
  console.log(`From: ${fromName} (${fromId})`);
  console.log(`Message: "${message}"`);
  console.log(`Page ID: ${pageId}`);
  if (String(fromId) === String(pageId)) {
    console.log("\u2713 IGNORING: This is the page's own comment (preventing loop)");
    return;
  }
  const now = Date.now();
  const existingProcessing = processingCache.get(commentId);
  if (existingProcessing && now - existingProcessing < PROCESSING_TIMEOUT) {
    console.log("\u2713 SKIPPING: Comment is currently being processed (race condition prevention)");
    return;
  }
  processingCache.set(commentId, now);
  for (const [key, timestamp] of processingCache.entries()) {
    if (now - timestamp > PROCESSING_TIMEOUT) {
      processingCache.delete(key);
    }
  }
  const { data: existingComment } = await supabase.from("comments").select("id, processed").eq("comment_id", commentId).single();
  if (existingComment) {
    if (existingComment.processed) {
      console.log("\u2713 SKIPPING: Comment already processed");
      return;
    }
    console.log("\u26A0\uFE0F  Comment exists but not processed - skipping to be safe");
    return;
  }
  const { data: page } = await supabase.from("connected_pages").select("*, workspaces!inner(id)").eq("page_id", pageId).single();
  if (!page) {
    console.log("\u2717 Page not found in database");
    return;
  }
  const workspaceId = page.workspaces.id;
  const pageAccessToken = page.page_access_token;
  const pageName = page.name || "Your Page";
  console.log(`\u2713 Page found: ${pageName} (Workspace: ${workspaceId})`);
  const { error: saveError } = await supabase.from("comments").insert({
    workspace_id: workspaceId,
    page_id: pageId,
    post_id: postId,
    comment_id: commentId,
    parent_comment_id: parentId,
    message: message || "",
    commenter_id: fromId,
    commenter_name: fromName || "Unknown",
    is_page_comment: false,
    processed: false,
    created_time: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (saveError) {
    if (saveError.code === "23505") {
      console.log("\u2713 SKIPPING: Duplicate key (race condition)");
      return;
    }
    console.error("\u2717 Error saving comment:", saveError);
    return;
  }
  console.log("\u2713 Comment saved to database");
  await executeAutomation(commentId, workspaceId, page.id, pageAccessToken, {
    commentId,
    postId,
    message: message || "",
    commenterId: fromId,
    commenterName: fromName || "Unknown",
    pageId,
    pageName,
    postUrl: postId ? `https://facebook.com/${postId}` : ""
  });
}
async function executeAutomation(commentId, workspaceId, pageDbId, pageAccessToken, context) {
  console.log("\n>>> Finding matching flows...");
  const { data: flows } = await supabase.from("flows").select("*").eq("workspace_id", workspaceId).eq("status", "ACTIVE");
  if (!flows || flows.length === 0) {
    console.log("\u2298 No active flows found");
    await markAsProcessed(commentId);
    return;
  }
  console.log(`\u2713 Found ${flows.length} active flow(s)`);
  for (const flow of flows) {
    const nodes = flow.nodes || [];
    const configurations = flow.configurations || {};
    const triggerNode = nodes.find(
      (n) => n.type === "triggerNode" && n.data?.label?.includes("Comment")
    );
    if (!triggerNode)
      continue;
    const triggerConfig = configurations[triggerNode.id] || {};
    console.log(`  Flow "${flow.name}" trigger config:`, JSON.stringify(triggerConfig, null, 2));
    console.log(`  \u2192 Config pageId: "${triggerConfig.pageId}"`);
    console.log(`  \u2192 Page DB ID: "${pageDbId}"`);
    console.log(`  \u2192 Page Facebook ID: "${context.pageId}"`);
    const configPageId = triggerConfig.pageId;
    const pageIdNotConfigured = !configPageId || configPageId === "undefined" || configPageId === "";
    const matchesDbId = configPageId === pageDbId;
    const matchesFacebookId = configPageId === context.pageId;
    if (!pageIdNotConfigured && !matchesDbId && !matchesFacebookId) {
      console.log(`\u2298 Flow "${flow.name}" not configured for this page (no match)`);
      continue;
    }
    if (pageIdNotConfigured) {
      console.log(`\u2713 Page ID not configured - flow applies to ALL pages`);
    } else {
      console.log(`\u2713 Page ID matched: ${matchesDbId ? "DB ID" : "Facebook ID"}`);
    }
    console.log(`
\u2713\u2713\u2713 EXECUTING FLOW: "${flow.name}" \u2713\u2713\u2713`);
    const enableAutoReact = triggerConfig.enableAutoReact !== false;
    if (enableAutoReact) {
      await reactToComment(context.commentId, pageAccessToken);
    }
    const enrichedContext = {
      ...context,
      workspaceId,
      pageDbId
    };
    await incrementNodeAnalytics(flow.id, triggerNode.id, "subscriber_count");
    console.log(`    \u{1F4CA} Analytics: Incremented subscriber_count for trigger node ${triggerNode.id}`);
    await executeFlowActions(flow, configurations, enrichedContext, pageAccessToken, commentId);
  }
  await markAsProcessed(commentId);
}
async function executeFlowActions(flow, configurations, context, pageAccessToken, commentId) {
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  console.log(`  Flow has ${nodes.length} nodes and ${edges.length} edges`);
  const triggerNode = nodes.find((n) => n.type === "triggerNode");
  if (!triggerNode) {
    console.log("  \u2298 No trigger node found");
    return;
  }
  console.log(`  Starting from trigger: ${triggerNode.data?.label || triggerNode.id}`);
  const queue = [triggerNode.id];
  const visited = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    if (visited.has(currentNodeId))
      continue;
    visited.add(currentNodeId);
    const node = nodes.find((n) => n.id === currentNodeId);
    if (!node)
      continue;
    if (node.type !== "triggerNode") {
      await executeAction(node, configurations[node.id] || {}, context, pageAccessToken, flow.id, commentId);
    }
    if (node.type === "formNode") {
      console.log(`  \u23F8 Stopping traversal at Form node: "${node.data?.label}" - will continue after form submission`);
      continue;
    }
    if (node.type === "productWebviewNode" || node.data?.nodeType === "productWebviewNode") {
      console.log(`  \u23F8 Stopping traversal at productWebviewNode: "${node.data?.label}" - waiting for webview interaction`);
      continue;
    }
    if (node.type === "upsellNode" || node.type === "downsellNode") {
      console.log(`  \u23F8 Stopping traversal at ${node.type}: "${node.data?.label}" - waiting for user choice`);
      continue;
    }
    if (node.type === "checkoutNode") {
      console.log(`  \u23F8 Stopping traversal at Checkout node: "${node.data?.label}" - waiting for checkout confirmation`);
      continue;
    }
    const outgoingEdges = edges.filter((e) => e.source === currentNodeId);
    console.log(`  Node "${node.data?.label || currentNodeId}" has ${outgoingEdges.length} outgoing edge(s)`);
    for (const edge of outgoingEdges) {
      if (edge.target && !visited.has(edge.target)) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode?.data?.isNewFlowNode || targetNode?.data?.label?.toLowerCase().includes("new flow:")) {
          console.log(`  \u2298 Stopping traversal at New Flow node: "${targetNode.data?.label}"`);
          continue;
        }
        queue.push(edge.target);
      }
    }
  }
  console.log(`  \u2713 Executed ${visited.size - 1} action node(s)`);
}
async function executeFlowFromNode(startNode, nodes, edges, configurations, context, pageAccessToken, flowId, commentId) {
  console.log(`Starting flow execution from node: ${startNode.data?.label || startNode.id}`);
  const queue = [startNode.id];
  const visited = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    if (visited.has(currentNodeId))
      continue;
    visited.add(currentNodeId);
    const node = nodes.find((n) => n.id === currentNodeId);
    if (!node)
      continue;
    if (node.type !== "triggerNode" && node.type !== "startNode") {
      await executeAction(node, configurations[node.id] || {}, context, pageAccessToken, flowId, commentId);
    }
    if (node.type === "formNode") {
      console.log(`  \u23F8 Stopping traversal at Form node: "${node.data?.label}" - will continue after form submission`);
      continue;
    }
    const nodeConfig = configurations[node.id] || {};
    if (node.type === "productNode" && nodeConfig.buttonAction === "continue_flow") {
      console.log(`  \u23F8 Stopping traversal at Product node: "${node.data?.label}" - waiting for Add to Cart click`);
      continue;
    }
    if (node.type === "upsellNode" || node.type === "downsellNode") {
      console.log(`  \u23F8 Stopping traversal at ${node.type}: "${node.data?.label}" - waiting for user choice`);
      continue;
    }
    if (node.type === "productWebviewNode" || node.data?.nodeType === "productWebviewNode") {
      console.log(`  \u23F8 Stopping traversal at productWebviewNode: "${node.data?.label}" - waiting for webview interaction`);
      continue;
    }
    if (node.type === "checkoutNode") {
      console.log(`  \u23F8 Stopping traversal at Checkout node: "${node.data?.label}" - waiting for checkout confirmation`);
      continue;
    }
    if (node.type === "conditionNode") {
      const config = configurations[node.id] || {};
      const conditions = config.conditions || [];
      const matchType = config.matchType || "all";
      console.log(`  \u{1F500} Evaluating Condition Node: "${node.data?.label}"`);
      const results = conditions.map((cond) => {
        const variable = cond.variable;
        const operator = cond.operator;
        const expectedValue = cond.value;
        let actualValue = context[variable];
        if (variable === "form_submitted") {
          actualValue = context.form_submitted === true || context.formSubmitted === true;
        }
        if (variable === "upsell_response") {
          actualValue = context.upsell_response || context.upsellResponse || context.metadata?.upsell_response || "";
        }
        if (variable === "downsell_response") {
          actualValue = context.downsell_response || context.downsellResponse || context.metadata?.downsell_response || "";
        }
        if (variable === "cart_count") {
          actualValue = context.cart_count || context.cartCount || (Array.isArray(context.cart) ? context.cart.length : 0);
        }
        if (variable === "webview_completed") {
          actualValue = context.webview_completed === true || context.webviewCompleted === true;
        }
        if (variable === "payment_method") {
          actualValue = context.payment_method || context.paymentMethod || context.formData?.paymentMethod || "";
        }
        console.log(`    Checking: ${variable} ${operator} ${expectedValue}, actual: ${actualValue}`);
        switch (operator) {
          case "is_true":
            return actualValue === true;
          case "is_false":
            return actualValue === false;
          case "equals":
            return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
          case "not_equals":
            return String(actualValue).toLowerCase() !== String(expectedValue).toLowerCase();
          case "contains":
            return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
          case "not_contains":
            return !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
          case "is_empty":
            return !actualValue || actualValue === "";
          case "is_not_empty":
            return actualValue && actualValue !== "";
          case "greater_than":
            return Number(actualValue) > Number(expectedValue);
          case "less_than":
            return Number(actualValue) < Number(expectedValue);
          case "greater_or_equal":
            return Number(actualValue) >= Number(expectedValue);
          case "less_or_equal":
            return Number(actualValue) <= Number(expectedValue);
          default:
            return false;
        }
      });
      const conditionResult = conditions.length === 0 ? true : matchType === "all" ? results.every((r) => r) : results.some((r) => r);
      console.log(`  \u{1F500} Condition result: ${conditionResult ? "TRUE" : "FALSE"}`);
      const allConditionEdges = edges.filter((e) => e.source === currentNodeId);
      let matchingEdges = allConditionEdges.filter(
        (e) => e.sourceHandle === (conditionResult ? "true" : "false")
      );
      if (matchingEdges.length === 0 && allConditionEdges.length > 0) {
        console.log(`    No sourceHandle found, using position-based fallback`);
        const edgesWithPositions = allConditionEdges.map((edge) => {
          const targetNode = nodes.find((n) => n.id === edge.target);
          return { ...edge, targetY: targetNode?.position?.y ?? 0 };
        }).sort((a, b) => a.targetY - b.targetY);
        if (conditionResult && edgesWithPositions.length >= 1) {
          matchingEdges = [edgesWithPositions[0]];
        } else if (!conditionResult && edgesWithPositions.length >= 2) {
          matchingEdges = [edgesWithPositions[1]];
        }
      }
      for (const edge of matchingEdges) {
        if (edge.target && !visited.has(edge.target)) {
          console.log(`    \u2192 Following ${conditionResult ? "TRUE" : "FALSE"} path to: ${nodes.find((n) => n.id === edge.target)?.data?.label || edge.target}`);
          queue.push(edge.target);
        }
      }
      continue;
    }
    const outgoingEdges = edges.filter((e) => e.source === currentNodeId);
    console.log(`  Node "${node.data?.label || currentNodeId}" has ${outgoingEdges.length} outgoing edge(s)`);
    for (const edge of outgoingEdges) {
      if (edge.target && !visited.has(edge.target)) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode?.data?.isNewFlowNode || targetNode?.data?.label?.toLowerCase().includes("new flow:")) {
          console.log(`  \u2298 Stopping traversal at New Flow node: "${targetNode.data?.label}"`);
          continue;
        }
        queue.push(edge.target);
      }
    }
  }
  console.log(`  \u2713 Flow execution complete from ${startNode.data?.label}`);
}
async function executeAction(node, config, context, pageAccessToken, flowId, commentId) {
  const label = node.data?.label || "";
  const actionType = node.data?.actionType || "";
  const nodeType = node.type || "";
  console.log(`
  \u2192 Executing: ${label}`);
  console.log(`    actionType: ${actionType}, nodeType: ${nodeType}`);
  console.log(`    Node data:`, JSON.stringify(node.data, null, 2));
  console.log(`    Config:`, JSON.stringify(config, null, 2));
  await incrementNodeAnalytics(flowId, node.id, "sent_count");
  console.log(`    \u{1F4CA} Analytics: Incremented sent_count for node ${node.id}`);
  if (nodeType === "conditionNode") {
    console.log(`    \u2713 Condition Node detected - evaluation happens in flow traversal`);
    await incrementNodeAnalytics(flowId, node.id, "delivered_count");
    return;
  }
  if (nodeType === "sheetsNode") {
    console.log(`    \u2713 Google Sheets Node detected - checking for order sync`);
    const webhookUrl = config.webhookUrl || "";
    const sheetName = config.sheetName || "Orders";
    const sourceType = config.sourceType || "auto";
    const includeMainProduct = config.includeMainProduct ?? true;
    const includeUpsells = config.includeUpsells ?? true;
    const includeDownsells = config.includeDownsells ?? true;
    const includeCustomerInfo = config.includeCustomerInfo ?? true;
    const includeTimestamp = config.includeTimestamp ?? true;
    const cart = context.cart || [];
    const cartTotal = context.cartTotal || 0;
    console.log(`    \u{1F4CB} Source type: ${sourceType}`);
    console.log(`    \u{1F6D2} Cart items: ${cart.length}, Total: \u20B1${cartTotal}`);
    if (cart.length > 0 && webhookUrl) {
      console.log(`    \u{1F4CA} Processing ORDER sync to Google Sheets...`);
      try {
        const { createClient: createClient2 } = await import("@supabase/supabase-js");
        const supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
        const supabaseSheets = createClient2(supabaseUrl2, supabaseKey2);
        const { data: subscriber } = await supabaseSheets.from("subscribers").select("name, metadata").eq("external_id", context.commenterId).eq("workspace_id", context.workspaceId).single();
        const mainProducts = [];
        const upsellProducts = [];
        const downsellProducts = [];
        const allProducts = [];
        const allQuantities = [];
        const allPrices = [];
        cart.forEach((item) => {
          const productName = item.productName || "Unknown Product";
          const quantity = item.quantity || 1;
          const price = item.productPrice || 0;
          if (item.isMainProduct && includeMainProduct) {
            mainProducts.push(productName);
            allProducts.push(`[Main] ${productName}`);
            allQuantities.push(String(quantity));
            allPrices.push(`\u20B1${price}`);
          } else if (item.isUpsell && includeUpsells) {
            upsellProducts.push(productName);
            allProducts.push(`[Upsell] ${productName}`);
            allQuantities.push(String(quantity));
            allPrices.push(`\u20B1${price}`);
          } else if (item.isDownsell && includeDownsells) {
            downsellProducts.push(productName);
            allProducts.push(`[Downsell] ${productName}`);
            allQuantities.push(String(quantity));
            allPrices.push(`\u20B1${price}`);
          } else if (!item.isMainProduct && !item.isUpsell && !item.isDownsell) {
            allProducts.push(productName);
            allQuantities.push(String(quantity));
            allPrices.push(`\u20B1${price}`);
          }
        });
        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const webhookPayload = {
          row_id: orderId,
          "Order ID": orderId,
          "Customer Name": subscriber?.name || context.commenterName || "Customer",
          "Customer ID": context.commenterId,
          "Products": allProducts.join(", "),
          "Quantities": allQuantities.join(", "),
          "Prices": allPrices.join(", "),
          "Total": `\u20B1${cartTotal.toLocaleString()}`,
          "Total Amount": cartTotal,
          "Main Products": mainProducts.join(", "),
          "Upsell Products": upsellProducts.join(", "),
          "Downsell Products": downsellProducts.join(", "),
          "Item Count": cart.length
        };
        if (includeCustomerInfo) {
          const checkoutData = context.checkoutData || {};
          const subMeta = subscriber?.metadata || {};
          webhookPayload["Customer Phone"] = checkoutData.customerPhone || subMeta.phone || subMeta.customerPhone || "";
          webhookPayload["Customer Email"] = checkoutData.customerEmail || subMeta.email || subMeta.customerEmail || "";
          webhookPayload["Customer Address"] = checkoutData.customerAddress || subMeta.address || subMeta.customerAddress || "";
          if (checkoutData.paymentMethod || subMeta.paymentMethod) {
            webhookPayload["Payment Method"] = checkoutData.paymentMethodName || checkoutData.paymentMethod || subMeta.paymentMethodName || subMeta.paymentMethod || "COD";
          }
          if (checkoutData.shippingFee !== void 0 || subMeta.shippingFee !== void 0) {
            webhookPayload["Shipping Fee"] = `\u20B1${(checkoutData.shippingFee || subMeta.shippingFee || 0).toLocaleString()}`;
          }
        }
        if (includeTimestamp) {
          const now = /* @__PURE__ */ new Date();
          webhookPayload["Timestamp"] = now.toISOString();
          webhookPayload["Date"] = now.toLocaleDateString("en-PH");
          webhookPayload["Time"] = now.toLocaleTimeString("en-PH");
        }
        webhookPayload["Flow ID"] = flowId;
        webhookPayload["Page Name"] = context.pageName || "";
        console.log(`    \u{1F4E4} Sending order to Google Sheets webhook...`);
        console.log(`    \u{1F4CB} Payload:`, JSON.stringify(webhookPayload, null, 2));
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowData: webhookPayload })
        });
        let webhookResult;
        try {
          webhookResult = await response.json();
        } catch (e) {
          webhookResult = { status: response.status };
        }
        console.log(`    \u2713 Google Sheets webhook response:`, webhookResult);
        try {
          const { error: orderError } = await supabaseSheets.from("orders").insert({
            id: orderId,
            workspace_id: context.workspaceId,
            subscriber_external_id: context.commenterId,
            customer_name: subscriber?.name || context.commenterName,
            items: cart,
            total: cartTotal,
            status: "completed",
            flow_id: flowId,
            metadata: {
              main_products: mainProducts,
              upsell_products: upsellProducts,
              downsell_products: downsellProducts,
              synced_to_sheets: true,
              sheet_name: sheetName
            }
          });
          if (orderError) {
            console.log(`    \u26A0\uFE0F Could not save to orders table:`, orderError.message);
          } else {
            console.log(`    \u2713 Order saved to database: ${orderId}`);
          }
        } catch (dbError) {
          console.log(`    \u26A0\uFE0F Database save skipped:`, dbError.message);
        }
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
        console.log(`    \u2713 Order sync complete!`);
      } catch (error) {
        console.error(`    \u2717 Error syncing order to sheets:`, error.message);
        await incrementNodeAnalytics(flowId, node.id, "error_count");
      }
    } else if (!webhookUrl) {
      console.log(`    \u26A0\uFE0F No webhook URL configured, skipping sync`);
      await incrementNodeAnalytics(flowId, node.id, "delivered_count");
    } else {
      console.log(`    \u2139\uFE0F No cart data - form sync handled separately via form submission`);
      await incrementNodeAnalytics(flowId, node.id, "delivered_count");
    }
    return;
  }
  const replaceVars = (template) => {
    const commenterName = context.commenterName || "Friend";
    const nameParts = commenterName.split(" ");
    const firstName = nameParts[0] || commenterName;
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    return template.replace(/{commenter_name}/g, commenterName).replace(/{first_name}/g, firstName).replace(/{last_name}/g, lastName);
  };
  if (nodeType === "imageNode" || label.toLowerCase() === "image") {
    console.log(`    \u2713 Detected as Image node`);
    const imageUrl = config.imageUrl || "";
    const caption = config.caption || "";
    if (!imageUrl) {
      console.log("    \u2298 Skipping: No image URL configured");
      return;
    }
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      console.error("    \u2717 Invalid image URL - must start with http:// or https://");
      return;
    }
    console.log(`    \u{1F5BC}\uFE0F Image URL: "${imageUrl}"`);
    console.log(`    \u{1F517} URL Protocol: ${imageUrl.startsWith("https://") ? "HTTPS (\u2713)" : "HTTP (\u26A0 Facebook prefers HTTPS)"}`);
    if (caption) {
      console.log(`    \u{1F4DD} Caption: "${caption}"`);
    }
    try {
      const delaySeconds = config.delaySeconds || 0;
      const showTyping = config.showTyping ?? false;
      if (showTyping || delaySeconds > 0) {
        const typingDuration = delaySeconds > 0 ? delaySeconds * 1e3 : 500;
        console.log(`    \u23F1\uFE0F Showing typing indicator for ${typingDuration}ms`);
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
        await new Promise((resolve) => setTimeout(resolve, typingDuration));
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      }
      const imageRequestBody = {
        recipient: { id: context.commenterId },
        message: {
          attachment: {
            type: "image",
            payload: {
              url: imageUrl,
              is_reusable: true
            }
          }
        },
        access_token: pageAccessToken
      };
      console.log(`    \u{1F4E4} Sending image to user: ${context.commenterName}`);
      console.log(`    \u{1F4E4} Request body:`, JSON.stringify(imageRequestBody, null, 2));
      const imageResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(imageRequestBody)
        }
      );
      const imageResult = await imageResponse.json();
      console.log(`    \u{1F4E4} Facebook API response:`, JSON.stringify(imageResult, null, 2));
      if (imageResult.error) {
        console.error("    \u2717 Facebook API error:", imageResult.error.message);
        console.error("    \u2717 Error code:", imageResult.error.code);
        console.error("    \u2717 Error subcode:", imageResult.error.error_subcode);
        console.error("    \u2717 Full error:", JSON.stringify(imageResult.error, null, 2));
        await incrementNodeAnalytics(flowId, node.id, "error_count");
        if (imageResult.error.code === 100) {
          console.error("    \u{1F4A1} Hint: The image URL may not be publicly accessible or is blocked by the host");
        }
        if (imageResult.error.message?.includes("URL")) {
          console.error("    \u{1F4A1} Hint: Facebook cannot fetch the image. Make sure the URL is publicly accessible and not behind authentication");
        }
      } else {
        console.log("    \u2713 Image sent successfully!");
        console.log("    \u2713 Message ID:", imageResult.message_id);
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
        if (caption) {
          const captionRequestBody = {
            recipient: { id: context.commenterId },
            message: { text: caption },
            access_token: pageAccessToken
          };
          const captionResponse = await fetch(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(captionRequestBody)
            }
          );
          const captionResult = await captionResponse.json();
          if (captionResult.error) {
            console.error("    \u2717 Caption send error:", captionResult.error.message);
          } else {
            console.log("    \u2713 Caption sent successfully!");
          }
        }
      }
    } catch (error) {
      console.error("    \u2717 Exception sending image:", error.message);
    }
    return;
  }
  if (nodeType === "videoNode" || label.toLowerCase() === "video") {
    console.log(`    \u2713 Detected as Video node`);
    const videoUrl = config.videoUrl || "";
    const caption = config.caption || "";
    if (!videoUrl) {
      console.log("    \u2298 Skipping: No video URL configured");
      return;
    }
    if (!videoUrl.startsWith("http://") && !videoUrl.startsWith("https://")) {
      console.error("    \u2717 Invalid video URL - must start with http:// or https://");
      return;
    }
    console.log(`    \u{1F3AC} Video URL: "${videoUrl}"`);
    console.log(`    \u{1F517} URL Protocol: ${videoUrl.startsWith("https://") ? "HTTPS (\u2713)" : "HTTP (\u26A0 Facebook prefers HTTPS)"}`);
    if (caption) {
      console.log(`    \u{1F4DD} Caption: "${caption}"`);
    }
    try {
      const delaySeconds = config.delaySeconds || 0;
      const showTyping = config.showTyping ?? false;
      if (showTyping || delaySeconds > 0) {
        const typingDuration = delaySeconds > 0 ? delaySeconds * 1e3 : 500;
        console.log(`    \u23F1\uFE0F Showing typing indicator for ${typingDuration}ms`);
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
        await new Promise((resolve) => setTimeout(resolve, typingDuration));
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      }
      const isFacebookVideo = videoUrl.includes("facebook.com") || videoUrl.includes("fb.watch");
      let videoRequestBody;
      if (isFacebookVideo) {
        let fbVideoId = "";
        const videoIdMatch = videoUrl.match(/\/videos\/(\d+)/);
        if (videoIdMatch) {
          fbVideoId = videoIdMatch[1];
        } else {
          const fbWatchMatch = videoUrl.match(/fb\.watch\/(\w+)/);
          if (fbWatchMatch) {
            fbVideoId = fbWatchMatch[1];
          }
        }
        if (fbVideoId) {
          console.log(`    \u{1F4F9} Facebook Video ID: ${fbVideoId}`);
          videoRequestBody = {
            recipient: { id: context.commenterId },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "media",
                  elements: [
                    {
                      media_type: "video",
                      url: videoUrl
                    }
                  ]
                }
              }
            },
            access_token: pageAccessToken
          };
        } else {
          console.error("    \u2717 Could not extract Facebook video ID from URL");
          return;
        }
      } else {
        videoRequestBody = {
          recipient: { id: context.commenterId },
          message: {
            attachment: {
              type: "video",
              payload: {
                url: videoUrl,
                is_reusable: true
              }
            }
          },
          access_token: pageAccessToken
        };
      }
      console.log(`    \u{1F4E4} Sending video to user: ${context.commenterName}`);
      console.log(`    \u{1F4E4} Request body:`, JSON.stringify(videoRequestBody, null, 2));
      const videoResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(videoRequestBody)
        }
      );
      const videoResult = await videoResponse.json();
      console.log(`    \u{1F4E4} Facebook API response:`, JSON.stringify(videoResult, null, 2));
      if (videoResult.error) {
        console.error("    \u2717 Facebook API error:", videoResult.error.message);
        console.error("    \u2717 Error code:", videoResult.error.code);
        console.error("    \u2717 Full error:", JSON.stringify(videoResult.error, null, 2));
        await incrementNodeAnalytics(flowId, node.id, "error_count");
        if (videoResult.error.code === 100) {
          console.error("    \u{1F4A1} Hint: The video URL may not be publicly accessible or is blocked by the host");
        }
      } else {
        console.log("    \u2713 Video sent successfully!");
        console.log("    \u2713 Message ID:", videoResult.message_id);
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
        if (caption) {
          const captionRequestBody = {
            recipient: { id: context.commenterId },
            message: { text: caption },
            access_token: pageAccessToken
          };
          const captionResponse = await fetch(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(captionRequestBody)
            }
          );
          const captionResult = await captionResponse.json();
          if (captionResult.error) {
            console.error("    \u2717 Caption send error:", captionResult.error.message);
          } else {
            console.log("    \u2713 Caption sent successfully!");
          }
        }
      }
    } catch (error) {
      console.error("    \u2717 Exception sending video:", error.message);
    }
    return;
  }
  if (nodeType === "formNode" || label.toLowerCase() === "form") {
    console.log(`    \u2713 Detected as Form node`);
    const formName = config.formName || "Form";
    const formId = config.formId || node.id;
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.APP_URL || "https://your-app-url.vercel.app";
    const formUrl = `${baseUrl}/forms/${formId}?sid=${encodeURIComponent(context.commenterId)}&sname=${encodeURIComponent(context.commenterName || "")}&flowId=${flowId}&nodeId=${node.id}&pageId=${context.pageId}&pageName=${encodeURIComponent(context.pageName || "")}`;
    console.log(`    \u{1F4CB} Form Name: "${formName}"`);
    console.log(`    \u{1F517} Form URL: ${formUrl}`);
    try {
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      const formRequestBody = {
        recipient: { id: context.commenterId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: `\u{1F4CB} ${formName}

Tap below to fill out the form:`,
              buttons: [
                {
                  type: "web_url",
                  url: formUrl,
                  title: "Open Form",
                  webview_height_ratio: "tall"
                  // Note: messenger_extensions removed for SaaS compatibility
                }
              ]
            }
          }
        },
        access_token: pageAccessToken
      };
      console.log(`    \u{1F4E4} Sending form button to Facebook API...`);
      const formResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formRequestBody)
        }
      );
      const formResult = await formResponse.json();
      if (formResult.error) {
        console.error("    \u2717 Facebook API error:", formResult.error.message);
        console.error("    \u2717 Error code:", formResult.error.code);
        if (formResult.error.code === 100) {
          console.log("    \u{1F504} Retrying with regular URL button...");
          const fallbackBody = {
            recipient: { id: context.commenterId },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "button",
                  text: `\u{1F4CB} ${formName}

Tap below to fill out the form:`,
                  buttons: [
                    {
                      type: "web_url",
                      url: formUrl,
                      title: "Open Form"
                    }
                  ]
                }
              }
            },
            access_token: pageAccessToken
          };
          const fallbackResponse = await fetch(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fallbackBody)
            }
          );
          const fallbackResult = await fallbackResponse.json();
          if (fallbackResult.error) {
            console.error("    \u2717 Fallback also failed:", fallbackResult.error.message);
            await incrementNodeAnalytics(flowId, node.id, "error_count");
          } else {
            console.log("    \u2713 Form button sent successfully (fallback)!");
            await incrementNodeAnalytics(flowId, node.id, "delivered_count");
          }
        } else {
          await incrementNodeAnalytics(flowId, node.id, "error_count");
        }
      } else {
        console.log("    \u2713 Form button sent successfully!");
        console.log("    \u2713 Message ID:", formResult.message_id);
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
      }
    } catch (error) {
      console.error("    \u2717 Exception sending form:", error.message);
    }
    return;
  }
  const isCommentReply = actionType === "reply" || label.toLowerCase().includes("reply") || label.toLowerCase().includes("comment");
  if (isCommentReply) {
    console.log(`    \u2713 Detected as Comment Reply node`);
    const useAiReply = config.useAiReply === true;
    const aiProvider = config.aiProvider || "openai";
    const aiPrompt = config.aiPrompt || "";
    const template = config.replyTemplate || config.template || "";
    console.log(`    \u{1F527} AI Mode: ${useAiReply ? "ON" : "OFF"}`);
    if (useAiReply) {
      console.log(`    \u{1F916} AI Provider: ${aiProvider}`);
      console.log(`    \u{1F4DD} AI Prompt: "${aiPrompt}"`);
    } else {
      console.log(`    \u{1F4DD} Template: "${template}"`);
    }
    const { data: existingLog } = await supabase.from("comment_automation_log").select("id").eq("comment_id", commentId).eq("action_type", "comment_reply").single();
    if (existingLog) {
      console.log("    \u2713 Already replied to this comment");
      return;
    }
    let replyMessage = "";
    if (useAiReply) {
      const generatedMessage = await generateAIResponse(
        aiProvider,
        aiPrompt,
        {
          commenterName: context.commenterName || "User",
          commentText: context.message || "",
          pageName: context.pageName || "Our Page"
        },
        context.workspaceId
      );
      if (!generatedMessage) {
        console.log("    \u2298 Skipping: AI failed to generate a response");
        return;
      }
      replyMessage = generatedMessage;
    } else {
      if (!template || !pageAccessToken) {
        console.log("    \u2298 Skipping: Missing template or token");
        return;
      }
      replyMessage = replaceVars(template);
    }
    if (!pageAccessToken) {
      console.log("    \u2298 Skipping: Missing page access token");
      return;
    }
    await replyToComment(context.commentId, replyMessage, context.commenterId, pageAccessToken, flowId, commentId);
    return;
  }
  const isMessage = actionType === "message" || label.toLowerCase().includes("message") || label.toLowerCase().includes("messenger");
  if (isMessage) {
    console.log(`    \u2713 Detected as Send Message node`);
    const useAiReply = config.useAiReply === true;
    const aiProvider = config.aiProvider || "openai";
    const aiPrompt = config.aiPrompt || "";
    const template = config.messageTemplate || config.template || "";
    console.log(`    \u{1F527} AI Mode: ${useAiReply ? "ON" : "OFF"}`);
    if (useAiReply) {
      console.log(`    \u{1F916} AI Provider: ${aiProvider}`);
      console.log(`    \u{1F4DD} AI Prompt: "${aiPrompt}"`);
    } else {
      console.log(`    \u{1F4DD} Template: "${template}"`);
    }
    const { data: existingLog } = await supabase.from("comment_automation_log").select("id").eq("comment_id", commentId).eq("action_type", "dm_sent").single();
    if (existingLog) {
      console.log("    \u2713 Already sent DM for this comment (skipping duplicate)");
      return;
    }
    let message = "";
    if (useAiReply) {
      const generatedMessage = await generateAIResponse(
        aiProvider,
        aiPrompt,
        {
          commenterName: context.commenterName || "User",
          commentText: context.message || "",
          pageName: context.pageName || "Our Page"
        },
        context.workspaceId
      );
      if (!generatedMessage) {
        console.log("    \u2298 Skipping: AI failed to generate a response");
        return;
      }
      message = generatedMessage;
    } else {
      if (!template || !pageAccessToken) {
        console.log("    \u2298 Skipping: Missing template or token");
        return;
      }
      message = replaceVars(template);
    }
    if (!pageAccessToken) {
      console.log("    \u2298 Skipping: Missing page access token");
      return;
    }
    await sendPrivateReply(
      context.commenterId,
      context.commenterName,
      message,
      pageAccessToken,
      flowId,
      commentId,
      config.buttons
      // Pass buttons from config
    );
    if (context.workspaceId && context.pageDbId) {
      await saveOrUpdateSubscriber(
        context.workspaceId,
        context.pageDbId,
        context.commenterId,
        context.commenterName || "Unknown User",
        "COMMENT",
        pageAccessToken
      );
    }
    return;
  }
  if (nodeType === "textNode") {
    console.log(`    \u2713 Detected as Text/Delay node`);
    const delaySeconds = config.delaySeconds || 0;
    const textContent = config.textContent || "";
    const buttons = config.buttons || [];
    const showTyping = config.showTyping ?? false;
    if (textContent) {
      console.log(`    \u{1F4DD} Text content: "${textContent}"`);
    }
    if (showTyping || delaySeconds > 0) {
      const typingDuration = delaySeconds > 0 ? delaySeconds * 1e3 : 500;
      console.log(`    \u23F1\uFE0F  Showing typing indicator for ${typingDuration}ms...`);
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, typingDuration));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      console.log(`    \u2713 Typing indicator complete`);
    }
    if (textContent && textContent.trim()) {
      console.log(`    \u{1F4E4} Sending text content as Messenger message...`);
      try {
        let messagePayload;
        if (buttons && buttons.length > 0) {
          const validButtons = buttons.filter((b) => {
            if (b.type === "url" && b.title && b.url)
              return true;
            if (b.type === "startFlow" && b.title && b.flowId)
              return true;
            if (b.type === "newFlow" && b.title && b.flowName)
              return true;
            if (!b.type && b.title && b.url)
              return true;
            return false;
          });
          if (validButtons.length > 0) {
            console.log(`    \u{1F517} Including ${validButtons.length} button(s)`);
            const fbButtons = validButtons.map((btn) => {
              if (btn.type === "url" || !btn.type && btn.url) {
                console.log(`      \u2192 URL button: "${btn.title}" -> ${btn.url}`);
                return {
                  type: "web_url",
                  title: btn.title,
                  url: btn.url,
                  webview_height_ratio: btn.webviewHeight || "full"
                };
              }
              if (btn.type === "startFlow" && btn.flowId) {
                const labelData = btn.addLabel || btn.removeLabel ? `|ADD:${btn.addLabel || ""}|REM:${btn.removeLabel || ""}` : "";
                const buttonPayload = `FLOW_${btn.flowId}${labelData}`;
                console.log(`      \u2192 Flow button: "${btn.title}" -> ${buttonPayload}`);
                return {
                  type: "postback",
                  title: btn.title,
                  payload: buttonPayload
                };
              }
              if (btn.type === "newFlow" && btn.flowName) {
                console.log(`      \u2192 New Flow button: "${btn.title}" -> NEWFLOW_${btn.flowName}`);
                return {
                  type: "postback",
                  title: btn.title,
                  payload: `NEWFLOW_${btn.flowName}`
                };
              }
              return null;
            }).filter(Boolean);
            messagePayload = {
              attachment: {
                type: "template",
                payload: {
                  template_type: "button",
                  text: textContent,
                  buttons: fbButtons
                }
              }
            };
          } else {
            messagePayload = { text: textContent };
          }
        } else {
          messagePayload = { text: textContent };
        }
        const requestBody = {
          recipient: { id: context.commenterId },
          message: messagePayload,
          access_token: pageAccessToken
        };
        console.log(`    \u{1F4E4} Sending message to user: ${context.commenterName}`);
        console.log(`    \u{1F4E4} Request:`, JSON.stringify(requestBody, null, 2));
        const response = await fetch(
          `https://graph.facebook.com/v21.0/me/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          }
        );
        const result = await response.json();
        console.log(`    \u{1F4E4} Facebook API response:`, JSON.stringify(result, null, 2));
        if (result.error) {
          console.error("    \u2717 Facebook API error:", result.error.message);
          await incrementNodeAnalytics(flowId, node.id, "error_count");
        } else {
          console.log("    \u2713 Message sent successfully!");
          console.log("    \u2713 Message ID:", result.message_id);
          await incrementNodeAnalytics(flowId, node.id, "delivered_count");
        }
      } catch (error) {
        console.error("    \u2717 Exception sending message:", error.message);
        await incrementNodeAnalytics(flowId, node.id, "error_count");
      }
    }
    return;
  }
  if (nodeType === "buttonNode") {
    console.log(`    \u2713 Detected as Button Node (Text with Buttons)`);
    const messageText = config.messageText || config.textContent || "";
    const buttons = config.buttons || [];
    console.log(`    \u{1F4DD} Message: "${messageText}"`);
    console.log(`    \u{1F518} Buttons: ${buttons.length}`);
    if (!messageText) {
      console.log("    \u2298 Skipping: No message text configured");
      return;
    }
    try {
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      let messagePayload;
      if (buttons && buttons.length > 0) {
        const fbButtons = buttons.map((btn) => {
          if (btn.type === "url" && btn.url) {
            return {
              type: "web_url",
              title: btn.title,
              url: btn.url,
              webview_height_ratio: btn.webviewType || "full"
            };
          } else if (btn.type === "startFlow" && btn.flowId) {
            return {
              type: "postback",
              title: btn.title,
              payload: `FLOW_${btn.flowId}`
            };
          } else if (btn.type === "postback" || btn.payload) {
            return {
              type: "postback",
              title: btn.title,
              payload: btn.payload || btn.title.toUpperCase().replace(/\s+/g, "_")
            };
          }
          return null;
        }).filter(Boolean);
        console.log(`    \u{1F4E4} Sending message with ${fbButtons.length} button(s)`);
        messagePayload = {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: messageText,
              buttons: fbButtons
            }
          }
        };
      } else {
        messagePayload = { text: messageText };
      }
      const requestBody = {
        recipient: { id: context.commenterId },
        message: messagePayload,
        access_token: pageAccessToken
      };
      console.log(`    \u{1F4E4} Request body:`, JSON.stringify(requestBody, null, 2));
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );
      const result = await response.json();
      console.log(`    \u{1F4E4} Facebook API response:`, JSON.stringify(result, null, 2));
      if (result.error) {
        console.error("    \u2717 Facebook API error:", result.error.message);
        await incrementNodeAnalytics(flowId, node.id, "error_count");
      } else {
        console.log("    \u2713 Button message sent successfully!");
        console.log("    \u2713 Message ID:", result.message_id);
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
      }
    } catch (error) {
      console.error("    \u2717 Exception sending button message:", error.message);
      await incrementNodeAnalytics(flowId, node.id, "error_count");
    }
    return;
  }
  if (nodeType === "buttonsOnlyNode") {
    console.log(`    \u2713 Detected as Buttons Only Node`);
    const buttons = config.buttons || [];
    if (buttons.length === 0) {
      console.log("    \u2298 Skipping: No buttons configured");
      return;
    }
    const promptText = config.promptText || "Please select an option:";
    try {
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 300));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      const fbButtons = buttons.map((btn) => {
        if (btn.type === "url" && btn.url) {
          return {
            type: "web_url",
            title: btn.title,
            url: btn.url
          };
        } else {
          return {
            type: "postback",
            title: btn.title,
            payload: btn.payload || btn.title.toUpperCase().replace(/\s+/g, "_")
          };
        }
      }).filter(Boolean);
      const requestBody = {
        recipient: { id: context.commenterId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: promptText,
              buttons: fbButtons
            }
          }
        },
        access_token: pageAccessToken
      };
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );
      const result = await response.json();
      if (result.error) {
        console.error("    \u2717 Facebook API error:", result.error.message);
      } else {
        console.log("    \u2713 Buttons sent successfully!");
      }
    } catch (error) {
      console.error("    \u2717 Exception sending buttons:", error.message);
    }
    return;
  }
  if (nodeType === "productNode") {
    console.log(`    \u2713 Detected as Product Node`);
    const productName = config.productName || "Product";
    const productDescription = config.productDescription || "";
    const productPrice = config.productPrice || 0;
    const productImage = config.productImage || "";
    const storeId = config.storeId || "";
    const productId = config.productId || "";
    console.log(`    \u{1F6CD}\uFE0F Product: "${productName}"`);
    console.log(`    \u{1F5BC}\uFE0F Product image: ${productImage || "(none configured)"}`);
    console.log(`    \u{1F4B0} Price: ${productPrice}`);
    console.log(`    \u{1F3F7}\uFE0F Product ID: ${productId}`);
    if (!productName) {
      console.log("    \u2298 Skipping: No product configured");
      return;
    }
    try {
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      const formattedPrice = `\u20B1${productPrice.toLocaleString()}`;
      const subtitle = productDescription ? `${formattedPrice} - ${productDescription.substring(0, 60)}${productDescription.length > 60 ? "..." : ""}` : formattedPrice;
      let buyNowUrl = "";
      const { createClient: createClient2 } = await import("@supabase/supabase-js");
      const supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
      const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
      const supabase2 = createClient2(supabaseUrl2, supabaseKey2);
      console.log(`    \u{1F50D} Looking up store... storeId: ${storeId}`);
      let storeSlug = "";
      if (storeId) {
        const { data: storeData, error } = await supabase2.from("stores").select("slug").eq("id", storeId).single();
        console.log(`    \u{1F50D} Store lookup by ID result:`, storeData, "error:", error?.message);
        if (storeData?.slug) {
          storeSlug = storeData.slug;
        }
      }
      if (!storeSlug && context.workspaceId) {
        console.log(`    \u{1F50D} Trying fallback lookup by workspace: ${context.workspaceId}`);
        const { data: storeData } = await supabase2.from("stores").select("slug").eq("workspace_id", context.workspaceId).single();
        if (storeData?.slug) {
          storeSlug = storeData.slug;
          console.log(`    \u2713 Found store by workspace: ${storeSlug}`);
        }
      }
      if (storeSlug) {
        const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || "";
        buyNowUrl = productId ? `${baseUrl}/store/${storeSlug}?product=${productId}` : `${baseUrl}/store/${storeSlug}`;
        console.log(`    \u{1F517} Buy Now URL: ${buyNowUrl}`);
      } else {
        console.log(`    \u26A0\uFE0F No store found for storeId: ${storeId}, workspace: ${context.workspaceId}`);
      }
      const buttonAction = config.buttonAction || "store_page";
      let buttons = [];
      if (buttonAction === "continue_flow") {
        buttons = [{
          type: "postback",
          title: "\u{1F6D2} Add to Cart",
          payload: JSON.stringify({
            action: "continue_flow",
            nodeId: node.id,
            flowId,
            productId,
            productName,
            productPrice,
            productImage: productImage || ""
          })
        }];
        console.log(`    \u{1F517} Button action: continue_flow (postback), flowId: ${flowId}`);
      } else if (buyNowUrl) {
        buttons = [{
          type: "web_url",
          title: "\u{1F6D2} Buy Now",
          url: buyNowUrl,
          webview_height_ratio: "full"
        }];
        console.log(`    \u{1F517} Button action: store_page (web_url)`);
      }
      const elements = [{
        title: productName,
        subtitle,
        image_url: productImage || void 0,
        buttons: buttons.length > 0 ? buttons : void 0
      }];
      if (!elements[0].image_url)
        delete elements[0].image_url;
      if (!elements[0].buttons)
        delete elements[0].buttons;
      const messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            image_aspect_ratio: "square",
            elements
          }
        }
      };
      const requestBody = {
        recipient: { id: context.commenterId },
        message: messagePayload,
        access_token: pageAccessToken
      };
      console.log(`    \u{1F4E4} Sending product card...`);
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );
      const result = await response.json();
      if (result.error) {
        console.error("    \u2717 Facebook API error:", result.error.message);
        await incrementNodeAnalytics(flowId, node.id, "error_count");
      } else {
        console.log("    \u2713 Product card sent successfully!");
        console.log("    \u2713 Message ID:", result.message_id);
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
      }
    } catch (error) {
      console.error("    \u2717 Exception sending product card:", error.message);
      await incrementNodeAnalytics(flowId, node.id, "error_count");
    }
    return;
  }
  if (nodeType === "productWebviewNode") {
    console.log(`    \u2713 Detected as Product Webview Node`);
    const headline = config.headline || "Check Out This Product!";
    const productName = config.productName || "Featured Product";
    const price = config.price || "\u20B1999";
    const description = config.description || "Limited time offer!";
    const productImage = config.productImage || config.imageUrl || "";
    const acceptButtonText = config.acceptButtonText || config.buttonText || "\u2705 Add to Cart";
    const useWebview = config.useWebview === true;
    console.log(`    \u{1F527} Config: useWebview=${useWebview}`);
    try {
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      let buttons = [];
      if (useWebview) {
        console.log(`    \u{1F310} Webview mode enabled - creating webview session`);
        const webviewUrl = await createWebviewSession(
          "product",
          context.commenterId,
          context.workspaceId,
          flowId,
          node.id,
          config,
          pageAccessToken,
          context.cart || []
        );
        if (webviewUrl) {
          buttons = [{
            type: "web_url",
            title: "\u{1F6D2} View Product",
            url: webviewUrl,
            webview_height_ratio: "full"
            // Note: messenger_extensions removed for SaaS compatibility
          }];
        } else {
          console.log(`    \u26A0\uFE0F Webview creation failed, falling back to postback`);
          buttons = [
            {
              type: "postback",
              title: acceptButtonText.slice(0, 20),
              payload: JSON.stringify({
                action: "product_accept",
                flowId,
                nodeId: node.id,
                productName,
                productPrice: parseFloat(price.replace(/[^\d.]/g, "")) || 0,
                productImage
              })
            },
            {
              type: "postback",
              title: "\u274C No Thanks",
              payload: JSON.stringify({
                action: "product_decline",
                flowId,
                nodeId: node.id
              })
            }
          ];
        }
      } else {
        buttons = [
          {
            type: "postback",
            title: acceptButtonText.slice(0, 20),
            payload: JSON.stringify({
              action: "product_accept",
              flowId,
              nodeId: node.id,
              productName,
              productPrice: parseFloat(price.replace(/[^\d.]/g, "")) || 0,
              productImage
            })
          },
          {
            type: "postback",
            title: "\u274C No Thanks",
            payload: JSON.stringify({
              action: "product_decline",
              flowId,
              nodeId: node.id
            })
          }
        ];
      }
      const messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            image_aspect_ratio: "square",
            elements: [{
              title: headline.slice(0, 80),
              subtitle: `${productName} - ${price}
${description}`.slice(0, 80),
              image_url: productImage || void 0,
              buttons
            }]
          }
        }
      };
      if (!productImage) {
        delete messagePayload.attachment.payload.elements[0].image_url;
      }
      const requestBody = {
        recipient: { id: context.commenterId },
        message: messagePayload,
        access_token: pageAccessToken
      };
      console.log(`    \u{1F4E4} Sending product webview card...`);
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );
      const result = await response.json();
      if (result.error) {
        console.error("    \u2717 Facebook API error:", result.error.message);
        await incrementNodeAnalytics(flowId, node.id, "error_count");
      } else {
        console.log(`    \u2713 Product webview card sent successfully! (webview: ${useWebview})`);
        console.log("    \u2713 Message ID:", result.message_id);
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
      }
      console.log(`    \u23F8 Stopping traversal at productWebviewNode: "${node.data?.label}" - waiting for user choice`);
    } catch (error) {
      console.error("    \u2717 Exception sending product webview card:", error.message);
      await incrementNodeAnalytics(flowId, node.id, "error_count");
    }
    return;
  }
  if (nodeType === "upsellNode") {
    console.log(`    \u2713 Detected as Upsell Node`);
    const headline = config.headline || "Special Offer!";
    const price = config.price || "\u20B10";
    const productImage = config.productImage || config.imageUrl || "";
    const description = config.description || "";
    const acceptButtonText = config.acceptButtonText || config.buttonText || "\u2713 Yes, Add This!";
    const cartAction = config.cartAction || "add";
    const useWebview = config.useWebview === true;
    console.log(`    \u{1F527} Config: cartAction="${cartAction}", useWebview=${useWebview}`);
    try {
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      let buttons = [];
      if (useWebview) {
        console.log(`    \u{1F310} Webview mode enabled - creating webview session`);
        const webviewUrl = await createWebviewSession(
          "upsell",
          context.commenterId,
          context.workspaceId,
          flowId,
          node.id,
          config,
          pageAccessToken,
          context.cart || []
        );
        if (webviewUrl) {
          buttons = [{
            type: "web_url",
            title: "\u{1F381} View Offer",
            url: webviewUrl,
            webview_height_ratio: "full"
            // Note: messenger_extensions removed for SaaS compatibility
          }];
        } else {
          console.log(`    \u26A0\uFE0F Webview creation failed, falling back to postback`);
          buttons = [
            {
              type: "postback",
              title: acceptButtonText,
              payload: JSON.stringify({
                action: "upsell_accept",
                nodeId: node.id,
                flowId,
                productName: config.productName || headline,
                productPrice: parseFloat(price.replace(/[^\d.]/g, "")) || 0,
                productImage: productImage || "",
                cartAction
              })
            },
            {
              type: "postback",
              title: "\u2717 No Thanks",
              payload: JSON.stringify({
                action: "upsell_decline",
                nodeId: node.id,
                flowId
              })
            }
          ];
        }
      } else {
        buttons = [
          {
            type: "postback",
            title: acceptButtonText,
            payload: JSON.stringify({
              action: "upsell_accept",
              nodeId: node.id,
              flowId,
              productName: config.productName || headline,
              productPrice: parseFloat(price.replace(/[^\d.]/g, "")) || 0,
              productImage: productImage || "",
              cartAction
            })
          },
          {
            type: "postback",
            title: "\u2717 No Thanks",
            payload: JSON.stringify({
              action: "upsell_decline",
              nodeId: node.id,
              flowId
            })
          }
        ];
      }
      const elements = [{
        title: headline,
        subtitle: description ? `${price} - ${description.substring(0, 60)}` : price,
        image_url: productImage || void 0,
        buttons
      }];
      if (!elements[0].image_url)
        delete elements[0].image_url;
      const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: context.commenterId },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                image_aspect_ratio: "square",
                elements
              }
            }
          },
          access_token: pageAccessToken
        })
      });
      const result = await response.json();
      if (result.error) {
        console.error("    \u2717 Facebook API error:", result.error.message);
        await incrementNodeAnalytics(flowId, node.id, "error_count");
      } else {
        console.log(`    \u2713 Upsell card sent successfully! (webview: ${useWebview})`);
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
      }
    } catch (error) {
      console.error("    \u2717 Exception sending upsell:", error.message);
      await incrementNodeAnalytics(flowId, node.id, "error_count");
    }
    return;
  }
  if (nodeType === "downsellNode") {
    console.log(`    \u2713 Detected as Downsell Node`);
    const headline = config.headline || "Wait! Special Deal";
    const price = config.price || "\u20B10";
    const productImage = config.productImage || config.imageUrl || "";
    const description = config.description || "";
    const acceptButtonText = config.acceptButtonText || "\u2713 Yes, I Want This";
    const cartAction = config.cartAction || "add";
    const useWebview = config.useWebview === true;
    console.log(`    \u{1F527} Config: cartAction="${cartAction}", useWebview=${useWebview}`);
    try {
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      let buttons = [];
      if (useWebview) {
        console.log(`    \u{1F310} Webview mode enabled - creating webview session`);
        const webviewUrl = await createWebviewSession(
          "downsell",
          context.commenterId,
          context.workspaceId,
          flowId,
          node.id,
          config,
          pageAccessToken,
          context.cart || []
        );
        if (webviewUrl) {
          buttons = [{
            type: "web_url",
            title: "\u{1F381} View Offer",
            url: webviewUrl,
            webview_height_ratio: "full"
            // Note: messenger_extensions removed for SaaS compatibility
          }];
        } else {
          console.log(`    \u26A0\uFE0F Webview creation failed, falling back to postback`);
          buttons = [
            {
              type: "postback",
              title: acceptButtonText,
              payload: JSON.stringify({
                action: "downsell_accept",
                nodeId: node.id,
                flowId,
                productName: config.productName || headline,
                productPrice: parseFloat(price.replace(/[^\d.]/g, "")) || 0,
                productImage: productImage || "",
                cartAction
              })
            },
            {
              type: "postback",
              title: "\u2717 No Thanks",
              payload: JSON.stringify({
                action: "downsell_decline",
                nodeId: node.id,
                flowId
              })
            }
          ];
        }
      } else {
        buttons = [
          {
            type: "postback",
            title: acceptButtonText,
            payload: JSON.stringify({
              action: "downsell_accept",
              nodeId: node.id,
              flowId,
              productName: config.productName || headline,
              productPrice: parseFloat(price.replace(/[^\d.]/g, "")) || 0,
              productImage: productImage || "",
              cartAction
            })
          },
          {
            type: "postback",
            title: "\u2717 No Thanks",
            payload: JSON.stringify({
              action: "downsell_decline",
              nodeId: node.id,
              flowId
            })
          }
        ];
      }
      const elements = [{
        title: headline,
        subtitle: description ? `${price} - ${description.substring(0, 60)}` : price,
        image_url: productImage || void 0,
        buttons
      }];
      if (!elements[0].image_url)
        delete elements[0].image_url;
      const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: context.commenterId },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                image_aspect_ratio: "square",
                elements
              }
            }
          },
          access_token: pageAccessToken
        })
      });
      const result = await response.json();
      if (result.error) {
        console.error("    \u2717 Facebook API error:", result.error.message);
        await incrementNodeAnalytics(flowId, node.id, "error_count");
      } else {
        console.log(`    \u2713 Downsell card sent successfully! (webview: ${useWebview})`);
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
      }
    } catch (error) {
      console.error("    \u2717 Exception sending downsell:", error.message);
      await incrementNodeAnalytics(flowId, node.id, "error_count");
    }
    return;
  }
  if (nodeType === "checkoutNode") {
    console.log(`    \u2713 Detected as Checkout Node`);
    const headerText = config.headerText || "\u{1F6D2} Your Order Summary";
    const buttonText = config.buttonText || "\u2705 Proceed to Checkout";
    const companyName = config.companyName || "";
    const useWebview = config.useWebview === true;
    const showShipping = config.showShipping ?? false;
    const shippingFee = config.shippingFee || 0;
    try {
      let cart = context.cart || [];
      let cartTotal = context.cartTotal || 0;
      let customerName = context.commenterName || "Valued Customer";
      if (cart.length === 0) {
        const { createClient: createClient2 } = await import("@supabase/supabase-js");
        const supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
        const supabase2 = createClient2(supabaseUrl2, supabaseKey2);
        const { data: subscriber } = await supabase2.from("subscribers").select("metadata, name").eq("external_id", context.commenterId).eq("workspace_id", context.workspaceId).single();
        if (subscriber?.metadata?.cart) {
          cart = subscriber.metadata.cart;
          cartTotal = subscriber.metadata.cartTotal || 0;
        }
        if (subscriber?.name) {
          customerName = subscriber.name;
        }
      }
      console.log(`    \u{1F6D2} Cart items: ${cart.length}`);
      console.log(`    \u{1F4B0} Total: \u20B1${cartTotal}`);
      console.log(`    \u{1F310} Webview mode: ${useWebview}`);
      if (cart.length > 0) {
        console.log(`    \u{1F4DD} Saving cart to subscriber metadata for checkout...`);
        const { createClient: createClient2 } = await import("@supabase/supabase-js");
        const supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
        const supabaseCheckout = createClient2(supabaseUrl2, supabaseKey2);
        const { data: existingSub } = await supabaseCheckout.from("subscribers").select("metadata").eq("external_id", context.commenterId).eq("workspace_id", context.workspaceId).single();
        await supabaseCheckout.from("subscribers").update({
          metadata: {
            ...existingSub?.metadata || {},
            cart,
            cartTotal,
            cartUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }).eq("external_id", context.commenterId).eq("workspace_id", context.workspaceId);
        console.log(`    \u2713 Cart saved to subscriber metadata`);
      }
      if (cart.length === 0) {
        console.log("    \u2298 Empty cart, sending empty cart message");
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: context.commenterId },
            message: { text: "\u{1F6D2} Your cart is empty. Please add some items first!" },
            access_token: pageAccessToken
          })
        });
        return;
      }
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      if (useWebview) {
        console.log(`    \u{1F310} Creating checkout webview session...`);
        const checkoutConfig = {
          ...config,
          headerText,
          buttonText,
          companyName,
          showShipping,
          shippingFee
        };
        const webviewUrl = await createWebviewSession(
          "checkout",
          context.commenterId,
          context.workspaceId,
          flowId,
          node.id,
          checkoutConfig,
          pageAccessToken,
          cart
        );
        if (webviewUrl) {
          const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: context.commenterId },
              message: {
                attachment: {
                  type: "template",
                  payload: {
                    template_type: "button",
                    text: `\u{1F6D2} ${headerText}

${cart.length} item(s) - \u20B1${cartTotal.toLocaleString()}

Tap below to review and confirm your order.`,
                    buttons: [{
                      type: "web_url",
                      title: buttonText,
                      url: webviewUrl,
                      webview_height_ratio: "full"
                      // Note: messenger_extensions removed for SaaS compatibility
                    }]
                  }
                }
              },
              access_token: pageAccessToken
            })
          });
          const result = await response.json();
          if (result.error) {
            console.error("    \u2717 Facebook API error:", result.error.message);
            await incrementNodeAnalytics(flowId, node.id, "error_count");
          } else {
            console.log("    \u2713 Checkout webview button sent!");
            await incrementNodeAnalytics(flowId, node.id, "delivered_count");
          }
        } else {
          console.log(`    \u26A0\uFE0F Webview creation failed, falling back to postback`);
        }
      }
      if (!useWebview) {
        let checkoutText = `${headerText}
`;
        if (companyName) {
          checkoutText += `\u{1F3EA} ${companyName}
`;
        }
        checkoutText += `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

`;
        cart.forEach((item, index) => {
          const price = typeof item.productPrice === "number" ? item.productPrice : 0;
          const qty = item.quantity || 1;
          const itemTotal = price * qty;
          checkoutText += `\u{1F4E6} ${item.productName}
`;
          checkoutText += `    ${qty} \xD7 \u20B1${price.toLocaleString()} = \u20B1${itemTotal.toLocaleString()}

`;
        });
        checkoutText += `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
`;
        checkoutText += `\u{1F4B0} TOTAL: \u20B1${cartTotal.toLocaleString()}

`;
        checkoutText += `Tap the button below to confirm your order.`;
        const payload = JSON.stringify({
          action: "checkout_confirm",
          nodeId: node.id,
          flowId,
          cartTotal
        });
        const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: context.commenterId },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "button",
                  text: checkoutText,
                  buttons: [{
                    type: "postback",
                    title: buttonText,
                    payload
                  }]
                }
              }
            },
            access_token: pageAccessToken
          })
        });
        const result = await response.json();
        if (result.error) {
          console.error("    \u2717 Facebook API error:", result.error.message);
          await incrementNodeAnalytics(flowId, node.id, "error_count");
        } else {
          console.log("    \u2713 Checkout card sent successfully!");
          console.log("    \u23F8 Waiting for user to click checkout button...");
          await incrementNodeAnalytics(flowId, node.id, "delivered_count");
        }
      }
    } catch (error) {
      console.error("    \u2717 Exception sending checkout:", error.message);
      await incrementNodeAnalytics(flowId, node.id, "error_count");
    }
    return;
  }
  if (nodeType === "checkoutFormNode") {
    console.log(`    \u2713 Detected as Checkout Form Node - Using Facebook Native Form`);
    const privacyUrl = config.privacyUrl || "https://www.facebook.com/privacy/policy/";
    const countries = config.countries || ["PH"];
    const expiresInDays = config.expiresInDays || 7;
    const paymentMethods = config.paymentMethods || ["Cash on Delivery", "GCash", "Bank Transfer"];
    const thankYouMessage = config.thankYouMessage || "\u2705 Thank you! Your information has been saved. Processing your order...";
    try {
      const { createClient: createClient2 } = await import("@supabase/supabase-js");
      const supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
      const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
      const supabase2 = createClient2(supabaseUrl2, supabaseKey2);
      const { data: subscriber } = await supabase2.from("subscribers").select("id, metadata").eq("external_id", context.commenterId).eq("workspace_id", context.workspaceId).maybeSingle();
      if (subscriber) {
        const checkoutFormState = {
          formNodeId: node.id,
          flowId,
          paymentMethods,
          thankYouMessage,
          awaitingNativeForm: true
        };
        await supabase2.from("subscribers").update({
          metadata: {
            ...subscriber.metadata || {},
            checkoutFormState
          }
        }).eq("id", subscriber.id);
        console.log(`    \u2713 Checkout form state saved for native form callback`);
      }
      const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: context.commenterId },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "customer_information",
                countries,
                business_privacy: {
                  url: privacyUrl
                },
                expires_in_days: expiresInDays
              }
            }
          },
          access_token: pageAccessToken
        })
      });
      const result = await response.json();
      if (result.error) {
        console.error("    \u2717 Facebook API error:", result.error.message);
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: context.commenterId },
            message: { text: "\u{1F4CD} Please reply with your complete delivery address including: Full Name, Street Address, City/Municipality, Province, Postal Code, and Mobile Number." },
            access_token: pageAccessToken
          })
        });
        console.log("    \u2713 Fallback address prompt sent");
      } else {
        console.log("    \u2713 Facebook native shipping form sent successfully!");
        console.log("    \u23F8 Waiting for customer to fill and submit the form...");
      }
    } catch (error) {
      console.error("    \u2717 Exception in checkout form:", error.message);
    }
    return;
  }
  if (nodeType === "invoiceNode") {
    console.log(`    \u2713 Detected as Invoice Node`);
    const companyName = config.companyName || "Store";
    const companyLogo = config.companyLogo || "";
    const companyAddress = config.companyAddress || "";
    const primaryColor = config.primaryColor || "#6366f1";
    const confirmationMessage = config.confirmationMessage || "Thank you for your order! \u{1F389}";
    try {
      let cart = context.cart || [];
      let cartTotal = context.cartTotal || 0;
      let customerName = context.commenterName || "Valued Customer";
      const { createClient: createClient2 } = await import("@supabase/supabase-js");
      const supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
      const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
      const supabaseInvoice = createClient2(supabaseUrl2, supabaseKey2);
      if (cart.length === 0) {
        const { data: subscriber } = await supabaseInvoice.from("subscribers").select("metadata, name").eq("external_id", context.commenterId).eq("workspace_id", context.workspaceId).single();
        if (subscriber?.metadata?.cart) {
          cart = subscriber.metadata.cart;
          cartTotal = subscriber.metadata.cartTotal || 0;
        }
        if (subscriber?.name) {
          customerName = subscriber.name;
        }
      }
      console.log(`    \u{1F6D2} Cart items for invoice: ${cart.length}`);
      console.log(`    \u{1F4B0} Total: \u20B1${cartTotal}`);
      console.log(`    \u{1F464} Customer: ${customerName}`);
      if (cart.length === 0) {
        console.log("    \u2298 Empty cart, sending confirmation only");
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: context.commenterId },
            message: { text: `\u2705 ${confirmationMessage}` },
            access_token: pageAccessToken
          })
        });
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
        return;
      }
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "";
      const receiptElements = cart.map((item) => {
        const qty = parseInt(item.quantity) || 1;
        const unitPrice = parseFloat(item.productPrice) || 0;
        const itemTotal = unitPrice * qty;
        let imageUrl = item.productImage || "";
        if (imageUrl) {
          if (imageUrl.startsWith("/")) {
            imageUrl = `${appUrl}${imageUrl}`;
          }
          if (!imageUrl.startsWith("http")) {
            imageUrl = "";
          }
        }
        console.log(`    \u{1F4F8} Item: ${item.productName}, Image: ${imageUrl || "none"}`);
        const element = {
          title: String(item.productName || "Product"),
          subtitle: qty > 1 ? `Qty: ${qty}` : "",
          quantity: qty,
          price: itemTotal,
          currency: "PHP"
        };
        if (imageUrl && imageUrl.startsWith("http")) {
          element.image_url = imageUrl;
        }
        return element;
      });
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 800));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      console.log("    \u{1F4E7} Sending Receipt Template...");
      const receiptPayload = {
        recipient: { id: context.commenterId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "receipt",
              recipient_name: customerName,
              order_number: orderNumber,
              currency: "PHP",
              payment_method: "Cash on Delivery",
              timestamp: Math.floor(Date.now() / 1e3).toString(),
              elements: receiptElements,
              summary: {
                subtotal: cartTotal,
                shipping_cost: 0,
                total_tax: 0,
                total_cost: cartTotal
              }
            }
          }
        },
        access_token: pageAccessToken
      };
      const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptPayload)
      });
      const result = await response.json();
      if (result.error) {
        console.error("    \u2717 Receipt Template error:", result.error.message);
        console.error("    \u2717 Error code:", result.error.code);
        console.error("    \u2717 Error type:", result.error.type);
        console.error("    \u2717 Full error:", JSON.stringify(result.error));
        console.error("    \u2717 Receipt elements:", JSON.stringify(receiptElements));
        console.log("    \u21A9\uFE0F Falling back to text invoice...");
        let invoiceText = `\u{1F9FE} **${companyName}**
`;
        invoiceText += `Order #${orderNumber}
`;
        invoiceText += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

`;
        for (const item of cart) {
          invoiceText += `\u{1F4E6} ${item.productName} x${item.quantity || 1}
`;
          invoiceText += `   \u20B1${(item.productPrice * (item.quantity || 1)).toLocaleString()}

`;
        }
        invoiceText += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;
        invoiceText += `**TOTAL: \u20B1${cartTotal.toLocaleString()}**

`;
        invoiceText += `\u2705 ${confirmationMessage}`;
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: context.commenterId },
            message: { text: invoiceText },
            access_token: pageAccessToken
          })
        });
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
      } else {
        console.log("    \u2713 Receipt sent successfully!");
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: context.commenterId },
            message: { text: `\u2705 ${confirmationMessage}

\u{1F4CB} Tap the receipt above to view your complete order details.` },
            access_token: pageAccessToken
          })
        });
      }
    } catch (error) {
      console.error("    \u2717 Exception sending invoice:", error.message);
      await incrementNodeAnalytics(flowId, node.id, "error_count");
    }
    return;
  }
  if (nodeType === "cartInvoiceNode") {
    console.log(`    \u2713 Detected as Cart Invoice Node`);
    const companyName = config.companyName || "Store";
    const primaryColor = config.primaryColor || "#10b981";
    const showShipping = config.showShipping ?? true;
    const shippingFee = config.shippingFee || 0;
    const thankYouMessage = config.thankYouMessage || "Thank you for your order! \u{1F389}";
    try {
      let cart = context.cart || [];
      let cartTotal = context.cartTotal || 0;
      if (cart.length === 0) {
        const { createClient: createClient2 } = await import("@supabase/supabase-js");
        const supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
        const supabase2 = createClient2(supabaseUrl2, supabaseKey2);
        const { data: subscriber } = await supabase2.from("subscribers").select("metadata").eq("external_id", context.commenterId).eq("workspace_id", context.workspaceId).single();
        if (subscriber?.metadata?.cart) {
          cart = subscriber.metadata.cart;
          cartTotal = subscriber.metadata.cartTotal || 0;
        }
      }
      console.log(`    \u{1F6D2} Cart items: ${cart.length}`);
      console.log(`    \u{1F4B0} Subtotal: \u20B1${cartTotal}`);
      if (cart.length === 0) {
        console.log("    \u2298 Empty cart, sending empty cart message");
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: context.commenterId },
            message: { text: "\u{1F6D2} Your cart is empty. Please add some items first!" },
            access_token: pageAccessToken
          })
        });
        return;
      }
      const appUrl2 = process.env.VITE_APP_URL || process.env.APP_URL || "";
      const receiptElements = cart.map((item) => {
        const qty = parseInt(item.quantity) || 1;
        const unitPrice = parseFloat(item.productPrice) || 0;
        const itemTotal = unitPrice * qty;
        let imageUrl = item.productImage || "";
        if (imageUrl) {
          if (imageUrl.startsWith("/")) {
            imageUrl = `${appUrl2}${imageUrl}`;
          }
          if (!imageUrl.startsWith("http")) {
            imageUrl = "";
          }
        }
        const element = {
          title: String(item.productName || "Product"),
          subtitle: qty > 1 ? `Qty: ${qty}` : "",
          quantity: qty,
          price: itemTotal,
          currency: "PHP"
        };
        if (imageUrl && imageUrl.startsWith("http")) {
          element.image_url = imageUrl;
        }
        return element;
      });
      const grandTotal = cartTotal + (showShipping ? shippingFee : 0);
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_on");
      await new Promise((resolve) => setTimeout(resolve, 800));
      await sendTypingIndicator(context.commenterId, pageAccessToken, "typing_off");
      const receiptPayload = {
        recipient: { id: context.commenterId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "receipt",
              recipient_name: context.commenterName || "Valued Customer",
              order_number: orderNumber,
              currency: "PHP",
              payment_method: "Cash on Delivery",
              order_url: "",
              timestamp: Math.floor(Date.now() / 1e3).toString(),
              elements: receiptElements,
              address: void 0,
              summary: {
                subtotal: cartTotal,
                shipping_cost: showShipping ? shippingFee : 0,
                total_tax: 0,
                total_cost: grandTotal
              },
              adjustments: []
            }
          }
        },
        access_token: pageAccessToken
      };
      if (!receiptPayload.message.attachment.payload.order_url) {
        delete receiptPayload.message.attachment.payload.order_url;
      }
      delete receiptPayload.message.attachment.payload.address;
      console.log("    \u{1F4E7} Sending Receipt Template...");
      const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptPayload)
      });
      const result = await response.json();
      if (result.error) {
        console.error("    \u2717 Receipt Template error:", result.error.message);
        console.log("    \u21A9\uFE0F Falling back to text message...");
        let invoiceText = `\u{1F9FE} **${companyName}**
`;
        invoiceText += `Order #${orderNumber}
`;
        invoiceText += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

`;
        for (const item of cart) {
          invoiceText += `\u{1F4E6} ${item.productName} x${item.quantity || 1}
`;
          invoiceText += `   \u20B1${(item.productPrice * (item.quantity || 1)).toLocaleString()}

`;
        }
        invoiceText += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;
        invoiceText += `Subtotal: \u20B1${cartTotal.toLocaleString()}
`;
        if (showShipping && shippingFee > 0) {
          invoiceText += `Shipping: \u20B1${shippingFee.toLocaleString()}
`;
        }
        invoiceText += `**TOTAL: \u20B1${grandTotal.toLocaleString()}**

`;
        invoiceText += thankYouMessage;
        await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: context.commenterId },
            message: { text: invoiceText },
            access_token: pageAccessToken
          })
        });
      } else {
        console.log("    \u2713 Receipt sent successfully!");
        await incrementNodeAnalytics(flowId, node.id, "delivered_count");
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      const followUpMessage = `${thankYouMessage}

\u{1F4CB} Tap the receipt above to view your complete order details.`;
      await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: context.commenterId },
          message: { text: followUpMessage },
          access_token: pageAccessToken
        })
      });
    } catch (error) {
      console.error("    \u2717 Exception sending cart invoice:", error.message);
      await incrementNodeAnalytics(flowId, node.id, "error_count");
    }
    return;
  }
  if (nodeType === "cartSheetNode") {
    console.log(`    \u2713 Detected as Cart Sheet Node`);
    const webhookUrl = config.webhookUrl || "";
    const sheetName = config.sheetName || "Cart Orders";
    const includeTimestamp = config.includeTimestamp ?? true;
    const includeCustomerName = config.includeCustomerName ?? true;
    const includeProductDetails = config.includeProductDetails ?? true;
    if (!webhookUrl) {
      console.log("    \u2298 No webhook URL configured, skipping");
      return;
    }
    try {
      let cart = context.cart || [];
      let cartTotal = context.cartTotal || 0;
      if (cart.length === 0) {
        const { createClient: createClient2 } = await import("@supabase/supabase-js");
        const supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
        const supabase2 = createClient2(supabaseUrl2, supabaseKey2);
        const { data: subscriber } = await supabase2.from("subscribers").select("metadata, name").eq("external_id", context.commenterId).eq("workspace_id", context.workspaceId).single();
        if (subscriber?.metadata?.cart) {
          cart = subscriber.metadata.cart;
          cartTotal = subscriber.metadata.cartTotal || 0;
        }
      }
      console.log(`    \u{1F6D2} Cart items: ${cart.length}`);
      console.log(`    \u{1F4B0} Total: \u20B1${cartTotal}`);
      if (cart.length === 0) {
        console.log("    \u2298 Empty cart, skipping sheet update");
        return;
      }
      const productNames = cart.map((item) => item.productName).join(", ");
      const quantities = cart.map((item) => item.quantity).join(", ");
      const prices = cart.map((item) => `\u20B1${item.productPrice}`).join(", ");
      const webhookPayload = {
        sheetName,
        customerId: context.commenterId,
        customerName: context.commenterName || "Customer",
        products: productNames,
        quantities,
        prices,
        total: cartTotal
      };
      if (includeTimestamp) {
        webhookPayload.timestamp = (/* @__PURE__ */ new Date()).toISOString();
      }
      console.log(`    \u{1F4E4} Sending to Google Sheets webhook...`);
      console.log(`    \u{1F4CB} Data:`, JSON.stringify(webhookPayload));
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload)
      });
      const result = await response.json();
      console.log(`    \u2713 Webhook response:`, result);
      await incrementNodeAnalytics(flowId, node.id, "delivered_count");
    } catch (error) {
      console.error("    \u2717 Exception sending to Cart Sheet webhook:", error.message);
      await incrementNodeAnalytics(flowId, node.id, "error_count");
    }
    return;
  }
}
async function sendTypingIndicator(userId, pageAccessToken, action) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: userId },
          sender_action: action,
          access_token: pageAccessToken
        })
      }
    );
    const result = await response.json();
    if (result.error) {
      console.log(`    \u26A0\uFE0F Typing indicator error: ${result.error.message}`);
    } else {
      console.log(`    \u2713 Typing indicator: ${action}`);
    }
  } catch (error) {
    console.log(`    \u26A0\uFE0F Typing indicator exception: ${error.message}`);
  }
}
async function replyToComment(commentId, messageTemplate, userId, pageAccessToken, flowId, originalCommentId) {
  const message = `@[${userId}] ${messageTemplate}`;
  console.log(`    \u{1F4E4} Posting reply with mention: "${message}"`);
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${commentId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          access_token: pageAccessToken
        })
      }
    );
    const result = await response.json();
    if (result.error) {
      console.error("    \u2717 Facebook API error:", result.error.message);
      console.error("    \u2717 Full error response:", JSON.stringify(result.error, null, 2));
      await logAction(originalCommentId, flowId, "comment_reply", false, result.error.message, result);
    } else {
      console.log("    \u2713 Reply posted successfully with @mention!");
      console.log("    \u2713 Facebook response:", JSON.stringify(result, null, 2));
      await logAction(originalCommentId, flowId, "comment_reply", true, null, result);
    }
  } catch (error) {
    console.error("    \u2717 Exception:", error.message);
    await logAction(originalCommentId, flowId, "comment_reply", false, error.message, null);
  }
}
async function sendPrivateReply(userId, userName, message, pageAccessToken, flowId, commentId, buttons) {
  try {
    let messagePayload;
    if (buttons && buttons.length > 0) {
      const fbButtons = buttons.map((btn) => {
        if (btn.type === "url" && btn.url) {
          return {
            type: "web_url",
            title: btn.title,
            url: btn.url,
            webview_height_ratio: btn.webviewType || "full"
          };
        } else if (btn.type === "startFlow" && btn.flowId) {
          return {
            type: "postback",
            title: btn.title,
            payload: `FLOW_${btn.flowId}`
            // Prefix with FLOW_ to identify flow triggers
          };
        }
        return null;
      }).filter(Boolean);
      console.log(`  Mapped ${fbButtons.length} button(s) to Facebook format:`, fbButtons);
      messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: message,
            buttons: fbButtons
          }
        }
      };
    } else {
      messagePayload = { text: message };
    }
    const requestBody = {
      recipient: { comment_id: commentId },
      // Use comment_id, not user_id
      message: messagePayload,
      access_token: pageAccessToken
    };
    console.log(`    \u{1F4E4} Request body:`, JSON.stringify(requestBody, null, 2));
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );
    const result = await response.json();
    console.log(`    \u{1F4E4} Facebook API response:`, JSON.stringify(result, null, 2));
    if (result.error) {
      console.error("    \u2717 Facebook API error:", result.error.message);
      console.error("    \u2717 Error code:", result.error.code);
      console.error("    \u2717 Error type:", result.error.type);
      await logAction(commentId, flowId, "dm_sent", false, result.error.message, result);
    } else {
      console.log("    \u2713 Private reply (DM) sent successfully!");
      console.log("    \u2713 Message ID:", result.message_id);
      console.log("    \u2713 Recipient ID:", result.recipient_id);
      await logAction(commentId, flowId, "dm_sent", true, null, result);
    }
  } catch (error) {
    console.error("    \u2717 Exception sending private reply:", error.message);
    console.error("    \u2717 Stack:", error.stack);
    await logAction(commentId, flowId, "dm_sent", false, error.message, null);
  }
}
async function reactToComment(commentId, pageAccessToken) {
  try {
    console.log(`    \u{1F44D} Auto-liking comment: ${commentId}`);
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${commentId}/likes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: pageAccessToken
        })
      }
    );
    const result = await response.json();
    if (result.error) {
      console.error("    \u2717 Like error:", result.error.message);
      console.error("    \u2717 Error code:", result.error.code);
    } else if (result.success === true) {
      console.log(`    \u2713 Successfully liked comment`);
    } else {
      console.log(`    \u26A0 Like response:`, JSON.stringify(result));
    }
  } catch (error) {
    console.error("    \u2717 Exception liking comment:", error.message);
  }
}
async function logAction(commentId, flowId, actionType, success, errorMessage, facebookResponse) {
  await supabase.from("comment_automation_log").insert({
    comment_id: commentId,
    flow_id: flowId,
    action_type: actionType,
    success,
    error_message: errorMessage,
    facebook_response: facebookResponse
  });
}
async function markAsProcessed(commentId) {
  await supabase.from("comments").update({ processed: true }).eq("comment_id", commentId);
  console.log("\n\u2713 Comment marked as processed");
}
