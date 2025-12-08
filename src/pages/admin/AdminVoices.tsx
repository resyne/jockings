import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mic, Save, Plus, Trash2, Shield, Play, Volume2, Loader2, Music, Brain, Phone, Zap } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VoiceTestDialog } from "@/components/VoiceTestDialog";

interface VoiceSetting {
  id: string;
  language: string;
  gender: string;
  voice_provider: string;
  elevenlabs_voice_id: string | null;
  elevenlabs_stability: number;
  elevenlabs_similarity: number;
  elevenlabs_style: number;
  elevenlabs_speed: number;
  polly_voice_id: string | null;
  is_active: boolean;
}

interface GlobalVoiceSettings {
  stability: number;
  similarity: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
}

const LANGUAGES = ["Italiano", "English"];

const GENDERS = ["male", "female"];

const ELEVENLABS_MODELS = [
  { value: "eleven_turbo_v2_5", label: "Turbo v2.5", description: "⚡ Più veloce - 32 lingue - Consigliato", recommended: true },
  { value: "eleven_multilingual_v2", label: "Multilingual v2", description: "Alta qualità - 29 lingue" },
  { value: "eleven_turbo_v2", label: "Turbo v2", description: "Veloce - Solo inglese" },
  { value: "eleven_flash_v2_5", label: "Flash v2.5", description: "Ultra veloce - Bassa latenza" },
];

const AI_MODELS = [
  { value: "google/gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite", description: "⚡ Velocissimo - Consigliato", recommended: true },
  { value: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash", description: "Molto veloce, buona qualità" },
  { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini", description: "Veloce, economico" },
  { value: "openai/gpt-5-mini", label: "OpenAI GPT-5 Mini", description: "Più potente, più lento" },
];

// VAPI Configuration Options
const VAPI_VOICE_PROVIDERS = [
  { value: "elevenlabs", label: "ElevenLabs", description: "Alta qualità, bassa latenza" },
  { value: "openai", label: "OpenAI", description: "Veloce, buona qualità" },
  { value: "azure", label: "Azure", description: "Microsoft TTS" },
  { value: "deepgram", label: "Deepgram", description: "Ultra veloce" },
  { value: "playht", label: "PlayHT", description: "Voci realistiche" },
];

const VAPI_TRANSCRIBER_PROVIDERS = [
  { value: "deepgram", label: "Deepgram", description: "⚡ Consigliato - Veloce e accurato", recommended: true },
  { value: "gladia", label: "Gladia", description: "Multilingue" },
  { value: "azure", label: "Azure", description: "Microsoft Speech" },
  { value: "talkscriber", label: "Talkscriber", description: "Specializzato" },
];

const VAPI_AI_MODELS = [
  { value: "gpt-4o-mini", label: "OpenAI GPT-4o Mini", description: "⚡ Veloce - Consigliato", recommended: true },
  { value: "gpt-4o", label: "OpenAI GPT-4o", description: "Più potente" },
  { value: "gpt-4", label: "OpenAI GPT-4", description: "Legacy" },
  { value: "gemini-2.5-flash", label: "Google Gemini 2.5 Flash", description: "Veloce" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku", description: "Veloce e economico" },
];

const VAPI_ELEVENLABS_VOICES = [
  { value: "21m00Tcm4TlvDq8ikWAM", label: "Rachel (English)", description: "Femminile, naturale" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Bella (English)", description: "Femminile, giovane" },
  { value: "yoZ06aMxZJJ28mfd3POQ", label: "Sam (English)", description: "Maschile, professionale" },
  { value: "pNInz6obpgDQGcFmaJgB", label: "Adam (English)", description: "Maschile, profondo" },
  { value: "custom", label: "Voice ID Personalizzato", description: "Inserisci il tuo Voice ID" },
];

const DEEPGRAM_MODELS = [
  { value: "nova-2", label: "Nova 2", description: "⚡ Più veloce e accurato", recommended: true },
  { value: "nova-2-general", label: "Nova 2 General", description: "General purpose" },
  { value: "nova-2-meeting", label: "Nova 2 Meeting", description: "Ottimizzato per meeting" },
  { value: "nova-2-phonecall", label: "Nova 2 Phonecall", description: "Ottimizzato per telefonate" },
];

interface VapiSettings {
  phoneNumberId: string;
  assistantId: string;
  // Model
  aiProvider: string;
  aiModel: string;
  temperature: number;
  maxTokens: number;
  // Voice
  voiceProvider: string;
  voiceId: string;
  customVoiceId: string;
  // Transcriber
  transcriberProvider: string;
  transcriberModel: string;
  transcriberLanguage: string;
  // Call settings
  firstMessage: string;
  silenceTimeoutSeconds: number;
  maxDurationSeconds: number;
  backgroundSound: string;
  backchannelingEnabled: boolean;
  endCallMessage: string;
}

const DEFAULT_VAPI_SETTINGS: VapiSettings = {
  phoneNumberId: "",
  assistantId: "",
  aiProvider: "openai",
  aiModel: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 150,
  voiceProvider: "elevenlabs",
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  customVoiceId: "",
  transcriberProvider: "deepgram",
  transcriberModel: "nova-2",
  transcriberLanguage: "it",
  firstMessage: "Pronto?",
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 300,
  backgroundSound: "off",
  backchannelingEnabled: false,
  endCallMessage: "Arrivederci!",
};

const DEFAULT_GLOBAL_SETTINGS: GlobalVoiceSettings = {
  stability: 0.5,
  similarity: 0.75,
  style: 0,
  speed: 1,
  use_speaker_boost: false,
};

const AdminVoices = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading } = useAdminCheck();
  const [voiceSettings, setVoiceSettings] = useState<VoiceSetting[]>([]);
  const [selectedSetting, setSelectedSetting] = useState<VoiceSetting | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLanguage, setNewLanguage] = useState("Italiano");
  const [newGender, setNewGender] = useState("male");
  const [testingVoice, setTestingVoice] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const [soundPrompt, setSoundPrompt] = useState("");
  const [generatingSound, setGeneratingSound] = useState(false);
  const [soundPreviewUrl, setSoundPreviewUrl] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState("google/gemini-2.5-flash-lite");
  const [savingAiModel, setSavingAiModel] = useState(false);
  const [voiceTestOpen, setVoiceTestOpen] = useState(false);
  
  // Global ElevenLabs settings
  const [globalSettings, setGlobalSettings] = useState<GlobalVoiceSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [elevenlabsModel, setElevenlabsModel] = useState("eleven_turbo_v2_5");
  const [savingGlobalSettings, setSavingGlobalSettings] = useState(false);
  
  // Call Provider selection
  const [callProvider, setCallProvider] = useState<"twilio" | "vapi">("twilio");
  const [vapiSettings, setVapiSettings] = useState<VapiSettings>(DEFAULT_VAPI_SETTINGS);
  const [savingCallProvider, setSavingCallProvider] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchVoiceSettings();
      fetchAiModel();
      fetchGlobalVoiceSettings();
      fetchCallProvider();
    }
  }, [isAdmin]);

  const fetchAiModel = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ai_model")
      .single();
    
    if (!error && data) {
      setAiModel(data.value);
    }
  };

  const fetchGlobalVoiceSettings = async () => {
    // Fetch global voice settings from app_settings
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["elevenlabs_stability", "elevenlabs_similarity", "elevenlabs_style", "elevenlabs_speed", "elevenlabs_speaker_boost", "elevenlabs_model"]);
    
    if (settingsData && settingsData.length > 0) {
      const settings: Partial<GlobalVoiceSettings> = {};
      let model = "eleven_turbo_v2_5";
      
      settingsData.forEach(({ key, value }) => {
        if (key === "elevenlabs_stability") settings.stability = parseFloat(value);
        if (key === "elevenlabs_similarity") settings.similarity = parseFloat(value);
        if (key === "elevenlabs_style") settings.style = parseFloat(value);
        if (key === "elevenlabs_speed") settings.speed = parseFloat(value);
        if (key === "elevenlabs_speaker_boost") settings.use_speaker_boost = value === "true";
        if (key === "elevenlabs_model") model = value;
      });
      
      setGlobalSettings({ ...DEFAULT_GLOBAL_SETTINGS, ...settings });
      setElevenlabsModel(model);
    }
  };

  const handleSaveGlobalSettings = async () => {
    setSavingGlobalSettings(true);
    try {
      const settingsToSave = [
        { key: "elevenlabs_stability", value: globalSettings.stability.toString() },
        { key: "elevenlabs_similarity", value: globalSettings.similarity.toString() },
        { key: "elevenlabs_style", value: globalSettings.style.toString() },
        { key: "elevenlabs_speed", value: globalSettings.speed.toString() },
        { key: "elevenlabs_speaker_boost", value: globalSettings.use_speaker_boost.toString() },
        { key: "elevenlabs_model", value: elevenlabsModel },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: setting.key, value: setting.value }, { onConflict: "key" });
        if (error) throw error;
      }

      toast({ title: "Salvato!", description: "Setup globale ElevenLabs aggiornato" });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setSavingGlobalSettings(false);
    }
  };

  const fetchCallProvider = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "call_provider", 
        "vapi_phone_number_id", 
        "vapi_assistant_id",
        "vapi_ai_provider",
        "vapi_ai_model",
        "vapi_temperature",
        "vapi_max_tokens",
        "vapi_voice_provider",
        "vapi_voice_id",
        "vapi_custom_voice_id",
        "vapi_transcriber_provider",
        "vapi_transcriber_model",
        "vapi_transcriber_language",
        "vapi_first_message",
        "vapi_silence_timeout",
        "vapi_max_duration",
        "vapi_background_sound",
        "vapi_backchanneling",
        "vapi_end_call_message",
      ]);
    
    if (data) {
      const newSettings = { ...DEFAULT_VAPI_SETTINGS };
      data.forEach(({ key, value }) => {
        if (key === "call_provider") setCallProvider(value as "twilio" | "vapi");
        if (key === "vapi_phone_number_id") newSettings.phoneNumberId = value;
        if (key === "vapi_assistant_id") newSettings.assistantId = value;
        if (key === "vapi_ai_provider") newSettings.aiProvider = value;
        if (key === "vapi_ai_model") newSettings.aiModel = value;
        if (key === "vapi_temperature") newSettings.temperature = parseFloat(value);
        if (key === "vapi_max_tokens") newSettings.maxTokens = parseInt(value);
        if (key === "vapi_voice_provider") newSettings.voiceProvider = value;
        if (key === "vapi_voice_id") newSettings.voiceId = value;
        if (key === "vapi_custom_voice_id") newSettings.customVoiceId = value;
        if (key === "vapi_transcriber_provider") newSettings.transcriberProvider = value;
        if (key === "vapi_transcriber_model") newSettings.transcriberModel = value;
        if (key === "vapi_transcriber_language") newSettings.transcriberLanguage = value;
        if (key === "vapi_first_message") newSettings.firstMessage = value;
        if (key === "vapi_silence_timeout") newSettings.silenceTimeoutSeconds = parseInt(value);
        if (key === "vapi_max_duration") newSettings.maxDurationSeconds = parseInt(value);
        if (key === "vapi_background_sound") newSettings.backgroundSound = value;
        if (key === "vapi_backchanneling") newSettings.backchannelingEnabled = value === "true";
        if (key === "vapi_end_call_message") newSettings.endCallMessage = value;
      });
      setVapiSettings(newSettings);
    }
  };

  const handleSaveCallProvider = async () => {
    setSavingCallProvider(true);
    try {
      const settingsToSave = [
        { key: "call_provider", value: callProvider },
        { key: "vapi_phone_number_id", value: vapiSettings.phoneNumberId },
        { key: "vapi_assistant_id", value: vapiSettings.assistantId },
        { key: "vapi_ai_provider", value: vapiSettings.aiProvider },
        { key: "vapi_ai_model", value: vapiSettings.aiModel },
        { key: "vapi_temperature", value: vapiSettings.temperature.toString() },
        { key: "vapi_max_tokens", value: vapiSettings.maxTokens.toString() },
        { key: "vapi_voice_provider", value: vapiSettings.voiceProvider },
        { key: "vapi_voice_id", value: vapiSettings.voiceId },
        { key: "vapi_custom_voice_id", value: vapiSettings.customVoiceId },
        { key: "vapi_transcriber_provider", value: vapiSettings.transcriberProvider },
        { key: "vapi_transcriber_model", value: vapiSettings.transcriberModel },
        { key: "vapi_transcriber_language", value: vapiSettings.transcriberLanguage },
        { key: "vapi_first_message", value: vapiSettings.firstMessage },
        { key: "vapi_silence_timeout", value: vapiSettings.silenceTimeoutSeconds.toString() },
        { key: "vapi_max_duration", value: vapiSettings.maxDurationSeconds.toString() },
        { key: "vapi_background_sound", value: vapiSettings.backgroundSound },
        { key: "vapi_backchanneling", value: vapiSettings.backchannelingEnabled.toString() },
        { key: "vapi_end_call_message", value: vapiSettings.endCallMessage },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: setting.key, value: setting.value }, { onConflict: "key" });
        if (error) throw error;
      }

      toast({ title: "Salvato!", description: `Provider chiamate: ${callProvider === "vapi" ? "VAPI" : "Twilio/ElevenLabs"}` });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setSavingCallProvider(false);
    }
  };

  const handleSaveAiModel = async () => {
    setSavingAiModel(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: aiModel })
        .eq("key", "ai_model");

      if (error) throw error;
      toast({ title: "Salvato!", description: "Modello AI aggiornato" });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setSavingAiModel(false);
    }
  };

  const fetchVoiceSettings = async () => {
    const { data, error } = await supabase
      .from("voice_settings")
      .select("*")
      .order("language", { ascending: true });

    if (!error && data) {
      setVoiceSettings(data as VoiceSetting[]);
    }
  };

  const handleSave = async (setting: VoiceSetting) => {
    // Only save voice ID - other settings are global now
    const { error } = await supabase
      .from("voice_settings")
      .update({
        elevenlabs_voice_id: setting.elevenlabs_voice_id,
        is_active: setting.is_active,
      })
      .eq("id", setting.id);

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvato!", description: "Voice ID aggiornato" });
      fetchVoiceSettings();
      setSelectedSetting(null);
    }
  };

  const handleAddNew = async () => {
    const existing = voiceSettings.find(
      (v) => v.language === newLanguage && v.gender === newGender
    );

    if (existing) {
      toast({ title: "Errore", description: "Questa combinazione lingua/genere esiste già", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("voice_settings")
      .insert({
        language: newLanguage,
        gender: newGender,
        voice_provider: "elevenlabs",
        elevenlabs_stability: 0.5,
        elevenlabs_similarity: 0.75,
        elevenlabs_style: 0,
        elevenlabs_speed: 1,
      });

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Aggiunto!", description: "Nuova configurazione voce creata" });
      fetchVoiceSettings();
      setIsAddDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("voice_settings")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Eliminato!", description: "Configurazione voce rimossa" });
      fetchVoiceSettings();
      setSelectedSetting(null);
    }
  };

  const handleTestVoice = async (setting: VoiceSetting) => {
    if (!setting.elevenlabs_voice_id) {
      toast({ title: "Errore", description: "Inserisci prima un Voice ID", variant: "destructive" });
      return;
    }

    setTestingVoice(true);
    setTestAudioUrl(null);

    try {
      // Use global settings for test
      const { data, error } = await supabase.functions.invoke("test-voice", {
        body: {
          voiceId: setting.elevenlabs_voice_id,
          stability: globalSettings.stability,
          similarity: globalSettings.similarity,
          style: globalSettings.style,
          speed: globalSettings.speed,
          language: setting.language,
        },
      });

      if (error) throw error;

      if (data?.audioUrl) {
        setTestAudioUrl(data.audioUrl);
        toast({ title: "Audio generato!", description: "Premi play per ascoltare" });
      }
    } catch (error: any) {
      console.error("Test voice error:", error);
      toast({ 
        title: "Errore", 
        description: error.message || "Impossibile generare l'audio di test", 
        variant: "destructive" 
      });
    } finally {
      setTestingVoice(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Shield className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-orange-500" />
              <h1 className="font-bold">Configurazione Voci</h1>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuova Configurazione Voce</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Lingua</Label>
                  <Select value={newLanguage} onValueChange={setNewLanguage}>
                    <SelectTrigger>
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
                  <Label>Genere</Label>
                  <Select value={newGender} onValueChange={setNewGender}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g === "male" ? "Maschile" : "Femminile"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddNew} className="w-full">Crea</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Call Provider Selection */}
        <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              Provider Chiamate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCallProvider("twilio")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  callProvider === "twilio" 
                    ? "border-purple-500 bg-purple-500/10" 
                    : "border-border hover:border-purple-500/50"
                }`}
              >
                <div className="font-medium">Twilio + ElevenLabs</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Architettura attuale. Più controllo ma latenza maggiore.
                </p>
              </button>
              <button
                onClick={() => setCallProvider("vapi")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  callProvider === "vapi" 
                    ? "border-purple-500 bg-purple-500/10" 
                    : "border-border hover:border-purple-500/50"
                }`}
              >
                <div className="font-medium flex items-center gap-2">
                  VAPI
                  <span className="text-xs bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded">Streaming</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Audio streaming nativo. Latenza minima.
                </p>
              </button>
            </div>

            {callProvider === "vapi" && (
              <div className="space-y-6 pt-4 border-t">
                {/* Basic VAPI Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>VAPI Phone Number ID *</Label>
                    <Input
                      value={vapiSettings.phoneNumberId}
                      onChange={(e) => setVapiSettings({ ...vapiSettings, phoneNumberId: e.target.value })}
                      placeholder="Inserisci Phone Number ID"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      <a href="https://dashboard.vapi.ai/phone-numbers" target="_blank" rel="noopener" className="text-primary underline">
                        VAPI Dashboard → Phone Numbers
                      </a>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>VAPI Assistant ID (opzionale)</Label>
                    <Input
                      value={vapiSettings.assistantId}
                      onChange={(e) => setVapiSettings({ ...vapiSettings, assistantId: e.target.value })}
                      placeholder="Usa un assistente pre-configurato"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lascia vuoto per creare dinamicamente
                    </p>
                  </div>
                </div>

                {/* AI Model Section */}
                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-4">
                  <h4 className="font-medium flex items-center gap-2 text-purple-600">
                    <Brain className="w-4 h-4" />
                    Modello AI
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Modello</Label>
                      <Select 
                        value={vapiSettings.aiModel} 
                        onValueChange={(value) => setVapiSettings({ ...vapiSettings, aiModel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VAPI_AI_MODELS.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              <div className="flex flex-col">
                                <span className={model.recommended ? "font-medium" : ""}>{model.label}</span>
                                <span className="text-xs text-muted-foreground">{model.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature: {vapiSettings.temperature.toFixed(1)}</Label>
                      <Slider
                        value={[vapiSettings.temperature * 100]}
                        onValueChange={([v]) => setVapiSettings({ ...vapiSettings, temperature: v / 100 })}
                        max={100}
                        step={5}
                      />
                      <p className="text-xs text-muted-foreground">
                        0 = preciso, 1 = creativo
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tokens: {vapiSettings.maxTokens}</Label>
                    <Slider
                      value={[vapiSettings.maxTokens]}
                      onValueChange={([v]) => setVapiSettings({ ...vapiSettings, maxTokens: v })}
                      min={50}
                      max={500}
                      step={10}
                    />
                  </div>
                </div>

                {/* Voice Section */}
                <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-4">
                  <h4 className="font-medium flex items-center gap-2 text-orange-600">
                    <Volume2 className="w-4 h-4" />
                    Voce TTS
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Provider Voce</Label>
                      <Select 
                        value={vapiSettings.voiceProvider} 
                        onValueChange={(value) => setVapiSettings({ ...vapiSettings, voiceProvider: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VAPI_VOICE_PROVIDERS.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              <div className="flex flex-col">
                                <span>{provider.label}</span>
                                <span className="text-xs text-muted-foreground">{provider.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Voice ID</Label>
                      {vapiSettings.voiceProvider === "elevenlabs" ? (
                        <Select 
                          value={vapiSettings.voiceId} 
                          onValueChange={(value) => setVapiSettings({ ...vapiSettings, voiceId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VAPI_ELEVENLABS_VOICES.map((voice) => (
                              <SelectItem key={voice.value} value={voice.value}>
                                <div className="flex flex-col">
                                  <span>{voice.label}</span>
                                  <span className="text-xs text-muted-foreground">{voice.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={vapiSettings.voiceId}
                          onChange={(e) => setVapiSettings({ ...vapiSettings, voiceId: e.target.value })}
                          placeholder="Voice ID del provider selezionato"
                          className="font-mono text-sm"
                        />
                      )}
                    </div>
                  </div>
                  {vapiSettings.voiceId === "custom" && (
                    <div className="space-y-2">
                      <Label>Voice ID Personalizzato</Label>
                      <Input
                        value={vapiSettings.customVoiceId}
                        onChange={(e) => setVapiSettings({ ...vapiSettings, customVoiceId: e.target.value })}
                        placeholder="Inserisci il Voice ID personalizzato"
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Transcriber Section */}
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-4">
                  <h4 className="font-medium flex items-center gap-2 text-blue-600">
                    <Mic className="w-4 h-4" />
                    Trascrizione (STT)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select 
                        value={vapiSettings.transcriberProvider} 
                        onValueChange={(value) => setVapiSettings({ ...vapiSettings, transcriberProvider: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VAPI_TRANSCRIBER_PROVIDERS.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              <div className="flex flex-col">
                                <span className={provider.recommended ? "font-medium" : ""}>{provider.label}</span>
                                <span className="text-xs text-muted-foreground">{provider.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {vapiSettings.transcriberProvider === "deepgram" && (
                      <div className="space-y-2">
                        <Label>Modello</Label>
                        <Select 
                          value={vapiSettings.transcriberModel} 
                          onValueChange={(value) => setVapiSettings({ ...vapiSettings, transcriberModel: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEEPGRAM_MODELS.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                <div className="flex flex-col">
                                  <span className={model.recommended ? "font-medium" : ""}>{model.label}</span>
                                  <span className="text-xs text-muted-foreground">{model.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Lingua</Label>
                      <Select 
                        value={vapiSettings.transcriberLanguage} 
                        onValueChange={(value) => setVapiSettings({ ...vapiSettings, transcriberLanguage: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="it">Italiano</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="multi">Multi-lingua</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Call Settings Section */}
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 space-y-4">
                  <h4 className="font-medium flex items-center gap-2 text-green-600">
                    <Phone className="w-4 h-4" />
                    Impostazioni Chiamata
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Primo Messaggio</Label>
                      <Input
                        value={vapiSettings.firstMessage}
                        onChange={(e) => setVapiSettings({ ...vapiSettings, firstMessage: e.target.value })}
                        placeholder="Messaggio iniziale della chiamata"
                      />
                      <p className="text-xs text-muted-foreground">
                        Il messaggio che l'AI dirà all'inizio della chiamata
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Messaggio Fine Chiamata</Label>
                      <Input
                        value={vapiSettings.endCallMessage}
                        onChange={(e) => setVapiSettings({ ...vapiSettings, endCallMessage: e.target.value })}
                        placeholder="Messaggio finale"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Timeout Silenzio: {vapiSettings.silenceTimeoutSeconds}s</Label>
                        <Slider
                          value={[vapiSettings.silenceTimeoutSeconds]}
                          onValueChange={([v]) => setVapiSettings({ ...vapiSettings, silenceTimeoutSeconds: v })}
                          min={10}
                          max={120}
                          step={5}
                        />
                        <p className="text-xs text-muted-foreground">
                          Termina la chiamata dopo questo tempo di silenzio
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Durata Massima: {Math.floor(vapiSettings.maxDurationSeconds / 60)}m</Label>
                        <Slider
                          value={[vapiSettings.maxDurationSeconds]}
                          onValueChange={([v]) => setVapiSettings({ ...vapiSettings, maxDurationSeconds: v })}
                          min={60}
                          max={600}
                          step={30}
                        />
                        <p className="text-xs text-muted-foreground">
                          Durata massima della chiamata
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Suono di Sottofondo</Label>
                        <Select 
                          value={vapiSettings.backgroundSound} 
                          onValueChange={(value) => setVapiSettings({ ...vapiSettings, backgroundSound: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="off">Nessuno</SelectItem>
                            <SelectItem value="office">Ufficio</SelectItem>
                            <SelectItem value="convention">Convention</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <Label className="font-medium">Backchanneling</Label>
                          <p className="text-xs text-muted-foreground">
                            Risposte come "mhm", "ok"
                          </p>
                        </div>
                        <Button
                          variant={vapiSettings.backchannelingEnabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVapiSettings({ ...vapiSettings, backchannelingEnabled: !vapiSettings.backchannelingEnabled })}
                        >
                          {vapiSettings.backchannelingEnabled ? "ON" : "OFF"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleSaveCallProvider} disabled={savingCallProvider} className="w-full">
              {savingCallProvider ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salva Provider
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Global ElevenLabs Setup - UNIFIED FOR ALL VOICES - Only show for Twilio */}
        {callProvider === "twilio" && (
        <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-orange-500" />
              Setup Globale ElevenLabs
              <span className="text-xs bg-orange-500/20 text-orange-600 px-2 py-0.5 rounded-full ml-2">
                Vale per tutte le voci
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ElevenLabs Model */}
            <div className="space-y-2">
              <Label className="font-medium">Modello TTS</Label>
              <Select value={elevenlabsModel} onValueChange={setElevenlabsModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELEVENLABS_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span className={model.recommended ? "font-medium" : ""}>{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Turbo v2.5 è il più veloce e consigliato per chiamate in tempo reale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stability */}
              <div className="space-y-3">
                <Label className="font-medium">
                  Stabilità: {Math.round(globalSettings.stability * 100)}%
                </Label>
                <Slider
                  value={[globalSettings.stability * 100]}
                  onValueChange={([v]) => setGlobalSettings({ ...globalSettings, stability: v / 100 })}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  🎯 <strong>Basso (0-30%):</strong> Più espressivo e variabile<br/>
                  <strong>Alto (70-100%):</strong> Più costante e prevedibile<br/>
                  <span className="text-orange-600">Consigliato prank: 40-60%</span>
                </p>
              </div>

              {/* Similarity Boost */}
              <div className="space-y-3">
                <Label className="font-medium">
                  Similarity Boost: {Math.round(globalSettings.similarity * 100)}%
                </Label>
                <Slider
                  value={[globalSettings.similarity * 100]}
                  onValueChange={([v]) => setGlobalSettings({ ...globalSettings, similarity: v / 100 })}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  🔊 Fedeltà alla voce originale<br/>
                  <strong>Alto:</strong> Più fedele ma può creare artefatti<br/>
                  <span className="text-orange-600">Consigliato: 50-75%</span>
                </p>
              </div>

              {/* Style Exaggeration */}
              <div className="space-y-3">
                <Label className="font-medium">
                  Style Exaggeration: {Math.round(globalSettings.style * 100)}%
                </Label>
                <Slider
                  value={[globalSettings.style * 100]}
                  onValueChange={([v]) => setGlobalSettings({ ...globalSettings, style: v / 100 })}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  🎭 Amplifica lo stile della voce<br/>
                  <strong>0%:</strong> Neutro | <strong>Alto:</strong> Più teatrale<br/>
                  <span className="text-orange-600">Per realismo: 0-30%</span>
                </p>
              </div>

              {/* Speed */}
              <div className="space-y-3">
                <Label className="font-medium">
                  Velocità: {globalSettings.speed.toFixed(2)}x
                </Label>
                <Slider
                  value={[globalSettings.speed * 100]}
                  onValueChange={([v]) => setGlobalSettings({ ...globalSettings, speed: v / 100 })}
                  min={50}
                  max={200}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  ⚡ Velocità parlata<br/>
                  <strong>0.5x:</strong> Lento | <strong>2x:</strong> Veloce<br/>
                  <span className="text-orange-600">Normale: 0.9-1.1x</span>
                </p>
              </div>
            </div>

            {/* Speaker Boost */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <Label className="font-medium">Speaker Boost</Label>
                <p className="text-xs text-muted-foreground">
                  Migliora la chiarezza ma aumenta latenza. Disabilitato = più veloce.
                </p>
              </div>
              <Button
                variant={globalSettings.use_speaker_boost ? "default" : "outline"}
                size="sm"
                onClick={() => setGlobalSettings({ ...globalSettings, use_speaker_boost: !globalSettings.use_speaker_boost })}
              >
                {globalSettings.use_speaker_boost ? "ON" : "OFF"}
              </Button>
            </div>

            <Button onClick={handleSaveGlobalSettings} disabled={savingGlobalSettings} className="w-full">
              {savingGlobalSettings ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salva Setup Globale ElevenLabs
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        )}

        {/* AI Model Configuration - Only show for Twilio */}
        {callProvider === "twilio" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Modello AI per Risposte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Seleziona il modello AI</Label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className={model.recommended ? "font-medium" : ""}>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Questo modello genera il testo delle risposte AI. ElevenLabs viene sempre usato per la voce.
              </p>
            </div>
            <Button onClick={handleSaveAiModel} disabled={savingAiModel} className="w-full">
              {savingAiModel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salva Modello AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        )}

        {/* Voice configurations - Only show for Twilio */}
        {callProvider === "twilio" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* List */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground">Configurazioni ({voiceSettings.length})</h2>
            {voiceSettings.map((setting) => (
              <Card 
                key={setting.id}
                className={`cursor-pointer transition-colors ${selectedSetting?.id === setting.id ? "border-primary" : ""}`}
                onClick={() => setSelectedSetting(setting)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{setting.language}</p>
                      <p className="text-sm text-muted-foreground">
                        {setting.gender === "male" ? "Maschile" : "Femminile"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Voice ID</p>
                      <p className="text-xs font-mono">{setting.elevenlabs_voice_id?.slice(0, 8) || "Non impostato"}...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Editor */}
          <div>
            {selectedSetting ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedSetting.language} - {selectedSetting.gender === "male" ? "Maschile" : "Femminile"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-medium">ElevenLabs Voice ID</Label>
                    <Input
                      value={selectedSetting.elevenlabs_voice_id || ""}
                      onChange={(e) => setSelectedSetting({
                        ...selectedSetting,
                        elevenlabs_voice_id: e.target.value
                      })}
                      placeholder="Voice ID da ElevenLabs"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Trova voice IDs su{" "}
                      <a href="https://elevenlabs.io/voice-library" target="_blank" rel="noopener" className="text-primary underline">
                        ElevenLabs Voice Library
                      </a>
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">ℹ️ Parametri audio</p>
                    <p>I parametri Stabilità, Similarity, Stile e Velocità sono configurati nel <strong>Setup Globale ElevenLabs</strong> sopra e valgono per tutte le voci.</p>
                  </div>

                  {/* Test Voice Section */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-primary" />
                        <Label>Prova Voce</Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestVoice(selectedSetting)}
                        disabled={testingVoice || !selectedSetting.elevenlabs_voice_id}
                      >
                        {testingVoice ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Genera Audio
                          </>
                        )}
                      </Button>
                    </div>
                    {testAudioUrl && (
                      <audio 
                        src={testAudioUrl} 
                        controls 
                        autoPlay 
                        className="w-full"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Genera un audio di test con i settings globali
                    </p>
                  </div>

                  {/* Test Call Section */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-500" />
                        <Label>Test Chiamata Live</Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVoiceTestOpen(true)}
                        className="border-green-500 text-green-600 hover:bg-green-50"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Avvia Test
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prova una conversazione dal vivo con l'AI usando questa configurazione voce
                    </p>
                  </div>

                  {/* Background Sound Section */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-orange-500" />
                      <Label>Genera Suono di Sottofondo</Label>
                    </div>
                    <Textarea
                      value={soundPrompt}
                      onChange={(e) => setSoundPrompt(e.target.value)}
                      placeholder="Descrivi il suono (in inglese per migliori risultati): es. 'busy office with phones ringing and people talking'"
                      rows={2}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!soundPrompt.trim()) {
                          toast({ title: "Errore", description: "Inserisci una descrizione del suono", variant: "destructive" });
                          return;
                        }
                        setGeneratingSound(true);
                        setSoundPreviewUrl(null);
                        try {
                          const { data, error } = await supabase.functions.invoke("generate-sound-effect", {
                            body: { prompt: soundPrompt, duration: 10 }
                          });
                          if (error) throw error;
                          if (data?.audioUrl) {
                            setSoundPreviewUrl(data.audioUrl);
                            toast({ title: "Suono generato!", description: "Premi play per ascoltare" });
                          } else if (data?.audioBase64) {
                            setSoundPreviewUrl(`data:audio/mpeg;base64,${data.audioBase64}`);
                            toast({ title: "Suono generato!", description: "Premi play per ascoltare" });
                          }
                        } catch (error: any) {
                          toast({ title: "Errore", description: error.message, variant: "destructive" });
                        } finally {
                          setGeneratingSound(false);
                        }
                      }}
                      disabled={generatingSound || !soundPrompt.trim()}
                      className="w-full"
                    >
                      {generatingSound ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Music className="w-4 h-4 mr-2" />
                          Genera Suono
                        </>
                      )}
                    </Button>
                    {soundPreviewUrl && (
                      <audio src={soundPreviewUrl} controls className="w-full" />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Usa ElevenLabs Sound Effects per generare suoni ambiente. Copia l'URL per usarlo nei preset.
                    </p>
                    {soundPreviewUrl && soundPreviewUrl.startsWith("http") && (
                      <div className="flex items-center gap-2">
                        <Input value={soundPreviewUrl} readOnly className="text-xs" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(soundPreviewUrl);
                            toast({ title: "Copiato!", description: "URL copiato negli appunti" });
                          }}
                        >
                          Copia
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => handleSave(selectedSetting)} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Salva
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={() => handleDelete(selectedSetting.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[300px]">
                <p className="text-muted-foreground">Seleziona una configurazione</p>
              </Card>
            )}
          </div>
        </div>
        )}
      </main>

      {/* Voice Test Dialog */}
      {selectedSetting && (
        <VoiceTestDialog
          open={voiceTestOpen}
          onOpenChange={setVoiceTestOpen}
          language={selectedSetting.language}
          gender={selectedSetting.gender}
          voiceId={selectedSetting.elevenlabs_voice_id}
          personality="friendly"
          elevenlabsSettings={{
            stability: selectedSetting.elevenlabs_stability * 100,
            similarity: selectedSetting.elevenlabs_similarity * 100,
            style: selectedSetting.elevenlabs_style * 100,
            speed: selectedSetting.elevenlabs_speed
          }}
        />
      )}
    </div>
  );
};

export default AdminVoices;
