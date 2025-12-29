import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Users, Phone, Ticket, CreditCard, TrendingUp, Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";

interface KPIData {
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  totalUsers: number;
  promoCodesUsedToday: number;
  promoCodesUsedWeek: number;
  promoCodesUsedMonth: number;
  totalPromoCodesUsed: number;
  callsToday: number;
  callsWeek: number;
  callsMonth: number;
  totalCalls: number;
  completedCalls: number;
  purchasesToday: number;
  purchasesWeek: number;
  purchasesMonth: number;
  totalPurchases: number;
  totalPranksFromPurchases: number;
}

const AdminKPI = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  const [kpiData, setKpiData] = useState<KPIData>({
    newUsersToday: 0,
    newUsersWeek: 0,
    newUsersMonth: 0,
    totalUsers: 0,
    promoCodesUsedToday: 0,
    promoCodesUsedWeek: 0,
    promoCodesUsedMonth: 0,
    totalPromoCodesUsed: 0,
    callsToday: 0,
    callsWeek: 0,
    callsMonth: 0,
    totalCalls: 0,
    completedCalls: 0,
    purchasesToday: 0,
    purchasesWeek: 0,
    purchasesMonth: 0,
    totalPurchases: 0,
    totalPranksFromPurchases: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchKPIData();
    }
  }, [isAdmin]);

  const fetchKPIData = async () => {
    setIsLoading(true);
    
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const weekStart = startOfDay(subDays(now, 7)).toISOString();
    const monthStart = startOfDay(subDays(now, 30)).toISOString();

    try {
      // Fetch all data in parallel
      const [
        usersTotal,
        usersToday,
        usersWeek,
        usersMonth,
        promoTotal,
        promoToday,
        promoWeek,
        promoMonth,
        callsTotal,
        callsCompleted,
        callsToday,
        callsWeek,
        callsMonth,
        purchasesTotal,
        purchasesToday,
        purchasesWeek,
        purchasesMonth,
        totalPranksFromPurchases,
      ] = await Promise.all([
        // Users
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        // Promo codes used
        supabase.from("promo_code_uses").select("id", { count: "exact", head: true }),
        supabase.from("promo_code_uses").select("id", { count: "exact", head: true }).gte("used_at", todayStart).lte("used_at", todayEnd),
        supabase.from("promo_code_uses").select("id", { count: "exact", head: true }).gte("used_at", weekStart),
        supabase.from("promo_code_uses").select("id", { count: "exact", head: true }).gte("used_at", monthStart),
        // Calls (pranks)
        supabase.from("pranks").select("id", { count: "exact", head: true }),
        supabase.from("pranks").select("id", { count: "exact", head: true }).eq("call_status", "completed"),
        supabase.from("pranks").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("pranks").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
        supabase.from("pranks").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        // Purchases
        supabase.from("processed_payments").select("id", { count: "exact", head: true }),
        supabase.from("processed_payments").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("processed_payments").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
        supabase.from("processed_payments").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        // Total pranks from purchases
        supabase.from("processed_payments").select("pranks_added"),
      ]);

      // Calculate total pranks from purchases
      const totalPranks = totalPranksFromPurchases.data?.reduce((sum, p) => sum + (p.pranks_added || 0), 0) || 0;

      setKpiData({
        newUsersToday: usersToday.count || 0,
        newUsersWeek: usersWeek.count || 0,
        newUsersMonth: usersMonth.count || 0,
        totalUsers: usersTotal.count || 0,
        promoCodesUsedToday: promoToday.count || 0,
        promoCodesUsedWeek: promoWeek.count || 0,
        promoCodesUsedMonth: promoMonth.count || 0,
        totalPromoCodesUsed: promoTotal.count || 0,
        callsToday: callsToday.count || 0,
        callsWeek: callsWeek.count || 0,
        callsMonth: callsMonth.count || 0,
        totalCalls: callsTotal.count || 0,
        completedCalls: callsCompleted.count || 0,
        purchasesToday: purchasesToday.count || 0,
        purchasesWeek: purchasesWeek.count || 0,
        purchasesMonth: purchasesMonth.count || 0,
        totalPurchases: purchasesTotal.count || 0,
        totalPranksFromPurchases: totalPranks,
      });
    } catch (error) {
      console.error("Error fetching KPI data:", error);
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

  const KPICard = ({ 
    title, 
    icon: Icon, 
    iconColor, 
    today, 
    week, 
    month, 
    total,
    extraInfo
  }: { 
    title: string;
    icon: any;
    iconColor: string;
    today: number;
    week: number;
    month: number;
    total: number;
    extraInfo?: string;
  }) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {extraInfo && <CardDescription>{extraInfo}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 mt-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{today}</p>
            <p className="text-xs text-muted-foreground">Oggi</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{week}</p>
            <p className="text-xs text-muted-foreground">7 giorni</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{month}</p>
            <p className="text-xs text-muted-foreground">30 giorni</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/10">
            <p className="text-2xl font-bold text-primary">{total}</p>
            <p className="text-xs text-muted-foreground">Totale</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              <div>
                <h1 className="font-bold">KPI Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  Aggiornato: {format(new Date(), "dd MMM yyyy HH:mm", { locale: it })}
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchKPIData} disabled={isLoading}>
            <Calendar className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <KPICard
              title="Nuovi Utenti Registrati"
              icon={Users}
              iconColor="bg-blue-500/10 text-blue-500"
              today={kpiData.newUsersToday}
              week={kpiData.newUsersWeek}
              month={kpiData.newUsersMonth}
              total={kpiData.totalUsers}
            />

            <KPICard
              title="Codici Promo Utilizzati"
              icon={Ticket}
              iconColor="bg-pink-500/10 text-pink-500"
              today={kpiData.promoCodesUsedToday}
              week={kpiData.promoCodesUsedWeek}
              month={kpiData.promoCodesUsedMonth}
              total={kpiData.totalPromoCodesUsed}
            />

            <KPICard
              title="Chiamate Effettuate"
              icon={Phone}
              iconColor="bg-green-500/10 text-green-500"
              today={kpiData.callsToday}
              week={kpiData.callsWeek}
              month={kpiData.callsMonth}
              total={kpiData.totalCalls}
              extraInfo={`${kpiData.completedCalls} completate`}
            />

            <KPICard
              title="Acquisti Effettuati"
              icon={CreditCard}
              iconColor="bg-yellow-500/10 text-yellow-500"
              today={kpiData.purchasesToday}
              week={kpiData.purchasesWeek}
              month={kpiData.purchasesMonth}
              total={kpiData.totalPurchases}
              extraInfo={`${kpiData.totalPranksFromPurchases} prank acquistati`}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminKPI;
