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

// api/webview.ts
var webview_exports = {};
__export(webview_exports, {
  default: () => handler
});
module.exports = __toCommonJS(webview_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const route = req.query.route || "session";
  try {
    switch (route) {
      case "session":
        return handleSession(req, res);
      case "action":
        return handleAction(req, res);
      case "continue":
        return handleContinue(req, res);
      default:
        return res.status(400).json({ error: `Unknown route: ${route}` });
    }
  } catch (error) {
    console.error("[Webview] Unexpected error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
async function handleSession(req, res) {
  if (req.method === "GET") {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Session ID required" });
    }
    const { data: session, error } = await supabase.from("webview_sessions").select("*").eq("id", id).single();
    if (error || !session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (new Date(session.expires_at) < /* @__PURE__ */ new Date()) {
      return res.status(410).json({ error: "Session expired" });
    }
    return res.status(200).json({ session });
  }
  if (req.method === "POST") {
    const { external_id, workspace_id, flow_id, current_node_id, page_type, page_config, cart, cart_total, metadata, page_access_token } = req.body;
    if (!external_id || !workspace_id || !page_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const { data: session, error } = await supabase.from("webview_sessions").insert({
      external_id,
      workspace_id,
      flow_id,
      current_node_id,
      page_type,
      page_config: page_config || {},
      cart: cart || [],
      cart_total: cart_total || 0,
      metadata: metadata || {},
      page_access_token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString()
    }).select().single();
    if (error) {
      console.error("[Session] Error creating:", error);
      return res.status(500).json({ error: "Failed to create session" });
    }
    return res.status(201).json({ session });
  }
  if (req.method === "PATCH") {
    const { id, ...updates } = req.body;
    if (!id)
      return res.status(400).json({ error: "Session ID required" });
    const { data: session, error } = await supabase.from("webview_sessions").update(updates).eq("id", id).select().single();
    if (error) {
      return res.status(500).json({ error: "Failed to update session" });
    }
    return res.status(200).json({ session });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
async function handleAction(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { sessionId, action, payload } = req.body;
  if (!sessionId || !action) {
    return res.status(400).json({ error: "sessionId and action required" });
  }
  const { data: session, error: fetchError } = await supabase.from("webview_sessions").select("*").eq("id", sessionId).single();
  if (fetchError || !session) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (new Date(session.expires_at) < /* @__PURE__ */ new Date()) {
    return res.status(410).json({ error: "Session expired" });
  }
  let updates = {};
  let result = { success: true };
  switch (action) {
    case "add_to_cart": {
      const { productId, productName, productPrice, productImage, quantity = 1, variant, promoCode, discountPercent } = payload;
      const cart = session.cart || [];
      const existingIndex = cart.findIndex(
        (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
      );
      if (existingIndex >= 0) {
        cart[existingIndex].quantity += quantity;
      } else {
        cart.push({ productId, productName, productPrice, productImage, quantity, variant });
      }
      const cartTotal = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
      const metadata = session.metadata || {};
      if (promoCode && promoCode.trim()) {
        metadata.promoCode = promoCode.trim();
        const discountRate = (discountPercent || 10) / 100;
        metadata.discount = Math.round(cartTotal * discountRate);
        metadata.discountPercent = discountPercent || 10;
        console.log("[Webview] Promo code applied:", promoCode, "Discount:", metadata.discount, `(${discountPercent || 10}%)`);
      }
      updates = {
        cart,
        cart_total: cartTotal,
        metadata: promoCode ? metadata : session.metadata
      };
      result.cart = cart;
      result.cartTotal = cartTotal;
      result.cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      break;
    }
    case "update_cart": {
      const { productId, quantity, variant } = payload;
      const cart = session.cart || [];
      const index = cart.findIndex(
        (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
      );
      if (index >= 0) {
        if (quantity <= 0)
          cart.splice(index, 1);
        else
          cart[index].quantity = quantity;
      }
      const cartTotal = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
      updates = { cart, cart_total: cartTotal };
      result.cart = cart;
      result.cartTotal = cartTotal;
      break;
    }
    case "remove_from_cart": {
      const { productId, variant } = payload;
      let cart = session.cart || [];
      cart = cart.filter(
        (item) => !(item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant))
      );
      const cartTotal = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
      updates = { cart, cart_total: cartTotal };
      result.cart = cart;
      result.cartTotal = cartTotal;
      break;
    }
    case "upsell_accept": {
      const { productName, productPrice, productImage } = payload;
      const cart = session.cart || [];
      cart.push({
        productId: `upsell_${Date.now()}`,
        productName,
        productPrice,
        productImage,
        quantity: 1,
        isUpsell: true
        // Flag for order tracking
      });
      const cartTotal = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
      updates = { cart, cart_total: cartTotal, user_response: "accepted", completed_at: (/* @__PURE__ */ new Date()).toISOString() };
      result.response = "accepted";
      break;
    }
    case "upsell_decline":
      updates = { user_response: "declined", completed_at: (/* @__PURE__ */ new Date()).toISOString() };
      result.response = "declined";
      break;
    case "downsell_accept": {
      const { productName, productPrice, productImage, cartAction } = payload;
      let cart = cartAction === "replace" ? [] : session.cart || [];
      cart.push({
        productId: `downsell_${Date.now()}`,
        productName,
        productPrice,
        productImage,
        quantity: 1,
        isDownsell: true
        // Flag for order tracking
      });
      const cartTotal = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
      updates = { cart, cart_total: cartTotal, user_response: "accepted", completed_at: (/* @__PURE__ */ new Date()).toISOString() };
      result.response = "accepted";
      break;
    }
    case "downsell_decline":
      updates = { user_response: "declined", completed_at: (/* @__PURE__ */ new Date()).toISOString() };
      result.response = "declined";
      break;
    case "submit_form": {
      const formData = payload;
      updates = { form_data: formData, user_response: "completed", completed_at: (/* @__PURE__ */ new Date()).toISOString() };
      await saveToSubscriber(session, formData);
      await syncToGoogleSheets(session, formData);
      result.formData = formData;
      break;
    }
    case "apply_coupon": {
      const { couponCode } = payload;
      const metadata = session.metadata || {};
      metadata.couponCode = couponCode;
      metadata.couponApplied = true;
      updates = { metadata };
      result.couponApplied = true;
      break;
    }
    case "checkout_confirm": {
      const {
        cart,
        cartTotal,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        notes,
        addressDetails,
        paymentMethod,
        paymentMethodName,
        paymentProof,
        paymentProofFileName,
        promoCode,
        discount,
        shippingFee,
        confirmedAt
      } = payload;
      let paymentProofUrl = "";
      if (paymentProof && paymentProof.startsWith("data:image")) {
        try {
          const base64Data = paymentProof.split(",")[1];
          const mimeType = paymentProof.split(";")[0].split(":")[1];
          const extension = mimeType.split("/")[1] || "png";
          const buffer = Buffer.from(base64Data, "base64");
          const fileName = `payment-proofs/${session.workspace_id}/${Date.now()}-${sessionId.substring(0, 8)}.${extension}`;
          const bucketName = "payment-proofs";
          const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5242880
            // 5MB
          });
          if (bucketError && !bucketError.message.includes("already exists")) {
            console.log("[Webview] Bucket creation note:", bucketError.message);
          }
          const { data: uploadData, error: uploadError } = await supabase.storage.from(bucketName).upload(`${session.workspace_id}/${Date.now()}-${sessionId.substring(0, 8)}.${extension}`, buffer, {
            contentType: mimeType,
            upsert: true
          });
          if (uploadError) {
            console.error("[Webview] Payment proof upload error:", uploadError.message);
            paymentProofUrl = `[Image uploaded - ${Math.round(buffer.length / 1024)}KB]`;
          } else {
            const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
            paymentProofUrl = urlData?.publicUrl || "";
            console.log("[Webview] Payment proof uploaded:", paymentProofUrl);
          }
        } catch (uploadErr) {
          console.error("[Webview] Error uploading payment proof:", uploadErr.message);
          paymentProofUrl = "[Image upload failed]";
        }
      } else if (paymentProof) {
        paymentProofUrl = paymentProof;
      }
      const subtotal = (cart || session.cart || []).reduce((sum, item) => sum + item.productPrice * (item.quantity || 1), 0);
      const discountAmount = discount || Math.round(subtotal * 0.1);
      const orderMetadata = {
        ...session.metadata,
        notes: notes || "",
        shipping: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          address: customerAddress,
          details: addressDetails
        },
        payment: {
          method: paymentMethod,
          methodName: paymentMethodName,
          proofUrl: paymentProofUrl,
          proofFileName: paymentProofFileName || ""
        },
        promoCode: promoCode || "",
        discount: promoCode ? discountAmount : 0,
        shippingFee: shippingFee || 0,
        confirmedAt: confirmedAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      updates = {
        cart: cart || session.cart,
        cart_total: cartTotal || session.cart_total,
        customer_name: customerName,
        user_response: "checkout_confirmed",
        completed_at: confirmedAt || (/* @__PURE__ */ new Date()).toISOString(),
        form_data: {
          ...session.form_data || {},
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          address: customerAddress,
          notes,
          paymentProof: paymentProofUrl,
          paymentProofFileName: paymentProofFileName || "",
          promoCode: promoCode || "",
          discount: promoCode ? discountAmount : 0,
          ...addressDetails
        },
        metadata: orderMetadata
      };
      const orderSession = {
        ...session,
        ...updates,
        customerPhone,
        customerEmail,
        customerAddress,
        paymentMethod,
        paymentMethodName,
        shippingFee
      };
      const createdOrderId = await createOrder(orderSession);
      if (createdOrderId) {
        updates.metadata = {
          ...orderMetadata,
          orderId: createdOrderId
        };
        console.log("[Webview] Order created with ID:", createdOrderId, "- will be synced via Google Sheets node");
      }
      result.orderCreated = true;
      result.response = "confirmed";
      result.paymentProofUrl = paymentProofUrl;
      result.orderId = createdOrderId;
      break;
    }
    case "checkout_complete": {
      const orderId = await createOrder(session);
      updates = {
        user_response: "checkout_complete",
        completed_at: (/* @__PURE__ */ new Date()).toISOString(),
        metadata: {
          ...session.metadata || {},
          orderId
        }
      };
      if (orderId) {
        console.log("[Webview] Order created with ID:", orderId, "- will be synced via Google Sheets node");
      }
      result.orderCreated = true;
      result.orderId = orderId;
      break;
    }
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }
  await supabase.from("webview_sessions").update(updates).eq("id", sessionId);
  return res.status(200).json(result);
}
async function handleContinue(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { sessionId, closeReason } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId required" });
  }
  console.log("[Webview Continue] Processing session:", sessionId);
  const { data: session, error: fetchError } = await supabase.from("webview_sessions").select("*").eq("id", sessionId).single();
  if (fetchError || !session) {
    console.error("[Webview Continue] Session not found:", sessionId);
    return res.status(404).json({ error: "Session not found" });
  }
  console.log("[Webview Continue] Session data:", {
    page_type: session.page_type,
    flow_id: session.flow_id,
    current_node_id: session.current_node_id,
    cart_length: session.cart?.length || 0
  });
  let pageAccessToken = session.page_access_token;
  let pageName = session.page_name;
  let pageId = session.page_id;
  if (!pageAccessToken) {
    const { data: connection } = await supabase.from("connected_pages").select("page_access_token, page_id, name").eq("workspace_id", session.workspace_id).single();
    pageAccessToken = connection?.page_access_token;
    if (!pageId && connection?.page_id)
      pageId = connection.page_id;
    if (!pageName && connection?.name)
      pageName = connection.name;
  }
  if (!pageAccessToken) {
    console.error("[Webview Continue] No page access token");
    return res.status(500).json({ error: "No page access token" });
  }
  await updateSubscriberFromSession(session);
  await supabase.from("webview_sessions").update({
    completed_at: (/* @__PURE__ */ new Date()).toISOString(),
    metadata: { ...session.metadata, closeReason, processedAt: (/* @__PURE__ */ new Date()).toISOString() }
  }).eq("id", sessionId);
  if (session.flow_id && session.current_node_id) {
    console.log("[Webview Continue] Continuing flow from node:", session.current_node_id);
    try {
      const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || "";
      const continueResponse = await fetch(`${baseUrl}/api/forms/continue-flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId: session.flow_id,
          nodeId: session.current_node_id,
          pageId: pageId || session.page_id || null,
          // Ensure pageId is passed
          pageName: pageName || session.page_name || null,
          // Ensure pageName is passed
          subscriberId: session.external_id,
          workspaceId: session.workspace_id,
          // Pass cart context so downstream nodes can access it
          cart: session.cart || [],
          cartTotal: session.cart_total || 0,
          formData: session.form_data || {},
          userResponse: session.user_response || "completed",
          // Pass checkout data (shipping, payment) for Google Sheets sync
          checkoutData: session.metadata?.shipping ? {
            // IMPORTANT: Pass the orderId so Google Sheets uses the same ID as the database
            orderId: session.metadata?.orderId,
            customerName: session.metadata.shipping?.name || session.customer_name,
            customerPhone: session.metadata.shipping?.phone,
            customerEmail: session.metadata.shipping?.email,
            customerAddress: session.metadata.shipping?.address,
            paymentMethod: session.metadata.payment?.method,
            paymentMethodName: session.metadata.payment?.methodName,
            paymentProof: session.metadata.payment?.proofUrl || session.form_data?.paymentProof || "",
            promoCode: session.metadata.promoCode || session.form_data?.promoCode || "",
            discount: session.metadata.discount || session.form_data?.discount || 0,
            notes: session.metadata.notes || session.form_data?.notes || "",
            shippingFee: session.metadata.shippingFee || 0
          } : { orderId: session.metadata?.orderId },
          // Pass access token for sending messages
          pageAccessToken
        })
      });
      const continueResult = await continueResponse.json();
      console.log("[Webview Continue] Flow continuation result:", continueResult);
    } catch (error) {
      console.error("[Webview Continue] Error continuing flow:", error.message);
    }
  } else {
    console.log("[Webview Continue] No flow context, sending simple message");
    let messageText = "";
    switch (session.page_type) {
      case "product":
        messageText = (session.cart?.length || 0) > 0 ? `\u2705 Added to cart! You now have ${session.cart.length} item(s).` : "\u{1F44B} No items added. Let me know if you need help!";
        break;
      case "upsell":
        messageText = session.user_response === "accepted" ? "\u{1F389} Great choice! Added to your order." : "\u{1F44D} No problem! Let's continue.";
        break;
      case "checkout":
        messageText = session.user_response === "checkout_confirmed" ? "\u{1F389} Order confirmed!" : "\u{1F6D2} Checkout closed.";
        break;
      default:
        messageText = "\u2705 Done!";
    }
    if (messageText) {
      await sendMessage(session.external_id, messageText, pageAccessToken);
    }
  }
  return res.status(200).json({ success: true, userResponse: session.user_response });
}
async function sendMessage(recipientId, text, accessToken) {
  try {
    await fetch("https://graph.facebook.com/v21.0/me/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        access_token: accessToken
      })
    });
  } catch (error) {
    console.error("[Webview] Error sending message:", error);
  }
}
async function saveToSubscriber(session, formData) {
  try {
    const { data: subscriber } = await supabase.from("subscribers").select("id, metadata").eq("external_id", session.external_id).eq("workspace_id", session.workspace_id).single();
    if (subscriber) {
      await supabase.from("subscribers").update({
        email: formData.email || void 0,
        phone: formData.phone || void 0,
        metadata: { ...subscriber.metadata || {}, ...formData, cart: session.cart, cartTotal: session.cart_total }
      }).eq("id", subscriber.id);
    }
  } catch (error) {
    console.error("[Webview] Error saving to subscriber:", error);
  }
}
async function syncToGoogleSheets(session, formData) {
  try {
    const { data: workspace } = await supabase.from("workspaces").select("google_webhook_url").eq("id", session.workspace_id).single();
    if (workspace?.google_webhook_url) {
      await fetch(workspace.google_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          external_id: session.external_id,
          ...formData,
          cart_items: JSON.stringify(session.cart),
          cart_total: session.cart_total
        })
      });
    }
  } catch (error) {
    console.error("[Webview] Error syncing to Google Sheets:", error);
  }
}
async function createOrder(session) {
  try {
    console.log("[Webview] Creating order with data:", {
      customer: session.customer_name,
      phone: session.customerPhone,
      email: session.customerEmail,
      payment: session.paymentMethod,
      items: session.cart?.length || 0,
      total: session.cart_total
    });
    let pageId = session.page_id;
    let pageName = session.page_name;
    if (!pageId && session.page_access_token) {
      const { data: page } = await supabase.from("connected_pages").select("page_id, name").eq("page_access_token", session.page_access_token).single();
      if (page) {
        pageId = page.page_id;
        pageName = page.name;
      }
    }
    if (!pageId && session.external_id) {
      const { data: sub } = await supabase.from("subscribers").select("page_id").eq("external_id", session.external_id).single();
      if (sub?.page_id) {
        pageId = sub.page_id;
      }
    }
    if (pageId && !pageName) {
      const { data: page } = await supabase.from("connected_pages").select("name").eq("page_id", pageId).single();
      if (page) {
        pageName = page.name;
      }
    }
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const orderData = {
      id: orderId,
      workspace_id: session.workspace_id,
      subscriber_id: session.external_id,
      customer_name: session.customer_name,
      customer_phone: session.customerPhone || null,
      customer_email: session.customerEmail || null,
      customer_address: session.customerAddress || null,
      items: session.cart || [],
      subtotal: (session.cart || []).reduce((sum, item) => sum + item.productPrice * (item.quantity || 1), 0),
      shipping_fee: session.shippingFee || 0,
      total: session.cart_total,
      payment_method: session.paymentMethod || "cod",
      payment_method_name: session.paymentMethodName || "Cash on Delivery",
      status: "pending",
      source: "webview_checkout",
      metadata: session.metadata || {},
      page_id: pageId || null,
      page_name: pageName || null
    };
    const { data, error } = await supabase.from("orders").insert(orderData).select("id").single();
    if (error) {
      console.error("[Webview] Error creating order:", error.message);
      return null;
    }
    console.log("[Webview] \u2713 Order created:", data?.id);
    return orderId;
  } catch (error) {
    console.error("[Webview] Error creating order:", error.message);
    return null;
  }
}
async function updateSubscriberFromSession(session) {
  try {
    const { data: subscriber } = await supabase.from("subscribers").select("id, metadata").eq("external_id", session.external_id).eq("workspace_id", session.workspace_id).single();
    if (subscriber) {
      const updates = {
        metadata: {
          ...subscriber.metadata || {},
          cart: session.cart,
          cartTotal: session.cart_total,
          formData: session.form_data,
          lastWebviewSession: session.id,
          lastWebviewType: session.page_type,
          lastWebviewResponse: session.user_response
        }
      };
      if (session.page_type === "upsell")
        updates.metadata.upsell_response = session.user_response;
      if (session.page_type === "downsell")
        updates.metadata.downsell_response = session.user_response;
      await supabase.from("subscribers").update(updates).eq("id", subscriber.id);
    }
  } catch (error) {
    console.error("[Webview] Error updating subscriber:", error);
  }
}
