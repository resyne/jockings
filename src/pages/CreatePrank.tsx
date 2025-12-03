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
import { ArrowLeft, Phone, User, Mic, Globe, Clock, Sparkles, Send, Volume2 } from "lucide-react";
import { z } from "zod";

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
  const [prankTheme, setPrankTheme] = useState("");
  const [voiceGender, setVoiceGender] = useState("male");
  const [language, setLanguage] = useState("Italiano");
  const [personalityTone, setPersonalityTone] = useState("enthusiastic");
  const [maxDuration, setMaxDuration] = useState(60);
  const [creativityLevel, setCreativityLevel] = useState([50]);
  const [sendRecording, setSendRecording] = useState(false);

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

    setLoading(true);

    try {
      const { data: prank, error } = await supabase
        .from("pranks")
        .insert({
          user_id: user.id,
          victim_first_name: victimFirstName.trim(),
          victim_last_name: victimLastName.trim(),
          victim_phone: victimPhone.replace(/\s/g, ""),
          prank_theme: prankTheme.trim(),
          voice_gender: voiceGender,
          language,
          personality_tone: personalityTone,
          max_duration: maxDuration,
          creativity_level: creativityLevel[0],
          send_recording: sendRecording,
          call_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

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
              <div className="space-y-2">
                <Label htmlFor="theme">Tema dello Scherzo</Label>
                <Textarea
                  id="theme"
                  placeholder="Es: Fai finta di essere un tecnico del gas che deve fare un controllo urgente..."
                  value={prankTheme}
                  onChange={(e) => setPrankTheme(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Voce</Label>
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
