-- Add scheduled_at column to pranks table
ALTER TABLE public.pranks 
ADD COLUMN scheduled_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient querying of scheduled pranks
CREATE INDEX idx_pranks_scheduled_at ON public.pranks (scheduled_at) 
WHERE scheduled_at IS NOT NULL AND call_status = 'scheduled';

-- Update call_status to include 'scheduled' and 'cancelled' states
COMMENT ON COLUMN public.pranks.call_status IS 'Status: pending, scheduled, in_progress, completed, failed, cancelled';