import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Save, Plus, Trash2, Shield, GripVertical, Volume2, Loader2, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PrankPreset {
  id: string;
  title: string;
  theme: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  background_sound_prompt: string | null;
  background_sound_url: string | null;
  background_sound_enabled: boolean;
}

const AdminPresets = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading } = useAdminCheck();
  const [presets, setPresets] = useState<PrankPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PrankPreset | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTheme, setNewTheme] = useState("");
  const [newIcon, setNewIcon] = useState("🎭");
  const [generatingSound, setGeneratingSound] = useState(false);
  const [testSoundUrl, setTestSoundUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchPresets();
    }
  }, [isAdmin]);

  const fetchPresets = async () => {
    const { data, error } = await supabase
      .from("prank_presets")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setPresets(data as PrankPreset[]);
    }
  };

  const handleSave = async (preset: PrankPreset) => {
    const { error } = await supabase
      .from("prank_presets")
      .update({
        title: preset.title,
        theme: preset.theme,
        icon: preset.icon,
        is_active: preset.is_active,
        sort_order: preset.sort_order,
        background_sound_prompt: preset.background_sound_prompt,
        background_sound_url: preset.background_sound_url,
        background_sound_enabled: preset.background_sound_enabled,
      })
      .eq("id", preset.id);

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvato!", description: "Preset aggiornato" });
      fetchPresets();
    }
  };

  const handleGenerateSound = async () => {
    if (!selectedPreset?.background_sound_prompt) {
      toast({ title: "Errore", description: "Inserisci prima un prompt per il suono", variant: "destructive" });
      return;
    }

    setGeneratingSound(true);
    setTestSoundUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-sound-effect", {
        body: {
          prompt: selectedPreset.background_sound_prompt,
          duration: 5,
          presetId: selectedPreset.id,
        },
      });

      if (error) throw error;

      if (data?.audioUrl) {
        setTestSoundUrl(data.audioUrl);
        setSelectedPreset({
          ...selectedPreset,
          background_sound_url: data.audioUrl,
          background_sound_enabled: true
        });
        toast({ title: "Suono generato!", description: "Ascolta il risultato" });
        fetchPresets();
      } else if (data?.audioBase64) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioBase64}`;
        setTestSoundUrl(audioUrl);
        toast({ title: "Suono generato!", description: "Ascolta il risultato" });
      }
    } catch (error: any) {
      console.error("Generate sound error:", error);
      toast({ 
        title: "Errore", 
        description: error.message || "Impossibile generare il suono", 
        variant: "destructive" 
      });
    } finally {
      setGeneratingSound(false);
    }
  };

  const handleAddNew = async () => {
    if (!newTitle.trim() || !newTheme.trim()) {
      toast({ title: "Errore", description: "Compila tutti i campi", variant: "destructive" });
      return;
    }

    const maxOrder = Math.max(...presets.map(p => p.sort_order), 0);

    const { error } = await supabase
      .from("prank_presets")
      .insert({
        title: newTitle,
        theme: newTheme,
        icon: newIcon,
        sort_order: maxOrder + 1,
      });

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Aggiunto!", description: "Nuovo preset creato" });
      fetchPresets();
      setIsAddDialogOpen(false);
      setNewTitle("");
      setNewTheme("");
      setNewIcon("🎭");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("prank_presets")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Eliminato!", description: "Preset rimosso" });
      fetchPresets();
      setSelectedPreset(null);
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
              <FileText className="w-5 h-5 text-purple-500" />
              <h1 className="font-bold">Preset Scherzi</h1>
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
                <DialogTitle>Nuovo Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label>Icona</Label>
                    <Input
                      value={newIcon}
                      onChange={(e) => setNewIcon(e.target.value)}
                      className="text-center text-2xl"
                      maxLength={4}
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label>Titolo</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Es: Tecnico del Gas"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tema / Prompt</Label>
                  <Textarea
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                    placeholder="Descrivi lo scherzo..."
                    className="min-h-[120px]"
                  />
                </div>
                <Button onClick={handleAddNew} className="w-full">Crea Preset</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* List */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground">Preset ({presets.length})</h2>
            {presets.map((preset) => (
              <Card 
                key={preset.id}
                className={`cursor-pointer transition-colors ${selectedPreset?.id === preset.id ? "border-primary" : ""} ${!preset.is_active ? "opacity-50" : ""}`}
                onClick={() => setSelectedPreset(preset)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-2xl">{preset.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{preset.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{preset.theme}</p>
                    </div>
                    {!preset.is_active && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Disattivo</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Editor */}
          <div>
            {selectedPreset ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">{selectedPreset.icon}</span>
                    {selectedPreset.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label>Icona</Label>
                      <Input
                        value={selectedPreset.icon}
                        onChange={(e) => setSelectedPreset({
                          ...selectedPreset,
                          icon: e.target.value
                        })}
                        className="text-center text-2xl"
                        maxLength={4}
                      />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label>Titolo</Label>
                      <Input
                        value={selectedPreset.title}
                        onChange={(e) => setSelectedPreset({
                          ...selectedPreset,
                          title: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tema / Prompt AI</Label>
                    <Textarea
                      value={selectedPreset.theme}
                      onChange={(e) => setSelectedPreset({
                        ...selectedPreset,
                        theme: e.target.value
                      })}
                      className="min-h-[150px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ordine</Label>
                    <Input
                      type="number"
                      value={selectedPreset.sort_order}
                      onChange={(e) => setSelectedPreset({
                        ...selectedPreset,
                        sort_order: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Attivo</Label>
                    <Switch
                      checked={selectedPreset.is_active}
                      onCheckedChange={(checked) => setSelectedPreset({
                        ...selectedPreset,
                        is_active: checked
                      })}
                    />
                  </div>

                  {/* Background Sound Section */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-primary" />
                        <Label>Suono di Sottofondo</Label>
                      </div>
                      <Switch
                        checked={selectedPreset.background_sound_enabled}
                        onCheckedChange={(checked) => setSelectedPreset({
                          ...selectedPreset,
                          background_sound_enabled: checked
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Prompt per ElevenLabs Sound Effects</Label>
                      <Textarea
                        value={selectedPreset.background_sound_prompt || ""}
                        onChange={(e) => setSelectedPreset({
                          ...selectedPreset,
                          background_sound_prompt: e.target.value
                        })}
                        placeholder="Es: Office ambiance with phone ringing, keyboard typing, distant conversations"
                        className="min-h-[80px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Descrivi l'ambiente sonoro in inglese. Es: "busy traffic street", "quiet office", "restaurant kitchen"
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateSound}
                        disabled={generatingSound || !selectedPreset.background_sound_prompt}
                        className="flex-1"
                      >
                        {generatingSound ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 mr-2" />
                            Genera Suono
                          </>
                        )}
                      </Button>
                      {(testSoundUrl || selectedPreset.background_sound_url) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const audio = new Audio(testSoundUrl || selectedPreset.background_sound_url || "");
                            audio.play();
                          }}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {(testSoundUrl || selectedPreset.background_sound_url) && (
                      <audio 
                        src={testSoundUrl || selectedPreset.background_sound_url || ""} 
                        controls 
                        className="w-full h-8"
                      />
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => handleSave(selectedPreset)} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Salva
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={() => handleDelete(selectedPreset.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[300px]">
                <p className="text-muted-foreground">Seleziona un preset</p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPresets;
