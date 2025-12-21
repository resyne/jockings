import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { 
  ArrowLeft, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Save, 
  Loader2,
  AlertTriangle,
  Ban,
  Skull,
  DollarSign,
  MessageSquareWarning,
  Brain
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContentRule {
  id: string;
  category: string;
  keywords: string[];
  block_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  TRAUMA: { label: "Eventi Traumatici", icon: <Skull className="w-4 h-4" />, color: "bg-red-500" },
  SCAM: { label: "Potenziale Truffa", icon: <DollarSign className="w-4 h-4" />, color: "bg-orange-500" },
  THREATS: { label: "Minacce/Intimidazioni", icon: <Ban className="w-4 h-4" />, color: "bg-yellow-500" },
  SENSITIVE: { label: "Contenuti Sensibili", icon: <AlertTriangle className="w-4 h-4" />, color: "bg-purple-500" },
};

const AdminContentChecker = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  
  const [rules, setRules] = useState<ContentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkerEnabled, setCheckerEnabled] = useState(true);
  const [useAI, setUseAI] = useState(true);
  
  const [editingRule, setEditingRule] = useState<ContentRule | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    fetchRules();
    fetchSettings();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prank_content_rules")
      .select("*")
      .order("category");

    if (error) {
      toast({ title: "Errore", description: "Impossibile caricare le regole", variant: "destructive" });
    } else {
      setRules(data || []);
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["ai_content_checker_enabled", "ai_content_checker_use_ai"]);

    if (data) {
      data.forEach((setting) => {
        if (setting.key === "ai_content_checker_enabled") {
          setCheckerEnabled(setting.value === "true");
        }
        if (setting.key === "ai_content_checker_use_ai") {
          setUseAI(setting.value === "true");
        }
      });
    }
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from("app_settings")
      .update({ value })
      .eq("key", key);

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiornare l'impostazione", variant: "destructive" });
    }
  };

  const handleCheckerToggle = async (enabled: boolean) => {
    setCheckerEnabled(enabled);
    await updateSetting("ai_content_checker_enabled", enabled.toString());
    toast({ title: enabled ? "Content Checker attivato" : "Content Checker disattivato" });
  };

  const handleAIToggle = async (enabled: boolean) => {
    setUseAI(enabled);
    await updateSetting("ai_content_checker_use_ai", enabled.toString());
    toast({ title: enabled ? "Analisi AI attivata" : "Analisi AI disattivata" });
  };

  const toggleRuleActive = async (rule: ContentRule) => {
    const { error } = await supabase
      .from("prank_content_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiornare la regola", variant: "destructive" });
    } else {
      setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
    }
  };

  const openEditDialog = (rule: ContentRule) => {
    setEditingRule({ ...rule });
    setShowEditDialog(true);
  };

  const addKeyword = () => {
    if (!newKeyword.trim() || !editingRule) return;
    if (!editingRule.keywords.includes(newKeyword.trim().toLowerCase())) {
      setEditingRule({
        ...editingRule,
        keywords: [...editingRule.keywords, newKeyword.trim().toLowerCase()]
      });
    }
    setNewKeyword("");
  };

  const removeKeyword = (keyword: string) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      keywords: editingRule.keywords.filter(k => k !== keyword)
    });
  };

  const saveRule = async () => {
    if (!editingRule) return;
    setSaving(true);

    const { error } = await supabase
      .from("prank_content_rules")
      .update({
        keywords: editingRule.keywords,
        block_message: editingRule.block_message,
        category: editingRule.category
      })
      .eq("id", editingRule.id);

    if (error) {
      toast({ title: "Errore", description: "Impossibile salvare la regola", variant: "destructive" });
    } else {
      toast({ title: "Regola salvata" });
      setRules(rules.map(r => r.id === editingRule.id ? editingRule : r));
      setShowEditDialog(false);
    }
    setSaving(false);
  };

  const createNewRule = async () => {
    const newRule = {
      category: "CUSTOM",
      keywords: [],
      block_message: "Contenuto non consentito.",
      is_active: true
    };

    const { data, error } = await supabase
      .from("prank_content_rules")
      .insert(newRule)
      .select()
      .single();

    if (error) {
      toast({ title: "Errore", description: "Impossibile creare la regola", variant: "destructive" });
    } else if (data) {
      setRules([...rules, data]);
      openEditDialog(data);
    }
  };

  const deleteRule = async (ruleId: string) => {
    const { error } = await supabase
      .from("prank_content_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare la regola", variant: "destructive" });
    } else {
      setRules(rules.filter(r => r.id !== ruleId));
      setShowEditDialog(false);
      toast({ title: "Regola eliminata" });
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <h1 className="font-bold">AI Content Checker</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Global Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Impostazioni Generali
            </CardTitle>
            <CardDescription>Configura il comportamento del content checker</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <Label className="font-medium">Content Checker Attivo</Label>
                <p className="text-sm text-muted-foreground">
                  Controlla i contenuti degli scherzi prima di procedere
                </p>
              </div>
              <Switch 
                checked={checkerEnabled} 
                onCheckedChange={handleCheckerToggle}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <Label className="font-medium">Analisi AI Avanzata</Label>
                <p className="text-sm text-muted-foreground">
                  Usa l'AI per analizzare contenuti che sfuggono alle keywords
                </p>
              </div>
              <Switch 
                checked={useAI} 
                onCheckedChange={handleAIToggle}
                disabled={!checkerEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareWarning className="w-5 h-5" />
                  Regole di Blocco
                </CardTitle>
                <CardDescription>Gestisci le categorie e le keywords bloccate</CardDescription>
              </div>
              <Button onClick={createNewRule} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nuova Regola
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {rules.map((rule) => {
              const config = CATEGORY_CONFIG[rule.category] || { 
                label: rule.category, 
                icon: <ShieldAlert className="w-4 h-4" />, 
                color: "bg-gray-500" 
              };
              
              return (
                <div 
                  key={rule.id}
                  className={`p-4 rounded-lg border transition-all ${
                    rule.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.color} text-white`}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                        {!rule.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Disattivata
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{rule.block_message}</p>
                      
                      <div className="flex flex-wrap gap-1">
                        {rule.keywords.slice(0, 8).map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {rule.keywords.length > 8 && (
                          <Badge variant="outline" className="text-xs">
                            +{rule.keywords.length - 8} altre
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={rule.is_active} 
                        onCheckedChange={() => toggleRuleActive(rule)}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(rule)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Regola</DialogTitle>
            <DialogDescription>
              Configura le keywords e il messaggio di blocco per questa categoria
            </DialogDescription>
          </DialogHeader>
          
          {editingRule && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select 
                  value={editingRule.category} 
                  onValueChange={(value) => setEditingRule({ ...editingRule, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRAUMA">Eventi Traumatici</SelectItem>
                    <SelectItem value="SCAM">Potenziale Truffa</SelectItem>
                    <SelectItem value="THREATS">Minacce/Intimidazioni</SelectItem>
                    <SelectItem value="SENSITIVE">Contenuti Sensibili</SelectItem>
                    <SelectItem value="CUSTOM">Personalizzata</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Messaggio di Blocco</Label>
                <Textarea
                  value={editingRule.block_message}
                  onChange={(e) => setEditingRule({ ...editingRule, block_message: e.target.value })}
                  placeholder="Messaggio mostrato quando il contenuto viene bloccato..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords ({editingRule.keywords.length})</Label>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Aggiungi keyword..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                  />
                  <Button onClick={addKeyword} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                  {editingRule.keywords.map((keyword) => (
                    <Badge 
                      key={keyword} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onClick={() => removeKeyword(keyword)}
                    >
                      {keyword}
                      <Trash2 className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                  {editingRule.keywords.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">
                      Nessuna keyword. Aggiungi delle parole chiave per attivare il blocco.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={() => editingRule && deleteRule(editingRule.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Elimina
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annulla
            </Button>
            <Button onClick={saveRule} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContentChecker;
