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
        let pageAccessToken = '';
        let pageName = '';
        let workspaceId = '';

        if (pageId) {
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

        if (!pageAccessToken) {
            console.error('[Continue Flow] No page access token found for pageId:', pageId);
            return res.status(400).json({ error: 'No page access token', pageId });
        }

        // Create context for flow execution
        const context = {
            commenterId: subscriberId,
            commenterName: subscriberName || 'Customer',
            form_submitted: formSubmitted === true,
            formSubmitted: formSubmitted === true,
            submissionData,
            pageId,
            pageName,
            workspaceId,
            commentId: `form_submission_${Date.now()}`,
            // Start with fresh cart for every new form submission
            cart: [],
            cartTotal: 0
        };

        console.log('[Continue Flow] Execution context:', {
            commenterId: context.commenterId,
            form_submitted: context.form_submitted
        });

        // CRITICAL FIX: Initialize cart with the MAIN PRODUCT from form submission
        // The form has a product configured with name, price, quantity
        if (workspaceId && subscriberId) {
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

                // Update context with cart
                (context as any).cart = initialCart;
                (context as any).cartTotal = initialCartTotal;

                const { data: existingSubscriber } = await supabase
                    .from('subscribers')
                    .select('metadata')
                    .eq('workspace_id', workspaceId)
                    .eq('external_id', subscriberId)
                    .single();

                await supabase
                    .from('subscribers')
                    .update({
                        metadata: {
                            // Keep essential subscriber info
                            email: existingSubscriber?.metadata?.email,
                            phone: existingSubscriber?.metadata?.phone,
                            address: existingSubscriber?.metadata?.address,
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

            // If it's a sheetsNode, skip it and find nodes after it
            if (targetNode.type === 'sheetsNode') {
                console.log('[Continue Flow] Found sheets node, looking for nodes after it');
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
            console.log('[Continue Flow] Processing node:', node.data?.label, 'Type:', node.type);

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

                // Build invoice URL using the submissionId passed directly from FormView
                // This is more reliable than looking it up by subscriber
                let invoiceUrl = '';
                let finalSubmissionId = submissionId; // Use the ID passed from FormView

                // Fallback: If submissionId not passed, try to look it up
                if (!finalSubmissionId) {
                    console.log('[Continue Flow] No submissionId passed, looking up by subscriber:', subscriberId);
                    try {
                        const { data: submission } = await supabase
                            .from('form_submissions')
                            .select('id')
                            .eq('subscriber_external_id', subscriberId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (submission) {
                            finalSubmissionId = submission.id;
                        }
                    } catch (err) {
                        console.error('[Continue Flow] Error looking up submission:', err);
                    }
                }

                if (finalSubmissionId) {
                    console.log('[Continue Flow] Using submission ID:', finalSubmissionId);
                    const baseUrl = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';

                    // Use server-side rendered invoice endpoint (works in Messenger's in-app browser)
                    const params = new URLSearchParams();
                    params.set('id', finalSubmissionId);
                    params.set('company', companyName);
                    params.set('color', accentColor);
                    if (companyLogo) params.set('logo', companyLogo);
                    if (companyAddress) params.set('address', companyAddress);

                    invoiceUrl = `${baseUrl}/api/invoices/view?${params.toString()}`;
                    console.log('[Continue Flow] Invoice URL:', invoiceUrl);
                } else {
                    console.log('[Continue Flow] No submission ID available for invoice');
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

            // Handle Upsell Node - send upsell offer and STOP traversal (wait for user response)
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

        // Handle upsell_response - check context first
        if (variable === 'upsell_response') {
            actualValue = context.upsell_response || '';
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
                                    title: '🛒 View Offer',
                                    url: webviewUrl,
                                    webview_height_ratio: 'tall',
                                    messenger_extensions: true
                                }]
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
                                    title: '🛒 View Offer',
                                    url: webviewUrl,
                                    webview_height_ratio: 'tall',
                                    messenger_extensions: true
                                }]
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

// Send checkout confirmation via Messenger
async function sendCheckoutOffer(
    userId: string,
    config: any,
    nodeId: string,
    flowId: string,
    pageAccessToken: string,
    workspaceId: string,
    context: any
): Promise<void> {
    console.log('[Continue Flow] Sending Checkout confirmation to:', userId);

    const headerText = config.headerText || '🛒 Order Summary';
    const buttonText = config.buttonText || '✅ Confirm Order';
    const confirmationMessage = config.confirmationMessage || '';

    try {
        const confirmPayload = JSON.stringify({
            action: 'checkout_confirm',
            flowId,
            nodeId
        });

        // Get cart from context/metadata if available
        const cart = context.cart || context.metadata?.cart || [];
        const cartTotal = context.cartTotal || context.metadata?.cartTotal || 0;

        let summaryText = headerText;
        if (cart.length > 0) {
            summaryText += '\n\n';
            cart.forEach((item: any) => {
                summaryText += `• ${item.productName || item.name} - ₱${item.productPrice || item.price}\n`;
            });
            summaryText += `\nTotal: ₱${cartTotal}`;
        }

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
        console.log('[Continue Flow] ✓ Checkout message sent');
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
