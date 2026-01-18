import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Continue Flow API
 * 
 * This endpoint continues executing a flow after a form has been submitted.
 * It picks up execution from nodes connected after the form node.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            flowId,
            nodeId,      // The form node ID
            pageId,      // The Facebook page ID
            subscriberId,
            subscriberName,
            formSubmitted,
            submissionData,
            submissionId  // The actual submission ID from database
        } = req.body;

        console.log('[Continue Flow] Starting flow continuation...');
        console.log('[Continue Flow] Flow ID:', flowId);
        console.log('[Continue Flow] Form Node ID:', nodeId);
        console.log('[Continue Flow] Page ID:', pageId);
        console.log('[Continue Flow] Subscriber:', subscriberId, subscriberName);
        console.log('[Continue Flow] Submission ID received:', submissionId);

        if (!flowId || !nodeId) {
            console.log('[Continue Flow] Missing flowId or nodeId');
            return res.status(400).json({ error: 'Missing flowId or nodeId' });
        }

        // Get the flow from database
        const { data: flow, error: flowError } = await supabase
            .from('flows')
            .select('*')
            .eq('id', flowId)
            .single();

        if (flowError || !flow) {
            console.error('[Continue Flow] Flow not found:', flowError);
            return res.status(404).json({ error: 'Flow not found' });
        }

        console.log('[Continue Flow] Flow found:', flow.name);

        const nodes = flow.nodes || [];
        const edges = flow.edges || [];
        const configurations = flow.configurations || {};

        // Find the form node
        const formNode = nodes.find((n: any) => n.id === nodeId);
        if (!formNode) {
            console.error('[Continue Flow] Form node not found in flow');
            return res.status(404).json({ error: 'Form node not found' });
        }

        console.log('[Continue Flow] Form node found:', formNode.data?.label);

        // Get page access token for sending messages
        // Can be passed directly (from webview) or looked up via pageId
        let pageAccessToken = req.body.pageAccessToken || '';
        let pageName = req.body.pageName || '';
        let workspaceId = req.body.workspaceId || '';

        // Also accept cart context from webview sessions
        let passedCart = req.body.cart || [];
        let passedCartTotal = req.body.cartTotal || 0;
        let passedCheckoutData = req.body.checkoutData || {};

        if (!pageAccessToken && pageId) {
            console.log('[Continue Flow] Looking up page with page_id:', pageId);

            // Try to find by Facebook page_id first
            let { data: page, error: pageError } = await supabase
                .from('connected_pages')
                .select('*, workspaces!inner(id)')
                .eq('page_id', pageId)
                .single();

            // If not found, also log what pages exist for debugging
            if (!page) {
                console.log('[Continue Flow] Page not found by page_id, checking available pages...');
                const { data: allPages } = await supabase
                    .from('connected_pages')
                    .select('id, page_id, name')
                    .limit(5);
                console.log('[Continue Flow] Available pages:', allPages);
            }

            if (page) {
                pageAccessToken = (page as any).page_access_token;
                pageName = (page as any).name;
                workspaceId = (page as any).workspaces.id;
                console.log('[Continue Flow] Page found:', pageName);
            }
        }

        // If still no access token but we have workspaceId, try to get it from workspace's connected page
        if (!pageAccessToken && workspaceId) {
            console.log('[Continue Flow] Looking up page by workspaceId:', workspaceId);
            const { data: page } = await supabase
                .from('connected_pages')
                .select('page_access_token, name')
                .eq('workspace_id', workspaceId)
                .single();
            if (page) {
                pageAccessToken = (page as any).page_access_token;
                pageName = (page as any).name || 'Page';
                console.log('[Continue Flow] Page found by workspace:', pageName);
            }
        }

        if (!pageAccessToken) {
            console.error('[Continue Flow] No page access token found for pageId:', pageId, 'workspaceId:', workspaceId);
            return res.status(400).json({ error: 'No page access token', pageId, workspaceId });
        }

        // Get subscriber metadata to fetch stored upsell/downsell responses
        let subscriberMetadata: any = {};
        if (workspaceId && subscriberId) {
            try {
                const { data: subscriber } = await supabase
                    .from('subscribers')
                    .select('metadata')
                    .eq('workspace_id', workspaceId)
                    .eq('external_id', subscriberId)
                    .single();
                if (subscriber?.metadata) {
                    subscriberMetadata = subscriber.metadata;
                }
            } catch (err) {
                console.log('[Continue Flow] Could not fetch subscriber metadata:', err);
            }
        }

        // Get userResponse from webview (passed when upsell/downsell completes)
        const userResponse = req.body.userResponse || '';
        console.log('[Continue Flow] User response from webview:', userResponse);

        // Create context for flow execution
        const context: any = {
            commenterId: subscriberId,
            commenterName: subscriberName || 'Customer',
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
            upsell_response: subscriberMetadata.upsell_response || '',
            downsell_response: subscriberMetadata.downsell_response || '',
            // Store the current webview response too
            userResponse: userResponse
        };

        console.log('[Continue Flow] Execution context:', {
            commenterId: context.commenterId,
            form_submitted: context.form_submitted,
            passedCartItems: passedCart.length,
            passedCartTotal: passedCartTotal,
            hasCheckoutData: Object.keys(passedCheckoutData).length > 0,
            upsell_response: context.upsell_response,
            downsell_response: context.downsell_response,
            userResponse: userResponse
        });

        // Log if cart was passed from webview
        if (passedCart.length > 0) {
            console.log('[Continue Flow] 🛒 Cart passed from webview:', passedCart.length, 'items, ₱' + passedCartTotal);
            passedCart.forEach((item: any, i: number) => {
                console.log(`[Continue Flow]   [${i}] ${item.productName}: ₱${item.productPrice}`);
            });
        }

        // CRITICAL FIX: Only initialize cart from form submission if:
        // 1. No cart was passed from webview (passedCart is empty)
        // 2. This is a form submission (formSubmitted is true)
        // If cart was passed from webview (e.g., from upsell), DON'T overwrite it!
        if (workspaceId && subscriberId && passedCart.length === 0 && formSubmitted) {
            console.log('[Continue Flow] 🛒 Initializing cart with main product from form...');
            try {
                const cartSessionId = `form_session_${Date.now()}`;

                // Extract main product from form submission data
                const mainProductName = submissionData?.product_name || '';
                const mainProductPrice = parseFloat(submissionData?.product_price) || 0;
                const mainProductQuantity = parseInt(submissionData?.quantity) || 1;
                const mainProductTotal = parseFloat(submissionData?.total) || mainProductPrice * mainProductQuantity;

                // Try to get product image from submission data first
                let mainProductImage = submissionData?.product_image || submissionData?.header_image_url || '';

                // If no image in submission, fetch from form configuration in database
                if (!mainProductImage && configurations[nodeId]?.formId) {
                    try {
                        const { data: formData } = await supabase
                            .from('forms')
                            .select('header_image_url')
                            .eq('id', configurations[nodeId].formId)
                            .single();

                        if (formData?.header_image_url) {
                            mainProductImage = formData.header_image_url;
                            console.log('[Continue Flow] 📸 Fetched product image from form:', mainProductImage);
                        }
                    } catch (imgError) {
                        console.log('[Continue Flow] ⚠️ Could not fetch form image:', imgError);
                    }
                }

                console.log('[Continue Flow] 📦 Main product from form:', {
                    name: mainProductName,
                    price: mainProductPrice,
                    quantity: mainProductQuantity,
                    total: mainProductTotal,
                    image: mainProductImage ? 'yes' : 'no'
                });

                // Status - IMPORTANT: This is required for status updates in Google Sheets
                // Using 'Order Placed' to match Invoice/Tracking display labels
                submissionData.order_status = 'Order Placed';

                // Create cart with main product if product info exists
                let initialCart: any[] = [];
                let initialCartTotal = 0;

                if (mainProductName && mainProductPrice > 0) {
                    initialCart = [{
                        nodeId: nodeId, // Form node ID
                        productId: `form_${nodeId}`,
                        productName: mainProductName,
                        productPrice: mainProductPrice,
                        productImage: mainProductImage, // Use fetched product image
                        quantity: mainProductQuantity,
                        isMainProduct: true // Mark as main product from form
                    }];
                    initialCartTotal = mainProductTotal;
                    console.log('[Continue Flow] ✓ Cart initialized with main product:', mainProductName, mainProductImage ? '(with image)' : '(no image)');
                } else {
                    console.log('[Continue Flow] ⚠️ No product info in form, starting with empty cart');
                }

                // Update context with cart from form
                (context as any).cart = initialCart;
                (context as any).cartTotal = initialCartTotal;

                const { data: existingSubscriber } = await supabase
                    .from('subscribers')
                    .select('metadata')
                    .eq('workspace_id', workspaceId)
                    .eq('external_id', subscriberId)
                    .single();

                // Extract customer info from form submission data
                // PRIORITY 1: Use standardized _customer_* fields (extracted by field type in FormView)
                // PRIORITY 2: Try common field label names as fallback
                const customerPhone = submissionData?._customer_phone ||
                    submissionData?.phone ||
                    submissionData?.phone_number ||
                    submissionData?.mobile ||
                    submissionData?.mobile_number ||
                    submissionData?.contact ||
                    submissionData?.contact_number ||
                    submissionData?.cellphone ||
                    existingSubscriber?.metadata?.phone || '';

                const customerEmail = submissionData?.email ||
                    submissionData?.email_address ||
                    submissionData?.e_mail ||
                    existingSubscriber?.metadata?.email || '';

                const customerAddress = submissionData?.address ||
                    submissionData?.full_address ||
                    submissionData?.complete_address ||
                    submissionData?.shipping_address ||
                    submissionData?.delivery_address ||
                    submissionData?.home_address ||
                    submissionData?.location ||
                    existingSubscriber?.metadata?.address || '';

                // Also log what we're receiving for debugging
                console.log('[Continue Flow] 📞 Customer info from form:', {
                    phone: customerPhone || 'not found',
                    email: customerEmail || 'not found',
                    address: customerAddress || 'not found',
                    // Show available fields for debugging
                    availableFields: Object.keys(submissionData || {}).filter(k =>
                        !['subscriber_id', 'subscriber_name', 'product_name', 'product_price', 'quantity', 'total', 'submitted_at', 'order_status', 'currency', 'payment_method'].includes(k)
                    ).join(', ')
                });

                await supabase
                    .from('subscribers')
                    .update({
                        metadata: {
                            // Save customer info from form submission
                            email: customerEmail,
                            phone: customerPhone,
                            address: customerAddress,
                            // Initialize cart with main product (not empty!)
                            cart: initialCart,
                            cartTotal: initialCartTotal,
                            cartSessionId: cartSessionId,
                            cartUpdatedAt: new Date().toISOString(),
                            // Clear stale data from previous transactions
                            upsell_response: null,
                            upsell_node_id: null,
                            lastCheckoutAt: null
                        }
                    })
                    .eq('workspace_id', workspaceId)
                    .eq('external_id', subscriberId);

                console.log('[Continue Flow] ✓ Cart saved - session:', cartSessionId, 'items:', initialCart.length);
            } catch (clearError) {
                console.error('[Continue Flow] Error initializing cart:', clearError);
            }
        }

        // Apply labels from form node configuration (on submit)
        const formNodeConfig = configurations[nodeId] || {};
        const formAddLabel = formNodeConfig.submitAddLabel;
        const formRemoveLabel = formNodeConfig.submitRemoveLabel;

        if ((formAddLabel || formRemoveLabel) && workspaceId && subscriberId) {
            console.log('[Continue Flow] Applying form submit labels:', { addLabel: formAddLabel, removeLabel: formRemoveLabel });
            try {
                // Get current subscriber
                const { data: subscriber } = await supabase
                    .from('subscribers')
                    .select('id, labels')
                    .eq('workspace_id', workspaceId)
                    .eq('external_id', subscriberId)
                    .single();

                if (subscriber) {
                    let labels: string[] = subscriber.labels || [];

                    // Remove label if specified
                    if (formRemoveLabel) {
                        labels = labels.filter((l: string) => l.toLowerCase() !== formRemoveLabel.toLowerCase());
                    }

                    // Add label if specified and not already present
                    if (formAddLabel && !labels.some((l: string) => l.toLowerCase() === formAddLabel.toLowerCase())) {
                        labels.push(formAddLabel);
                    }

                    // Update subscriber labels
                    await supabase
                        .from('subscribers')
                        .update({ labels })
                        .eq('id', subscriber.id);

                    console.log('[Continue Flow] ✓ Labels updated:', labels);
                }
            } catch (labelError) {
                console.error('[Continue Flow] Error updating labels:', labelError);
            }
        }



        // DEBUG: Log ALL edges in the flow
        console.log('[Continue Flow] ALL edges in flow:', edges.map((e: any) => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle })));

        // Find all edges FROM the form node (direct connections)
        const formNodeEdges = edges.filter((e: any) => e.source === nodeId);
        console.log('[Continue Flow] Found', formNodeEdges.length, 'edge(s) from form node');
        console.log('[Continue Flow] Form node edges:', formNodeEdges.map((e: any) => ({ target: e.target, sourceHandle: e.sourceHandle })));

        // Find nodes to execute (skip the form node itself, start from its successors)
        const nodesToExecute: string[] = [];
        const visited = new Set<string>();
        visited.add(nodeId); // Mark form node as visited

        // BFS through the graph starting from form node's successors
        const queue: Array<{ nodeId: string; conditionPath?: string }> = [];

        for (const edge of formNodeEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target);
            console.log('[Continue Flow] Checking edge target:', edge.target, '-> type:', targetNode?.type);
            if (!targetNode) continue;

            // If it's a sheetsNode, EXECUTE it and then find nodes after it
            if (targetNode.type === 'sheetsNode') {
                console.log('[Continue Flow] 📊 Found sheets node, executing Google Sheets sync...');

                // Get the sheetsNode config
                const sheetsConfig = configurations[targetNode.id] || {};
                console.log('[Continue Flow] 📊 Sheets config:', {
                    webhookUrl: sheetsConfig.webhookUrl ? 'SET' : 'NOT SET',
                    sheetName: sheetsConfig.sheetName,
                    sourceType: sheetsConfig.sourceType
                });

                // Execute the Google Sheets sync
                if (sheetsConfig.webhookUrl && context.cart && context.cart.length > 0) {
                    try {
                        await syncToGoogleSheets(sheetsConfig, context, subscriberName);
                        console.log('[Continue Flow] ✓ Google Sheets sync completed');
                    } catch (err: any) {
                        console.error('[Continue Flow] ❌ Google Sheets sync failed:', err.message);
                    }
                } else {
                    console.log('[Continue Flow] ⚠️ Skipping sheets sync: no webhookUrl or empty cart');
                }

                // Continue to nodes after sheetsNode
                const sheetsEdges = edges.filter((e: any) => e.source === edge.target);
                for (const sheetsEdge of sheetsEdges) {
                    console.log('[Continue Flow] Adding sheets successor:', sheetsEdge.target);
                    queue.push({ nodeId: sheetsEdge.target });
                }
                visited.add(edge.target);
            } else {
                console.log('[Continue Flow] Adding direct successor:', edge.target);
                queue.push({ nodeId: edge.target });
            }
        }

        // DEBUG: Log what's in the queue before processing
        console.log('[Continue Flow] Queue after building:', queue.map(q => q.nodeId));
        console.log('[Continue Flow] Visited set:', Array.from(visited));

        // Process queue and execute nodes
        console.log('[Continue Flow] Starting queue processing loop, queue length:', queue.length);
        while (queue.length > 0) {
            const current = queue.shift()!;
            const currentNodeId = current.nodeId;
            console.log('[Continue Flow] Processing queue item:', currentNodeId);

            if (visited.has(currentNodeId)) continue;
            visited.add(currentNodeId);

            const node = nodes.find((n: any) => n.id === currentNodeId);
            if (!node) continue;

            const config = configurations[currentNodeId] || {};
            const configKeys = Object.keys(config);
            console.log('[Continue Flow] Processing node:', node.data?.label, 'Type:', node.type, 'ConfigKeys:', configKeys.length > 0 ? configKeys.slice(0, 5).join(',') + (configKeys.length > 5 ? '...' : '') : 'EMPTY');

            // Handle Condition Node
            if (node.type === 'conditionNode') {
                const conditionResult = evaluateConditions(config, context);
                console.log('[Continue Flow] Condition result:', conditionResult ? 'TRUE' : 'FALSE');

                // Get all edges from this condition node
                const allConditionEdges = edges.filter((e: any) => e.source === currentNodeId);
                console.log('[Continue Flow] All edges from condition node:', allConditionEdges.map((e: any) => ({
                    target: e.target,
                    sourceHandle: e.sourceHandle
                })));

                // Find edges with matching sourceHandle
                // FALLBACK: If sourceHandle is undefined, use target node Y position to determine path
                // TRUE path = top (lower Y), FALSE path = bottom (higher Y)
                let conditionEdges: any[] = [];

                // First try exact sourceHandle match
                conditionEdges = allConditionEdges.filter((e: any) =>
                    e.sourceHandle === (conditionResult ? 'true' : 'false')
                );

                // FALLBACK: If no edges found with sourceHandle, infer from node positions
                if (conditionEdges.length === 0 && allConditionEdges.length > 0) {
                    console.log('[Continue Flow] No sourceHandle found, using position-based fallback');

                    // Sort edges by target node Y position
                    const edgesWithPositions = allConditionEdges.map((edge: any) => {
                        const targetNode = nodes.find((n: any) => n.id === edge.target);
                        return {
                            ...edge,
                            targetY: targetNode?.position?.y ?? 0
                        };
                    }).sort((a: any, b: any) => a.targetY - b.targetY);

                    console.log('[Continue Flow] Edges sorted by Y position:', edgesWithPositions.map((e: any) => ({ target: e.target, y: e.targetY })));

                    // TRUE = first edge (top/lower Y), FALSE = second edge (bottom/higher Y)
                    if (conditionResult && edgesWithPositions.length >= 1) {
                        conditionEdges = [edgesWithPositions[0]];
                        console.log('[Continue Flow] Using first edge (TRUE path):', conditionEdges[0].target);
                    } else if (!conditionResult && edgesWithPositions.length >= 2) {
                        conditionEdges = [edgesWithPositions[1]];
                        console.log('[Continue Flow] Using second edge (FALSE path):', conditionEdges[0].target);
                    } else if (!conditionResult && edgesWithPositions.length === 1) {
                        // Only one edge exists, skip for FALSE path
                        console.log('[Continue Flow] Only one edge exists, cannot follow FALSE path');
                        conditionEdges = [];
                    }
                }

                console.log('[Continue Flow] Following', conditionEdges.length, 'edge(s) for', conditionResult ? 'TRUE' : 'FALSE', 'path');

                for (const edge of conditionEdges) {
                    if (!visited.has(edge.target)) {
                        queue.push({ nodeId: edge.target });
                    }
                }
                continue; // Don't process condition node as action
            }

            // Handle Text Node - send message
            if (node.type === 'textNode') {
                await sendTextMessage(
                    subscriberId,
                    config.textContent || '',
                    config.buttons || [],
                    pageAccessToken
                );
            }

            // Handle Action Node (Send Message)
            if (node.type === 'actionNode' && node.data?.actionType === 'message') {
                const template = config.messageTemplate || config.template || '';
                await sendTextMessage(
                    subscriberId,
                    template.replace(/{commenter_name}/g, subscriberName || 'Friend'),
                    config.buttons || [],
                    pageAccessToken
                );
            }

            // Handle Image Node
            if (node.type === 'imageNode' || node.data?.label?.toLowerCase() === 'image') {
                console.log('[Continue Flow] Processing Image node');
                const imageUrl = config.imageUrl || '';
                const caption = config.caption || '';

                if (imageUrl) {
                    await sendImageMessage(
                        subscriberId,
                        imageUrl,
                        caption,
                        config.delaySeconds || 0,
                        pageAccessToken
                    );
                } else {
                    console.log('[Continue Flow] Skipping image node: No URL configured');
                }
            }


            // Handle Invoice Node - send invoice with clickable button to view in webview
            if (node.type === 'invoiceNode') {
                console.log('[Continue Flow] Processing Invoice node');
                const companyName = config.companyName || 'Your Company';
                const companyLogo = config.companyLogo || '';
                const companyAddress = config.companyAddress || '';
                const accentColor = config.primaryColor || '#6366f1';

                // Build invoice URL - supports both form submissions and webview orders
                let invoiceUrl = '';
                let finalInvoiceId = submissionId; // First try the submissionId passed from FormView

                // PRIORITY 1: If submissionId is passed (form-based flow), use it directly
                if (!finalInvoiceId) {
                    console.log('[Continue Flow] No submissionId passed, checking orders table...');

                    // PRIORITY 2: Try to find in orders table (webview checkout orders)
                    try {
                        const { data: order } = await supabase
                            .from('orders')
                            .select('id')
                            .eq('subscriber_id', subscriberId)
                            .eq('workspace_id', workspaceId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (order) {
                            console.log('[Continue Flow] Found order for invoice:', order.id);
                            finalInvoiceId = order.id; // This will be like 'ORD-xxx'
                        }
                    } catch (err) {
                        console.error('[Continue Flow] Error looking up order:', err);
                    }
                }

                // PRIORITY 3: Fallback to form_submissions table
                if (!finalInvoiceId) {
                    console.log('[Continue Flow] No order found, checking form_submissions table...');
                    try {
                        const { data: submission } = await supabase
                            .from('form_submissions')
                            .select('id')
                            .eq('subscriber_external_id', subscriberId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (submission) {
                            finalInvoiceId = submission.id;
                            console.log('[Continue Flow] Found form submission for invoice:', finalInvoiceId);
                        }
                    } catch (err) {
                        console.error('[Continue Flow] Error looking up submission:', err);
                    }
                }

                // For form_submissions, update with cart data if needed
                if (finalInvoiceId && !finalInvoiceId.startsWith('ORD-') && context.cart && context.cart.length > 0) {
                    console.log('[Continue Flow] Updating form submission with cart:', context.cart.length, 'items');
                    try {
                        const { data: existingSubmission } = await supabase
                            .from('form_submissions')
                            .select('data')
                            .eq('id', finalInvoiceId)
                            .single();

                        const existingData = existingSubmission?.data || {};

                        const { error: updateError } = await supabase
                            .from('form_submissions')
                            .update({
                                data: {
                                    ...existingData,
                                    cart: context.cart,
                                    cartTotal: context.cartTotal
                                }
                            })
                            .eq('id', finalInvoiceId);

                        if (updateError) {
                            console.error('[Continue Flow] Error updating submission with cart:', updateError);
                        } else {
                            console.log('[Continue Flow] ✓ Submission updated with current cart');
                        }
                    } catch (err) {
                        console.error('[Continue Flow] Exception updating submission:', err);
                    }
                }

                if (finalInvoiceId) {
                    console.log('[Continue Flow] Using invoice ID:', finalInvoiceId, '(type:', finalInvoiceId.startsWith('ORD-') ? 'order' : 'submission', ')');
                    const baseUrl = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';

                    // Use server-side rendered invoice endpoint (works in Messenger's in-app browser)
                    const params = new URLSearchParams();
                    params.set('id', finalInvoiceId);
                    params.set('company', companyName);
                    params.set('color', accentColor);
                    if (companyLogo) params.set('logo', companyLogo);
                    if (companyAddress) params.set('address', companyAddress);

                    invoiceUrl = `${baseUrl}/api/views/handler?type=invoice&${params.toString()}`;
                    console.log('[Continue Flow] Invoice URL:', invoiceUrl);
                } else {
                    console.log('[Continue Flow] No invoice ID available - neither order nor submission found');
                }

                // Send message with button to view invoice
                const defaultMessage = `🧾 Invoice from ${companyName}\n\nThank you for your order! Your invoice has been generated.\n\n✅ Order Confirmed\n📦 We will process your order soon.`;
                const invoiceMessage = formNodeConfig.confirmationMessage || defaultMessage;

                // If we have an invoice URL, send button; otherwise just text
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

            // Handle Product Webview Node - send product offer and STOP traversal (wait for user response)
            const isProductWebviewNode = node.type === 'productWebviewNode' ||
                node.data?.nodeType === 'productWebviewNode' ||
                (node.data?.label || '').toLowerCase().includes('product webview');

            if (isProductWebviewNode) {
                console.log('[Continue Flow] *** PRODUCT WEBVIEW NODE DETECTED ***');
                console.log('[Continue Flow] Node type:', node.type, 'Data nodeType:', node.data?.nodeType, 'Label:', node.data?.label);
                console.log('[Continue Flow] Product Webview config:', JSON.stringify({
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
                    console.log('[Continue Flow] ✓ Product Webview offer function completed');
                } catch (productError: any) {
                    console.error('[Continue Flow] ✗ Product Webview offer FAILED:', productError.message);
                    console.error('[Continue Flow] Stack:', productError.stack);
                }

                // STOP traversal here - user must click Accept or Decline to continue
                console.log('[Continue Flow] ⏸ Stopping at Product Webview node - waiting for user response');
                continue; // Don't add successors to queue
            }

            const isUpsellNode = node.type === 'upsellNode' ||
                node.data?.nodeType === 'upsellNode' ||
                (node.data?.label || '').toLowerCase().includes('upsell');

            if (isUpsellNode) {
                console.log('[Continue Flow] *** UPSELL NODE DETECTED ***');
                console.log('[Continue Flow] Node type:', node.type, 'Data nodeType:', node.data?.nodeType, 'Label:', node.data?.label);
                console.log('[Continue Flow] Upsell config:', JSON.stringify({
                    useWebview: config.useWebview,
                    headline: config.headline,
                    productName: config.productName,
                    hasImage: !!config.imageUrl
                }));
                console.log('[Continue Flow] Context:', JSON.stringify({
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
                    console.log('[Continue Flow] ✓ Upsell offer function completed');
                } catch (upsellError: any) {
                    console.error('[Continue Flow] ✗ Upsell offer FAILED:', upsellError.message);
                    console.error('[Continue Flow] Stack:', upsellError.stack);
                }

                // STOP traversal here - user must click Accept or Decline to continue
                console.log('[Continue Flow] ⏸ Stopping at Upsell node - waiting for user response');
                continue; // Don't add successors to queue
            }

            // Handle Downsell Node - send downsell offer and STOP traversal (wait for user response)
            const isDownsellNode = node.type === 'downsellNode' ||
                node.data?.nodeType === 'downsellNode' ||
                (node.data?.label || '').toLowerCase().includes('downsell');

            if (isDownsellNode) {
                console.log('[Continue Flow] *** DOWNSELL NODE DETECTED ***');
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
                    console.log('[Continue Flow] ✓ Downsell offer function completed');
                } catch (downsellError: any) {
                    console.error('[Continue Flow] ✗ Downsell offer FAILED:', downsellError.message);
                }
                // STOP traversal here - user must click Accept or Decline to continue
                console.log('[Continue Flow] ⏸ Stopping at Downsell node - waiting for user response');
                continue; // Don't add successors to queue
            }

            // Handle Checkout Node - send checkout summary and STOP traversal
            if (node.type === 'checkoutNode') {
                console.log('[Continue Flow] Processing Checkout node');
                await sendCheckoutOffer(
                    subscriberId,
                    config,
                    node.id,
                    flowId,
                    pageAccessToken,
                    workspaceId,
                    context
                );
                console.log('[Continue Flow] ⏸ Stopping at Checkout node - waiting for confirmation');
                continue; // Don't add successors to queue
            }

            // Handle Google Sheets Node - sync data and continue
            const isSheetsNode = node.type === 'sheetsNode' ||
                node.data?.nodeType === 'sheetsNode' ||
                (node.data?.label || '').toLowerCase().includes('google') ||
                (node.data?.label || '').toLowerCase().includes('sheets');

            if (isSheetsNode) {
                console.log('[Continue Flow] 📊 Processing Google Sheets node');
                console.log('[Continue Flow] 📊 Node ID:', node.id);
                console.log('[Continue Flow] 📊 Config keys:', Object.keys(config));

                if (config.webhookUrl) {
                    console.log('[Continue Flow] 📊 Webhook URL found, executing sync...');
                    console.log('[Continue Flow] 📊 Cart items:', (context.cart || []).length);
                    console.log('[Continue Flow] 📊 Cart total:', context.cartTotal);

                    try {
                        await syncToGoogleSheets(config, context, subscriberName);
                        console.log('[Continue Flow] ✓ Google Sheets sync completed!');
                    } catch (sheetsError: any) {
                        console.error('[Continue Flow] ❌ Google Sheets sync error:', sheetsError.message);
                    }
                } else {
                    console.log('[Continue Flow] ⚠️ No webhookUrl in sheetsNode config, skipping sync');
                }
                // Don't continue/return - let it fall through to add successors
            }

            // Find outgoing edges for non-condition nodes
            const outgoingEdges = edges.filter((e: any) => e.source === currentNodeId);
            for (const edge of outgoingEdges) {
                if (!visited.has(edge.target)) {
                    queue.push({ nodeId: edge.target });
                }
            }
        }

        console.log('[Continue Flow] ✓ Flow continuation complete');
        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('[Continue Flow] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

// Evaluate conditions for a condition node
function evaluateConditions(config: any, context: any): boolean {
    const conditions = config.conditions || [];
    const matchType = config.matchType || 'all';

    if (conditions.length === 0) {
        return true; // No conditions = pass
    }

    const results = conditions.map((cond: any) => {
        const variable = cond.variable;
        const operator = cond.operator;
        const expectedValue = cond.value;

        // Get the actual value from context
        let actualValue = context[variable];

        // Handle special variables
        if (variable === 'form_submitted') {
            actualValue = context.form_submitted === true || context.formSubmitted === true;
        }

        // Handle upsell_response - check context first, then metadata
        if (variable === 'upsell_response') {
            actualValue = context.upsell_response || context.metadata?.upsell_response || '';
            console.log(`[Condition] upsell_response resolved to: '${actualValue}'`);
        }

        // Handle downsell_response - check context first, then metadata
        if (variable === 'downsell_response') {
            actualValue = context.downsell_response || context.metadata?.downsell_response || '';
            console.log(`[Condition] downsell_response resolved to: '${actualValue}'`);
        }

        console.log(`[Condition] Checking: ${variable} ${operator} ${expectedValue}, actual: ${actualValue}`);

        // Evaluate based on operator
        switch (operator) {
            case 'is_true':
                return actualValue === true;
            case 'is_false':
                return actualValue === false;
            case 'equals':
                return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
            case 'not_equals':
                return String(actualValue).toLowerCase() !== String(expectedValue).toLowerCase();
            case 'contains':
                return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
            case 'not_contains':
                return !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
            case 'is_empty':
                return !actualValue || actualValue === '';
            case 'is_not_empty':
                return actualValue && actualValue !== '';
            case 'greater_than':
                return Number(actualValue) > Number(expectedValue);
            case 'less_than':
                return Number(actualValue) < Number(expectedValue);
            case 'greater_or_equal':
                return Number(actualValue) >= Number(expectedValue);
            case 'less_or_equal':
                return Number(actualValue) <= Number(expectedValue);
            default:
                return false;
        }
    });

    // Match ALL conditions or ANY condition
    if (matchType === 'all') {
        return results.every((r: boolean) => r);
    } else {
        return results.some((r: boolean) => r);
    }
}

// Send a text message via Messenger
async function sendTextMessage(
    userId: string,
    text: string,
    buttons: any[],
    pageAccessToken: string
): Promise<void> {
    if (!text || !text.trim()) {
        console.log('[Continue Flow] Skipping empty text message');
        return;
    }

    console.log('[Continue Flow] Sending message to:', userId);
    console.log('[Continue Flow] Message:', text);

    try {
        let messagePayload: any;

        // Check for buttons
        const validButtons = (buttons || []).filter((b: any) => {
            if (b.type === 'url' && b.title && b.url) return true;
            if (b.type === 'startFlow' && b.title && b.flowId) return true;
            if (b.type === 'newFlow' && b.title && b.flowName) return true;
            return false;
        });

        if (validButtons.length > 0) {
            const fbButtons = validButtons.map((btn: any) => {
                if (btn.type === 'url') {
                    return {
                        type: 'web_url',
                        title: btn.title,
                        url: btn.url
                    };
                }
                if (btn.type === 'startFlow') {
                    return {
                        type: 'postback',
                        title: btn.title,
                        payload: `FLOW_${btn.flowId}`
                    };
                }
                if (btn.type === 'newFlow') {
                    return {
                        type: 'postback',
                        title: btn.title,
                        payload: `NEWFLOW_${btn.flowName}`
                    };
                }
                return null;
            }).filter(Boolean);

            messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: text,
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: userId },
                    message: messagePayload,
                    access_token: pageAccessToken
                })
            }
        );

        const result = await response.json();
        if (result.error) {
            console.error('[Continue Flow] Message error:', result.error.message);
        } else {
            console.log('[Continue Flow] ✓ Message sent, ID:', result.message_id);
        }
    } catch (error: any) {
        console.error('[Continue Flow] Send message exception:', error.message);
    }
}

// Send an invoice button message via Messenger (opens in external browser)
async function sendInvoiceButton(
    userId: string,
    text: string,
    invoiceUrl: string,
    pageAccessToken: string
): Promise<void> {
    console.log('[Continue Flow] Sending invoice button to:', userId);
    console.log('[Continue Flow] Invoice URL:', invoiceUrl);

    try {
        // Use regular web_url without messenger_extensions
        // This opens in the device's default browser which works better
        const messagePayload = {
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'button',
                    text: text,
                    buttons: [
                        {
                            type: 'web_url',
                            title: '📄 View Invoice',
                            url: invoiceUrl,
                            webview_height_ratio: 'full'
                            // Note: messenger_extensions removed for better compatibility
                        }
                    ]
                }
            }
        };

        const response = await fetch(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: userId },
                    message: messagePayload,
                    access_token: pageAccessToken
                })
            }
        );

        const result = await response.json();
        if (result.error) {
            console.error('[Continue Flow] Invoice button error:', result.error.message);
        } else {
            console.log('[Continue Flow] ✓ Invoice button sent, ID:', result.message_id);
        }
    } catch (error: any) {
        console.error('[Continue Flow] Invoice button exception:', error.message);
    }
}

// Send an image message via Messenger
async function sendImageMessage(
    userId: string,
    imageUrl: string,
    caption: string,
    delaySeconds: number,
    pageAccessToken: string
): Promise<void> {
    console.log('[Continue Flow] Sending image to:', userId);
    console.log('[Continue Flow] Image URL:', imageUrl);

    try {
        // typing indicator
        if (delaySeconds > 0) {
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }

        const messagePayload = {
            recipient: { id: userId },
            message: {
                attachment: {
                    type: 'image',
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messagePayload)
            }
        );

        const result = await response.json();

        if (result.error) {
            console.error('[Continue Flow] Image send error:', result.error.message);
        } else {
            console.log('[Continue Flow] ✓ Image sent, ID:', result.message_id);

            // Send caption as separate message if present
            if (caption) {
                await sendTextMessage(userId, caption, [], pageAccessToken);
            }
        }
    } catch (error: any) {
        console.error('[Continue Flow] Image exception:', error.message);
    }
}

// Send an upsell offer via Messenger
async function sendUpsellOffer(
    userId: string,
    config: any,
    nodeId: string,
    flowId: string,
    pageAccessToken: string,
    workspaceId: string,
    context: any
): Promise<void> {
    console.log('[Continue Flow] Sending Upsell offer to:', userId);

    const headline = config.headline || 'Special Offer for You!';
    const productName = config.productName || 'Premium Product';
    const price = config.price || '₱999';
    const description = config.description || 'Limited time offer!';
    const imageUrl = config.imageUrl || '';
    const acceptButtonText = config.acceptButtonText || '✅ Yes, Add to Order';
    const declineButtonText = config.declineButtonText || '❌ No Thanks';
    const useWebview = config.useWebview ?? false;

    try {
        // If webview is enabled, create a webview session and send webview button
        if (useWebview && workspaceId) {
            console.log('[Continue Flow] Creating webview session for upsell...');
            console.log('[Continue Flow] workspaceId:', workspaceId, 'userId:', userId);

            // Create webview session
            const baseUrl = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';

            const { data: session, error: sessionError } = await supabase
                .from('webview_sessions')
                .insert({
                    workspace_id: workspaceId,
                    external_id: userId,
                    flow_id: flowId,
                    current_node_id: nodeId,
                    page_type: 'upsell',
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
                })
                .select('id')
                .single();


            if (sessionError || !session) {
                console.error('[Continue Flow] Failed to create webview session:', sessionError?.message);
                console.log('[Continue Flow] Falling back to postback buttons');
                // Fallback to postback buttons below
            } else {
                const webviewUrl = `${baseUrl}/wv/upsell/${session.id}`;
                console.log('[Continue Flow] Webview URL:', webviewUrl);

                // Send full-screen image first (if available)
                if (imageUrl) {
                    const imagePayload = {
                        attachment: {
                            type: 'image',
                            payload: {
                                url: imageUrl,
                                is_reusable: true
                            }
                        }
                    };
                    await sendFacebookMessage(userId, imagePayload, pageAccessToken);
                    console.log('[Continue Flow] ✓ Full-screen upsell image sent');
                }

                // Then send button template with offer details
                const messagePayload = {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'button',
                            text: `${headline}\n\n${productName} - ${price}\n${description}`,
                            buttons: [{
                                type: 'web_url',
                                title: '🛒 View Offer',
                                url: webviewUrl,
                                webview_height_ratio: 'tall'
                            }]
                        }
                    }
                };

                await sendFacebookMessage(userId, messagePayload, pageAccessToken);
                console.log('[Continue Flow] ✓ Upsell webview offer sent');
                return;
            }
        }

        // Fallback: Build the payload for postback button clicks
        // Parse the price string to get numeric value (e.g., "₱588" -> 588)
        const numericPrice = parseFloat(price.replace(/[^\d.]/g, '')) || 0;

        const acceptPayload = JSON.stringify({
            action: 'upsell_accept',
            flowId,
            nodeId,
            productName,
            productPrice: numericPrice, // Numeric price for cart calculation
            price, // Original formatted price for display
            productImage: imageUrl,
            imageUrl
        });

        const declinePayload = JSON.stringify({
            action: 'upsell_decline',
            flowId,
            nodeId
        });

        // Use generic template with image if available
        if (imageUrl) {
            const messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'generic',
                        elements: [{
                            title: headline,
                            subtitle: `${productName} - ${price}\n${description}`,
                            image_url: imageUrl,
                            buttons: [
                                {
                                    type: 'postback',
                                    title: acceptButtonText.slice(0, 20),
                                    payload: acceptPayload
                                },
                                {
                                    type: 'postback',
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
            // No image - use button template
            const messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: `${headline}\n\n${productName} - ${price}\n${description}`,
                        buttons: [
                            {
                                type: 'postback',
                                title: acceptButtonText.slice(0, 20),
                                payload: acceptPayload
                            },
                            {
                                type: 'postback',
                                title: declineButtonText.slice(0, 20),
                                payload: declinePayload
                            }
                        ]
                    }
                }
            };

            await sendFacebookMessage(userId, messagePayload, pageAccessToken);
        }

        console.log('[Continue Flow] ✓ Upsell offer sent');
    } catch (error: any) {
        console.error('[Continue Flow] Upsell send exception:', error.message);
    }
}

// Send a downsell offer via Messenger
async function sendDownsellOffer(
    userId: string,
    config: any,
    nodeId: string,
    flowId: string,
    pageAccessToken: string,
    workspaceId: string,
    context: any
): Promise<void> {
    console.log('[Continue Flow] Sending Downsell offer to:', userId);

    const headline = config.headline || 'Wait! Special Deal Just for You';
    const productName = config.productName || 'Value Product';
    const price = config.price || '₱499';
    const description = config.description || 'Exclusive discount!';
    const imageUrl = config.imageUrl || '';
    const acceptButtonText = config.acceptButtonText || '✅ Yes, I\'ll Take It';
    const declineButtonText = config.declineButtonText || '❌ No Thanks';
    const useWebview = config.useWebview ?? false;

    try {
        // If webview is enabled, create a webview session and send webview button
        if (useWebview && workspaceId) {
            console.log('[Continue Flow] Creating webview session for downsell...');
            console.log('[Continue Flow] workspaceId:', workspaceId, 'userId:', userId);

            const baseUrl = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';

            const { data: session, error: sessionError } = await supabase
                .from('webview_sessions')
                .insert({
                    workspace_id: workspaceId,
                    external_id: userId,
                    flow_id: flowId,
                    current_node_id: nodeId,
                    page_type: 'downsell',
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
                })
                .select('id')
                .single();


            if (sessionError || !session) {
                console.error('[Continue Flow] Failed to create webview session:', sessionError?.message);
                // Fallback to postback buttons below
            } else {
                const webviewUrl = `${baseUrl}/wv/downsell/${session.id}`;
                console.log('[Continue Flow] Webview URL:', webviewUrl);

                // Send full-screen image first (if available)
                if (imageUrl) {
                    const imagePayload = {
                        attachment: {
                            type: 'image',
                            payload: {
                                url: imageUrl,
                                is_reusable: true
                            }
                        }
                    };
                    await sendFacebookMessage(userId, imagePayload, pageAccessToken);
                    console.log('[Continue Flow] ✓ Full-screen downsell image sent');
                }

                // Then send button template with offer details
                const messagePayload = {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'button',
                            text: `${headline}\n\n${productName} - ${price}\n${description}`,
                            buttons: [{
                                type: 'web_url',
                                title: '🛒 View Offer',
                                url: webviewUrl,
                                webview_height_ratio: 'tall'
                            }]
                        }
                    }
                };

                await sendFacebookMessage(userId, messagePayload, pageAccessToken);
                console.log('[Continue Flow] ✓ Downsell webview offer sent');
                return;
            }
        }

        // Fallback: postback buttons
        // Parse the price string to get numeric value (e.g., "₱499" -> 499)
        const numericPrice = parseFloat(price.replace(/[^\d.]/g, '')) || 0;

        const acceptPayload = JSON.stringify({
            action: 'downsell_accept',
            flowId,
            nodeId,
            productName,
            productPrice: numericPrice, // Numeric price for cart calculation
            price, // Original formatted price for display
            productImage: imageUrl,
            imageUrl
        });

        const declinePayload = JSON.stringify({
            action: 'downsell_decline',
            flowId,
            nodeId
        });

        if (imageUrl) {
            const messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'generic',
                        elements: [{
                            title: headline,
                            subtitle: `${productName} - ${price}\n${description}`,
                            image_url: imageUrl,
                            buttons: [
                                {
                                    type: 'postback',
                                    title: acceptButtonText.slice(0, 20),
                                    payload: acceptPayload
                                },
                                {
                                    type: 'postback',
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
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: `${headline}\n\n${productName} - ${price}\n${description}`,
                        buttons: [
                            {
                                type: 'postback',
                                title: acceptButtonText.slice(0, 20),
                                payload: acceptPayload
                            },
                            {
                                type: 'postback',
                                title: declineButtonText.slice(0, 20),
                                payload: declinePayload
                            }
                        ]
                    }
                }
            };

            await sendFacebookMessage(userId, messagePayload, pageAccessToken);
        }

        console.log('[Continue Flow] ✓ Downsell offer sent');
    } catch (error: any) {
        console.error('[Continue Flow] Downsell send exception:', error.message);
    }
}

// Send a product webview offer via Messenger
async function sendProductWebviewOffer(
    userId: string,
    config: any,
    nodeId: string,
    flowId: string,
    pageAccessToken: string,
    workspaceId: string,
    context: any
): Promise<void> {
    console.log('[Continue Flow] Sending Product Webview offer to:', userId);
    console.log('[Continue Flow] → Config received (keys):', Object.keys(config || {}));
    console.log('[Continue Flow] → useWebview value:', config.useWebview, 'type:', typeof config.useWebview);
    console.log('[Continue Flow] → workspaceId:', workspaceId);
    console.log('[Continue Flow] → config.headline:', config.headline);
    console.log('[Continue Flow] → config.productName:', config.productName);
    console.log('[Continue Flow] → config.imageUrl:', config.imageUrl ? 'present' : 'missing');

    const headline = config.headline || 'Check Out This Product!';
    const productName = config.productName || 'Featured Product';
    const price = config.price || '₱999';
    const description = config.description || 'Limited time offer!';
    const imageUrl = config.imageUrl || '';
    const acceptButtonText = config.acceptButtonText || '✅ Add to Cart';
    const declineButtonText = config.declineButtonText || '❌ No Thanks';
    const useWebview = config.useWebview ?? true; // Default to true for Product Webview node

    console.log('[Continue Flow] → Final useWebview (after default):', useWebview);
    console.log('[Continue Flow] → Webview condition check: useWebview=' + useWebview + ', workspaceId=' + (workspaceId ? 'present' : 'MISSING'));

    try {
        // If webview is enabled, create a webview session and send webview button
        if (useWebview && workspaceId) {
            console.log('[Continue Flow] Creating webview session for product...');
            console.log('[Continue Flow] workspaceId:', workspaceId, 'userId:', userId);

            // Create webview session
            const baseUrl = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';

            const { data: session, error: sessionError } = await supabase
                .from('webview_sessions')
                .insert({
                    workspace_id: workspaceId,
                    external_id: userId,
                    flow_id: flowId,
                    current_node_id: nodeId,
                    page_type: 'product', // Different from 'upsell'
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
                })
                .select('id')
                .single();


            if (sessionError || !session) {
                console.error('[Continue Flow] Failed to create webview session:', sessionError?.message);
                console.log('[Continue Flow] Falling back to postback buttons');
                // Fallback to postback buttons below
            } else {
                const webviewUrl = `${baseUrl}/wv/product/${session.id}`;
                console.log('[Continue Flow] Product Webview URL:', webviewUrl);

                // Send message with webview button
                const messagePayload = {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'generic',
                            elements: [{
                                title: headline,
                                subtitle: `${productName} - ${price}\n${description}`,
                                image_url: imageUrl || undefined,
                                buttons: [{
                                    type: 'web_url',
                                    title: '🛒 View Product',
                                    url: webviewUrl,
                                    webview_height_ratio: 'tall'
                                    // Note: messenger_extensions removed for SaaS compatibility (no domain whitelisting needed)
                                }]
                            }]
                        }
                    }
                };

                await sendFacebookMessage(userId, messagePayload, pageAccessToken);
                console.log('[Continue Flow] ✓ Product Webview offer sent');
                return;
            }
        }

        // Fallback: Build the payload for postback button clicks
        const numericPrice = parseFloat(price.replace(/[^\\d.]/g, '')) || 0;

        const acceptPayload = JSON.stringify({
            action: 'product_accept',
            flowId,
            nodeId,
            productName,
            productPrice: numericPrice,
            price,
            productImage: imageUrl,
            imageUrl
        });

        const declinePayload = JSON.stringify({
            action: 'product_decline',
            flowId,
            nodeId
        });

        // Use generic template with image if available
        if (imageUrl) {
            const messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'generic',
                        elements: [{
                            title: headline,
                            subtitle: `${productName} - ${price}\n${description}`,
                            image_url: imageUrl,
                            buttons: [
                                {
                                    type: 'postback',
                                    title: acceptButtonText.slice(0, 20),
                                    payload: acceptPayload
                                },
                                {
                                    type: 'postback',
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
            // No image - use button template
            const messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: `${headline}\n\n${productName} - ${price}\n${description}`,
                        buttons: [
                            {
                                type: 'postback',
                                title: acceptButtonText.slice(0, 20),
                                payload: acceptPayload
                            },
                            {
                                type: 'postback',
                                title: declineButtonText.slice(0, 20),
                                payload: declinePayload
                            }
                        ]
                    }
                }
            };

            await sendFacebookMessage(userId, messagePayload, pageAccessToken);
        }

        console.log('[Continue Flow] ✓ Product offer sent with postback buttons');
    } catch (error: any) {
        console.error('[Continue Flow] Product Webview send exception:', error.message);
    }
}

// Send checkout confirmation via Messenger (webview-based)
async function sendCheckoutOffer(
    userId: string,
    config: any,
    nodeId: string,
    flowId: string,
    pageAccessToken: string,
    workspaceId: string,
    context: any
): Promise<void> {
    console.log('[Continue Flow] Sending Checkout webview to:', userId);
    console.log('[Continue Flow] → Context cart items:', context.cart?.length || 0);
    console.log('[Continue Flow] → Context cart total:', context.cartTotal || 0);
    console.log('[Continue Flow] → workspaceId:', workspaceId);

    const headerText = config.headerText || '🛒 Your Order Summary';
    const buttonText = config.buttonText || '✅ View Order';
    const companyName = config.companyName || '';

    // Get cart from context first, then fallback to subscriber metadata
    let cart = context.cart || context.metadata?.cart || [];
    let cartTotal = context.cartTotal || context.metadata?.cartTotal || 0;
    let customerName = context.commenterName || context.customerName || 'Valued Customer';

    // CRITICAL: If cart is empty in context, fetch from subscriber metadata
    if (cart.length === 0 && workspaceId && userId) {
        console.log('[Continue Flow] Cart empty in context, fetching from subscriber metadata...');
        try {
            const { data: subscriber } = await supabase
                .from('subscribers')
                .select('metadata, name')
                .eq('external_id', userId)
                .eq('workspace_id', workspaceId)
                .single();

            if (subscriber?.metadata) {
                cart = subscriber.metadata.cart || [];
                cartTotal = subscriber.metadata.cartTotal || 0;
                customerName = subscriber.name || subscriber.metadata.name || customerName;
                console.log('[Continue Flow] ✓ Loaded cart from subscriber:', cart.length, 'items, ₱' + cartTotal);
                cart.forEach((item: any, i: number) => {
                    console.log(`[Continue Flow]   [${i}] ${item.productName}: ₱${item.productPrice}`);
                });
            } else {
                console.log('[Continue Flow] ⚠️ No cart in subscriber metadata');
            }
        } catch (subError: any) {
            console.error('[Continue Flow] Error fetching subscriber cart:', subError.message);
        }
    }

    try {
        // Create a webview session for checkout
        if (workspaceId) {
            console.log('[Continue Flow] Creating webview session for checkout...');
            console.log('[Continue Flow] → Final cart:', cart.length, 'items');
            console.log('[Continue Flow] → Final total:', cartTotal);

            const baseUrl = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';

            const { data: session, error: sessionError } = await supabase
                .from('webview_sessions')
                .insert({
                    workspace_id: workspaceId,
                    external_id: userId,
                    flow_id: flowId,
                    current_node_id: nodeId,
                    page_type: 'checkout',
                    page_config: config,
                    cart: cart,
                    cart_total: cartTotal,
                    page_access_token: pageAccessToken,
                    customer_name: customerName,
                    page_id: context.pageId || null,
                    page_name: context.pageName || null,
                    metadata: {
                        commenterName: context.commenterName,
                        customerName: customerName,
                        formData: context.formData || {},
                        shippingFee: config.shippingFee || 0,
                        showShipping: config.showShipping ?? true
                    }
                })
                .select('id')
                .single();


            if (sessionError || !session) {
                console.error('[Continue Flow] Failed to create checkout session:', sessionError?.message);
                // Fallback to simple message below
            } else {
                const webviewUrl = `${baseUrl}/wv/checkout/${session.id}`;
                console.log('[Continue Flow] Checkout Webview URL:', webviewUrl);

                // Build summary text for the card
                let summaryText = '';
                if (cart.length > 0) {
                    const itemCount = cart.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
                    summaryText = `${itemCount} item${itemCount > 1 ? 's' : ''} • ₱${cartTotal.toLocaleString()}`;
                    if (config.showShipping && config.shippingFee > 0) {
                        summaryText += ` + ₱${config.shippingFee} shipping`;
                    }
                } else {
                    summaryText = 'Review your order details';
                }

                // Send message with webview button (NO messenger_extensions for SaaS compatibility)
                const messagePayload = {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'generic',
                            elements: [{
                                title: headerText,
                                subtitle: summaryText + (companyName ? `\n${companyName}` : ''),
                                buttons: [{
                                    type: 'web_url',
                                    title: buttonText.slice(0, 20),
                                    url: webviewUrl,
                                    webview_height_ratio: 'full'
                                    // Note: NO messenger_extensions - for SaaS compatibility
                                }]
                            }]
                        }
                    }
                };

                await sendFacebookMessage(userId, messagePayload, pageAccessToken);
                console.log('[Continue Flow] ✓ Checkout webview sent');
                return;
            }
        }

        // Fallback: Send a simple text message if webview session creation failed
        console.log('[Continue Flow] Falling back to simple checkout message');
        let summaryText = headerText;
        if (cart.length > 0) {
            summaryText += '\n\n';
            cart.forEach((item: any) => {
                summaryText += `• ${item.productName || item.name} - ₱${item.productPrice || item.price}\n`;
            });
            summaryText += `\nTotal: ₱${cartTotal}`;
        }

        const confirmPayload = JSON.stringify({
            action: 'checkout_confirm',
            flowId,
            nodeId
        });

        const messagePayload = {
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'button',
                    text: summaryText,
                    buttons: [
                        {
                            type: 'postback',
                            title: buttonText.slice(0, 20),
                            payload: confirmPayload
                        }
                    ]
                }
            }
        };

        await sendFacebookMessage(userId, messagePayload, pageAccessToken);
        console.log('[Continue Flow] ✓ Checkout fallback message sent');
    } catch (error: any) {
        console.error('[Continue Flow] Checkout send exception:', error.message);
    }
}

// Generic function to send Facebook message
async function sendFacebookMessage(
    userId: string,
    messagePayload: any,
    pageAccessToken: string
): Promise<void> {
    const response = await fetch(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: userId },
                message: messagePayload,
                access_token: pageAccessToken
            })
        }
    );

    const result = await response.json();
    if (result.error) {
        console.error('[Continue Flow] Facebook API error:', result.error.message);
        throw new Error(result.error.message);
    }
    console.log('[Continue Flow] ✓ Message sent, ID:', result.message_id);
}

// Google Sheets sync function for sheetsNode execution
async function syncToGoogleSheets(
    config: any,
    context: any,
    customerName: string
): Promise<void> {
    const webhookUrl = config.webhookUrl;
    const sheetName = config.sheetName || 'Orders';
    const includeMainProduct = config.includeMainProduct ?? true;
    const includeUpsells = config.includeUpsells ?? true;
    const includeDownsells = config.includeDownsells ?? true;
    const includeCustomerInfo = config.includeCustomerInfo ?? true;
    const includeTimestamp = config.includeTimestamp ?? true;

    const cart = context.cart || [];
    const cartTotal = context.cartTotal || 0;
    const checkoutData = context.checkoutData || {};

    console.log('[syncToGoogleSheets] Starting sync...');
    console.log('[syncToGoogleSheets] Cart items:', cart.length);
    console.log('[syncToGoogleSheets] Checkout data:', Object.keys(checkoutData).length > 0 ? 'present' : 'empty');

    // Build product lists
    const allProducts: string[] = [];
    const allQuantities: string[] = [];
    const allPrices: string[] = [];

    cart.forEach((item: any) => {
        const productName = item.productName || 'Unknown Product';
        const quantity = item.quantity || 1;
        const price = item.productPrice || 0;

        if (item.isMainProduct && includeMainProduct) {
            allProducts.push(`[Main] ${productName}`);
            allQuantities.push(String(quantity));
            allPrices.push(`₱${price}`);
        } else if (item.isUpsell && includeUpsells) {
            allProducts.push(`[Upsell] ${productName}`);
            allQuantities.push(String(quantity));
            allPrices.push(`₱${price}`);
        } else if (item.isDownsell && includeDownsells) {
            allProducts.push(`[Downsell] ${productName}`);
            allQuantities.push(String(quantity));
            allPrices.push(`₱${price}`);
        } else if (!item.isMainProduct && !item.isUpsell && !item.isDownsell) {
            // Include if no specific flag
            allProducts.push(productName);
            allQuantities.push(String(quantity));
            allPrices.push(`₱${price}`);
        }
    });

    // Extract variant info (color, size, promo code) from cart items
    const allColors: string[] = [];
    const allSizes: string[] = [];
    const allPromoCodes: string[] = [];

    cart.forEach((item: any) => {
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

    // Use orderId from checkout (if available) to ensure it matches the database
    // This is CRITICAL for status updates to work correctly!
    const orderId = checkoutData.orderId || `ORD-${Date.now().toString(36).toUpperCase()}`;
    console.log('[syncToGoogleSheets] Using Order ID:', orderId, checkoutData.orderId ? '(from checkout)' : '(generated)');

    // Build webhook payload - organized in a predictable order
    const webhookPayload: any = {
        // Core identifiers
        row_id: orderId,
        'Order ID': orderId,

        // Customer info
        'Customer Name': checkoutData.customerName || customerName || 'Customer',
        'Customer ID': context.commenterId,
        'Customer Phone': checkoutData.customerPhone || '',
        'Customer Email': checkoutData.customerEmail || '',
        'Customer Address': checkoutData.customerAddress || '',

        // Products
        'Products': allProducts.join(', '),
        'Quantities': allQuantities.join(', '),
        'Prices': allPrices.join(', '),
        'Item Count': cart.length,

        // Variants
        'Colors': allColors.join(', ') || '',
        'Sizes': allSizes.join(', ') || '',

        // Promo & Discount
        'Promo Code': checkoutData.promoCode || allPromoCodes.join(', ') || '',
        'Discount': checkoutData.discount || 0,

        // Totals
        'Subtotal': cartTotal,
        'Shipping Fee': checkoutData.shippingFee || 0,
        'Total': cartTotal - (checkoutData.discount || 0) + (checkoutData.shippingFee || 0),

        // Payment
        'Payment Method': checkoutData.paymentMethodName || checkoutData.paymentMethod || 'COD',
        'Payment Proof': checkoutData.paymentProof || '',

        // Notes
        'Notes': checkoutData.notes || '',

        // Status - IMPORTANT: This is required for status updates in Google Sheets
        // Using 'Order Placed' to match Invoice/Tracking display labels
        'Status': 'Order Placed',

        // Attributes
        'Page ID': context.pageId || '',
        'Page Name': context.pageName || '',

        // Timestamp
        'Timestamp': new Date().toISOString(),
        'Date': new Date().toLocaleDateString('en-PH'),
        'Time': new Date().toLocaleTimeString('en-PH')
    };

    console.log('[syncToGoogleSheets] 📤 Sending to webhook:', webhookUrl.substring(0, 50) + '...');
    console.log('[syncToGoogleSheets] 📋 Payload:', JSON.stringify(webhookPayload, null, 2));

    // Send to Google Sheets webhook - include sheetName for correct tab
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sheetName: sheetName,
            rowData: webhookPayload
        })
    });

    const responseText = await response.text();
    console.log('[syncToGoogleSheets] ✓ Response:', response.status, responseText.substring(0, 100));
}
