-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pranks table
CREATE TABLE public.pranks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  victim_first_name TEXT NOT NULL,
  victim_last_name TEXT NOT NULL,
  victim_phone TEXT NOT NULL,
  prank_theme TEXT NOT NULL,
  voice_gender TEXT NOT NULL CHECK (voice_gender IN ('male', 'female', 'neutral')),
  language TEXT NOT NULL DEFAULT 'Italiano',
  personality_tone TEXT NOT NULL DEFAULT 'enthusiastic',
  max_duration INTEGER NOT NULL DEFAULT 60,
  creativity_level INTEGER NOT NULL DEFAULT 50 CHECK (creativity_level >= 0 AND creativity_level <= 100),
  send_recording BOOLEAN NOT NULL DEFAULT false,
  call_status TEXT NOT NULL DEFAULT 'pending' CHECK (call_status IN ('pending', 'in_progress', 'completed', 'failed', 'recording_available')),
  twilio_call_sid TEXT,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pranks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Pranks policies
CREATE POLICY "Users can view their own pranks" ON public.pranks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own pranks" ON public.pranks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pranks" ON public.pranks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pranks" ON public.pranks FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pranks_updated_at
  BEFORE UPDATE ON public.pranks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();