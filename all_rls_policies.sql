-- ============================================
-- COMPLETE RLS POLICIES FOR SELF-HOSTED SUPABASE
-- Run this after running the main migration script
-- Excludes packages table (already configured)
-- ============================================

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow profile creation" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can view all profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role full access profiles" ON public.profiles FOR ALL TO service_role USING (true);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);

-- ============================================
-- 2. WORKSPACES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can manage workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Service role full access workspaces" ON public.workspaces;

CREATE POLICY "Users can view own workspaces" ON public.workspaces FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create workspaces" ON public.workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own workspaces" ON public.workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own workspaces" ON public.workspaces FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY "Service role full access workspaces" ON public.workspaces FOR ALL TO service_role USING (true);

-- ============================================
-- 3. ADMIN SETTINGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated can read admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;

CREATE POLICY "Authenticated can read admin settings" ON public.admin_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage settings" ON public.admin_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);
CREATE POLICY "Service role full access admin_settings" ON public.admin_settings FOR ALL TO service_role USING (true);

-- ============================================
-- 4. USER SUBSCRIPTIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can create subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Service role full access user_subscriptions" ON public.user_subscriptions;

CREATE POLICY "Users can view own subscription" ON public.user_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own subscription" ON public.user_subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);
CREATE POLICY "Service role full access user_subscriptions" ON public.user_subscriptions FOR ALL TO service_role USING (true);

-- ============================================
-- 5. WORKSPACE SETTINGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access workspace_settings" ON public.workspace_settings;

CREATE POLICY "Users can view own workspace settings" ON public.workspace_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own workspace settings" ON public.workspace_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access workspace_settings" ON public.workspace_settings FOR ALL TO service_role USING (true);

-- ============================================
-- 6. CONNECTED PAGES TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access connected_pages" ON public.connected_pages;

CREATE POLICY "Users can view own connected pages" ON public.connected_pages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own connected pages" ON public.connected_pages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access connected_pages" ON public.connected_pages FOR ALL TO service_role USING (true);

-- ============================================
-- 7. META CONNECTIONS TABLE
-- ============================================
CREATE POLICY "Users can view own meta connections" ON public.meta_connections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own meta connections" ON public.meta_connections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access meta_connections" ON public.meta_connections FOR ALL TO service_role USING (true);

-- ============================================
-- 8. SUBSCRIBERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access subscribers" ON public.subscribers;

CREATE POLICY "Users can view own subscribers" ON public.subscribers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own subscribers" ON public.subscribers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access subscribers" ON public.subscribers FOR ALL TO service_role USING (true);

-- ============================================
-- 9. CONVERSATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access conversations" ON public.conversations;

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access conversations" ON public.conversations FOR ALL TO service_role USING (true);

-- ============================================
-- 10. MESSAGES TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access messages" ON public.messages;

CREATE POLICY "Users can view messages in own conversations" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    JOIN public.workspaces w ON c.workspace_id = w.id 
    WHERE c.id = conversation_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can manage messages in own conversations" ON public.messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    JOIN public.workspaces w ON c.workspace_id = w.id 
    WHERE c.id = conversation_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Service role full access messages" ON public.messages FOR ALL TO service_role USING (true);

-- ============================================
-- 11. REACTIONS TABLE
-- ============================================
CREATE POLICY "Users can view reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own reactions" ON public.reactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Service role full access reactions" ON public.reactions FOR ALL TO service_role USING (true);

-- ============================================
-- 12. FLOWS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access flows" ON public.flows;

CREATE POLICY "Users can view own flows" ON public.flows FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own flows" ON public.flows FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access flows" ON public.flows FOR ALL TO service_role USING (true);

-- ============================================
-- 13. FLOW TEMPLATES TABLE
-- ============================================
CREATE POLICY "Users can view own flow templates" ON public.flow_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  OR is_global = true
);
CREATE POLICY "Users can manage own flow templates" ON public.flow_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access flow_templates" ON public.flow_templates FOR ALL TO service_role USING (true);

-- ============================================
-- 14. FORMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access forms" ON public.forms;

CREATE POLICY "Users can view own forms" ON public.forms FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own forms" ON public.forms FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Public can view forms for submission" ON public.forms FOR SELECT USING (true);
CREATE POLICY "Service role full access forms" ON public.forms FOR ALL TO service_role USING (true);

-- ============================================
-- 15. FORM SUBMISSIONS TABLE
-- ============================================
CREATE POLICY "Users can view submissions for own forms" ON public.form_submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.forms f 
    JOIN public.workspaces w ON f.workspace_id = w.id 
    WHERE f.id = form_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Anyone can create form submissions" ON public.form_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access form_submissions" ON public.form_submissions FOR ALL TO service_role USING (true);

-- ============================================
-- 16. FORM OPENS TABLE
-- ============================================
CREATE POLICY "Users can view form opens for own flows" ON public.form_opens FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.flows f 
    JOIN public.workspaces w ON f.workspace_id = w.id 
    WHERE f.id = flow_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Public can create form opens" ON public.form_opens FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access form_opens" ON public.form_opens FOR ALL TO service_role USING (true);

-- ============================================
-- 17. NODE ANALYTICS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access node_analytics" ON public.node_analytics;

CREATE POLICY "Users can view own node analytics" ON public.node_analytics FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.flows f 
    JOIN public.workspaces w ON f.workspace_id = w.id 
    WHERE f.id = flow_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can manage own node analytics" ON public.node_analytics FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.flows f 
    JOIN public.workspaces w ON f.workspace_id = w.id 
    WHERE f.id = flow_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Service role full access node_analytics" ON public.node_analytics FOR ALL TO service_role USING (true);

-- ============================================
-- 18. COMMENTS TABLE
-- ============================================
CREATE POLICY "Users can view own comments" ON public.comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own comments" ON public.comments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access comments" ON public.comments FOR ALL TO service_role USING (true);

-- ============================================
-- 19. COMMENT AUTOMATION LOG TABLE
-- ============================================
CREATE POLICY "Users can view own automation logs" ON public.comment_automation_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.flows f 
    JOIN public.workspaces w ON f.workspace_id = w.id 
    WHERE f.id = flow_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Service role full access comment_automation_log" ON public.comment_automation_log FOR ALL TO service_role USING (true);

-- ============================================
-- 20. SCHEDULED POSTS TABLE
-- ============================================
CREATE POLICY "Users can view own scheduled posts" ON public.scheduled_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own scheduled posts" ON public.scheduled_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access scheduled_posts" ON public.scheduled_posts FOR ALL TO service_role USING (true);

-- ============================================
-- 21. SCHEDULER WORKFLOWS TABLE
-- ============================================
CREATE POLICY "Users can view own scheduler workflows" ON public.scheduler_workflows FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own scheduler workflows" ON public.scheduler_workflows FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access scheduler_workflows" ON public.scheduler_workflows FOR ALL TO service_role USING (true);

-- ============================================
-- 22. SCHEDULER EXECUTIONS TABLE
-- ============================================
CREATE POLICY "Users can view own scheduler executions" ON public.scheduler_executions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.scheduler_workflows sw 
    JOIN public.workspaces w ON sw.workspace_id = w.id 
    WHERE sw.id = workflow_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Service role full access scheduler_executions" ON public.scheduler_executions FOR ALL TO service_role USING (true);

-- ============================================
-- 23. SCHEDULER TOPIC HISTORY TABLE
-- ============================================
CREATE POLICY "Users can view own topic history" ON public.scheduler_topic_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.scheduler_workflows sw 
    JOIN public.workspaces w ON sw.workspace_id = w.id 
    WHERE sw.id = workflow_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Service role full access scheduler_topic_history" ON public.scheduler_topic_history FOR ALL TO service_role USING (true);

-- ============================================
-- 24. STORES TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access stores" ON public.stores;

CREATE POLICY "Public can view active stores" ON public.stores FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view own stores" ON public.stores FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own stores" ON public.stores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Service role full access stores" ON public.stores FOR ALL TO service_role USING (true);

-- ============================================
-- 25. PRODUCTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access products" ON public.products;

CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (status = 'active');
CREATE POLICY "Users can view own products" ON public.products FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.stores s 
    JOIN public.workspaces w ON s.workspace_id = w.id 
    WHERE s.id = store_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can manage own products" ON public.products FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.stores s 
    JOIN public.workspaces w ON s.workspace_id = w.id 
    WHERE s.id = store_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Service role full access products" ON public.products FOR ALL TO service_role USING (true);

-- ============================================
-- 26. STORE ORDERS TABLE
-- ============================================
CREATE POLICY "Users can view own store orders" ON public.store_orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.stores s 
    JOIN public.workspaces w ON s.workspace_id = w.id 
    WHERE s.id = store_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Users can manage own store orders" ON public.store_orders FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.stores s 
    JOIN public.workspaces w ON s.workspace_id = w.id 
    WHERE s.id = store_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Public can create store orders" ON public.store_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access store_orders" ON public.store_orders FOR ALL TO service_role USING (true);

-- ============================================
-- 27. ORDER ITEMS TABLE
-- ============================================
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.store_orders so 
    JOIN public.stores s ON so.store_id = s.id
    JOIN public.workspaces w ON s.workspace_id = w.id 
    WHERE so.id = order_id AND w.owner_id = auth.uid()
  )
);
CREATE POLICY "Public can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access order_items" ON public.order_items FOR ALL TO service_role USING (true);

-- ============================================
-- 28. ORDERS TABLE (Flow Orders)
-- ============================================
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can manage own orders" ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "Public can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL TO service_role USING (true);

-- ============================================
-- 29. SUPPORT TICKETS TABLE
-- ============================================
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);
CREATE POLICY "Service role full access support_tickets" ON public.support_tickets FOR ALL TO service_role USING (true);

-- ============================================
-- 30. TICKET MESSAGES TABLE
-- ============================================
CREATE POLICY "Users can view messages in own tickets" ON public.ticket_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create messages in own tickets" ON public.ticket_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all ticket messages" ON public.ticket_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);
CREATE POLICY "Service role full access ticket_messages" ON public.ticket_messages FOR ALL TO service_role USING (true);

-- ============================================
-- 31. WEBVIEW SESSIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access webview" ON public.webview_sessions;

CREATE POLICY "Public can view webview sessions" ON public.webview_sessions FOR SELECT USING (true);
CREATE POLICY "Public can create webview sessions" ON public.webview_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update webview sessions" ON public.webview_sessions FOR UPDATE USING (true);
CREATE POLICY "Service role full access webview_sessions" ON public.webview_sessions FOR ALL TO service_role USING (true);

-- ============================================
-- DONE! RLS Policies Complete
-- ============================================
