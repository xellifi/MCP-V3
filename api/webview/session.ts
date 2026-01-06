import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Webview Session API
 * 
 * POST /api/webview/session - Create a new session
 * GET /api/webview/session?id=xxx - Get session by ID
 * PATCH /api/webview/session - Update session
 */

export interface WebviewSession {
    id: string;
    external_id: string;
    workspace_id: string;
    flow_id?: string;
    current_node_id?: string;
    page_type: 'product' | 'upsell' | 'downsell' | 'cart' | 'form';
    page_config: any;
    cart: any[];
    cart_total: number;
    form_data: any;
    user_response?: string;
    metadata: any;
    page_access_token?: string;
    created_at: string;
    expires_at: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS for webview pages
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // GET - Retrieve session
        if (req.method === 'GET') {
            const { id } = req.query;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'Session ID required' });
            }

            const { data: session, error } = await supabase
                .from('webview_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !session) {
                console.error('[Session] Error fetching session:', error);
                return res.status(404).json({ error: 'Session not found' });
            }

            // Check if session is expired
            if (new Date(session.expires_at) < new Date()) {
                return res.status(410).json({ error: 'Session expired' });
            }

            return res.status(200).json({ session });
        }

        // POST - Create new session
        if (req.method === 'POST') {
            const {
                external_id,
                workspace_id,
                flow_id,
                current_node_id,
                page_type,
                page_config,
                cart,
                cart_total,
                metadata,
                page_access_token
            } = req.body;

            if (!external_id || !workspace_id || !page_type) {
                return res.status(400).json({
                    error: 'Missing required fields: external_id, workspace_id, page_type'
                });
            }

            const { data: session, error } = await supabase
                .from('webview_sessions')
                .insert({
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
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('[Session] Error creating session:', error);
                return res.status(500).json({ error: 'Failed to create session' });
            }

            console.log(`[Session] Created session ${session.id} for ${page_type}`);
            return res.status(201).json({ session });
        }

        // PATCH - Update session
        if (req.method === 'PATCH') {
            const { id, ...updates } = req.body;

            if (!id) {
                return res.status(400).json({ error: 'Session ID required' });
            }

            const { data: session, error } = await supabase
                .from('webview_sessions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[Session] Error updating session:', error);
                return res.status(500).json({ error: 'Failed to update session' });
            }

            return res.status(200).json({ session });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('[Session] Unexpected error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
