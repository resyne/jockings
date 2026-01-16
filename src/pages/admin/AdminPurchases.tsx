import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, CreditCard, Calendar, Ticket, Euro } from "lucide-react";
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

const AdminPurchases = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [promoUses, setPromoUses] = useState<PromoCodeUse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalPranks: 0,
    totalRevenue: 0,
    totalPromoUses: 0,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

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

      setStats({
        totalPurchases: paymentsRes.data?.length || 0,
        totalPranks,
        totalRevenue,
        totalPromoUses: promoUsesRes.data?.length || 0,
      });

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
                <h1 className="font-bold">Acquisti & Promo</h1>
                <p className="text-xs text-muted-foreground">Pagamenti e codici sconto</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            Aggiorna
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="purchases">Acquisti ({stats.totalPurchases})</TabsTrigger>
            <TabsTrigger value="promo">Promo Code ({stats.totalPromoUses})</TabsTrigger>
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
