import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, User, Mic, Globe, Send, CalendarClock } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const phoneSchema = z.string().regex(/^\d{6,14}$/, "Numero di telefono non valido");

const LANGUAGES = ["Italiano", "English"];

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
  gender: string;
  language: string;
}

const CreatePrank = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [presets, setPresets] = useState<PrankPreset[]>([]);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");

  // Form state
  const [victimFirstName, setVictimFirstName] = useState("");
  const [victimLastName, setVictimLastName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+39");
  const [victimPhone, setVictimPhone] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("custom");
  const [prankTheme, setPrankTheme] = useState("");
  const [voiceGender, setVoiceGender] = useState("male");
  const [language, setLanguage] = useState("Italiano");
  const [personalityTone, setPersonalityTone] = useState("enthusiastic");
  const [maxDuration] = useState(120); // Default 120 seconds, managed from admin
  const [creativityLevel] = useState([50]); // Default 50%, managed from admin
  const sendRecording = true; // Recording always enabled
  const [scheduleCall, setScheduleCall] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  useEffect(() => {
    fetchPresets();
  }, []);

  useEffect(() => {
    fetchVoices();
  }, [language, voiceGender]);

  useEffect(() => {
    const repeatId = searchParams.get("repeat");
    if (repeatId && user) {
      loadPrankData(repeatId);
    }
  }, [searchParams, user]);

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

  const fetchVoices = async () => {
    const { data } = await supabase
      .from("voice_settings")
      .select("id, voice_name, description, elevenlabs_voice_id, gender, language")
      .eq("language", language)
      .eq("gender", voiceGender)
      .eq("is_active", true);

    if (data && data.length > 0) {
      setAvailableVoices(data);
      // Auto-select first voice if none selected
      if (!selectedVoiceId || !data.find(v => v.id === selectedVoiceId)) {
        setSelectedVoiceId(data[0].id);
      }
    } else {
      setAvailableVoices([]);
      setSelectedVoiceId("");
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
    const { data, error } = await supabase
      .from("pranks")
      .select("*")
      .eq("id", prankId)
      .eq("user_id", user.id)
      .single();

    if (data && !error) {
      setVictimFirstName(data.victim_first_name);
      setVictimLastName(data.victim_last_name);
      // Parse phone number to extract country code and number
      const phone = data.victim_phone;
      const matchedCountry = COUNTRY_CODES.find(c => phone.startsWith(c.code));
      if (matchedCountry) {
        setPhoneCountryCode(matchedCountry.code);
        setVictimPhone(phone.replace(matchedCountry.code, "").trim());
      } else {
        setVictimPhone(phone);
      }
      setPrankTheme(data.prank_theme);
      setVoiceGender(data.voice_gender);
      setLanguage(data.language);
      setPersonalityTone(data.personality_tone);
      
      // Find and set the voice based on elevenlabs_voice_id
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
  };

  const validateForm = () => {
    if (!victimFirstName.trim() || !victimLastName.trim()) {
      toast({ title: "Errore", description: "Inserisci nome e cognome della vittima", variant: "destructive" });
      return false;
    }
    try {
      phoneSchema.parse(victimPhone.replace(/\s/g, ""));
    } catch {
      toast({ title: "Errore", description: "Numero di telefono non valido", variant: "destructive" });
      return false;
    }
    if (!prankTheme.trim()) {
      toast({ title: "Errore", description: "Descrivi il tema dello scherzo", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user) return;

    // Validate schedule if enabled
    if (scheduleCall) {
      if (!scheduledDate || !scheduledTime) {
        toast({ title: "Errore", description: "Seleziona data e ora per la schedulazione", variant: "destructive" });
        return;
      }
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        toast({ title: "Errore", description: "La data deve essere nel futuro", variant: "destructive" });
        return;
      }
    }

    setLoading(true);

    try {
      // Get selected voice settings
      const selectedVoice = availableVoices.find(v => v.id === selectedVoiceId);
      
      // Fetch full voice settings for the selected voice
      const { data: voiceSettings } = selectedVoiceId && selectedVoiceId.length > 0
        ? await supabase
            .from("voice_settings")
            .select("*")
            .eq("id", selectedVoiceId)
            .single()
        : await supabase
            .from("voice_settings")
            .select("*")
            .eq("language", language)
            .eq("gender", voiceGender)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();

      const scheduledAt = scheduleCall ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null;
      
      const { data: prank, error } = await supabase
        .from("pranks")
        .insert({
          user_id: user.id,
          victim_first_name: victimFirstName.trim(),
          victim_last_name: victimLastName.trim(),
          victim_phone: `${phoneCountryCode}${victimPhone.replace(/\s/g, "")}`,
          prank_theme: prankTheme.trim(),
          voice_gender: voiceGender,
          voice_provider: voiceSettings?.voice_provider || "elevenlabs",
          elevenlabs_stability: voiceSettings?.elevenlabs_stability || 0.5,
          elevenlabs_similarity: voiceSettings?.elevenlabs_similarity || 0.75,
          elevenlabs_style: voiceSettings?.elevenlabs_style || 0,
          elevenlabs_speed: voiceSettings?.elevenlabs_speed || 1,
          elevenlabs_voice_id: voiceSettings?.elevenlabs_voice_id || null,
          language,
          personality_tone: personalityTone,
          max_duration: maxDuration,
          creativity_level: creativityLevel[0],
          send_recording: sendRecording,
          call_status: scheduleCall ? "scheduled" : "pending",
          scheduled_at: scheduledAt,
        })
        .select()
        .single();

      if (error) throw error;

      if (scheduleCall) {
        toast({
          title: "Scherzo schedulato! 📅",
          description: `La chiamata partirà il ${format(new Date(scheduledAt!), "d MMMM 'alle' HH:mm", { locale: it })}`,
        });
        navigate("/dashboard");
      } else {
        toast({
          title: "Scherzo creato! 🎭",
          description: "Avvio della chiamata in corso...",
        });

        // Always use VAPI
        const { error: callError } = await supabase.functions.invoke("initiate-call-vapi", {
          body: { prankId: prank.id }
        });

        if (callError) {
          console.error('Error initiating call:', callError);
          toast({
            title: "Errore chiamata",
            description: "Lo scherzo è stato salvato ma la chiamata non è partita. Riprova dalla cronologia.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Chiamata avviata! 📞",
            description: `Stiamo chiamando ${victimFirstName}...`,
          });
        }
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold">Crea Scherzo</h1>
            <p className="text-xs text-muted-foreground">Configura la tua chiamata AI</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Victim Info */}
          <Card className="animate-slide-up">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Dati della Vittima</CardTitle>
                  <CardDescription>Chi vuoi chiamare?</CardDescription>
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
                  <Label htmlFor="lastName">Cognome</Label>
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
            </CardContent>
          </Card>

          {/* Prank Theme */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Mic className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tema dello Scherzo</CardTitle>
                  <CardDescription>Cosa vuoi far dire all'AI?</CardDescription>
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
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Voice & Language Settings */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Globe className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Voce e Lingua</CardTitle>
                  <CardDescription>Personalizza la voce AI</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Lingua / Accento</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Genere Voce</Label>
                  <Select value={voiceGender} onValueChange={setVoiceGender}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Maschile 👨</SelectItem>
                      <SelectItem value="female">Femminile 👩</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
              </div>

              {/* Voice Selection Cards */}
              {availableVoices.length > 0 && (
                <div className="space-y-3">
                  <Label>Voce</Label>
                  <div className="grid gap-3">
                    {availableVoices.map((voice) => (
                      <div
                        key={voice.id}
                        onClick={() => setSelectedVoiceId(voice.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedVoiceId === voice.id
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">
                              {voice.voice_name || "Voce senza nome"}
                            </h4>
                            {voice.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {voice.description}
                              </p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
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
                    ))}
                  </div>
                </div>
              )}

              {availableVoices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nessuna voce configurata per {language} {voiceGender === "male" ? "maschile" : "femminile"}
                </p>
              )}

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
            </CardContent>
          </Card>

          {/* Options */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 py-2 text-muted-foreground">
                <Mic className="w-4 h-4" />
                <p className="text-sm">A termine della chiamata sarà disponibile la registrazione</p>
              </div>

              <div className="flex items-center justify-between py-2 border-t pt-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-orange-500" />
                  <div>
                    <Label>Programma Chiamata</Label>
                    <p className="text-xs text-muted-foreground">Imposta data e ora</p>
                  </div>
                </div>
                <Switch
                  checked={scheduleCall}
                  onCheckedChange={setScheduleCall}
                />
              </div>

              {scheduleCall && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ora</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-14 text-lg gradient-primary shadow-glow animate-slide-up"
            style={{ animationDelay: "0.25s" }}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {scheduleCall ? "Schedulando..." : "Avviando..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                {scheduleCall ? "Programma Scherzo" : "Avvia Scherzo"}
              </div>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CreatePrank;
