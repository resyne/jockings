-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create voice_settings table for admin configuration
CREATE TABLE public.voice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language TEXT NOT NULL,
    gender TEXT NOT NULL,
    voice_provider TEXT NOT NULL DEFAULT 'elevenlabs',
    elevenlabs_voice_id TEXT,
    elevenlabs_stability NUMERIC DEFAULT 0.5,
    elevenlabs_similarity NUMERIC DEFAULT 0.75,
    elevenlabs_style NUMERIC DEFAULT 0.0,
    elevenlabs_speed NUMERIC DEFAULT 1.0,
    polly_voice_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (language, gender)
);

-- Enable RLS on voice_settings
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read voice settings
CREATE POLICY "Anyone can read voice settings"
ON public.voice_settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify voice settings
CREATE POLICY "Admins can manage voice settings"
ON public.voice_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create prank_presets table
CREATE TABLE public.prank_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    theme TEXT NOT NULL,
    icon TEXT DEFAULT '🎭',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on prank_presets
ALTER TABLE public.prank_presets ENABLE ROW LEVEL SECURITY;

-- Everyone can read presets
CREATE POLICY "Anyone can read prank presets"
ON public.prank_presets FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can read all presets
CREATE POLICY "Admins can read all presets"
ON public.prank_presets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage presets
CREATE POLICY "Admins can manage presets"
ON public.prank_presets FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default voice settings
INSERT INTO public.voice_settings (language, gender, elevenlabs_voice_id, elevenlabs_stability, elevenlabs_similarity, elevenlabs_style, elevenlabs_speed) VALUES
('Italiano', 'male', 'onwK4e9ZLuTAKqWW03F9', 0.5, 0.75, 0.0, 1.0),
('Italiano', 'female', 'EXAVITQu4vr4xnSDxMaL', 0.5, 0.75, 0.0, 1.0),
('Italiano', 'neutral', 'CwhRBWXzGAHq8TQ4Fs17', 0.5, 0.75, 0.0, 1.0),
('English', 'male', 'JBFqnCBsd6RMkjVDRZzb', 0.5, 0.75, 0.0, 1.0),
('English', 'female', 'pFZP5JQG7iQjIQuC4Bku', 0.5, 0.75, 0.0, 1.0),
('Napoletano', 'male', 'onwK4e9ZLuTAKqWW03F9', 0.5, 0.75, 0.0, 1.0),
('Napoletano', 'female', 'EXAVITQu4vr4xnSDxMaL', 0.5, 0.75, 0.0, 1.0);

-- Insert default prank presets
INSERT INTO public.prank_presets (title, theme, icon, sort_order) VALUES
('Tecnico del Gas', 'Fai finta di essere un tecnico del gas che deve fare un controllo urgente per una presunta fuga di gas nel palazzo.', '🔧', 1),
('Vincita alla Lotteria', 'Fai finta di chiamare da un ufficio lotterie per comunicare una vincita incredibile che richiede verifica immediata.', '🎰', 2),
('Parente Lontano', 'Fai finta di essere un parente lontanissimo (tipo cugino di terzo grado) che vuole riallacciare i rapporti e raccontare storie di famiglia completamente inventate.', '👴', 3),
('Manager Celebrity', 'Fai finta di essere il manager di una celebrity famosa che sta cercando urgentemente una casa in affitto nella zona e vuole venire a vedere l''appartamento oggi stesso.', '⭐', 4),
('Sondaggio Assurdo', 'Fai finta di fare un sondaggio telefonico con domande sempre più assurde e specifiche.', '📋', 5),
('Consegna Misteriosa', 'Fai finta di essere un corriere che ha un pacco enorme e pesantissimo da consegnare, ma l''indirizzo è illeggibile.', '📦', 6);

-- Update trigger for voice_settings
CREATE TRIGGER update_voice_settings_updated_at
BEFORE UPDATE ON public.voice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for prank_presets
CREATE TRIGGER update_prank_presets_updated_at
BEFORE UPDATE ON public.prank_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();