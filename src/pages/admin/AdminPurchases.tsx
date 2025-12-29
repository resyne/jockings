import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, CreditCard, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
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
  created_at: string;
  username?: string;
}

const AdminPurchases = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalPranks: 0,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchPurchases();
    }
  }, [isAdmin]);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const [paymentsRes, profilesRes] = await Promise.all([
        supabase
          .from("processed_payments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("profiles").select("user_id, username"),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;

      // Create username lookup
      const usernames: Record<string, string> = {};
      profilesRes.data?.forEach(p => {
        usernames[p.user_id] = p.username || "Senza nome";
      });

      // Calculate stats
      const totalPranks = paymentsRes.data?.reduce((sum, p) => sum + (p.pranks_added || 0), 0) || 0;

      setStats({
        totalPurchases: paymentsRes.data?.length || 0,
        totalPranks,
      });

      const purchasesWithUsernames = (paymentsRes.data || []).map(p => ({
        ...p,
        username: usernames[p.user_id] || "Sconosciuto",
      }));

      setPurchases(purchasesWithUsernames);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setIsLoading(false);
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/kpi")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              <div>
                <h1 className="font-bold">Acquisti</h1>
                <p className="text-xs text-muted-foreground">Storico pagamenti</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPurchases} disabled={isLoading}>
            Aggiorna
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <CreditCard className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalPurchases}</p>
              <p className="text-xs text-muted-foreground">Acquisti totali</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalPranks}</p>
              <p className="text-xs text-muted-foreground">Prank acquistati</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchases Table */}
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
                      <TableHead>Session ID</TableHead>
                      <TableHead className="text-right">Prank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          {format(new Date(purchase.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {purchase.username}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {purchase.session_id.slice(0, 16)}...
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-500">
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
      </main>
    </div>
  );
};

export default AdminPurchases;
