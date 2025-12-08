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
import { ArrowLeft, Mic, Save, Plus, Trash2, Shield, Play, Volume2, Loader2, Music, Brain, Phone } from "lucide-react";
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

const LANGUAGES = ["Italiano", "English"];

const GENDERS = ["male", "female"];

const AI_MODELS = [
  { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini", description: "Veloce, economico (attuale)" },
  { value: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash", description: "Molto veloce, Lovable AI" },
  { value: "google/gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite", description: "Velocissimo, economico" },
  { value: "openai/gpt-5-mini", label: "OpenAI GPT-5 Mini", description: "Più potente, più lento" },
];

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
  const [aiModel, setAiModel] = useState("openai/gpt-4o-mini");
  const [savingAiModel, setSavingAiModel] = useState(false);
  const [voiceTestOpen, setVoiceTestOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchVoiceSettings();
      fetchAiModel();
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
    const { error } = await supabase
      .from("voice_settings")
      .update({
        elevenlabs_voice_id: setting.elevenlabs_voice_id,
        elevenlabs_stability: setting.elevenlabs_stability,
        elevenlabs_similarity: setting.elevenlabs_similarity,
        elevenlabs_style: setting.elevenlabs_style,
        elevenlabs_speed: setting.elevenlabs_speed,
        is_active: setting.is_active,
      })
      .eq("id", setting.id);

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvato!", description: "Configurazione voce aggiornata" });
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
      const { data, error } = await supabase.functions.invoke("test-voice", {
        body: {
          voiceId: setting.elevenlabs_voice_id,
          stability: setting.elevenlabs_stability,
          similarity: setting.elevenlabs_similarity,
          style: setting.elevenlabs_style,
          speed: setting.elevenlabs_speed,
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
        {/* AI Model Configuration */}
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
                      <div className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
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
                    <Label>ElevenLabs Voice ID</Label>
                    <Input
                      value={selectedSetting.elevenlabs_voice_id || ""}
                      onChange={(e) => setSelectedSetting({
                        ...selectedSetting,
                        elevenlabs_voice_id: e.target.value
                      })}
                      placeholder="Voice ID da ElevenLabs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Trova voice IDs su{" "}
                      <a href="https://elevenlabs.io/voice-library" target="_blank" rel="noopener" className="text-primary underline">
                        ElevenLabs Voice Library
                      </a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Stabilità: {Math.round(selectedSetting.elevenlabs_stability * 100)}%</Label>
                    <Slider
                      value={[selectedSetting.elevenlabs_stability * 100]}
                      onValueChange={([v]) => setSelectedSetting({
                        ...selectedSetting,
                        elevenlabs_stability: v / 100
                      })}
                      max={100}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      🎯 <strong>Basso (0-30%):</strong> Più espressivo e variabile. <strong>Alto (70-100%):</strong> Più costante e monotono. Per prank, 40-60% è ideale.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Similarity Boost: {Math.round(selectedSetting.elevenlabs_similarity * 100)}%</Label>
                    <Slider
                      value={[selectedSetting.elevenlabs_similarity * 100]}
                      onValueChange={([v]) => setSelectedSetting({
                        ...selectedSetting,
                        elevenlabs_similarity: v / 100
                      })}
                      max={100}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      🔊 Quanto la voce assomiglia all'originale. <strong>Alto (75-100%):</strong> Più fedele ma può creare artefatti. <strong>Medio (50-75%):</strong> Bilanciato.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Stile: {Math.round(selectedSetting.elevenlabs_style * 100)}%</Label>
                    <Slider
                      value={[selectedSetting.elevenlabs_style * 100]}
                      onValueChange={([v]) => setSelectedSetting({
                        ...selectedSetting,
                        elevenlabs_style: v / 100
                      })}
                      max={100}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      🎭 Amplifica lo stile della voce. <strong>0%:</strong> Neutro. <strong>Alto:</strong> Più teatrale/esagerato. Per chiamate realistiche, tieni basso (0-30%).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Velocità: {selectedSetting.elevenlabs_speed.toFixed(2)}x</Label>
                    <Slider
                      value={[selectedSetting.elevenlabs_speed * 100]}
                      onValueChange={([v]) => setSelectedSetting({
                        ...selectedSetting,
                        elevenlabs_speed: v / 100
                      })}
                      min={50}
                      max={200}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      ⚡ <strong>0.8-1.0x:</strong> Naturale e calmo. <strong>1.0-1.2x:</strong> Energico/agitato. Adatta alla personalità del prank.
                    </p>
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
                      Genera un audio di test con le impostazioni correnti
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
