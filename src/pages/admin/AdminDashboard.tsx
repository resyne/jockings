import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Users, Phone, Mic, FileText, Shield, ArrowLeft, Ticket, ShieldAlert, TrendingUp, CreditCard } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCalls: 0,
    totalPresets: 0,
    totalVoiceSettings: 0,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    const [profiles, pranks, presets, voices] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("pranks").select("id", { count: "exact", head: true }),
      supabase.from("prank_presets").select("id", { count: "exact", head: true }),
      supabase.from("voice_settings").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalUsers: profiles.count || 0,
      totalCalls: pranks.count || 0,
      totalPresets: presets.count || 0,
      totalVoiceSettings: voices.count || 0,
    });
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
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="font-bold">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Gestione Back-Office</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Utenti</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Phone className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalCalls}</p>
              <p className="text-xs text-muted-foreground">Chiamate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalPresets}</p>
              <p className="text-xs text-muted-foreground">Preset</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Mic className="w-8 h-8 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalVoiceSettings}</p>
              <p className="text-xs text-muted-foreground">Config. Voci</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/voices")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Mic className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configurazione Voci</CardTitle>
                  <CardDescription>Gestisci voci ElevenLabs per lingua e genere</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/presets")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <FileText className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Preset Scherzi</CardTitle>
                  <CardDescription>Gestisci i temi preimpostati</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/users")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Gestione Utenti</CardTitle>
                  <CardDescription>Visualizza utenti e assegna ruoli</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/calls")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Phone className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tutte le Chiamate</CardTitle>
                  <CardDescription>Monitora tutte le chiamate del sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/phone-numbers")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-teal-500/10">
                  <Settings className="w-6 h-6 text-teal-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Numeri Twilio</CardTitle>
                  <CardDescription>Gestisci numeri e code chiamate</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/caller-ids")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Phone className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Caller ID Verificati</CardTitle>
                  <CardDescription>Gestisci i numeri verificati per le chiamate</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/settings")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <Settings className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Impostazioni Business</CardTitle>
                  <CardDescription>Regole consumo prank e monetizzazione</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/promo-codes")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-pink-500/10">
                  <Ticket className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Codici Promo</CardTitle>
                  <CardDescription>Gestisci codici sconto e promozioni</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/content-checker")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI Content Checker</CardTitle>
                  <CardDescription>Gestisci regole e filtri contenuti</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/purchases")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <CreditCard className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Acquisti & Abbonamenti</CardTitle>
                  <CardDescription>Storico pagamenti e sottoscrizioni</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin/kpi")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">KPI Dashboard</CardTitle>
                  <CardDescription>Metriche e statistiche di performance</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
