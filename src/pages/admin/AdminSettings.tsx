import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, ArrowLeft, Save, Clock, Phone } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  const [saving, setSaving] = useState(false);
  
  // Prank consumption settings
  const [minCallDuration, setMinCallDuration] = useState(30);
  const [requireAnswered, setRequireAnswered] = useState(true);
  const [countFailedCalls, setCountFailedCalls] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["prank_min_duration", "prank_require_answered", "prank_count_failed"]);

    if (data) {
      data.forEach((setting) => {
        if (setting.key === "prank_min_duration") {
          setMinCallDuration(parseInt(setting.value) || 30);
        } else if (setting.key === "prank_require_answered") {
          setRequireAnswered(setting.value === "true");
        } else if (setting.key === "prank_count_failed") {
          setCountFailedCalls(setting.value === "true");
        }
      });
    }
  };

  const saveSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key, value }, { onConflict: "key" });
    
    if (error) {
      console.error("Error saving setting:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting("prank_min_duration", minCallDuration.toString()),
        saveSetting("prank_require_answered", requireAnswered.toString()),
        saveSetting("prank_count_failed", countFailedCalls.toString()),
      ]);
      toast.success("Impostazioni salvate");
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <p className="mt-4 text-muted-foreground">Verifica accesso admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <h1 className="font-bold">Impostazioni Business</h1>
                <p className="text-xs text-muted-foreground">Regole consumo prank</p>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Prank Consumption Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Regole Consumo Prank</CardTitle>
                <CardDescription>
                  Definisci quando un prank viene considerato "consumato" e scala i crediti dell'utente
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Minimum Duration */}
            <div className="space-y-3">
              <Label htmlFor="minDuration" className="text-base font-medium">
                Durata minima chiamata (secondi)
              </Label>
              <p className="text-sm text-muted-foreground">
                Una chiamata deve durare almeno questo tempo per essere conteggiata come prank consumato
              </p>
              <div className="flex items-center gap-4">
                <Input
                  id="minDuration"
                  type="number"
                  min={0}
                  max={300}
                  value={minCallDuration}
                  onChange={(e) => setMinCallDuration(parseInt(e.target.value) || 0)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  {minCallDuration === 0 ? "Qualsiasi durata" : `${minCallDuration} secondi`}
                </span>
              </div>
            </div>

            {/* Require Answered */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="text-base font-medium">Richiedi risposta</Label>
                <p className="text-sm text-muted-foreground">
                  Il prank viene consumato solo se la chiamata viene risposta
                </p>
              </div>
              <Switch
                checked={requireAnswered}
                onCheckedChange={setRequireAnswered}
              />
            </div>

            {/* Count Failed Calls */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="text-base font-medium">Conta chiamate fallite</Label>
                <p className="text-sm text-muted-foreground">
                  Se attivo, anche le chiamate con errori tecnici verranno conteggiate
                </p>
              </div>
              <Switch
                checked={countFailedCalls}
                onCheckedChange={setCountFailedCalls}
              />
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Riepilogo regole attuali</p>
                  <p className="text-sm text-muted-foreground">
                    Un prank viene consumato quando:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    {requireAnswered && <li>La chiamata viene risposta</li>}
                    {minCallDuration > 0 && <li>La durata supera {minCallDuration} secondi</li>}
                    {!requireAnswered && minCallDuration === 0 && <li>La chiamata viene avviata (qualsiasi esito)</li>}
                    {countFailedCalls && <li>Include chiamate con errori tecnici</li>}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminSettings;
