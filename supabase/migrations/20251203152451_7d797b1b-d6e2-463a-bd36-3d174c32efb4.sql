-- Create a bucket for temporary audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-audio', 'temp-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to temp-audio bucket
CREATE POLICY "Public read access for temp audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'temp-audio');

-- Allow service role to insert/delete
CREATE POLICY "Service role can manage temp audio"
ON storage.objects FOR ALL
USING (bucket_id = 'temp-audio')
WITH CHECK (bucket_id = 'temp-audio');