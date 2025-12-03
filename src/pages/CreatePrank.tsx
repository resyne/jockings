import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, User, Mic, Globe, Clock, Sparkles, Send, Volume2, CalendarClock } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/, "Numero di telefono non valido");

const LANGUAGES = [
  "Italiano", "Napoletano", "Siciliano", "Romano", "Milanese",
  "English", "Español", "Français", "Deutsch"
];

const TONES = [
  { value: "enthusiastic", label: "Entusiasta 🎉" },
  { value: "serious", label: "Serio 😐" },
  { value: "angry", label: "Arrabbiato 😠" },
  { value: "confused", label: "Confuso 🤔" },
  { value: "mysterious", label: "Misterioso 🕵️" },
  { value: "friendly", label: "Amichevole 😊" },
];

const PRANK_PRESETS = [
  { 
    id: "custom", 
    label: "Personalizzato ✏️", 
    theme: "" 
  },
  { 
    id: "gas-technician", 
    label: "Tecnico del Gas 🔧", 
    theme: "Fai finta di essere un tecnico del gas che deve fare un controllo urgente entro oggi altrimenti ci saranno gravi conseguenze. Sii molto insistente e crea urgenza." 
  },
  { 
    id: "lottery-winner", 
    label: "Vincita alla Lotteria 🎰", 
    theme: "Fai finta di essere un funzionario della lotteria nazionale che deve comunicare una vincita di 50.000€, ma ci sono documenti urgenti da compilare entro un'ora." 
  },
  { 
    id: "tv-show", 
    label: "Programma TV 📺", 
    theme: "Fai finta di essere un autore di un famoso programma TV che vuole invitare la persona come ospite d'onore per la puntata di domani. Sii entusiasta e convincente." 
  },
  { 
    id: "wrong-delivery", 
    label: "Pacco Misterioso 📦", 
    theme: "Fai finta di essere un corriere che ha un pacco enorme e pesantissimo da consegnare, ma l'indirizzo è illeggibile. Descrivi contenuti assurdi come 47 casse di ananas o un acquario con delfini." 
  },
  { 
    id: "celebrity-manager", 
    label: "Manager VIP ⭐", 
    theme: "Fai finta di essere il manager di una celebrity famosa che sta cercando urgentemente una casa in affitto nella zona e vuole venire a vedere l'appartamento oggi stesso." 
  },
  { 
    id: "survey", 
    label: "Sondaggio Assurdo 📋", 
    theme: "Fai finta di condurre un sondaggio ufficiale del comune con domande sempre più assurde: dal colore preferito dei calzini alla frequenza con cui parlano con i piccioni." 
  },
  { 
    id: "radio-contest", 
    label: "Quiz Radiofonico 🎙️", 
    theme: "Fai finta di essere un DJ di una radio locale che ha selezionato il loro numero per un quiz a premi. Fai domande impossibili e dai indizi fuorvianti." 
  },
  { 
    id: "long-lost-relative", 
    label: "Parente Lontano 👴", 
    theme: "Fai finta di essere un parente lontanissimo (tipo cugino di terzo grado) che vuole riallacciare i rapporti e raccontare storie di famiglia completamente inventate." 
  },
];

const CreatePrank = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form state
  const [victimFirstName, setVictimFirstName] = useState("");
  const [victimLastName, setVictimLastName] = useState("");
  const [victimPhone, setVictimPhone] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("custom");
  const [prankTheme, setPrankTheme] = useState("");
  const [voiceGender, setVoiceGender] = useState("male");
  const [voiceProvider, setVoiceProvider] = useState("openai");
  
  // ElevenLabs settings
  const [elStability, setElStability] = useState([50]);
  const [elSimilarity, setElSimilarity] = useState([75]);
  const [elStyle, setElStyle] = useState([0]);
  const [elSpeed, setElSpeed] = useState([100]);

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = PRANK_PRESETS.find(p => p.id === presetId);
    if (preset && preset.theme) {
      setPrankTheme(preset.theme);
    }
  };
  const [language, setLanguage] = useState("Italiano");
  const [personalityTone, setPersonalityTone] = useState("enthusiastic");
  const [maxDuration, setMaxDuration] = useState(60);
  const [creativityLevel, setCreativityLevel] = useState([50]);
  const [sendRecording, setSendRecording] = useState(false);
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
    const repeatId = searchParams.get("repeat");
    if (repeatId && user) {
      loadPrankData(repeatId);
    }
  }, [searchParams, user]);

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
      setVictimPhone(data.victim_phone);
      setPrankTheme(data.prank_theme);
      setVoiceGender(data.voice_gender);
      setVoiceProvider((data as any).voice_provider || "openai");
      setElStability([((data as any).elevenlabs_stability || 0.5) * 100]);
      setElSimilarity([((data as any).elevenlabs_similarity || 0.75) * 100]);
      setElStyle([((data as any).elevenlabs_style || 0) * 100]);
      setElSpeed([((data as any).elevenlabs_speed || 1) * 100]);
      setLanguage(data.language);
      setPersonalityTone(data.personality_tone);
      setMaxDuration(data.max_duration);
      setCreativityLevel([data.creativity_level]);
      setSendRecording(data.send_recording);
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
      const scheduledAt = scheduleCall ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null;
      
      const { data: prank, error } = await supabase
        .from("pranks")
        .insert({
          user_id: user.id,
          victim_first_name: victimFirstName.trim(),
          victim_last_name: victimLastName.trim(),
          victim_phone: victimPhone.replace(/\s/g, ""),
          prank_theme: prankTheme.trim(),
          voice_gender: voiceGender,
          voice_provider: voiceProvider,
          elevenlabs_stability: elStability[0] / 100,
          elevenlabs_similarity: elSimilarity[0] / 100,
          elevenlabs_style: elStyle[0] / 100,
          elevenlabs_speed: elSpeed[0] / 100,
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

        // Trigger Twilio call via edge function
        const { error: callError } = await supabase.functions.invoke('initiate-call', {
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
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+39 333 1234567"
                    value={victimPhone}
                    onChange={(e) => setVictimPhone(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Mic className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Parametri AI</CardTitle>
                  <CardDescription>Personalizza la voce e lo stile</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Tema dello Scherzo</Label>
                <div className="flex flex-wrap gap-2">
                  {PRANK_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant={selectedPreset === preset.id ? "default" : "outline"}
                      size="sm"
                      className={`text-xs ${selectedPreset === preset.id ? "gradient-primary" : ""}`}
                      onClick={() => handlePresetChange(preset.id)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  id="theme"
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

              <div className="space-y-2">
                <Label>Provider Voce</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "openai", label: "OpenAI (Polly)", emoji: "🤖" },
                    { value: "elevenlabs", label: "ElevenLabs", emoji: "🎙️" },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={voiceProvider === option.value ? "default" : "outline"}
                      className={`h-14 flex-col gap-1 ${voiceProvider === option.value ? "gradient-primary" : ""}`}
                      onClick={() => setVoiceProvider(option.value)}
                    >
                      <span className="text-lg">{option.emoji}</span>
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Genere Voce</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "male", label: "Maschio", emoji: "👨" },
                    { value: "female", label: "Femmina", emoji: "👩" },
                    { value: "neutral", label: "Neutro", emoji: "🤖" },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={voiceGender === option.value ? "default" : "outline"}
                      className={`h-16 flex-col gap-1 ${voiceGender === option.value ? "gradient-primary" : ""}`}
                      onClick={() => setVoiceGender(option.value)}
                    >
                      <span className="text-xl">{option.emoji}</span>
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* ElevenLabs Fine-Tuning Settings */}
              {voiceProvider === "elevenlabs" && (
                <div className="space-y-4 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                  <Label className="flex items-center gap-2 text-secondary">
                    <Sparkles className="w-4 h-4" /> Fine-Tuning ElevenLabs
                  </Label>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Stabilità</span>
                        <span className="text-muted-foreground">{elStability[0]}%</span>
                      </div>
                      <Slider
                        value={elStability}
                        onValueChange={setElStability}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Basso = più espressivo, Alto = più consistente</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Similarità</span>
                        <span className="text-muted-foreground">{elSimilarity[0]}%</span>
                      </div>
                      <Slider
                        value={elSimilarity}
                        onValueChange={setElSimilarity}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Quanto aderire al campione vocale originale</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Stile</span>
                        <span className="text-muted-foreground">{elStyle[0]}%</span>
                      </div>
                      <Slider
                        value={elStyle}
                        onValueChange={setElStyle}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Esagera lo stile (più teatrale/emotivo)</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Velocità</span>
                        <span className="text-muted-foreground">{(elSpeed[0] / 100).toFixed(1)}x</span>
                      </div>
                      <Slider
                        value={elSpeed}
                        onValueChange={setElSpeed}
                        min={50}
                        max={200}
                        step={10}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Velocità di parlato (0.5x - 2x)</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Lingua
                  </Label>
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
                  <Label className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" /> Tono
                  </Label>
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
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Sparkles className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Opzioni Avanzate</CardTitle>
                  <CardDescription>Regola durata e creatività</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Durata Massima
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 60, 120].map((duration) => (
                    <Button
                      key={duration}
                      type="button"
                      variant={maxDuration === duration ? "default" : "outline"}
                      className={maxDuration === duration ? "gradient-primary" : ""}
                      onClick={() => setMaxDuration(duration)}
                    >
                      {duration} sec
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Creatività AI
                  </Label>
                  <span className="text-sm font-medium text-primary">{creativityLevel[0]}%</span>
                </div>
                <Slider
                  value={creativityLevel}
                  onValueChange={setCreativityLevel}
                  max={100}
                  step={5}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Prevedibile</span>
                  <span>Imprevedibile</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="recording">Invia Registrazione</Label>
                  <p className="text-xs text-muted-foreground">Ricevi l'audio via email</p>
                </div>
                <Switch
                  id="recording"
                  checked={sendRecording}
                  onCheckedChange={setSendRecording}
                />
              </div>

              {/* Scheduling */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="schedule" className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4" /> Programma Chiamata
                    </Label>
                    <p className="text-xs text-muted-foreground">Pianifica per dopo</p>
                  </div>
                  <Switch
                    id="schedule"
                    checked={scheduleCall}
                    onCheckedChange={setScheduleCall}
                  />
                </div>

                {scheduleCall && (
                  <div className="grid grid-cols-2 gap-3 animate-slide-up">
                    <div className="space-y-2">
                      <Label htmlFor="date">Data</Label>
                      <Input
                        id="date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Ora</Label>
                      <Input
                        id="time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-14 text-lg gradient-primary shadow-glow animate-slide-up"
            style={{ animationDelay: "0.3s" }}
            disabled={loading}
          >
            {loading ? (
              <span className="animate-pulse">Generazione in corso...</span>
            ) : scheduleCall ? (
              <>
                <CalendarClock className="w-5 h-5 mr-2" />
                Programma Scherzo
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Avvia Chiamata AI
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CreatePrank;
