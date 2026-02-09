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

// api/forms/continue-flow.ts
var continue_flow_exports = {};
__export(continue_flow_exports, {
  default: () => handler
});
module.exports = __toCommonJS(continue_flow_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const {
      flowId,
      nodeId,
      // The form node ID
      pageId,
      // The Facebook page ID
      subscriberId,
      subscriberName,
      formSubmitted,
      submissionData,
      submissionId
      // The actual submission ID from database
    } = req.body;
    console.log("[Continue Flow] Starting flow continuation...");
    console.log("[Continue Flow] Flow ID:", flowId);
    console.log("[Continue Flow] Form Node ID:", nodeId);
    console.log("[Continue Flow] Page ID:", pageId);
    console.log("[Continue Flow] Subscriber:", subscriberId, subscriberName);
    console.log("[Continue Flow] Submission ID received:", submissionId);
    if (!flowId || !nodeId) {
      console.log("[Continue Flow] Missing flowId or nodeId");
      return res.status(400).json({ error: "Missing flowId or nodeId" });
    }
    const { data: flow, error: flowError } = await supabase.from("flows").select("*").eq("id", flowId).single();
    if (flowError || !flow) {
      console.error("[Continue Flow] Flow not found:", flowError);
      return res.status(404).json({ error: "Flow not found" });
    }
    console.log("[Continue Flow] Flow found:", flow.name);
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    const configurations = flow.configurations || {};
    const formNode = nodes.find((n) => n.id === nodeId);
    if (!formNode) {
      console.error("[Continue Flow] Form node not found in flow");
      return res.status(404).json({ error: "Form node not found" });
    }
    console.log("[Continue Flow] Form node found:", formNode.data?.label);
    let pageAccessToken = req.body.pageAccessToken || "";
    let pageName = req.body.pageName || "";
    let workspaceId = req.body.workspaceId || "";
    let passedCart = req.body.cart || [];
    let passedCartTotal = req.body.cartTotal || 0;
    let passedCheckoutData = req.body.checkoutData || {};
    if (!pageAccessToken && pageId) {
      console.log("[Continue Flow] Looking up page with page_id:", pageId);
      let { data: page, error: pageError } = await supabase.from("connected_pages").select("*, workspaces!inner(id)").eq("page_id", pageId).single();
      if (!page) {
        console.log("[Continue Flow] Page not found by page_id, checking available pages...");
        const { data: allPages } = await supabase.from("connected_pages").select("id, page_id, name").limit(5);
        console.log("[Continue Flow] Available pages:", allPages);
      }
      if (page) {
        pageAccessToken = page.page_access_token;
        pageName = page.name;
        workspaceId = page.workspaces.id;
        console.log("[Continue Flow] Page found:", pageName);
      }
    }
    if (!pageAccessToken && workspaceId) {
      console.log("[Continue Flow] Looking up page by workspaceId:", workspaceId);
      const { data: page } = await supabase.from("connected_pages").select("page_access_token, name").eq("workspace_id", workspaceId).single();
      if (page) {
        pageAccessToken = page.page_access_token;
        pageName = page.name || "Page";
        console.log("[Continue Flow] Page found by workspace:", pageName);
      }
    }
    if (!pageAccessToken) {
      console.error("[Continue Flow] No page access token found for pageId:", pageId, "workspaceId:", workspaceId);
      return res.status(400).json({ error: "No page access token", pageId, workspaceId });
    }
    let subscriberMetadata = {};
    if (workspaceId && subscriberId) {
      try {
        const { data: subscriber } = await supabase.from("subscribers").select("metadata").eq("workspace_id", workspaceId).eq("external_id", subscriberId).single();
        if (subscriber?.metadata) {
          subscriberMetadata = subscriber.metadata;
        }
      } catch (err) {
        console.log("[Continue Flow] Could not fetch subscriber metadata:", err);
      }
    }
    const userResponse = req.body.userResponse || "";
    console.log("[Continue Flow] User response from webview:", userResponse);
    const context = {
      commenterId: subscriberId,
      commenterName: subscriberName || "Customer",
      form_submitted: formSubmitted === true,
      formSubmitted: formSubmitted === true,
      submissionData,
      pageId,
      pageName,
      workspaceId,
      commentId: `flow_continuation_${Date.now()}`,
      // Use passed cart from webview, or start fresh for form submissions
      cart: passedCart.length > 0 ? passedCart : [],
      cartTotal: passedCartTotal > 0 ? passedCartTotal : 0,
      // Checkout data from webview (shipping, payment info)
      checkoutData: passedCheckoutData,
      // CRITICAL: Include upsell/downsell responses for Condition Node evaluation
      // First check the passed userResponse, then fall back to subscriber metadata
      upsell_response: subscriberMetadata.upsell_response || "",
      downsell_response: subscriberMetadata.downsell_response || "",
      // Store the current webview response too
      userResponse
    };
    console.log("[Continue Flow] Execution context:", {
      commenterId: context.commenterId,
      form_submitted: context.form_submitted,
      passedCartItems: passedCart.length,
      passedCartTotal,
      hasCheckoutData: Object.keys(passedCheckoutData).length > 0,
      upsell_response: context.upsell_response,
      downsell_response: context.downsell_response,
      userResponse,
      workspaceId: context.workspaceId || "(empty)",
      pageId: context.pageId || "(empty)",
      pageName: context.pageName || "(empty)"
    });
    if (passedCart.length > 0) {
      console.log("[Continue Flow] \u{1F6D2} Cart passed from webview:", passedCart.length, "items, \u20B1" + passedCartTotal);
      passedCart.forEach((item, i) => {
        console.log(`[Continue Flow]   [${i}] ${item.productName}: \u20B1${item.productPrice}`);
      });
    }
    if (workspaceId && subscriberId && passedCart.length === 0 && formSubmitted) {
      console.log("[Continue Flow] \u{1F6D2} Initializing cart with main product from form...");
      try {
        const cartSessionId = `form_session_${Date.now()}`;
        const mainProductName = submissionData?.product_name || "";
        const mainProductPrice = parseFloat(submissionData?.product_price) || 0;
        const mainProductQuantity = parseInt(submissionData?.quantity) || 1;
        const mainProductTotal = parseFloat(submissionData?.total) || mainProductPrice * mainProductQuantity;
        let mainProductImage = submissionData?.product_image || submissionData?.header_image_url || "";
        if (!mainProductImage && configurations[nodeId]?.formId) {
          try {
            const { data: formData } = await supabase.from("forms").select("header_image_url").eq("id", configurations[nodeId].formId).single();
            if (formData?.header_image_url) {
              mainProductImage = formData.header_image_url;
              console.log("[Continue Flow] \u{1F4F8} Fetched product image from form:", mainProductImage);
            }
          } catch (imgError) {
            console.log("[Continue Flow] \u26A0\uFE0F Could not fetch form image:", imgError);
          }
        }
        console.log("[Continue Flow] \u{1F4E6} Main product from form:", {
          name: mainProductName,
          price: mainProductPrice,
          quantity: mainProductQuantity,
          total: mainProductTotal,
          image: mainProductImage ? "yes" : "no"
        });
        submissionData.order_status = "Order Placed";
        let initialCart = [];
        let initialCartTotal = 0;
        if (mainProductName && mainProductPrice > 0) {
          initialCart = [{
            nodeId,
            // Form node ID
            productId: `form_${nodeId}`,
            productName: mainProductName,
            productPrice: mainProductPrice,
            productImage: mainProductImage,
            // Use fetched product image
            quantity: mainProductQuantity,
            isMainProduct: true
            // Mark as main product from form
          }];
          initialCartTotal = mainProductTotal;
          console.log("[Continue Flow] \u2713 Cart initialized with main product:", mainProductName, mainProductImage ? "(with image)" : "(no image)");
        } else {
          console.log("[Continue Flow] \u26A0\uFE0F No product info in form, starting with empty cart");
        }
        context.cart = initialCart;
        context.cartTotal = initialCartTotal;
        const { data: existingSubscriber } = await supabase.from("subscribers").select("metadata").eq("workspace_id", workspaceId).eq("external_id", subscriberId).single();
        const customerPhone = submissionData?._customer_phone || submissionData?.phone || submissionData?.phone_number || submissionData?.mobile || submissionData?.mobile_number || submissionData?.contact || submissionData?.contact_number || submissionData?.cellphone || existingSubscriber?.metadata?.phone || "";
        const customerEmail = submissionData?.email || submissionData?.email_address || submissionData?.e_mail || existingSubscriber?.metadata?.email || "";
        const customerAddress = submissionData?.address || submissionData?.full_address || submissionData?.complete_address || submissionData?.shipping_address || submissionData?.delivery_address || submissionData?.home_address || submissionData?.location || existingSubscriber?.metadata?.address || "";
        console.log("[Continue Flow] \u{1F4DE} Customer info from form:", {
          phone: customerPhone || "not found",
          email: customerEmail || "not found",
          address: customerAddress || "not found",
          // Show available fields for debugging
          availableFields: Object.keys(submissionData || {}).filter(
            (k) => !["subscriber_id", "subscriber_name", "product_name", "product_price", "quantity", "total", "submitted_at", "order_status", "currency", "payment_method"].includes(k)
          ).join(", ")
        });
        await supabase.from("subscribers").update({
          metadata: {
            // Save customer info from form submission
            email: customerEmail,
            phone: customerPhone,
            address: customerAddress,
            // Initialize cart with main product (not empty!)
            cart: initialCart,
            cartTotal: initialCartTotal,
            cartSessionId,
            cartUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            // Clear stale data from previous transactions
            upsell_response: null,
            upsell_node_id: null,
            lastCheckoutAt: null
          }
        }).eq("workspace_id", workspaceId).eq("external_id", subscriberId);
        console.log("[Continue Flow] \u2713 Cart saved - session:", cartSessionId, "items:", initialCart.length);
      } catch (clearError) {
        console.error("[Continue Flow] Error initializing cart:", clearError);
      }
    }
    const formNodeConfig = configurations[nodeId] || {};
    const formAddLabel = formNodeConfig.submitAddLabel;
    const formRemoveLabel = formNodeConfig.submitRemoveLabel;
    if ((formAddLabel || formRemoveLabel) && workspaceId && subscriberId) {
      console.log("[Continue Flow] Applying form submit labels:", { addLabel: formAddLabel, removeLabel: formRemoveLabel });
      try {
        const { data: subscriber } = await supabase.from("subscribers").select("id, labels").eq("workspace_id", workspaceId).eq("external_id", subscriberId).single();
        if (subscriber) {
          let labels = subscriber.labels || [];
          if (formRemoveLabel) {
            labels = labels.filter((l) => l.toLowerCase() !== formRemoveLabel.toLowerCase());
          }
          if (formAddLabel && !labels.some((l) => l.toLowerCase() === formAddLabel.toLowerCase())) {
            labels.push(formAddLabel);
          }
          await supabase.from("subscribers").update({ labels }).eq("id", subscriber.id);
          console.log("[Continue Flow] \u2713 Labels updated:", labels);
        }
      } catch (labelError) {
        console.error("[Continue Flow] Error updating labels:", labelError);
      }
    }
    console.log("[Continue Flow] ALL edges in flow:", edges.map((e) => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle })));
    const formNodeEdges = edges.filter((e) => e.source === nodeId);
    console.log("[Continue Flow] Found", formNodeEdges.length, "edge(s) from form node");
    console.log("[Continue Flow] Form node edges:", formNodeEdges.map((e) => ({ target: e.target, sourceHandle: e.sourceHandle })));
    const nodesToExecute = [];
    const visited = /* @__PURE__ */ new Set();
    visited.add(nodeId);
    const queue = [];
    for (const edge of formNodeEdges) {
      const targetNode = nodes.find((n) => n.id === edge.target);
      console.log("[Continue Flow] Checking edge target:", edge.target, "-> type:", targetNode?.type);
      if (!targetNode)
        continue;
      if (targetNode.type === "sheetsNode") {
        console.log("[Continue Flow] \u{1F4CA} Found sheets node, executing Google Sheets sync...");
        const sheetsConfig = configurations[targetNode.id] || {};
        console.log("[Continue Flow] \u{1F4CA} Sheets config:", {
          webhookUrl: sheetsConfig.webhookUrl ? "SET" : "NOT SET",
          sheetName: sheetsConfig.sheetName,
          sourceType: sheetsConfig.sourceType
        });
        if (sheetsConfig.webhookUrl && context.cart && context.cart.length > 0) {
          try {
            await syncToGoogleSheets(sheetsConfig, context, subscriberName);
            console.log("[Continue Flow] \u2713 Google Sheets sync completed");
          } catch (err) {
            console.error("[Continue Flow] \u274C Google Sheets sync failed:", err.message);
          }
        } else {
          console.log("[Continue Flow] \u26A0\uFE0F Skipping sheets sync: no webhookUrl or empty cart");
        }
        const sheetsEdges = edges.filter((e) => e.source === edge.target);
        for (const sheetsEdge of sheetsEdges) {
          console.log("[Continue Flow] Adding sheets successor:", sheetsEdge.target);
          queue.push({ nodeId: sheetsEdge.target });
        }
        visited.add(edge.target);
      } else {
        console.log("[Continue Flow] Adding direct successor:", edge.target);
        queue.push({ nodeId: edge.target });
      }
    }
    console.log("[Continue Flow] Queue after building:", queue.map((q) => q.nodeId));
    console.log("[Continue Flow] Visited set:", Array.from(visited));
    console.log("[Continue Flow] Starting queue processing loop, queue length:", queue.length);
    while (queue.length > 0) {
      const current = queue.shift();
      const currentNodeId = current.nodeId;
      console.log("[Continue Flow] Processing queue item:", currentNodeId);
      if (visited.has(currentNodeId))
        continue;
      visited.add(currentNodeId);
      const node = nodes.find((n) => n.id === currentNodeId);
      if (!node)
        continue;
      const config = configurations[currentNodeId] || {};
      const configKeys = Object.keys(config);
      console.log("[Continue Flow] Processing node:", node.data?.label, "Type:", node.type, "ConfigKeys:", configKeys.length > 0 ? configKeys.slice(0, 5).join(",") + (configKeys.length > 5 ? "..." : "") : "EMPTY");
      if (node.type === "conditionNode") {
        const conditionResult = evaluateConditions(config, context);
        console.log("[Continue Flow] Condition result:", conditionResult ? "TRUE" : "FALSE");
        const allConditionEdges = edges.filter((e) => e.source === currentNodeId);
        console.log("[Continue Flow] All edges from condition node:", allConditionEdges.map((e) => ({
          target: e.target,
          sourceHandle: e.sourceHandle
        })));
        let conditionEdges = [];
        conditionEdges = allConditionEdges.filter(
          (e) => e.sourceHandle === (conditionResult ? "true" : "false")
        );
        if (conditionEdges.length === 0 && allConditionEdges.length > 0) {
          console.log("[Continue Flow] No sourceHandle found, using position-based fallback");
          const edgesWithPositions = allConditionEdges.map((edge) => {
            const targetNode = nodes.find((n) => n.id === edge.target);
            return {
              ...edge,
              targetY: targetNode?.position?.y ?? 0
            };
          }).sort((a, b) => a.targetY - b.targetY);
          console.log("[Continue Flow] Edges sorted by Y position:", edgesWithPositions.map((e) => ({ target: e.target, y: e.targetY })));
          if (conditionResult && edgesWithPositions.length >= 1) {
            conditionEdges = [edgesWithPositions[0]];
            console.log("[Continue Flow] Using first edge (TRUE path):", conditionEdges[0].target);
          } else if (!conditionResult && edgesWithPositions.length >= 2) {
            conditionEdges = [edgesWithPositions[1]];
            console.log("[Continue Flow] Using second edge (FALSE path):", conditionEdges[0].target);
          } else if (!conditionResult && edgesWithPositions.length === 1) {
            console.log("[Continue Flow] Only one edge exists, cannot follow FALSE path");
            conditionEdges = [];
          }
        }
        console.log("[Continue Flow] Following", conditionEdges.length, "edge(s) for", conditionResult ? "TRUE" : "FALSE", "path");
        for (const edge of conditionEdges) {
          if (!visited.has(edge.target)) {
            queue.push({ nodeId: edge.target });
          }
        }
        continue;
      }
      if (node.type === "textNode") {
        await sendTextMessage(
          subscriberId,
          config.textContent || "",
          config.buttons || [],
          pageAccessToken
        );
      }
      if (node.type === "actionNode" && node.data?.actionType === "message") {
        const template = config.messageTemplate || config.template || "";
        await sendTextMessage(
          subscriberId,
          template.replace(/{commenter_name}/g, subscriberName || "Friend"),
          config.buttons || [],
          pageAccessToken
        );
      }
      if (node.type === "imageNode" || node.data?.label?.toLowerCase() === "image") {
        console.log("[Continue Flow] Processing Image node");
        const imageUrl = config.imageUrl || "";
        const caption = config.caption || "";
        if (imageUrl) {
          await sendImageMessage(
            subscriberId,
            imageUrl,
            caption,
            config.delaySeconds || 0,
            pageAccessToken
          );
        } else {
          console.log("[Continue Flow] Skipping image node: No URL configured");
        }
      }
      if (node.type === "invoiceNode") {
        console.log("[Continue Flow] Processing Invoice node");
        const companyName = config.companyName || "Your Company";
        const companyLogo = config.companyLogo || "";
        const companyAddress = config.companyAddress || "";
        const accentColor = config.primaryColor || "#6366f1";
        let invoiceUrl = "";
        let finalInvoiceId = submissionId;
        if (!finalInvoiceId) {
          console.log("[Continue Flow] No submissionId passed, checking orders table...");
          try {
            const { data: order } = await supabase.from("orders").select("id").eq("subscriber_id", subscriberId).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
            if (order) {
              console.log("[Continue Flow] Found order for invoice:", order.id);
              finalInvoiceId = order.id;
            }
          } catch (err) {
            console.error("[Continue Flow] Error looking up order:", err);
          }
        }
        if (!finalInvoiceId) {
          console.log("[Continue Flow] No order found, checking form_submissions table...");
          try {
            const { data: submission } = await supabase.from("form_submissions").select("id").eq("subscriber_external_id", subscriberId).order("created_at", { ascending: false }).limit(1).maybeSingle();
            if (submission) {
              finalInvoiceId = submission.id;
              console.log("[Continue Flow] Found form submission for invoice:", finalInvoiceId);
            }
          } catch (err) {
            console.error("[Continue Flow] Error looking up submission:", err);
          }
        }
        if (finalInvoiceId && !finalInvoiceId.startsWith("ORD-") && context.cart && context.cart.length > 0) {
          console.log("[Continue Flow] Updating form submission with cart:", context.cart.length, "items");
          try {
            const { data: existingSubmission } = await supabase.from("form_submissions").select("data").eq("id", finalInvoiceId).single();
            const existingData = existingSubmission?.data || {};
            const { error: updateError } = await supabase.from("form_submissions").update({
              data: {
                ...existingData,
                cart: context.cart,
                cartTotal: context.cartTotal
              }
            }).eq("id", finalInvoiceId);
            if (updateError) {
              console.error("[Continue Flow] Error updating submission with cart:", updateError);
            } else {
              console.log("[Continue Flow] \u2713 Submission updated with current cart");
            }
          } catch (err) {
            console.error("[Continue Flow] Exception updating submission:", err);
          }
        }
        if (finalInvoiceId) {
          console.log("[Continue Flow] Using invoice ID:", finalInvoiceId, "(type:", finalInvoiceId.startsWith("ORD-") ? "order" : "submission", ")");
          const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || "";
          const params = new URLSearchParams();
          params.set("id", finalInvoiceId);
          params.set("company", companyName);
          params.set("color", accentColor);
          if (companyLogo)
            params.set("logo", companyLogo);
          if (companyAddress)
            params.set("address", companyAddress);
          invoiceUrl = `${baseUrl}/api/views/handler?type=invoice&${params.toString()}`;
          console.log("[Continue Flow] Invoice URL:", invoiceUrl);
        } else {
          console.log("[Continue Flow] No invoice ID available - neither order nor submission found");
        }
        const defaultMessage = `\u{1F9FE} Invoice from ${companyName}

Thank you for your order! Your invoice has been generated.

\u2705 Order Confirmed
\u{1F4E6} We will process your order soon.`;
        const invoiceMessage = formNodeConfig.confirmationMessage || defaultMessage;
        if (invoiceUrl) {
          await sendInvoiceButton(
            subscriberId,
            invoiceMessage,
            invoiceUrl,
            pageAccessToken
          );
        } else {
          await sendTextMessage(
            subscriberId,
            invoiceMessage,
            [],
            pageAccessToken
          );
        }
      }
      const isProductWebviewNode = node.type === "productWebviewNode" || node.data?.nodeType === "productWebviewNode" || (node.data?.label || "").toLowerCase().includes("product webview");
      if (isProductWebviewNode) {
        console.log("[Continue Flow] *** PRODUCT WEBVIEW NODE DETECTED ***");
        console.log("[Continue Flow] Node type:", node.type, "Data nodeType:", node.data?.nodeType, "Label:", node.data?.label);
        console.log("[Continue Flow] Product Webview config:", JSON.stringify({
          useWebview: config.useWebview,
          headline: config.headline,
          productName: config.productName,
          hasImage: !!config.imageUrl
        }));
        try {
          await sendProductWebviewOffer(
            subscriberId,
            config,
            node.id,
            flowId,
            pageAccessToken,
            workspaceId,
            context
          );
          console.log("[Continue Flow] \u2713 Product Webview offer function completed");
        } catch (productError) {
          console.error("[Continue Flow] \u2717 Product Webview offer FAILED:", productError.message);
          console.error("[Continue Flow] Stack:", productError.stack);
        }
        console.log("[Continue Flow] \u23F8 Stopping at Product Webview node - waiting for user response");
        continue;
      }
      const isUpsellNode = node.type === "upsellNode" || node.data?.nodeType === "upsellNode" || (node.data?.label || "").toLowerCase().includes("upsell");
      if (isUpsellNode) {
        console.log("[Continue Flow] *** UPSELL NODE DETECTED ***");
        console.log("[Continue Flow] Node type:", node.type, "Data nodeType:", node.data?.nodeType, "Label:", node.data?.label);
        console.log("[Continue Flow] Upsell config:", JSON.stringify({
          useWebview: config.useWebview,
          headline: config.headline,
          productName: config.productName,
          hasImage: !!config.imageUrl
        }));
        console.log("[Continue Flow] Context:", JSON.stringify({
          workspaceId,
          subscriberId,
          hasPageToken: !!pageAccessToken
        }));
        try {
          await sendUpsellOffer(
            subscriberId,
            config,
            node.id,
            flowId,
            pageAccessToken,
            workspaceId,
            context
          );
          console.log("[Continue Flow] \u2713 Upsell offer function completed");
        } catch (upsellError) {
          console.error("[Continue Flow] \u2717 Upsell offer FAILED:", upsellError.message);
          console.error("[Continue Flow] Stack:", upsellError.stack);
        }
        console.log("[Continue Flow] \u23F8 Stopping at Upsell node - waiting for user response");
        continue;
      }
      const isDownsellNode = node.type === "downsellNode" || node.data?.nodeType === "downsellNode" || (node.data?.label || "").toLowerCase().includes("downsell");
      if (isDownsellNode) {
        console.log("[Continue Flow] *** DOWNSELL NODE DETECTED ***");
        try {
          await sendDownsellOffer(
            subscriberId,
            config,
            node.id,
            flowId,
            pageAccessToken,
            workspaceId,
            context
          );
          console.log("[Continue Flow] \u2713 Downsell offer function completed");
        } catch (downsellError) {
          console.error("[Continue Flow] \u2717 Downsell offer FAILED:", downsellError.message);
        }
        console.log("[Continue Flow] \u23F8 Stopping at Downsell node - waiting for user response");
        continue;
      }
      if (node.type === "checkoutNode") {
        console.log("[Continue Flow] Processing Checkout node");
        await sendCheckoutOffer(
          subscriberId,
          config,
          node.id,
          flowId,
          pageAccessToken,
          workspaceId,
          context
        );
        console.log("[Continue Flow] \u23F8 Stopping at Checkout node - waiting for confirmation");
        continue;
      }
      const isSheetsNode = node.type === "sheetsNode" || node.data?.nodeType === "sheetsNode" || (node.data?.label || "").toLowerCase().includes("google") || (node.data?.label || "").toLowerCase().includes("sheets");
      if (isSheetsNode) {
        console.log("[Continue Flow] \u{1F4CA} Processing Google Sheets node");
        console.log("[Continue Flow] \u{1F4CA} Node ID:", node.id);
        console.log("[Continue Flow] \u{1F4CA} Config keys:", Object.keys(config));
        if (config.webhookUrl) {
          console.log("[Continue Flow] \u{1F4CA} Webhook URL found, executing sync...");
          console.log("[Continue Flow] \u{1F4CA} Cart items:", (context.cart || []).length);
          console.log("[Continue Flow] \u{1F4CA} Cart total:", context.cartTotal);
          try {
            await syncToGoogleSheets(config, context, subscriberName);
            console.log("[Continue Flow] \u2713 Google Sheets sync completed!");
          } catch (sheetsError) {
            console.error("[Continue Flow] \u274C Google Sheets sync error:", sheetsError.message);
          }
        } else {
          console.log("[Continue Flow] \u26A0\uFE0F No webhookUrl in sheetsNode config, skipping sync");
        }
      }
      const outgoingEdges = edges.filter((e) => e.source === currentNodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          queue.push({ nodeId: edge.target });
        }
      }
    }
    console.log("[Continue Flow] \u2713 Flow continuation complete");
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Continue Flow] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
function evaluateConditions(config, context) {
  const conditions = config.conditions || [];
  const matchType = config.matchType || "all";
  if (conditions.length === 0) {
    return true;
  }
  const results = conditions.map((cond) => {
    const variable = cond.variable;
    const operator = cond.operator;
    const expectedValue = cond.value;
    let actualValue = context[variable];
    if (variable === "form_submitted") {
      actualValue = context.form_submitted === true || context.formSubmitted === true;
    }
    if (variable === "upsell_response") {
      actualValue = context.upsell_response || context.metadata?.upsell_response || "";
      console.log(`[Condition] upsell_response resolved to: '${actualValue}'`);
    }
    if (variable === "downsell_response") {
      actualValue = context.downsell_response || context.metadata?.downsell_response || "";
      console.log(`[Condition] downsell_response resolved to: '${actualValue}'`);
    }
    console.log(`[Condition] Checking: ${variable} ${operator} ${expectedValue}, actual: ${actualValue}`);
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
  if (matchType === "all") {
    return results.every((r) => r);
  } else {
    return results.some((r) => r);
  }
}
async function sendTextMessage(userId, text, buttons, pageAccessToken) {
  if (!text || !text.trim()) {
    console.log("[Continue Flow] Skipping empty text message");
    return;
  }
  console.log("[Continue Flow] Sending message to:", userId);
  console.log("[Continue Flow] Message:", text);
  try {
    let messagePayload;
    const validButtons = (buttons || []).filter((b) => {
      if (b.type === "url" && b.title && b.url)
        return true;
      if (b.type === "startFlow" && b.title && b.flowId)
        return true;
      if (b.type === "newFlow" && b.title && b.flowName)
        return true;
      return false;
    });
    if (validButtons.length > 0) {
      const fbButtons = validButtons.map((btn) => {
        if (btn.type === "url") {
          return {
            type: "web_url",
            title: btn.title,
            url: btn.url
          };
        }
        if (btn.type === "startFlow") {
          return {
            type: "postback",
            title: btn.title,
            payload: `FLOW_${btn.flowId}`
          };
        }
        if (btn.type === "newFlow") {
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
            text,
            buttons: fbButtons
          }
        }
      };
    } else {
      messagePayload = { text };
    }
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: userId },
          message: messagePayload,
          access_token: pageAccessToken
        })
      }
    );
    const result = await response.json();
    if (result.error) {
      console.error("[Continue Flow] Message error:", result.error.message);
    } else {
      console.log("[Continue Flow] \u2713 Message sent, ID:", result.message_id);
    }
  } catch (error) {
    console.error("[Continue Flow] Send message exception:", error.message);
  }
}
async function sendInvoiceButton(userId, text, invoiceUrl, pageAccessToken) {
  console.log("[Continue Flow] Sending invoice button to:", userId);
  console.log("[Continue Flow] Invoice URL:", invoiceUrl);
  try {
    const messagePayload = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons: [
            {
              type: "web_url",
              title: "\u{1F4C4} View Invoice",
              url: invoiceUrl,
              webview_height_ratio: "full"
              // Note: messenger_extensions removed for better compatibility
            }
          ]
        }
      }
    };
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: userId },
          message: messagePayload,
          access_token: pageAccessToken
        })
      }
    );
    const result = await response.json();
    if (result.error) {
      console.error("[Continue Flow] Invoice button error:", result.error.message);
    } else {
      console.log("[Continue Flow] \u2713 Invoice button sent, ID:", result.message_id);
    }
  } catch (error) {
    console.error("[Continue Flow] Invoice button exception:", error.message);
  }
}
async function sendImageMessage(userId, imageUrl, caption, delaySeconds, pageAccessToken) {
  console.log("[Continue Flow] Sending image to:", userId);
  console.log("[Continue Flow] Image URL:", imageUrl);
  try {
    if (delaySeconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1e3));
    }
    const messagePayload = {
      recipient: { id: userId },
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
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messagePayload)
      }
    );
    const result = await response.json();
    if (result.error) {
      console.error("[Continue Flow] Image send error:", result.error.message);
    } else {
      console.log("[Continue Flow] \u2713 Image sent, ID:", result.message_id);
      if (caption) {
        await sendTextMessage(userId, caption, [], pageAccessToken);
      }
    }
  } catch (error) {
    console.error("[Continue Flow] Image exception:", error.message);
  }
}
async function sendUpsellOffer(userId, config, nodeId, flowId, pageAccessToken, workspaceId, context) {
  console.log("[Continue Flow] Sending Upsell offer to:", userId);
  const headline = config.headline || "Special Offer for You!";
  const productName = config.productName || "Premium Product";
  const price = config.price || "\u20B1999";
  const description = config.description || "Limited time offer!";
  const imageUrl = config.imageUrl || "";
  const acceptButtonText = config.acceptButtonText || "\u2705 Yes, Add to Order";
  const declineButtonText = config.declineButtonText || "\u274C No Thanks";
  const useWebview = config.useWebview ?? false;
  try {
    if (useWebview && workspaceId) {
      console.log("[Continue Flow] Creating webview session for upsell...");
      console.log("[Continue Flow] workspaceId:", workspaceId, "userId:", userId);
      const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || "";
      const { data: session, error: sessionError } = await supabase.from("webview_sessions").insert({
        workspace_id: workspaceId,
        external_id: userId,
        flow_id: flowId,
        current_node_id: nodeId,
        page_type: "upsell",
        page_config: config,
        cart: context.cart || [],
        cart_total: context.cartTotal || 0,
        page_access_token: pageAccessToken,
        page_id: context.pageId || null,
        page_name: context.pageName || null,
        metadata: {
          commenterName: context.commenterName,
          productName,
          price,
          imageUrl
        }
      }).select("id").single();
      if (sessionError || !session) {
        console.error("[Continue Flow] Failed to create webview session:", sessionError?.message);
        console.log("[Continue Flow] Falling back to postback buttons");
      } else {
        const webviewUrl = `${baseUrl}/wv/upsell/${session.id}`;
        console.log("[Continue Flow] Webview URL:", webviewUrl);
        if (imageUrl) {
          const imagePayload = {
            attachment: {
              type: "image",
              payload: {
                url: imageUrl,
                is_reusable: true
              }
            }
          };
          await sendFacebookMessage(userId, imagePayload, pageAccessToken);
          console.log("[Continue Flow] \u2713 Full-screen upsell image sent");
        }
        const messagePayload = {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: `${headline}

${productName} - ${price}
${description}`,
              buttons: [{
                type: "web_url",
                title: "\u{1F6D2} View Offer",
                url: webviewUrl,
                webview_height_ratio: "tall"
              }]
            }
          }
        };
        await sendFacebookMessage(userId, messagePayload, pageAccessToken);
        console.log("[Continue Flow] \u2713 Upsell webview offer sent");
        return;
      }
    }
    const numericPrice = parseFloat(price.replace(/[^\d.]/g, "")) || 0;
    const acceptPayload = JSON.stringify({
      action: "upsell_accept",
      flowId,
      nodeId,
      productName,
      productPrice: numericPrice,
      // Numeric price for cart calculation
      price,
      // Original formatted price for display
      productImage: imageUrl,
      imageUrl
    });
    const declinePayload = JSON.stringify({
      action: "upsell_decline",
      flowId,
      nodeId
    });
    if (imageUrl) {
      const messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{
              title: headline,
              subtitle: `${productName} - ${price}
${description}`,
              image_url: imageUrl,
              buttons: [
                {
                  type: "postback",
                  title: acceptButtonText.slice(0, 20),
                  payload: acceptPayload
                },
                {
                  type: "postback",
                  title: declineButtonText.slice(0, 20),
                  payload: declinePayload
                }
              ]
            }]
          }
        }
      };
      await sendFacebookMessage(userId, messagePayload, pageAccessToken);
    } else {
      const messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: `${headline}

${productName} - ${price}
${description}`,
            buttons: [
              {
                type: "postback",
                title: acceptButtonText.slice(0, 20),
                payload: acceptPayload
              },
              {
                type: "postback",
                title: declineButtonText.slice(0, 20),
                payload: declinePayload
              }
            ]
          }
        }
      };
      await sendFacebookMessage(userId, messagePayload, pageAccessToken);
    }
    console.log("[Continue Flow] \u2713 Upsell offer sent");
  } catch (error) {
    console.error("[Continue Flow] Upsell send exception:", error.message);
  }
}
async function sendDownsellOffer(userId, config, nodeId, flowId, pageAccessToken, workspaceId, context) {
  console.log("[Continue Flow] Sending Downsell offer to:", userId);
  const headline = config.headline || "Wait! Special Deal Just for You";
  const productName = config.productName || "Value Product";
  const price = config.price || "\u20B1499";
  const description = config.description || "Exclusive discount!";
  const imageUrl = config.imageUrl || "";
  const acceptButtonText = config.acceptButtonText || "\u2705 Yes, I'll Take It";
  const declineButtonText = config.declineButtonText || "\u274C No Thanks";
  const useWebview = config.useWebview ?? false;
  try {
    if (useWebview && workspaceId) {
      console.log("[Continue Flow] Creating webview session for downsell...");
      console.log("[Continue Flow] workspaceId:", workspaceId, "userId:", userId);
      const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || "";
      const { data: session, error: sessionError } = await supabase.from("webview_sessions").insert({
        workspace_id: workspaceId,
        external_id: userId,
        flow_id: flowId,
        current_node_id: nodeId,
        page_type: "downsell",
        page_config: config,
        cart: context.cart || [],
        cart_total: context.cartTotal || 0,
        page_access_token: pageAccessToken,
        page_id: context.pageId || null,
        page_name: context.pageName || null,
        metadata: {
          commenterName: context.commenterName,
          productName,
          price,
          imageUrl
        }
      }).select("id").single();
      if (sessionError || !session) {
        console.error("[Continue Flow] Failed to create webview session:", sessionError?.message);
      } else {
        const webviewUrl = `${baseUrl}/wv/downsell/${session.id}`;
        console.log("[Continue Flow] Webview URL:", webviewUrl);
        if (imageUrl) {
          const imagePayload = {
            attachment: {
              type: "image",
              payload: {
                url: imageUrl,
                is_reusable: true
              }
            }
          };
          await sendFacebookMessage(userId, imagePayload, pageAccessToken);
          console.log("[Continue Flow] \u2713 Full-screen downsell image sent");
        }
        const messagePayload = {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: `${headline}

${productName} - ${price}
${description}`,
              buttons: [{
                type: "web_url",
                title: "\u{1F6D2} View Offer",
                url: webviewUrl,
                webview_height_ratio: "tall"
              }]
            }
          }
        };
        await sendFacebookMessage(userId, messagePayload, pageAccessToken);
        console.log("[Continue Flow] \u2713 Downsell webview offer sent");
        return;
      }
    }
    const numericPrice = parseFloat(price.replace(/[^\d.]/g, "")) || 0;
    const acceptPayload = JSON.stringify({
      action: "downsell_accept",
      flowId,
      nodeId,
      productName,
      productPrice: numericPrice,
      // Numeric price for cart calculation
      price,
      // Original formatted price for display
      productImage: imageUrl,
      imageUrl
    });
    const declinePayload = JSON.stringify({
      action: "downsell_decline",
      flowId,
      nodeId
    });
    if (imageUrl) {
      const messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{
              title: headline,
              subtitle: `${productName} - ${price}
${description}`,
              image_url: imageUrl,
              buttons: [
                {
                  type: "postback",
                  title: acceptButtonText.slice(0, 20),
                  payload: acceptPayload
                },
                {
                  type: "postback",
                  title: declineButtonText.slice(0, 20),
                  payload: declinePayload
                }
              ]
            }]
          }
        }
      };
      await sendFacebookMessage(userId, messagePayload, pageAccessToken);
    } else {
      const messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: `${headline}

${productName} - ${price}
${description}`,
            buttons: [
              {
                type: "postback",
                title: acceptButtonText.slice(0, 20),
                payload: acceptPayload
              },
              {
                type: "postback",
                title: declineButtonText.slice(0, 20),
                payload: declinePayload
              }
            ]
          }
        }
      };
      await sendFacebookMessage(userId, messagePayload, pageAccessToken);
    }
    console.log("[Continue Flow] \u2713 Downsell offer sent");
  } catch (error) {
    console.error("[Continue Flow] Downsell send exception:", error.message);
  }
}
async function sendProductWebviewOffer(userId, config, nodeId, flowId, pageAccessToken, workspaceId, context) {
  console.log("[Continue Flow] Sending Product Webview offer to:", userId);
  console.log("[Continue Flow] \u2192 Config received (keys):", Object.keys(config || {}));
  console.log("[Continue Flow] \u2192 useWebview value:", config.useWebview, "type:", typeof config.useWebview);
  console.log("[Continue Flow] \u2192 workspaceId:", workspaceId);
  console.log("[Continue Flow] \u2192 config.headline:", config.headline);
  console.log("[Continue Flow] \u2192 config.productName:", config.productName);
  console.log("[Continue Flow] \u2192 config.imageUrl:", config.imageUrl ? "present" : "missing");
  const headline = config.headline || "Check Out This Product!";
  const productName = config.productName || "Featured Product";
  const price = config.price || "\u20B1999";
  const description = config.description || "Limited time offer!";
  const imageUrl = config.imageUrl || "";
  const acceptButtonText = config.acceptButtonText || "\u2705 Add to Cart";
  const declineButtonText = config.declineButtonText || "\u274C No Thanks";
  const useWebview = config.useWebview ?? true;
  console.log("[Continue Flow] \u2192 Final useWebview (after default):", useWebview);
  console.log("[Continue Flow] \u2192 Webview condition check: useWebview=" + useWebview + ", workspaceId=" + (workspaceId ? "present" : "MISSING"));
  try {
    if (useWebview && workspaceId) {
      console.log("[Continue Flow] Creating webview session for product...");
      console.log("[Continue Flow] workspaceId:", workspaceId, "userId:", userId);
      const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || "";
      const { data: session, error: sessionError } = await supabase.from("webview_sessions").insert({
        workspace_id: workspaceId,
        external_id: userId,
        flow_id: flowId,
        current_node_id: nodeId,
        page_type: "product",
        // Different from 'upsell'
        page_config: config,
        cart: context.cart || [],
        cart_total: context.cartTotal || 0,
        page_access_token: pageAccessToken,
        page_id: context.pageId || null,
        page_name: context.pageName || null,
        metadata: {
          commenterName: context.commenterName,
          productName,
          price,
          imageUrl
        }
      }).select("id").single();
      if (sessionError || !session) {
        console.error("[Continue Flow] Failed to create webview session:", sessionError?.message);
        console.log("[Continue Flow] Falling back to postback buttons");
      } else {
        const webviewUrl = `${baseUrl}/wv/product/${session.id}`;
        console.log("[Continue Flow] Product Webview URL:", webviewUrl);
        const messagePayload = {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
                title: headline,
                subtitle: `${productName} - ${price}
${description}`,
                image_url: imageUrl || void 0,
                buttons: [{
                  type: "web_url",
                  title: "\u{1F6D2} View Product",
                  url: webviewUrl,
                  webview_height_ratio: "tall"
                  // Note: messenger_extensions removed for SaaS compatibility (no domain whitelisting needed)
                }]
              }]
            }
          }
        };
        await sendFacebookMessage(userId, messagePayload, pageAccessToken);
        console.log("[Continue Flow] \u2713 Product Webview offer sent");
        return;
      }
    }
    const numericPrice = parseFloat(price.replace(/[^\\d.]/g, "")) || 0;
    const acceptPayload = JSON.stringify({
      action: "product_accept",
      flowId,
      nodeId,
      productName,
      productPrice: numericPrice,
      price,
      productImage: imageUrl,
      imageUrl
    });
    const declinePayload = JSON.stringify({
      action: "product_decline",
      flowId,
      nodeId
    });
    if (imageUrl) {
      const messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{
              title: headline,
              subtitle: `${productName} - ${price}
${description}`,
              image_url: imageUrl,
              buttons: [
                {
                  type: "postback",
                  title: acceptButtonText.slice(0, 20),
                  payload: acceptPayload
                },
                {
                  type: "postback",
                  title: declineButtonText.slice(0, 20),
                  payload: declinePayload
                }
              ]
            }]
          }
        }
      };
      await sendFacebookMessage(userId, messagePayload, pageAccessToken);
    } else {
      const messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: `${headline}

${productName} - ${price}
${description}`,
            buttons: [
              {
                type: "postback",
                title: acceptButtonText.slice(0, 20),
                payload: acceptPayload
              },
              {
                type: "postback",
                title: declineButtonText.slice(0, 20),
                payload: declinePayload
              }
            ]
          }
        }
      };
      await sendFacebookMessage(userId, messagePayload, pageAccessToken);
    }
    console.log("[Continue Flow] \u2713 Product offer sent with postback buttons");
  } catch (error) {
    console.error("[Continue Flow] Product Webview send exception:", error.message);
  }
}
async function sendCheckoutOffer(userId, config, nodeId, flowId, pageAccessToken, workspaceId, context) {
  console.log("[Continue Flow] Sending Checkout webview to:", userId);
  console.log("[Continue Flow] \u2192 Context cart items:", context.cart?.length || 0);
  console.log("[Continue Flow] \u2192 Context cart total:", context.cartTotal || 0);
  console.log("[Continue Flow] \u2192 workspaceId:", workspaceId);
  const headerText = config.headerText || "\u{1F6D2} Your Order Summary";
  const buttonText = config.buttonText || "\u2705 View Order";
  const companyName = config.companyName || "";
  let cart = context.cart || context.metadata?.cart || [];
  let cartTotal = context.cartTotal || context.metadata?.cartTotal || 0;
  let customerName = context.commenterName || context.customerName || "Valued Customer";
  if (cart.length === 0 && workspaceId && userId) {
    console.log("[Continue Flow] Cart empty in context, fetching from subscriber metadata...");
    try {
      const { data: subscriber } = await supabase.from("subscribers").select("metadata, name").eq("external_id", userId).eq("workspace_id", workspaceId).single();
      if (subscriber?.metadata) {
        cart = subscriber.metadata.cart || [];
        cartTotal = subscriber.metadata.cartTotal || 0;
        customerName = subscriber.name || subscriber.metadata.name || customerName;
        console.log("[Continue Flow] \u2713 Loaded cart from subscriber:", cart.length, "items, \u20B1" + cartTotal);
        cart.forEach((item, i) => {
          console.log(`[Continue Flow]   [${i}] ${item.productName}: \u20B1${item.productPrice}`);
        });
      } else {
        console.log("[Continue Flow] \u26A0\uFE0F No cart in subscriber metadata");
      }
    } catch (subError) {
      console.error("[Continue Flow] Error fetching subscriber cart:", subError.message);
    }
  }
  try {
    if (workspaceId) {
      console.log("[Continue Flow] Creating webview session for checkout...");
      console.log("[Continue Flow] \u2192 Final cart:", cart.length, "items");
      console.log("[Continue Flow] \u2192 Final total:", cartTotal);
      const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || "";
      const { data: session, error: sessionError } = await supabase.from("webview_sessions").insert({
        workspace_id: workspaceId,
        external_id: userId,
        flow_id: flowId,
        current_node_id: nodeId,
        page_type: "checkout",
        page_config: config,
        cart,
        cart_total: cartTotal,
        page_access_token: pageAccessToken,
        customer_name: customerName,
        page_id: context.pageId || null,
        page_name: context.pageName || null,
        metadata: {
          commenterName: context.commenterName,
          customerName,
          formData: context.formData || {},
          shippingFee: config.shippingFee || 0,
          showShipping: config.showShipping ?? true
        }
      }).select("id").single();
      if (sessionError || !session) {
        console.error("[Continue Flow] Failed to create checkout session:", sessionError?.message);
      } else {
        const webviewUrl = `${baseUrl}/wv/checkout/${session.id}`;
        console.log("[Continue Flow] Checkout Webview URL:", webviewUrl);
        let summaryText2 = "";
        if (cart.length > 0) {
          const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
          summaryText2 = `${itemCount} item${itemCount > 1 ? "s" : ""} \u2022 \u20B1${cartTotal.toLocaleString()}`;
          if (config.showShipping && config.shippingFee > 0) {
            summaryText2 += ` + \u20B1${config.shippingFee} shipping`;
          }
        } else {
          summaryText2 = "Review your order details";
        }
        const messagePayload2 = {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
                title: headerText,
                subtitle: summaryText2 + (companyName ? `
${companyName}` : ""),
                buttons: [{
                  type: "web_url",
                  title: buttonText.slice(0, 20),
                  url: webviewUrl,
                  webview_height_ratio: "full"
                  // Note: NO messenger_extensions - for SaaS compatibility
                }]
              }]
            }
          }
        };
        await sendFacebookMessage(userId, messagePayload2, pageAccessToken);
        console.log("[Continue Flow] \u2713 Checkout webview sent");
        return;
      }
    }
    console.log("[Continue Flow] Falling back to simple checkout message");
    let summaryText = headerText;
    if (cart.length > 0) {
      summaryText += "\n\n";
      cart.forEach((item) => {
        summaryText += `\u2022 ${item.productName || item.name} - \u20B1${item.productPrice || item.price}
`;
      });
      summaryText += `
Total: \u20B1${cartTotal}`;
    }
    const confirmPayload = JSON.stringify({
      action: "checkout_confirm",
      flowId,
      nodeId
    });
    const messagePayload = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: summaryText,
          buttons: [
            {
              type: "postback",
              title: buttonText.slice(0, 20),
              payload: confirmPayload
            }
          ]
        }
      }
    };
    await sendFacebookMessage(userId, messagePayload, pageAccessToken);
    console.log("[Continue Flow] \u2713 Checkout fallback message sent");
  } catch (error) {
    console.error("[Continue Flow] Checkout send exception:", error.message);
  }
}
async function sendFacebookMessage(userId, messagePayload, pageAccessToken) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: userId },
        message: messagePayload,
        access_token: pageAccessToken
      })
    }
  );
  const result = await response.json();
  if (result.error) {
    console.error("[Continue Flow] Facebook API error:", result.error.message);
    throw new Error(result.error.message);
  }
  console.log("[Continue Flow] \u2713 Message sent, ID:", result.message_id);
}
async function syncToGoogleSheets(config, context, customerName) {
  const webhookUrl = config.webhookUrl;
  const sheetName = config.sheetName || "Orders";
  const includeMainProduct = config.includeMainProduct ?? true;
  const includeUpsells = config.includeUpsells ?? true;
  const includeDownsells = config.includeDownsells ?? true;
  const includeCustomerInfo = config.includeCustomerInfo ?? true;
  const includeTimestamp = config.includeTimestamp ?? true;
  const cart = context.cart || [];
  const cartTotal = context.cartTotal || 0;
  const checkoutData = context.checkoutData || {};
  console.log("[syncToGoogleSheets] Starting sync...");
  console.log("[syncToGoogleSheets] Cart items:", cart.length);
  console.log("[syncToGoogleSheets] Checkout data:", Object.keys(checkoutData).length > 0 ? "present" : "empty");
  console.log("[syncToGoogleSheets] \u{1F50D} Page ID (from context):", context.pageId || "(empty)");
  console.log("[syncToGoogleSheets] \u{1F50D} Page Name (from context):", context.pageName || "(empty)");
  let pageId = context.pageId || "";
  let pageName = context.pageName || "";
  if ((!pageId || !pageName) && context.workspaceId) {
    console.log("[syncToGoogleSheets] \u{1F504} Fetching page info from database...");
    console.log("[syncToGoogleSheets] Looking up subscriber:", context.commenterId);
    try {
      const { data: subscriber, error: subError } = await supabase.from("subscribers").select("page_id").eq("external_id", context.commenterId).eq("workspace_id", context.workspaceId).maybeSingle();
      console.log("[syncToGoogleSheets] Subscriber lookup:", {
        found: !!subscriber,
        page_id: subscriber?.page_id || "null",
        error: subError?.message || "none"
      });
      if (subscriber?.page_id) {
        const { data: connectedPage } = await supabase.from("connected_pages").select("page_id, name").eq("id", subscriber.page_id).maybeSingle();
        console.log("[syncToGoogleSheets] Connected page lookup:", {
          found: !!connectedPage,
          facebook_page_id: connectedPage?.page_id || "null",
          name: connectedPage?.name || "null"
        });
        if (connectedPage) {
          if (!pageId && connectedPage.page_id) {
            pageId = connectedPage.page_id;
            console.log("[syncToGoogleSheets] \u2713 Page ID (Facebook):", pageId);
          }
          if (!pageName && connectedPage.name) {
            pageName = connectedPage.name;
            console.log("[syncToGoogleSheets] \u2713 Page Name:", pageName);
          }
        }
      } else {
        console.log("[syncToGoogleSheets] \u26A0\uFE0F No subscriber/page_id found, cannot determine page");
      }
    } catch (dbError) {
      console.error("[syncToGoogleSheets] \u26A0\uFE0F DB error:", dbError.message);
    }
  }
  const allProducts = [];
  const allQuantities = [];
  const allPrices = [];
  cart.forEach((item) => {
    const productName = item.productName || "Unknown Product";
    const quantity = item.quantity || 1;
    const price = item.productPrice || 0;
    if (item.isMainProduct && includeMainProduct) {
      allProducts.push(`[Main] ${productName}`);
      allQuantities.push(String(quantity));
      allPrices.push(`\u20B1${price}`);
    } else if (item.isUpsell && includeUpsells) {
      allProducts.push(`[Upsell] ${productName}`);
      allQuantities.push(String(quantity));
      allPrices.push(`\u20B1${price}`);
    } else if (item.isDownsell && includeDownsells) {
      allProducts.push(`[Downsell] ${productName}`);
      allQuantities.push(String(quantity));
      allPrices.push(`\u20B1${price}`);
    } else if (!item.isMainProduct && !item.isUpsell && !item.isDownsell) {
      allProducts.push(productName);
      allQuantities.push(String(quantity));
      allPrices.push(`\u20B1${price}`);
    }
  });
  const allColors = [];
  const allSizes = [];
  const allPromoCodes = [];
  cart.forEach((item) => {
    if (item.variant?.color && !allColors.includes(item.variant.color)) {
      allColors.push(item.variant.color);
    }
    if (item.variant?.size && !allSizes.includes(item.variant.size)) {
      allSizes.push(item.variant.size);
    }
    if (item.promoCode && !allPromoCodes.includes(item.promoCode)) {
      allPromoCodes.push(item.promoCode);
    }
  });
  const orderId = checkoutData.orderId || `ORD-${Date.now().toString(36).toUpperCase()}`;
  console.log("[syncToGoogleSheets] Using Order ID:", orderId, checkoutData.orderId ? "(from checkout)" : "(generated)");
  const webhookPayload = {
    // Core identifiers
    row_id: orderId,
    "Order ID": orderId,
    // Customer info
    "Customer Name": checkoutData.customerName || customerName || "Customer",
    "Customer ID": context.commenterId,
    "Customer Phone": checkoutData.customerPhone || "",
    "Customer Email": checkoutData.customerEmail || "",
    "Customer Address": checkoutData.customerAddress || "",
    // Products
    "Products": allProducts.join(", "),
    "Quantities": allQuantities.join(", "),
    "Prices": allPrices.join(", "),
    "Item Count": cart.length,
    // Variants
    "Colors": allColors.join(", ") || "",
    "Sizes": allSizes.join(", ") || "",
    // Promo & Discount
    "Promo Code": checkoutData.promoCode || allPromoCodes.join(", ") || "",
    "Discount": checkoutData.discount || 0,
    // Totals
    "Subtotal": cartTotal,
    "Shipping Fee": checkoutData.shippingFee || 0,
    "Total": cartTotal - (checkoutData.discount || 0) + (checkoutData.shippingFee || 0),
    // Payment
    "Payment Method": checkoutData.paymentMethodName || checkoutData.paymentMethod || "COD",
    "Payment Proof": checkoutData.paymentProof || "",
    // Notes
    "Notes": checkoutData.notes || "",
    // Status - IMPORTANT: This is required for status updates in Google Sheets
    // Using 'Order Placed' to match Invoice/Tracking display labels
    "Status": "Order Placed",
    // Attributes - using pageId/pageName fetched from DB if not in context
    "Page ID": pageId || "",
    "Page Name": pageName || "",
    // Timestamp
    "Timestamp": (/* @__PURE__ */ new Date()).toISOString(),
    "Date": (/* @__PURE__ */ new Date()).toLocaleDateString("en-PH"),
    "Time": (/* @__PURE__ */ new Date()).toLocaleTimeString("en-PH")
  };
  console.log("[syncToGoogleSheets] \u{1F4E4} Sending to webhook:", webhookUrl.substring(0, 50) + "...");
  console.log("[syncToGoogleSheets] \u{1F4CB} Payload:", JSON.stringify(webhookPayload, null, 2));
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sheetName,
      rowData: webhookPayload
    })
  });
  const responseText = await response.text();
  console.log("[syncToGoogleSheets] \u2713 Response:", response.status, responseText.substring(0, 100));
}
