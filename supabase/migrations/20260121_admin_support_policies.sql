-- =====================================================
-- ADMIN SUPPORT TICKET MANAGEMENT MIGRATION
-- =====================================================

-- 1. Add attachments column to ticket_messages
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- 2. Add support_attachments_enabled to admin_settings
-- First check and create admin_settings table if needed
CREATE TABLE IF NOT EXISTS admin_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO admin_settings (id, settings)
VALUES ('global', '{"supportAttachmentsEnabled": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Add the setting to existing settings (merge)
UPDATE admin_settings 
SET settings = settings || '{"supportAttachmentsEnabled": true}'::jsonb
WHERE id = 'global' AND NOT (settings ? 'supportAttachmentsEnabled');

-- =====================================================
-- ADMIN RLS POLICIES FOR SUPPORT TICKETS
-- =====================================================

-- Drop existing policies if they exist (to recreate cleanly)
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON ticket_messages;
DROP POLICY IF EXISTS "Admins can reply to all tickets" ON ticket_messages;

-- Create function to check if user is admin (if not exists)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'ADMIN' OR role = 'OWNER')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SUPPORT_TICKETS POLICIES

-- Admins can view ALL tickets across all workspaces
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR SELECT
  USING (is_admin_user());

-- Admins can update ANY ticket (for status changes, etc.)
CREATE POLICY "Admins can update all tickets" ON support_tickets
  FOR UPDATE
  USING (is_admin_user());

-- TICKET_MESSAGES POLICIES

-- Admins can view ALL messages
CREATE POLICY "Admins can view all ticket messages" ON ticket_messages
  FOR SELECT
  USING (is_admin_user());

-- Admins can reply to ANY ticket
CREATE POLICY "Admins can reply to all tickets" ON ticket_messages
  FOR INSERT
  WITH CHECK (is_admin_user());

-- =====================================================
-- STORAGE BUCKET FOR SUPPORT ATTACHMENTS
-- =====================================================

-- Create storage bucket for support attachments (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('support_attachments', 'support_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to support_attachments
DROP POLICY IF EXISTS "Authenticated users can upload support attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload support attachments" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'support_attachments' 
    AND auth.role() = 'authenticated'
  );

-- Allow public read access
DROP POLICY IF EXISTS "Public can view support attachments" ON storage.objects;
CREATE POLICY "Public can view support attachments" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'support_attachments');

-- Allow authenticated users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete their support attachments" ON storage.objects;
CREATE POLICY "Users can delete their support attachments" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'support_attachments' 
    AND auth.role() = 'authenticated'
  );
