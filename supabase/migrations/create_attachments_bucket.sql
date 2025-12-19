-- Create attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for attachments bucket
-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow public read access to attachments
CREATE POLICY IF NOT EXISTS "Allow public read access to attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- Allow users to update their own files
CREATE POLICY IF NOT EXISTS "Allow users to update attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments');

-- Allow users to delete their own files
CREATE POLICY IF NOT EXISTS "Allow users to delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');
