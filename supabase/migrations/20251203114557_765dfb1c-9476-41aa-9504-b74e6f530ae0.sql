-- Drop existing check constraint and add new one with all valid statuses
ALTER TABLE public.pranks DROP CONSTRAINT IF EXISTS pranks_call_status_check;

ALTER TABLE public.pranks ADD CONSTRAINT pranks_call_status_check 
CHECK (call_status IN (
  'pending',
  'scheduled',
  'initiated',
  'ringing', 
  'in_progress',
  'completed',
  'recording_available',
  'failed',
  'no_answer',
  'busy',
  'cancelled'
));