-- ============================================
-- FIX: Missing RLS Policies for Workspace Tables
-- Run this in Supabase SQL Editor
-- Fixes: flow save hanging, and other workspace operations
-- 
-- ROOT CAUSE: These tables have RLS enabled but only 
-- service_role policies. Authenticated users have NO 
-- access policies, causing operations to silently hang.
-- ============================================

-- ============================================
-- STEP 1: FLOWS - Add authenticated user policies
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own flows" ON public.flows;
  DROP POLICY IF EXISTS "Users can view own flows" ON public.flows;
  DROP POLICY IF EXISTS "Users can create flows" ON public.flows;
  DROP POLICY IF EXISTS "Users can update own flows" ON public.flows;
  DROP POLICY IF EXISTS "Users can delete own flows" ON public.flows;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Users can view flows in their workspace
CREATE POLICY "Users can view own flows"
ON public.flows FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- Users can create flows in their workspace
CREATE POLICY "Users can create flows"
ON public.flows FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- Users can update flows in their workspace
CREATE POLICY "Users can update own flows"
ON public.flows FOR UPDATE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- Users can delete flows in their workspace
CREATE POLICY "Users can delete own flows"
ON public.flows FOR DELETE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- ============================================
-- STEP 2: FORMS - Add authenticated user policies
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own forms" ON public.forms;
  DROP POLICY IF EXISTS "Users can create forms" ON public.forms;
  DROP POLICY IF EXISTS "Users can update own forms" ON public.forms;
  DROP POLICY IF EXISTS "Users can delete own forms" ON public.forms;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own forms"
ON public.forms FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create forms"
ON public.forms FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update own forms"
ON public.forms FOR UPDATE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete own forms"
ON public.forms FOR DELETE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- ============================================
-- STEP 3: CONNECTED PAGES - Add authenticated user policies
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own connected pages" ON public.connected_pages;
  DROP POLICY IF EXISTS "Users can create connected pages" ON public.connected_pages;
  DROP POLICY IF EXISTS "Users can update own connected pages" ON public.connected_pages;
  DROP POLICY IF EXISTS "Users can delete own connected pages" ON public.connected_pages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own connected pages"
ON public.connected_pages FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create connected pages"
ON public.connected_pages FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update own connected pages"
ON public.connected_pages FOR UPDATE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete own connected pages"
ON public.connected_pages FOR DELETE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- ============================================
-- STEP 4: SUBSCRIBERS - Add authenticated user policies
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own subscribers" ON public.subscribers;
  DROP POLICY IF EXISTS "Users can create subscribers" ON public.subscribers;
  DROP POLICY IF EXISTS "Users can update own subscribers" ON public.subscribers;
  DROP POLICY IF EXISTS "Users can delete own subscribers" ON public.subscribers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own subscribers"
ON public.subscribers FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create subscribers"
ON public.subscribers FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update own subscribers"
ON public.subscribers FOR UPDATE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete own subscribers"
ON public.subscribers FOR DELETE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- ============================================
-- STEP 5: CONVERSATIONS - Add authenticated user policies
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
  DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
  DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
  DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete own conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- ============================================
-- STEP 6: MESSAGES - Add authenticated user policies
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
  DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
  DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
  DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

CREATE POLICY "Users can create messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

-- ============================================
-- STEP 7: Other workspace tables
-- ============================================

-- META CONNECTIONS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own meta connections" ON public.meta_connections;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own meta connections"
ON public.meta_connections FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- SCHEDULED POSTS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own scheduled posts" ON public.scheduled_posts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own scheduled posts"
ON public.scheduled_posts FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- SCHEDULER WORKFLOWS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own scheduler workflows" ON public.scheduler_workflows;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own scheduler workflows"
ON public.scheduler_workflows FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- SCHEDULER EXECUTIONS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own scheduler executions" ON public.scheduler_executions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own scheduler executions"
ON public.scheduler_executions FOR ALL
TO authenticated
USING (
  workflow_id IN (
    SELECT id FROM public.scheduler_workflows 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

-- STORES
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own stores" ON public.stores;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own stores"
ON public.stores FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- PRODUCTS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own products" ON public.products;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own products"
ON public.products FOR ALL
TO authenticated
USING (
  store_id IN (
    SELECT id FROM public.stores 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

-- STORE ORDERS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own store orders" ON public.store_orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own store orders"
ON public.store_orders FOR ALL
TO authenticated
USING (
  store_id IN (
    SELECT id FROM public.stores 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

-- ORDER ITEMS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own order items" ON public.order_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own order items"
ON public.order_items FOR ALL
TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.store_orders 
    WHERE store_id IN (
      SELECT id FROM public.stores 
      WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    )
  )
);

-- ORDERS (flow-based)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own orders" ON public.orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own orders"
ON public.orders FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- WORKSPACE SETTINGS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own workspace settings" ON public.workspace_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own workspace settings"
ON public.workspace_settings FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- SUPPORT TICKETS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own tickets" ON public.support_tickets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own tickets"
ON public.support_tickets FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- TICKET MESSAGES
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own ticket messages" ON public.ticket_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own ticket messages"
ON public.ticket_messages FOR ALL
TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
  ) OR
  ticket_id IN (
    SELECT id FROM public.support_tickets 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

-- USER SUBSCRIPTIONS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
  DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.user_subscriptions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own subscriptions"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow admins to view all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
ON public.user_subscriptions FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- FORM SUBMISSIONS (public access for form submitters)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can create form submissions" ON public.form_submissions;
  DROP POLICY IF EXISTS "Users can view own form submissions" ON public.form_submissions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Anyone can create form submissions"
ON public.form_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view own form submissions"
ON public.form_submissions FOR SELECT
TO authenticated
USING (
  form_id IN (
    SELECT id FROM public.forms 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

-- FORM OPENS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can manage form opens" ON public.form_opens;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Anyone can manage form opens"
ON public.form_opens FOR ALL
USING (true);

-- NODE ANALYTICS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own node analytics" ON public.node_analytics;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own node analytics"
ON public.node_analytics FOR ALL
TO authenticated
USING (
  flow_id IN (
    SELECT id FROM public.flows 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

-- COMMENTS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own comments" ON public.comments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage own comments"
ON public.comments FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- COMMENT AUTOMATION LOG
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage comment automation log" ON public.comment_automation_log;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage comment automation log"
ON public.comment_automation_log FOR ALL
TO authenticated
USING (true);

-- FLOW TEMPLATES
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage flow templates" ON public.flow_templates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage flow templates"
ON public.flow_templates FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  OR is_global = true
);

-- WEBVIEW SESSIONS (public for webview access)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can manage webview sessions" ON public.webview_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Anyone can manage webview sessions"
ON public.webview_sessions FOR ALL
USING (true);

-- REACTIONS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage reactions" ON public.reactions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage reactions"
ON public.reactions FOR ALL
TO authenticated
USING (true);

-- SCHEDULER TOPIC HISTORY
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage topic history" ON public.scheduler_topic_history;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage topic history"
ON public.scheduler_topic_history FOR ALL
TO authenticated
USING (
  workflow_id IN (
    SELECT id FROM public.scheduler_workflows 
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
);

-- ============================================
-- STEP 8: Verify - Show all policies for flows table
-- ============================================
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'flows'
ORDER BY policyname;
