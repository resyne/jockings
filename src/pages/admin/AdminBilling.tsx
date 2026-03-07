import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, RefreshCw, DollarSign, Loader2, AlertCircle, Phone, Zap, CreditCard } from "lucide-react";

interface BillingData {
  twilio: {
    status: string;
    balance?: number;
    currency?: string;
    message?: string;
  };
  vapi: {
    status: string;
    name?: string;
    plan?: string;
    balance?: number | null;
    concurrencyLimit?: number | null;
    raw?: { billingLimit?: number | null };
    message?: string;
  };
  stripe: {
    status: string;
    available?: number;
    pending?: number;
    currency?: string;
    message?: string;
  };
}

const AdminBilling = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminCheck();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/auth");
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchBilling();
  }, [isAdmin]);

  const fetchBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("admin-billing");
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      setData(result);
    } catch (e: any) {
      setError(e.message || "Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = "eur") => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 50) return "text-green-500";
    if (balance > 10) return "text-yellow-500";
    return "text-destructive";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Shield className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <h1 className="font-bold">Dashboard Economica</h1>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={fetchBilling} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Caricamento saldi...</p>
          </div>
        ) : error && !data ? (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-3" />
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchBilling}>Riprova</Button>
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-4">
            {/* Stripe */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-violet-500/10">
                    <CreditCard className="w-6 h-6 text-violet-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Stripe</CardTitle>
                    <CardDescription>Saldo pagamenti e incassi</CardDescription>
                  </div>
                  <Badge variant={data.stripe.status === "ok" ? "secondary" : "destructive"} className="ml-auto">
                    {data.stripe.status === "ok" ? "Connesso" : "Errore"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {data.stripe.status === "ok" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Disponibile</p>
                      <p className={`text-2xl font-bold ${getBalanceColor(data.stripe.available || 0)}`}>
                        {formatCurrency(data.stripe.available || 0, data.stripe.currency)}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">In arrivo</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(data.stripe.pending || 0, data.stripe.currency)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">{data.stripe.message || "Non configurato"}</p>
                )}
              </CardContent>
            </Card>

            {/* Twilio */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-red-500/10">
                    <Phone className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Twilio</CardTitle>
                    <CardDescription>Crediti per chiamate telefoniche</CardDescription>
                  </div>
                  <Badge variant={data.twilio.status === "ok" ? "secondary" : "destructive"} className="ml-auto">
                    {data.twilio.status === "ok" ? "Connesso" : data.twilio.status === "not_configured" ? "Non configurato" : "Errore"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {data.twilio.status === "ok" ? (
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                    <p className={`text-3xl font-bold ${getBalanceColor(data.twilio.balance || 0)}`}>
                      {formatCurrency(data.twilio.balance || 0, data.twilio.currency || "USD")}
                    </p>
                    {(data.twilio.balance || 0) < 10 && (
                      <p className="text-xs text-destructive mt-2">⚠️ Saldo basso! Ricarica consigliata.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{data.twilio.message || "Non configurato"}</p>
                )}
              </CardContent>
            </Card>

            {/* VAPI */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Zap className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">VAPI</CardTitle>
                    <CardDescription>Piattaforma AI per chiamate vocali</CardDescription>
                  </div>
                  <Badge variant={data.vapi.status === "ok" ? "secondary" : "destructive"} className="ml-auto">
                    {data.vapi.status === "ok" ? "Connesso" : data.vapi.status === "not_configured" ? "Non configurato" : "Errore"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {data.vapi.status === "ok" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Organizzazione</p>
                        <p className="text-sm font-semibold text-foreground">{data.vapi.name || "N/A"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Piano</p>
                        <p className="text-sm font-semibold text-foreground capitalize">{data.vapi.plan || "N/A"}</p>
                      </div>
                    </div>
                    {data.vapi.concurrencyLimit && (
                      <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Limite concorrenza</p>
                        <p className="text-lg font-bold text-foreground">{data.vapi.concurrencyLimit} chiamate</p>
                      </div>
                    )}
                    {data.vapi.raw?.billingLimit && (
                      <div className="bg-muted/50 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Limite mensile</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(data.vapi.raw.billingLimit, "USD")}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{data.vapi.message || "Non configurato"}</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-foreground mb-3">Link Rapidi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                      <CreditCard className="w-4 h-4 mr-2" /> Stripe Dashboard
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer">
                      <Phone className="w-4 h-4 mr-2" /> Twilio Console
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener noreferrer">
                      <Zap className="w-4 h-4 mr-2" /> VAPI Dashboard
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default AdminBilling;
