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
import { ArrowLeft, Mic, Save, Plus, Trash2, Shield, Play, Volume2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

const LANGUAGES = [
  "Italiano", "Napoletano", "Siciliano", "Romano", "Milanese",
  "English", "Español", "Français", "Deutsch"
];

const GENDERS = ["male", "female", "neutral"];

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

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchVoiceSettings();
    }
  }, [isAdmin]);

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
                          {g === "male" ? "Maschile" : g === "female" ? "Femminile" : "Neutro"}
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

      <main className="px-4 py-6 max-w-4xl mx-auto">
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
                        {setting.gender === "male" ? "Maschile" : setting.gender === "female" ? "Femminile" : "Neutro"}
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
                    {selectedSetting.language} - {selectedSetting.gender === "male" ? "Maschile" : selectedSetting.gender === "female" ? "Femminile" : "Neutro"}
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
    </div>
  );
};

export default AdminVoices;
