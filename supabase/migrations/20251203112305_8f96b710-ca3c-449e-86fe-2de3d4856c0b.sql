-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to process scheduled pranks every minute
SELECT cron.schedule(
  'process-scheduled-pranks',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vtsankkghplkfhrlxefs.supabase.co/functions/v1/process-scheduled-pranks',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0c2Fua2tnaHBsa2Zocmx4ZWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODY3NDcsImV4cCI6MjA4MDI2Mjc0N30.AJM4UtFXQCFz4K76cO9A6oYSppqGKfuiCD3hyaXuPSo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);