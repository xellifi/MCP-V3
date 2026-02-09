-- ============================================
-- COMPLETE DATABASE MIGRATION FOR SELF-HOSTED SUPABASE
-- Run this in your self-hosted Supabase SQL Editor
-- Tables are in correct order to respect foreign key constraints
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (No dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'MEMBER'::text,
  avatar_url text,
  affiliate_code text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  email_verified boolean DEFAULT false,
  facebook_id text,
  facebook_access_token text,
  auth_provider text DEFAULT 'email'::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- 2. WORKSPACES TABLE (Depends on: profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  google_webhook_url text,
  CONSTRAINT workspaces_pkey PRIMARY KEY (id),
  CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================
-- 3. ADMIN SETTINGS TABLE (No dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id integer NOT NULL DEFAULT 1,
  facebook_app_id text,
  facebook_app_secret text,
  facebook_verify_token text,
  openai_api_key text,
  gemini_api_key text,
  menu_sequence jsonb DEFAULT '[]'::jsonb,
  affiliate_enabled boolean DEFAULT true,
  affiliate_commission numeric DEFAULT 15.00,
  affiliate_currency text DEFAULT 'USD'::text,
  affiliate_min_withdrawal numeric DEFAULT 100,
  affiliate_withdrawal_days integer[] DEFAULT ARRAY[1],
  smtp_host text,
  smtp_port text,
  smtp_user text,
  smtp_password text,
  smtp_from_email text,
  webhook_url text,
  default_theme text DEFAULT 'dark'::text,
  payment_config jsonb DEFAULT '{"bank": {"enabled": false, "instructions": ""}, "paypal": {"enabled": false, "clientId": "", "clientSecret": ""}, "xendit": {"enabled": false, "publicKey": "", "secretKey": ""}, "ewallet": {"enabled": false, "instructions": ""}}'::jsonb,
  email_verification_provider text DEFAULT 'supabase'::text,
  google_client_id text,
  google_client_secret text,
  facebook_login_enabled boolean DEFAULT false,
  google_login_enabled boolean DEFAULT false,
  support_attachments_enabled boolean DEFAULT true,
  email_domain_restriction_enabled boolean DEFAULT false,
  allowed_email_domains text[] DEFAULT ARRAY['gmail.com'::text, 'yahoo.com'::text, 'outlook.com'::text, 'hotmail.com'::text, 'icloud.com'::text],
  CONSTRAINT admin_settings_pkey PRIMARY KEY (id)
);

-- Insert default admin settings
INSERT INTO public.admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. PACKAGES TABLE (No dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS public.packages (
  id text NOT NULL,
  name text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD'::text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  color text NOT NULL DEFAULT 'slate'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  allowed_routes jsonb DEFAULT '[]'::jsonb,
  is_visible text,
  price_lifetime numeric,
  display_order integer DEFAULT 99,
  duration_days integer CHECK (duration_days IS NULL OR duration_days >= 1 AND duration_days <= 30),
  price_daily numeric,
  price_custom numeric DEFAULT 0,
  description text DEFAULT ''::text,
  CONSTRAINT packages_pkey PRIMARY KEY (id)
);

-- ============================================
-- 5. USER SUBSCRIPTIONS (Depends on: profiles, packages)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  package_id text,
  status text DEFAULT 'Active'::text,
  billing_cycle text DEFAULT 'Monthly'::text,
  amount numeric,
  next_billing_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  payment_method text,
  proof_url text,
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_subscriptions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id)
);

-- ============================================
-- 6. WORKSPACE SETTINGS (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  openai_api_key text,
  gemini_api_key text,
  smtp_host text,
  smtp_port text,
  smtp_user text,
  smtp_password text,
  smtp_from_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  openrouter_api_key text,
  CONSTRAINT workspace_settings_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_settings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- ============================================
-- 7. CONNECTED PAGES (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.connected_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name text NOT NULL,
  page_id text NOT NULL,
  page_image_url text,
  page_followers integer DEFAULT 0,
  instagram_id text,
  instagram_username text,
  instagram_image_url text,
  instagram_followers integer DEFAULT 0,
  is_automation_enabled boolean DEFAULT false,
  status text DEFAULT 'CONNECTED'::text,
  created_at timestamp with time zone DEFAULT now(),
  page_access_token text,
  CONSTRAINT connected_pages_pkey PRIMARY KEY (id),
  CONSTRAINT connected_pages_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- ============================================
-- 8. META CONNECTIONS (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.meta_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid,
  platform text NOT NULL,
  name text NOT NULL,
  external_id text NOT NULL,
  status text DEFAULT 'CONNECTED'::text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  access_token text,
  CONSTRAINT meta_connections_pkey PRIMARY KEY (id),
  CONSTRAINT meta_connections_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- ============================================
-- 9. SUBSCRIBERS (Depends on: workspaces, connected_pages)
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name text NOT NULL,
  platform text NOT NULL,
  external_id text NOT NULL UNIQUE,
  avatar_url text,
  status text DEFAULT 'SUBSCRIBED'::text,
  tags text[] DEFAULT '{}'::text[],
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  page_id uuid,
  labels text[] DEFAULT '{}'::text[],
  source text CHECK (source IS NULL OR source = ANY (ARRAY['COMMENT'::text, 'MESSAGE'::text, 'POSTBACK'::text])),
  metadata jsonb DEFAULT '{}'::jsonb,
  email text,
  CONSTRAINT subscribers_pkey PRIMARY KEY (id),
  CONSTRAINT subscribers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT subscribers_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.connected_pages(id) ON DELETE SET NULL
);

-- ============================================
-- 10. CONVERSATIONS (Depends on: workspaces, subscribers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid,
  subscriber_id uuid,
  platform text NOT NULL,
  last_message_preview text,
  unread_count integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  external_id text,
  page_id text,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT conversations_subscriber_id_fkey FOREIGN KEY (subscriber_id) REFERENCES public.subscribers(id) ON DELETE CASCADE
);

-- ============================================
-- 11. MESSAGES (Depends on: conversations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  direction text NOT NULL,
  content text,
  type text DEFAULT 'TEXT'::text,
  attachment_url text,
  file_name text,
  status text DEFAULT 'SENT'::text,
  created_at timestamp with time zone DEFAULT now(),
  external_id text,
  sender_id text,
  platform text CHECK (platform IS NULL OR platform = ANY (ARRAY['FACEBOOK'::text, 'INSTAGRAM'::text])),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE
);

-- ============================================
-- 12. REACTIONS (Depends on: messages)
-- ============================================
CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL,
  user_id uuid,
  reaction text NOT NULL CHECK (reaction = ANY (ARRAY['LOVE'::text, 'HAHA'::text, 'WOW'::text, 'SAD'::text, 'ANGRY'::text, 'LIKE'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reactions_pkey PRIMARY KEY (id),
  CONSTRAINT reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
  CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 13. FLOWS (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.flows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name text NOT NULL,
  status text DEFAULT 'DRAFT'::text,
  nodes jsonb DEFAULT '[]'::jsonb,
  edges jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  configurations jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT flows_pkey PRIMARY KEY (id),
  CONSTRAINT flows_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- ============================================
-- 14. FLOW TEMPLATES (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.flow_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  nodes jsonb NOT NULL,
  edges jsonb NOT NULL,
  configurations jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_global boolean DEFAULT false,
  created_by uuid,
  CONSTRAINT flow_templates_pkey PRIMARY KEY (id),
  CONSTRAINT flow_templates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT flow_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 15. FORMS (Depends on: workspaces, flows)
-- ============================================
CREATE TABLE IF NOT EXISTS public.forms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid,
  flow_id uuid,
  node_id text,
  name text NOT NULL DEFAULT 'Untitled Form'::text,
  header_image_url text,
  submit_button_text text DEFAULT 'Submit'::text,
  submit_button_color text DEFAULT '#6366f1'::text,
  border_radius text DEFAULT 'round'::text,
  success_message text DEFAULT 'Thank you for your submission!'::text,
  google_sheet_id text,
  google_sheet_name text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  countdown_enabled boolean DEFAULT false,
  countdown_minutes integer DEFAULT 10,
  is_order_form boolean DEFAULT true,
  product_price numeric DEFAULT 0,
  currency character varying DEFAULT 'PHP'::character varying,
  max_quantity integer DEFAULT 10,
  coupon_enabled boolean DEFAULT false,
  coupon_code character varying DEFAULT ''::character varying,
  coupon_discount integer DEFAULT 0,
  cod_enabled boolean DEFAULT true,
  ewallet_enabled boolean DEFAULT true,
  ewallet_options jsonb DEFAULT '[]'::jsonb,
  ewallet_numbers jsonb DEFAULT '{}'::jsonb,
  require_proof_upload boolean DEFAULT true,
  form_template character varying DEFAULT 'modern'::character varying,
  countdown_blink boolean DEFAULT true,
  product_name character varying DEFAULT ''::character varying,
  google_webhook_url text,
  promo_text text DEFAULT 'Promo Only!'::text,
  promo_icon text DEFAULT '🔥'::text,
  page_id text,
  CONSTRAINT forms_pkey PRIMARY KEY (id),
  CONSTRAINT forms_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT forms_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.flows(id) ON DELETE SET NULL
);

-- ============================================
-- 16. FORM SUBMISSIONS (Depends on: forms)
-- ============================================
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid,
  subscriber_external_id text,
  subscriber_name text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_to_sheets boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT form_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT form_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE
);

-- ============================================
-- 17. FORM OPENS (Depends on: flows)
-- ============================================
CREATE TABLE IF NOT EXISTS public.form_opens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id text,
  flow_id uuid,
  node_id text,
  page_id text,
  subscriber_id text NOT NULL,
  subscriber_name text,
  opened_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  followup_count integer DEFAULT 0,
  last_followup_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  sent_followup_ids text[] DEFAULT '{}'::text[],
  CONSTRAINT form_opens_pkey PRIMARY KEY (id),
  CONSTRAINT form_opens_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.flows(id) ON DELETE SET NULL
);

-- ============================================
-- 18. NODE ANALYTICS (Depends on: flows)
-- ============================================
CREATE TABLE IF NOT EXISTS public.node_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flow_id uuid,
  node_id text NOT NULL,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  subscriber_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT node_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT node_analytics_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.flows(id) ON DELETE CASCADE
);

-- ============================================
-- 19. COMMENTS (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid,
  page_id text NOT NULL,
  post_id text NOT NULL,
  comment_id text NOT NULL UNIQUE,
  parent_comment_id text,
  message text,
  commenter_id text NOT NULL,
  commenter_name text,
  created_time timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  processed boolean DEFAULT false,
  is_page_comment boolean DEFAULT false,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- ============================================
-- 20. COMMENT AUTOMATION LOG (Depends on: flows)
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_automation_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id text NOT NULL,
  flow_id uuid,
  action_type text NOT NULL CHECK (action_type = ANY (ARRAY['comment_reply'::text, 'dm_sent'::text])),
  executed_at timestamp with time zone DEFAULT now(),
  success boolean DEFAULT true,
  error_message text,
  facebook_response jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_automation_log_pkey PRIMARY KEY (id),
  CONSTRAINT comment_automation_log_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.flows(id) ON DELETE SET NULL
);

-- ============================================
-- 21. SCHEDULED POSTS (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid,
  content text NOT NULL,
  platform text NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  status text DEFAULT 'PENDING'::text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduled_posts_pkey PRIMARY KEY (id),
  CONSTRAINT scheduled_posts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- ============================================
-- 22. SCHEDULER WORKFLOWS (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.scheduler_workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Workflow'::text,
  description text,
  status text NOT NULL DEFAULT 'draft'::text,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  configurations jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule_type text DEFAULT 'daily'::text,
  schedule_time time without time zone DEFAULT '09:00:00'::time without time zone,
  schedule_days integer[] DEFAULT '{}'::integer[],
  schedule_timezone text DEFAULT 'UTC'::text,
  cron_expression text,
  next_run_at timestamp with time zone,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  schedule_times text[] DEFAULT '{}'::text[],
  CONSTRAINT scheduler_workflows_pkey PRIMARY KEY (id),
  CONSTRAINT scheduler_workflows_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- ============================================
-- 23. SCHEDULER EXECUTIONS (Depends on: scheduler_workflows)
-- ============================================
CREATE TABLE IF NOT EXISTS public.scheduler_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running'::text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  result jsonb,
  error text,
  generated_topic text,
  generated_image_url text,
  generated_caption text,
  facebook_post_id text,
  CONSTRAINT scheduler_executions_pkey PRIMARY KEY (id),
  CONSTRAINT scheduler_executions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.scheduler_workflows(id) ON DELETE CASCADE
);

-- ============================================
-- 24. SCHEDULER TOPIC HISTORY (Depends on: scheduler_workflows)
-- ============================================
CREATE TABLE IF NOT EXISTS public.scheduler_topic_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  topic text NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduler_topic_history_pkey PRIMARY KEY (id),
  CONSTRAINT scheduler_topic_history_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.scheduler_workflows(id) ON DELETE CASCADE
);

-- ============================================
-- 25. STORES (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name character varying NOT NULL DEFAULT 'My Store'::character varying,
  slug character varying NOT NULL UNIQUE,
  logo_url text,
  description text,
  primary_color character varying DEFAULT '#7c3aed'::character varying,
  accent_color character varying DEFAULT '#6366f1'::character varying,
  email character varying,
  phone character varying,
  address text,
  is_active boolean DEFAULT true,
  currency character varying DEFAULT 'PHP'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  google_webhook_url text,
  google_sheet_name text DEFAULT 'Sheet1'::text,
  google_spreadsheet_id text,
  CONSTRAINT stores_pkey PRIMARY KEY (id),
  CONSTRAINT stores_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- ============================================
-- 26. PRODUCTS (Depends on: stores)
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid,
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  compare_at_price numeric,
  images jsonb DEFAULT '[]'::jsonb,
  stock_quantity integer DEFAULT 0,
  track_inventory boolean DEFAULT false,
  status character varying DEFAULT 'active'::character varying,
  category character varying,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE
);

-- ============================================
-- 27. STORE ORDERS (Depends on: stores)
-- ============================================
CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid,
  order_number character varying NOT NULL,
  customer_name character varying NOT NULL,
  customer_email character varying,
  customer_phone character varying,
  shipping_address text,
  status character varying DEFAULT 'pending'::character varying,
  payment_method character varying,
  payment_status character varying DEFAULT 'pending'::character varying,
  subtotal numeric NOT NULL DEFAULT 0,
  shipping_fee numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  proof_url text,
  CONSTRAINT store_orders_pkey PRIMARY KEY (id),
  CONSTRAINT store_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE
);

-- ============================================
-- 28. ORDER ITEMS (Depends on: store_orders, products)
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  product_name character varying NOT NULL,
  product_price numeric NOT NULL,
  product_image text,
  quantity integer NOT NULL DEFAULT 1,
  line_total numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.store_orders(id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL
);

-- ============================================
-- 29. ORDERS (Depends on: workspaces, flows, forms)
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id text NOT NULL,
  workspace_id uuid NOT NULL,
  subscriber_external_id text,
  customer_name text,
  items jsonb DEFAULT '[]'::jsonb,
  total numeric DEFAULT 0,
  status text DEFAULT 'pending'::text,
  flow_id uuid,
  form_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  customer_phone text,
  customer_email text,
  customer_address text,
  subtotal numeric DEFAULT 0,
  shipping_fee numeric DEFAULT 0,
  payment_method text DEFAULT 'cod'::text,
  payment_method_name text DEFAULT 'Cash on Delivery'::text,
  source text DEFAULT 'unknown'::text,
  subscriber_id text,
  page_id text,
  page_name text,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT orders_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.flows(id) ON DELETE SET NULL,
  CONSTRAINT orders_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE SET NULL
);

-- ============================================
-- 30. SUPPORT TICKETS (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN'::text CHECK (status = ANY (ARRAY['OPEN'::text, 'IN_PROGRESS'::text, 'RESOLVED'::text, 'CLOSED'::text])),
  priority text NOT NULL DEFAULT 'MEDIUM'::text CHECK (priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])),
  created_at timestamp with time zone DEFAULT now(),
  last_update_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- 31. TICKET MESSAGES (Depends on: support_tickets)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_admin boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT ticket_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- 32. WEBVIEW SESSIONS (Depends on: workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS public.webview_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text UNIQUE,
  workspace_id uuid NOT NULL,
  flow_id uuid,
  node_id text,
  subscriber_id uuid,
  product_id text,
  product_name text,
  product_price numeric,
  followup_enabled boolean DEFAULT false,
  followup_timeout_minutes integer DEFAULT 5,
  followup_node_type text,
  followup_node_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  shown_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  followup_sent_at timestamp with time zone,
  psid text,
  page_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  external_id text,
  current_node_id text,
  page_type text DEFAULT 'upsell'::text,
  page_config jsonb DEFAULT '{}'::jsonb,
  cart jsonb DEFAULT '[]'::jsonb,
  cart_total numeric DEFAULT 0,
  page_access_token text,
  metadata jsonb DEFAULT '{}'::jsonb,
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  user_response text,
  form_data jsonb,
  customer_name text,
  page_name text,
  CONSTRAINT webview_sessions_pkey PRIMARY KEY (id)
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON public.conversations(external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_page_id ON public.conversations(page_id);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON public.messages(external_id);
CREATE INDEX IF NOT EXISTS idx_node_analytics_flow_id ON public.node_analytics(flow_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_workspace_external ON public.conversations(workspace_id, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_unique ON public.messages(external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS node_analytics_flow_node_unique ON public.node_analytics(flow_id, node_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_automation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  
  INSERT INTO public.profiles (id, email, name, role, avatar_url, affiliate_code)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    'member',
    'https://ui-avatars.com/api/?name=' || user_name || '&background=random',
    LOWER(REPLACE(user_name, ' ', ''))
  );
  
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (
    user_name || '''s Workspace',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- BASIC RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow profile creation" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can view all profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

-- Workspaces policies
CREATE POLICY "Users can view workspaces" ON public.workspaces FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create workspaces" ON public.workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can manage workspaces" ON public.workspaces FOR ALL USING (owner_id = auth.uid());

-- Admin settings policies
CREATE POLICY "Authenticated can read admin settings" ON public.admin_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can update settings" ON public.admin_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Packages policies (public read)
CREATE POLICY "Anyone can view packages" ON public.packages FOR SELECT USING (true);

-- Service role bypass for all tables (for API operations)
CREATE POLICY "Service role full access profiles" ON public.profiles FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access workspaces" ON public.workspaces FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access subscribers" ON public.subscribers FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access conversations" ON public.conversations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access messages" ON public.messages FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access flows" ON public.flows FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access forms" ON public.forms FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access webview" ON public.webview_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access stores" ON public.stores FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access products" ON public.products FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access connected_pages" ON public.connected_pages FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access node_analytics" ON public.node_analytics FOR ALL TO service_role USING (true);

-- ============================================
-- DONE! Database migration complete
-- ============================================
