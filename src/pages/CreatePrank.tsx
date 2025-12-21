import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Phone, User, Mic, Globe, Send, Play, Square, Loader2, Check } from "lucide-react";
import saranoIcon from "@/assets/sarano-icon.png";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import PrankDisclaimerModal from "@/components/PrankDisclaimerModal";

const phoneSchema = z.string().regex(/^\d{6,15}$/, "Numero di telefono non valido");
const normalizePhoneDigits = (value: string) => value.replace(/\D/g, "");

const COUNTRY_CODES = [
  { code: "+39", country: "IT", flag: "🇮🇹", name: "Italia" },
  { code: "+49", country: "DE", flag: "🇩🇪", name: "Germania" },
  { code: "+33", country: "FR", flag: "🇫🇷", name: "Francia" },
  { code: "+34", country: "ES", flag: "🇪🇸", name: "Spagna" },
  { code: "+44", country: "GB", flag: "🇬🇧", name: "Regno Unito" },
  { code: "+41", country: "CH", flag: "🇨🇭", name: "Svizzera" },
  { code: "+43", country: "AT", flag: "🇦🇹", name: "Austria" },
  { code: "+31", country: "NL", flag: "🇳🇱", name: "Paesi Bassi" },
  { code: "+32", country: "BE", flag: "🇧🇪", name: "Belgio" },
  { code: "+351", country: "PT", flag: "🇵🇹", name: "Portogallo" },
  { code: "+48", country: "PL", flag: "🇵🇱", name: "Polonia" },
  { code: "+30", country: "GR", flag: "🇬🇷", name: "Grecia" },
];

const TONES = [
  { value: "enthusiastic", label: "Entusiasta 🎉" },
  { value: "serious", label: "Serio 😐" },
  { value: "angry", label: "Arrabbiato 😠" },
  { value: "confused", label: "Confuso 🤔" },
  { value: "mysterious", label: "Misterioso 🕵️" },
  { value: "friendly", label: "Amichevole 😊" },
  { value: "sexy", label: "Sexy 😏" },
];

const STEPS = [
  { id: 1, title: "Vittima", icon: User },
  { id: 2, title: "Tema", icon: Mic },
  { id: 3, title: "Voce", icon: Globe },
  { id: 4, title: "Riepilogo", icon: Check },
];

interface PrankPreset {
  id: string;
  title: string;
  theme: string;
  icon: string;
}

interface VoiceOption {
  id: string;
  voice_name: string | null;
  description: string | null;
  elevenlabs_voice_id: string | null;
  elevenlabs_stability: number | null;
  elevenlabs_similarity: number | null;
  elevenlabs_style: number | null;
  elevenlabs_speed: number | null;
  gender: string;
  language: string;
}

interface UserProfile {
  available_pranks: number;
  trial_prank_used: boolean;
  phone_verified: boolean;
  phone_number: string | null;
}

const CreatePrank = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingPrank, setLoadingPrank] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [presets, setPresets] = useState<PrankPreset[]>([]);
  const [allVoices, setAllVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form state
  const [victimFirstName, setVictimFirstName] = useState("");
  const [victimLastName, setVictimLastName] = useState("");
  const [victimGender, setVictimGender] = useState("male");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+39");
  const [victimPhone, setVictimPhone] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("custom");
  const [prankTheme, setPrankTheme] = useState("");
  const [realDetail, setRealDetail] = useState("");
  const [personalityTone, setPersonalityTone] = useState("enthusiastic");
  const [maxDuration] = useState(120);
  const [creativityLevel] = useState([50]);
  const sendRecording = true;
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [pendingPrankId, setPendingPrankId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("available_pranks, trial_prank_used, phone_verified, phone_number")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      setProfile({
        available_pranks: data.available_pranks || 0,
        trial_prank_used: data.trial_prank_used || false,
        phone_verified: data.phone_verified || false,
        phone_number: data.phone_number,
      });
    }
  };

  // Check if user can make a prank call
  const canMakePrank = (): { allowed: boolean; isTrialCall: boolean; reason?: string } => {
    if (!profile) return { allowed: false, isTrialCall: false, reason: "Caricamento profilo..." };
    
    // Has paid pranks available
    if (profile.available_pranks > 0) {
      return { allowed: true, isTrialCall: false };
    }
    
    // Can use free trial (only to own verified number)
    if (!profile.trial_prank_used && profile.phone_verified && profile.phone_number) {
      const fullVictimPhone = normalizePhoneDigits(`${phoneCountryCode}${victimPhone}`);
      const normalizedUserPhone = normalizePhoneDigits(profile.phone_number);

      if (fullVictimPhone === normalizedUserPhone) {
        return { allowed: true, isTrialCall: true };
      } else {
        return { 
          allowed: false, 
          isTrialCall: false, 
          reason: `Il prank gratuito può essere fatto solo al tuo numero verificato (${profile.phone_number})` 
        };
      }
    }
    
    // No pranks and trial used
    if (profile.trial_prank_used) {
      return { allowed: false, isTrialCall: false, reason: "Hai esaurito i prank disponibili. Acquista un pacchetto per continuare!" };
    }
    
    // Phone not verified
    if (!profile.phone_verified) {
      return { allowed: false, isTrialCall: false, reason: "Verifica il tuo numero di telefono per ottenere un prank gratuito!" };
    }
    
    return { allowed: false, isTrialCall: false, reason: "Nessun prank disponibile" };
  };

  useEffect(() => {
    fetchPresets();
    fetchAllVoices();
  }, []);

  useEffect(() => {
    const repeatId = searchParams.get("repeat");
    const quickCallId = searchParams.get("quickCall");
    const addThemeParam = searchParams.get("addTheme");
    const phoneParam = searchParams.get("phone");
    const firstNameParam = searchParams.get("firstName");
    const lastNameParam = searchParams.get("lastName");
    const themeParam = searchParams.get("theme");
    const stepParam = searchParams.get("step");
    
    if (repeatId && user?.id) {
      setLoadingPrank(true);
      loadPrankData(repeatId).then(() => {
        // Skip directly to summary step when repeating
        setCurrentStep(4);
      }).finally(() => setLoadingPrank(false));
    } else if (quickCallId && user?.id) {
      // Quick call: load prank data but override theme with addTheme
      setLoadingPrank(true);
      loadPrankData(quickCallId).then(() => {
        // Override the theme with the quick call text
        if (addThemeParam) {
          setRealDetail(addThemeParam);
        }
        // Skip directly to summary step
        setCurrentStep(4);
      }).finally(() => setLoadingPrank(false));
    } else if (phoneParam) {
      if (firstNameParam) setVictimFirstName(firstNameParam);
      if (lastNameParam) setVictimLastName(lastNameParam);
      
      if (themeParam) {
        setPrankTheme(themeParam);
        setSelectedPreset("custom");
      }
      
      if (addThemeParam) {
        setRealDetail(addThemeParam);
      }
      
      const matchedCountry = COUNTRY_CODES.find(c => phoneParam.startsWith(c.code));
      if (matchedCountry) {
        setPhoneCountryCode(matchedCountry.code);
        setVictimPhone(phoneParam.replace(matchedCountry.code, "").trim());
      } else {
        setVictimPhone(phoneParam);
      }
      
      if (stepParam) {
        setCurrentStep(parseInt(stepParam, 10));
      }
    }
  }, [searchParams, user?.id]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const fetchPresets = async () => {
    const { data } = await supabase
      .from("prank_presets")
      .select("id, title, theme, icon")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) {
      setPresets(data);
    }
  };

  const fetchAllVoices = async () => {
    const { data } = await supabase
      .from("voice_settings")
      .select("id, voice_name, description, elevenlabs_voice_id, elevenlabs_stability, elevenlabs_similarity, elevenlabs_style, elevenlabs_speed, gender, language")
      .eq("is_active", true)
      .order("gender", { ascending: true });

    if (data && data.length > 0) {
      setAllVoices(data);
      if (!selectedVoiceId) {
        setSelectedVoiceId(data[0].id);
      }
    }
  };

  const maleVoices = allVoices.filter(v => v.gender === "male");
  const femaleVoices = allVoices.filter(v => v.gender === "female");

  const playVoicePreview = async (voice: VoiceOption) => {
    if (playingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setLoadingPreviewId(voice.id);

    try {
      const { data, error } = await supabase.functions.invoke("test-voice", {
        body: {
          voiceId: voice.elevenlabs_voice_id,
          stability: voice.elevenlabs_stability || 0.5,
          similarity: voice.elevenlabs_similarity || 0.75,
          style: voice.elevenlabs_style || 0,
          speed: voice.elevenlabs_speed || 1,
          language: voice.language,
        }
      });

      if (error) throw error;

      if (data?.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setPlayingVoiceId(null);
          audioRef.current = null;
        };
        
        audio.onerror = () => {
          setPlayingVoiceId(null);
          audioRef.current = null;
          toast({ title: "Errore", description: "Impossibile riprodurre l'audio", variant: "destructive" });
        };

        await audio.play();
        setPlayingVoiceId(voice.id);
      } else {
        throw new Error("Nessun audio ricevuto");
      }
    } catch (error: any) {
      console.error("Voice preview error:", error);
      toast({ title: "Errore", description: "Impossibile caricare l'anteprima", variant: "destructive" });
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId !== "custom") {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        setPrankTheme(preset.theme);
      }
    }
  };

  const loadPrankData = async (prankId: string) => {
    try {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from("pranks")
        .select("*")
        .eq("id", prankId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error loading prank:", error);
        toast({ title: "Errore", description: "Impossibile caricare lo scherzo", variant: "destructive" });
        return;
      }

      if (data) {
        setVictimFirstName(data.victim_first_name);
        setVictimLastName(data.victim_last_name);
        const phone = data.victim_phone;
        const matchedCountry = COUNTRY_CODES.find(c => phone.startsWith(c.code));
        if (matchedCountry) {
          setPhoneCountryCode(matchedCountry.code);
          setVictimPhone(phone.replace(matchedCountry.code, "").trim());
        } else {
          setVictimPhone(phone);
        }
        setPrankTheme(data.prank_theme);
        setPersonalityTone(data.personality_tone);
        
        if (data.elevenlabs_voice_id) {
          const { data: voiceData } = await supabase
            .from("voice_settings")
            .select("id")
            .eq("elevenlabs_voice_id", data.elevenlabs_voice_id)
            .eq("is_active", true)
            .maybeSingle();
          
          if (voiceData) {
            setSelectedVoiceId(voiceData.id);
          }
        }
      }
    } catch (err) {
      console.error("Error in loadPrankData:", err);
      toast({ title: "Errore", description: "Errore nel caricamento", variant: "destructive" });
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!victimFirstName.trim()) {
          toast({ title: "Errore", description: "Inserisci il nome della vittima", variant: "destructive" });
          return false;
        }
        try {
          phoneSchema.parse(normalizePhoneDigits(victimPhone));
        } catch {
          toast({ title: "Errore", description: "Numero di telefono non valido", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!prankTheme.trim()) {
          toast({ title: "Errore", description: "Descrivi il tema dello scherzo", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        if (!selectedVoiceId) {
          toast({ title: "Errore", description: "Seleziona una voce", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user || !profile) return;

    // Check if user can make this prank
    const prankCheck = canMakePrank();
    if (!prankCheck.allowed) {
      toast({ 
        title: "Non puoi fare questo scherzo", 
        description: prankCheck.reason, 
        variant: "destructive" 
      });
      if (prankCheck.reason?.includes("Acquista")) {
        navigate("/pricing");
      } else if (prankCheck.reason?.includes("Verifica")) {
        navigate("/verify-phone");
      }
      return;
    }

    setLoading(true);

    try {
      const selectedVoice = allVoices.find(v => v.id === selectedVoiceId);
      
      const { data: voiceSettings } = selectedVoiceId && selectedVoiceId.length > 0
        ? await supabase
            .from("voice_settings")
            .select("*")
            .eq("id", selectedVoiceId)
            .single()
        : { data: null };
      
      const { data: prank, error } = await supabase
        .from("pranks")
        .insert({
          user_id: user.id,
          victim_first_name: victimFirstName.trim(),
          victim_last_name: victimLastName.trim(),
          victim_gender: victimGender,
          victim_phone: `${phoneCountryCode}${normalizePhoneDigits(victimPhone)}`,
          prank_theme: prankTheme.trim(),
          real_detail: realDetail.trim() || null,
          voice_gender: voiceSettings?.gender || "male",
          voice_provider: voiceSettings?.voice_provider || "elevenlabs",
          elevenlabs_stability: voiceSettings?.elevenlabs_stability || 0.5,
          elevenlabs_similarity: voiceSettings?.elevenlabs_similarity || 0.75,
          elevenlabs_style: voiceSettings?.elevenlabs_style || 0,
          elevenlabs_speed: voiceSettings?.elevenlabs_speed || 1,
          elevenlabs_voice_id: voiceSettings?.elevenlabs_voice_id || null,
          language: voiceSettings?.language || "Italiano",
          personality_tone: personalityTone,
          max_duration: maxDuration,
          creativity_level: creativityLevel[0],
          send_recording: sendRecording,
          call_status: "pending",
          scheduled_at: null,
        })
        .select()
        .single();

      if (error) throw error;

      // Store the prank ID and show disclaimer modal
      setPendingPrankId(prank.id);
      setShowDisclaimerModal(true);
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDisclaimerConfirm = async () => {
    if (!pendingPrankId || !user || !profile) return;

    const prankCheck = canMakePrank();
    const isTrialCall = prankCheck.isTrialCall;

    setLoading(true);
    try {
      toast({
        title: "Scherzo confermato! 🎭",
        description: "Avvio della chiamata in corso...",
      });

      const { error: callError } = await supabase.functions.invoke("initiate-call-vapi", {
        body: { prankId: pendingPrankId }
      });

      if (callError) {
        console.error('Error initiating call:', callError);
        await supabase
          .from("pranks")
          .update({ call_status: "failed" })
          .eq("id", pendingPrankId);
        
        toast({
          title: "Errore chiamata",
          description: callError.message || "Nessun numero attivo configurato. Contatta l'amministratore.",
          variant: "destructive",
        });
      } else {
        // Update profile based on call type
        if (isTrialCall) {
          await supabase
            .from("profiles")
            .update({ trial_prank_used: true })
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("profiles")
            .update({ available_pranks: profile.available_pranks - 1 })
            .eq("user_id", user.id);
        }
        
        toast({
          title: "Chiamata avviata! 📞",
          description: `Stiamo chiamando ${victimFirstName}...`,
        });
      }
      
      setShowDisclaimerModal(false);
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedVoice = allVoices.find(v => v.id === selectedVoiceId);
  const selectedCountry = COUNTRY_CODES.find(c => c.code === phoneCountryCode);

  if (loadingPrank) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Caricamento scherzo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img 
            src={saranoIcon} 
            alt="sarano.ai" 
            className="w-10 h-10 object-contain animate-bounce-in hover:animate-icon-wiggle cursor-pointer transition-transform" 
          />
          <div>
            <h1 className="font-bold">Crea Scherzo</h1>
            <p className="text-xs text-muted-foreground">Step {currentStep} di 4</p>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentStep >= step.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-xs mt-1 font-medium ${
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="px-4 max-w-lg mx-auto">
        {/* Step 1: Victim Info */}
        {currentStep === 1 && (
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Chi vuoi chiamare?</CardTitle>
                  <CardDescription>Inserisci i dati della vittima</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    placeholder="Mario"
                    value={victimFirstName}
                    onChange={(e) => setVictimFirstName(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome <span className="text-muted-foreground text-xs font-normal">(opzionale)</span></Label>
                  <Input
                    id="lastName"
                    placeholder="Rossi"
                    value={victimLastName}
                    onChange={(e) => setVictimLastName(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sesso Vittima</Label>
                <Select value={victimGender} onValueChange={setVictimGender}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Maschio 👨</SelectItem>
                    <SelectItem value="female">Femmina 👩</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Importante per l'italiano (es. "caro" vs "cara")</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Numero di Telefono</Label>
                <div className="flex gap-2">
                  <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                    <SelectTrigger className="w-[130px] h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="333 1234567"
                      value={victimPhone}
                      onChange={(e) => setVictimPhone(e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
              </div>
              {/* Trial call warning */}
              {profile && profile.available_pranks === 0 && !profile.trial_prank_used && profile.phone_verified && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <p className="text-sm text-orange-500 font-medium">
                    🎁 Hai 1 prank gratuito! Puoi usarlo solo sul tuo numero: {profile.phone_number}
                  </p>
                </div>
              )}
              {profile && profile.available_pranks === 0 && !profile.trial_prank_used && !profile.phone_verified && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm text-blue-500 font-medium">
                    📱 Verifica il tuo numero per ottenere 1 prank gratuito!
                  </p>
                  <Button 
                    variant="link" 
                    className="text-blue-500 p-0 h-auto text-sm"
                    onClick={() => navigate("/verify-phone")}
                  >
                    Verifica ora →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Prank Theme */}
        {currentStep === 2 && (
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Mic className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Cosa vuoi far dire all'AI?</CardTitle>
                  <CardDescription>Descrivi il tema dello scherzo</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Scegli un preset o scrivi il tuo</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedPreset === "custom" ? "default" : "outline"}
                    size="sm"
                    className={`text-xs ${selectedPreset === "custom" ? "gradient-primary" : ""}`}
                    onClick={() => handlePresetChange("custom")}
                  >
                    ✏️ Personalizzato
                  </Button>
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant={selectedPreset === preset.id ? "default" : "outline"}
                      size="sm"
                      className={`text-xs ${selectedPreset === preset.id ? "gradient-primary" : ""}`}
                      onClick={() => handlePresetChange(preset.id)}
                    >
                      {preset.icon} {preset.title}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Descrivi lo scherzo che vuoi fare..."
                  value={prankTheme}
                  onChange={(e) => {
                    setPrankTheme(e.target.value);
                    if (selectedPreset !== "custom") {
                      setSelectedPreset("custom");
                    }
                  }}
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Dettaglio Reale (opzionale) 💣</Label>
                <Textarea
                  placeholder="Es: lavora come idraulico, ha appena comprato una macchina nuova, suo figlio si chiama Luca..."
                  value={realDetail}
                  onChange={(e) => setRealDetail(e.target.value)}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">Un dettaglio vero sulla vittima rende lo scherzo molto più credibile!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Voice Selection */}
        {currentStep === 3 && (
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Globe className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Scegli la voce</CardTitle>
                  <CardDescription>Chi farà la chiamata?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <span className="text-lg">🇮🇹</span>
                <span className="font-medium text-foreground">Italiano</span>
                <span className="text-xs text-muted-foreground">(predefinito)</span>
              </div>

              <div className="space-y-2">
                <Label>Tono Personalità</Label>
                <Select value={personalityTone} onValueChange={setPersonalityTone}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {maleVoices.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-muted-foreground">👨 Voci Maschili</Label>
                  <div className="grid gap-3">
                    {maleVoices.map((voice) => (
                      <div
                        key={voice.id}
                        onClick={() => setSelectedVoiceId(voice.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedVoiceId === voice.id
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border bg-card hover:border-primary/50 hover:bg-accent/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">
                              {voice.voice_name || "Voce senza nome"}
                            </h4>
                            {voice.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                {voice.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                playVoicePreview(voice);
                              }}
                              disabled={loadingPreviewId === voice.id}
                            >
                              {loadingPreviewId === voice.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : playingVoiceId === voice.id ? (
                                <Square className="w-4 h-4 text-primary" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                              selectedVoiceId === voice.id
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}>
                              {selectedVoiceId === voice.id && (
                                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {femaleVoices.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-muted-foreground">👩 Voci Femminili</Label>
                  <div className="grid gap-3">
                    {femaleVoices.map((voice) => (
                      <div
                        key={voice.id}
                        onClick={() => setSelectedVoiceId(voice.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedVoiceId === voice.id
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border bg-card hover:border-primary/50 hover:bg-accent/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">
                              {voice.voice_name || "Voce senza nome"}
                            </h4>
                            {voice.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                {voice.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                playVoicePreview(voice);
                              }}
                              disabled={loadingPreviewId === voice.id}
                            >
                              {loadingPreviewId === voice.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : playingVoiceId === voice.id ? (
                                <Square className="w-4 h-4 text-primary" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                              selectedVoiceId === voice.id
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}>
                              {selectedVoiceId === voice.id && (
                                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allVoices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna voce configurata
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Summary */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            {/* Prank availability indicator */}
            {profile && (
              <Card className={`border-2 ${
                canMakePrank().allowed 
                  ? canMakePrank().isTrialCall 
                    ? "border-orange-500/50 bg-orange-500/5" 
                    : "border-green-500/50 bg-green-500/5"
                  : "border-destructive/50 bg-destructive/5"
              }`}>
                <CardContent className="pt-4 pb-4">
                  {canMakePrank().allowed ? (
                    canMakePrank().isTrialCall ? (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                          <Phone className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-orange-500">Prank Gratuito</p>
                          <p className="text-xs text-muted-foreground">
                            Puoi fare un prank gratuito solo al tuo numero verificato
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                          <Phone className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-500">Prank Disponibili: {profile.available_pranks}</p>
                          <p className="text-xs text-muted-foreground">
                            Dopo questo scherzo ne avrai {profile.available_pranks - 1}
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/20">
                        <Phone className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <p className="font-semibold text-destructive">Nessun Prank Disponibile</p>
                        <p className="text-xs text-muted-foreground">
                          {canMakePrank().reason}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Riepilogo</CardTitle>
                    <CardDescription>Controlla prima di avviare</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Vittima</span>
                    <span className="font-medium">{victimFirstName} {victimLastName}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Telefono</span>
                    <span className="font-medium font-mono">{selectedCountry?.flag} {phoneCountryCode} {victimPhone}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Sesso</span>
                    <span className="font-medium">{victimGender === "male" ? "👨 Maschio" : "👩 Femmina"}</span>
                  </div>
                  <div className="py-2 border-b border-border">
                    <span className="text-muted-foreground">Tema</span>
                    <p className="font-medium mt-1 text-sm">{prankTheme}</p>
                  </div>
                  {realDetail && (
                    <div className="py-2 border-b border-border">
                      <span className="text-muted-foreground">Dettaglio reale</span>
                      <p className="font-medium mt-1 text-sm">{realDetail}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Voce</span>
                    <span className="font-medium">{selectedVoice?.voice_name || "Non selezionata"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Tono</span>
                    <span className="font-medium">{TONES.find(t => t.value === personalityTone)?.label}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 py-2 text-muted-foreground">
                  <Mic className="w-4 h-4" />
                  <p className="text-sm">A termine della chiamata sarà disponibile la registrazione</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-14"
              onClick={handleBack}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Indietro
            </Button>
          )}
          
          {currentStep < 4 ? (
            <Button
              type="button"
              className="flex-1 h-14 gradient-primary"
              onClick={handleNext}
            >
              Avanti
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 h-14 gradient-primary shadow-glow"
              onClick={handleSubmit}
              disabled={loading || !canMakePrank().allowed}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Preparando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Avvia Scherzo
                </div>
              )}
            </Button>
          )}
        </div>
      </main>

      {/* Disclaimer Modal */}
      <PrankDisclaimerModal
        open={showDisclaimerModal}
        onOpenChange={(open) => {
          setShowDisclaimerModal(open);
          if (!open && pendingPrankId) {
            // If modal is closed without confirming, delete the pending prank
            supabase.from("pranks").delete().eq("id", pendingPrankId);
            setPendingPrankId(null);
          }
        }}
        onConfirm={handleDisclaimerConfirm}
        loading={loading}
        userId={user?.id || ""}
        prankId={pendingPrankId || undefined}
      />
    </div>
  );
};

export default CreatePrank;
