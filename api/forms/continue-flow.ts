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
            submissionData
        } = req.body;

        console.log('[Continue Flow] Starting flow continuation...');
        console.log('[Continue Flow] Flow ID:', flowId);
        console.log('[Continue Flow] Form Node ID:', nodeId);
        console.log('[Continue Flow] Page ID:', pageId);
        console.log('[Continue Flow] Subscriber:', subscriberId, subscriberName);

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
            commentId: `form_submission_${Date.now()}`
        };

        console.log('[Continue Flow] Execution context:', {
            commenterId: context.commenterId,
            form_submitted: context.form_submitted
        });

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

        // Process queue and execute nodes
        while (queue.length > 0) {
            const current = queue.shift()!;
            const currentNodeId = current.nodeId;

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

                // Debug: Log all edges from this condition node
                const allConditionEdges = edges.filter((e: any) => e.source === currentNodeId);
                console.log('[Continue Flow] All edges from condition node:', allConditionEdges.map((e: any) => ({
                    target: e.target,
                    sourceHandle: e.sourceHandle,
                    expectedHandle: conditionResult ? 'true' : 'false',
                    matches: e.sourceHandle === (conditionResult ? 'true' : 'false')
                })));

                // Find edges with matching sourceHandle
                const conditionEdges = edges.filter((e: any) =>
                    e.source === currentNodeId &&
                    e.sourceHandle === (conditionResult ? 'true' : 'false')
                );

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

            // Handle Invoice Node - send invoice message
            if (node.type === 'invoiceNode') {
                console.log('[Continue Flow] Processing Invoice node');
                const companyName = config.companyName || 'Your Company';
                const invoiceMessage = `🧾 *Invoice from ${companyName}*\n\nThank you for your order! Your invoice has been generated.\n\n✅ Order Confirmed\n📦 We will process your order soon.`;
                await sendTextMessage(
                    subscriberId,
                    invoiceMessage,
                    [],
                    pageAccessToken
                );
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
