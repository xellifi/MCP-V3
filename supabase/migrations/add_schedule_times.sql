-- Add schedule_times array column to scheduler_workflows
-- Run this in your Supabase SQL Editor

ALTER TABLE scheduler_workflows 
ADD COLUMN IF NOT EXISTS schedule_times TEXT[] DEFAULT '{}';

-- Copy existing schedule_time to schedule_times for backward compatibility
UPDATE scheduler_workflows 
SET schedule_times = ARRAY[schedule_time::text]
WHERE schedule_times IS NULL OR schedule_times = '{}';
