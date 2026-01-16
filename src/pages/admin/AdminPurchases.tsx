import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowLeft, CreditCard, Calendar, Ticket, Euro, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Purchase {
  id: string;
  user_id: string;
  session_id: string;
  pranks_added: number;
  amount_paid: number | null;
  currency: string | null;
  package_type: string | null;
  created_at: string;
  username?: string;
}

interface PromoCodeUse {
  id: string;
  user_id: string;
  promo_code_id: string;
  session_id: string | null;
  used_at: string;
  username?: string;
  promo_code?: string;
  discount_percentage?: number;
}

interface Subscription {
  id: string;
  status: string;
  customer_email: string;
  customer_name: string;
  amount: number;
  currency: string;
  interval: string;
  current_period_start: number;
  current_period_end: number;
  created: number;
  canceled_at: number | null;
  cancel_at_period_end: boolean;
  metadata: Record<string, string>;
}

const AdminPurchases = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [promoUses, setPromoUses] = useState<PromoCodeUse[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [subsLastFetchedAt, setSubsLastFetchedAt] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalPranks: 0,
    totalRevenue: 0,
    totalPromoUses: 0,
    activeSubscriptions: 0,
    monthlyRecurring: 0,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      fetchSubscriptions();
    }
  }, [isAdmin]);

  const fetchSubscriptions = async () => {
    setSubsLoading(true);
    setSubsError(null);
    try {
      const { data, error } = await supabase.functions.invoke("list-subscriptions");
      if (error) throw error;

      const subs = data?.subscriptions || [];
      setSubscriptions(subs);
      setSubsLastFetchedAt(new Date().toISOString());

      const activeSubs = subs.filter((s: Subscription) => s.status === "active");
      const mrr = activeSubs.reduce((sum: number, s: Subscription) => sum + s.amount, 0);

      setStats((prev) => ({
        ...prev,
        activeSubscriptions: activeSubs.length,
        monthlyRecurring: mrr,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto";
      console.error("Error fetching subscriptions:", error);
      setSubsError(message);
    } finally {
      setSubsLoading(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [paymentsRes, profilesRes, promoUsesRes, promoCodesRes] = await Promise.all([
        supabase
          .from("processed_payments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("profiles").select("user_id, username"),
        supabase
          .from("promo_code_uses")
          .select("*")
          .order("used_at", { ascending: false })
          .limit(100),
        supabase.from("promo_codes").select("id, code, discount_percentage"),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;

      // Create username lookup
      const usernames: Record<string, string> = {};
      profilesRes.data?.forEach(p => {
        usernames[p.user_id] = p.username || "Senza nome";
      });

      // Create promo code lookup
      const promoCodes: Record<string, { code: string; discount: number }> = {};
      promoCodesRes.data?.forEach(p => {
        promoCodes[p.id] = { code: p.code, discount: p.discount_percentage };
      });

      // Calculate stats
      const totalPranks = paymentsRes.data?.reduce((sum, p) => sum + (p.pranks_added || 0), 0) || 0;
      const totalRevenue = paymentsRes.data?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;

      setStats((prev) => ({
        ...prev,
        totalPurchases: paymentsRes.data?.length || 0,
        totalPranks,
        totalRevenue,
        totalPromoUses: promoUsesRes.data?.length || 0,
      }));

      const purchasesWithUsernames = (paymentsRes.data || []).map(p => ({
        ...p,
        username: usernames[p.user_id] || "Sconosciuto",
      }));

      const promoUsesWithData = (promoUsesRes.data || []).map(p => ({
        ...p,
        username: usernames[p.user_id] || "Sconosciuto",
        promo_code: promoCodes[p.promo_code_id]?.code || "N/A",
        discount_percentage: promoCodes[p.promo_code_id]?.discount || 0,
      }));

      setPurchases(purchasesWithUsernames);
      setPromoUses(promoUsesWithData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount === null) return "—";
    const curr = currency?.toUpperCase() || "EUR";
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: curr,
    }).format(amount);
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
              <CreditCard className="w-6 h-6 text-primary" />
              <div>
                <h1 className="font-bold">Acquisti & Abbonamenti</h1>
                <p className="text-xs text-muted-foreground">Pagamenti, sottoscrizioni e promo</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchData(); fetchSubscriptions(); }} disabled={isLoading || subsLoading}>
            Aggiorna
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <CreditCard className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalPurchases}</p>
              <p className="text-xs text-muted-foreground">Acquisti</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Euro className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue, "eur")}</p>
              <p className="text-xs text-muted-foreground">Ricavi totali</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <RefreshCw className="w-8 h-8 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
              <p className="text-xs text-muted-foreground">Abbonamenti attivi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Euro className="w-8 h-8 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(stats.monthlyRecurring, "eur")}</p>
              <p className="text-xs text-muted-foreground">MRR</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="w-8 h-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalPranks}</p>
              <p className="text-xs text-muted-foreground">Prank acquistati</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Ticket className="w-8 h-8 mx-auto text-pink-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalPromoUses}</p>
              <p className="text-xs text-muted-foreground">Promo usati</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="purchases" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="purchases">Acquisti ({stats.totalPurchases})</TabsTrigger>
            <TabsTrigger value="subscriptions">Abbonamenti ({stats.activeSubscriptions})</TabsTrigger>
            <TabsTrigger value="promo">Promo ({stats.totalPromoUses})</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ultimi 100 acquisti</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : purchases.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nessun acquisto trovato</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Utente</TableHead>
                          <TableHead>Pacchetto</TableHead>
                          <TableHead className="text-right">Importo</TableHead>
                          <TableHead className="text-right">Prank</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(purchase.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {purchase.username}
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full bg-muted text-xs">
                                {purchase.package_type || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-500">
                              {formatCurrency(purchase.amount_paid, purchase.currency)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              +{purchase.pranks_added}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Abbonamenti Stripe</CardTitle>
                  {subsLastFetchedAt && (
                    <p className="text-xs text-muted-foreground">
                      Ultimo aggiornamento: {format(new Date(subsLastFetchedAt), "dd MMM yyyy HH:mm", { locale: it })}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={fetchSubscriptions} disabled={subsLoading}>
                  <RefreshCw className={`w-4 h-4 ${subsLoading ? "animate-spin" : ""}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {subsError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      Errore caricamento abbonamenti: {subsError}
                    </AlertDescription>
                  </Alert>
                )}
                {subsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : subscriptions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nessun abbonamento trovato</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Stato</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Importo</TableHead>
                          <TableHead>Periodo</TableHead>
                          <TableHead>Creato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <Badge 
                                variant={sub.status === "active" ? "default" : "secondary"}
                                className={sub.status === "active" ? "bg-green-500" : sub.status === "canceled" ? "bg-red-500" : ""}
                              >
                                {sub.status === "active" ? "Attivo" : 
                                 sub.status === "canceled" ? "Cancellato" : 
                                 sub.status === "past_due" ? "Scaduto" : 
                                 sub.status === "trialing" ? "Prova" : sub.status}
                              </Badge>
                              {sub.cancel_at_period_end && (
                                <span className="text-xs text-muted-foreground ml-1">(cancella a fine periodo)</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{sub.customer_name}</p>
                                <p className="text-xs text-muted-foreground">{sub.customer_email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-green-500">
                              {formatCurrency(sub.amount, sub.currency)}/{sub.interval === "month" ? "mese" : sub.interval}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {sub.current_period_start && sub.current_period_end ? (
                                <>
                                  {format(new Date(sub.current_period_start * 1000), "dd/MM/yy", { locale: it })} - {format(new Date(sub.current_period_end * 1000), "dd/MM/yy", { locale: it })}
                                </>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {sub.created ? format(new Date(sub.created * 1000), "dd MMM yyyy", { locale: it }) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promo">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ultimi 100 utilizzi promo code</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : promoUses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nessun promo code utilizzato</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Utente</TableHead>
                          <TableHead>Codice</TableHead>
                          <TableHead className="text-right">Sconto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promoUses.map((use) => (
                          <TableRow key={use.id}>
                            <TableCell className="whitespace-nowrap">
                              {use.used_at ? format(new Date(use.used_at), "dd MMM yyyy HH:mm", { locale: it }) : "—"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {use.username}
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full bg-pink-500/10 text-pink-500 text-xs font-mono">
                                {use.promo_code}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-pink-500">
                              -{use.discount_percentage}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPurchases;
