-- ============================================
-- COMPLETE DATABASE SETUP FOR MyChatPilot
-- Run this in Supabase SQL Editor
-- This file consolidates all schema, policies, and configurations
-- ============================================

-- ============================================
-- 1. PROFILES TABLE (User Authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'member',
  avatar_url TEXT,
  affiliate_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Get the user's name
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  
  -- Create profile
  INSERT INTO public.profiles (id, email, name, role, avatar_url, affiliate_code)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    'member',
    'https://ui-avatars.com/api/?name=' || user_name || '&background=random',
    LOWER(REPLACE(user_name, ' ', ''))
  );
  
  -- Create default workspace for the user
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
-- 3. ADMIN SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  facebook_app_id TEXT,
  facebook_app_secret TEXT,
  facebook_verify_token TEXT,
  openai_api_key TEXT,
  gemini_api_key TEXT,
  menu_sequence JSONB DEFAULT '[]'::jsonb,
  affiliate_enabled BOOLEAN DEFAULT true,
  affiliate_commission DECIMAL(10,2) DEFAULT 15.00,
  affiliate_currency TEXT DEFAULT 'USD',
  affiliate_min_withdrawal DECIMAL(10,2) DEFAULT 100.00,
  affiliate_withdrawal_days INTEGER[] DEFAULT '{1}',
  smtp_host TEXT,
  smtp_port TEXT,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO public.admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated can read admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;

-- Create RLS policies
CREATE POLICY "Authenticated can read admin settings" ON public.admin_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update settings" ON public.admin_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert settings" ON public.admin_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 4. WORKSPACES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can manage workspaces" ON public.workspaces;

-- Create RLS policies
CREATE POLICY "Users can view workspaces" ON public.workspaces
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can manage workspaces" ON public.workspaces
  FOR ALL USING (owner_id = auth.uid());

-- ============================================
-- 5. CONNECTED PAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.connected_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_image_url TEXT,
  page_followers INTEGER DEFAULT 0,
  page_access_token TEXT,
  instagram_id TEXT,
  instagram_username TEXT,
  instagram_image_url TEXT,
  instagram_followers INTEGER,
  is_automation_enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'CONNECTED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure page_access_token column exists
ALTER TABLE public.connected_pages 
ADD COLUMN IF NOT EXISTS page_access_token TEXT;

-- Fix automation column default
ALTER TABLE public.connected_pages 
ALTER COLUMN is_automation_enabled SET DEFAULT false;

-- Update existing NULL values
UPDATE public.connected_pages 
SET is_automation_enabled = false 
WHERE is_automation_enabled IS NULL;

ALTER TABLE public.connected_pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their pages" ON public.connected_pages;

-- Create RLS policies
CREATE POLICY "Users can manage their pages" ON public.connected_pages
  FOR ALL USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- 6. META CONNECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  external_id TEXT,
  status TEXT DEFAULT 'CONNECTED',
  image_url TEXT,
  access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their connections" ON public.meta_connections;

-- Create RLS policies
CREATE POLICY "Users can manage their connections" ON public.meta_connections
  FOR ALL USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- 7. SUBSCRIBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT,
  platform TEXT,
  external_id TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'SUBSCRIBED',
  tags TEXT[] DEFAULT '{}',
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their subscribers" ON public.subscribers;

-- Create RLS policies
CREATE POLICY "Users can manage their subscribers" ON public.subscribers
  FOR ALL USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- 8. CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.subscribers(id) ON DELETE CASCADE,
  platform TEXT,
  external_id TEXT,
  page_id TEXT,
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Facebook Messenger inbox fields
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS page_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON public.conversations(external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_page_id ON public.conversations(page_id);

-- Add unique constraint to prevent duplicate conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_workspace_external 
  ON public.conversations(workspace_id, external_id) 
  WHERE external_id IS NOT NULL;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their conversations" ON public.conversations;

-- Create RLS policies
CREATE POLICY "Users can manage their conversations" ON public.conversations
  FOR ALL USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- 9. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'TEXT',
  attachment_url TEXT,
  file_name TEXT,
  external_id TEXT,
  sender_id TEXT,
  status TEXT DEFAULT 'SENT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Facebook Messenger inbox fields
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON public.messages(external_id);

-- Add unique constraint to prevent duplicate messages
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_unique 
  ON public.messages(external_id) 
  WHERE external_id IS NOT NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their messages" ON public.messages;

-- Create RLS policies
CREATE POLICY "Users can manage their messages" ON public.messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      )
    )
  );

-- ============================================
-- 10. FLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their flows" ON public.flows;

-- Create RLS policies
CREATE POLICY "Users can manage their flows" ON public.flows
  FOR ALL USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- 11. SCHEDULED POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content TEXT,
  platform TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their posts" ON public.scheduled_posts;

-- Create RLS policies
CREATE POLICY "Users can manage their posts" ON public.scheduled_posts
  FOR ALL USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- 12. GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- 13. CREATE ADMIN WORKSPACE (if needed)
-- ============================================
-- This will create a workspace for admin@mychatpilot.com if it doesn't exist
INSERT INTO public.workspaces (name, owner_id)
SELECT 'Admin Workspace', id
FROM public.profiles
WHERE email = 'admin@mychatpilot.com'
AND NOT EXISTS (
  SELECT 1 FROM public.workspaces WHERE owner_id = (
    SELECT id FROM public.profiles WHERE email = 'admin@mychatpilot.com'
  )
);

-- ============================================
-- DONE! Complete Database Setup
-- ============================================
-- Next steps:
-- 1. Create your admin user in Supabase Authentication
-- 2. Update the admin user's role to 'admin' in the profiles table
-- 3. Configure your environment variables in your application
-- ============================================
