import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, TrendingUp, CheckCircle, XCircle, PhoneOff, Clock, ShoppingCart, Users } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface TrialCallData {
  id: string;
  user_id: string;
  call_status: string;
  created_at: string;
  victim_first_name: string | null;
  victim_phone: string | null;
  prank_theme: string | null;
}

interface TrialAnalytics {
  totalTrialUsers: number;
  totalTrialCalls: number;
  completedCalls: number;
  failedCalls: number;
  noAnswerCalls: number;
  busyCalls: number;
  otherStatusCalls: number;
  usersWhoPurchased: number;
  conversionRate: number;
  recentTrialCalls: TrialCallData[];
}

export const TrialCallAnalytics = () => {
  const [analytics, setAnalytics] = useState<TrialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrialAnalytics();
  }, []);

  const fetchTrialAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Get all users who used the trial
      const { data: trialUsers } = await supabase
        .from("profiles")
        .select("user_id, phone_number")
        .eq("trial_prank_used", true);

      if (!trialUsers || trialUsers.length === 0) {
        setAnalytics({
          totalTrialUsers: 0,
          totalTrialCalls: 0,
          completedCalls: 0,
          failedCalls: 0,
          noAnswerCalls: 0,
          busyCalls: 0,
          otherStatusCalls: 0,
          usersWhoPurchased: 0,
          conversionRate: 0,
          recentTrialCalls: [],
        });
        setLoading(false);
        return;
      }

      const trialUserIds = trialUsers.map(u => u.user_id);

      // 2. Get pranks from trial users using decrypted view
      const { data: trialPranks } = await supabase
        .from("pranks_decrypted")
        .select("id, user_id, call_status, created_at, victim_first_name, victim_phone, prank_theme")
        .in("user_id", trialUserIds)
        .order("created_at", { ascending: false });

      // 3. Identify trial calls: match where victim_phone ends with user's phone (last 8 digits)
      const userPhoneMap = new Map<string, string>();
      trialUsers.forEach(u => {
        if (u.phone_number) {
          const last8 = u.phone_number.replace(/\D/g, '').slice(-8);
          userPhoneMap.set(u.user_id, last8);
        }
      });

      const trialCalls = (trialPranks || []).filter(p => {
        if (!p.victim_phone || !p.user_id) return false;
        const userLast8 = userPhoneMap.get(p.user_id);
        if (!userLast8) return false;
        const victimClean = p.victim_phone.replace(/\D/g, '');
        return victimClean.endsWith(userLast8);
      });

      // 4. Count statuses
      const statusCounts = trialCalls.reduce((acc, call) => {
        const status = call.call_status || 'unknown';
        if (status === 'completed' || status === 'recording_available') acc.completed++;
        else if (status === 'failed') acc.failed++;
        else if (status === 'no_answer') acc.noAnswer++;
        else if (status === 'busy') acc.busy++;
        else acc.other++;
        return acc;
      }, { completed: 0, failed: 0, noAnswer: 0, busy: 0, other: 0 });

      // 5. Check conversion: trial users who also made a purchase
      const { data: purchasers } = await supabase
        .from("processed_payments")
        .select("user_id")
        .in("user_id", trialUserIds);

      const uniquePurchasers = new Set((purchasers || []).map(p => p.user_id));

      const conversionRate = trialUserIds.length > 0 
        ? Math.round((uniquePurchasers.size / trialUserIds.length) * 100) 
        : 0;

      setAnalytics({
        totalTrialUsers: trialUserIds.length,
        totalTrialCalls: trialCalls.length,
        completedCalls: statusCounts.completed,
        failedCalls: statusCounts.failed,
        noAnswerCalls: statusCounts.noAnswer,
        busyCalls: statusCounts.busy,
        otherStatusCalls: statusCounts.other,
        usersWhoPurchased: uniquePurchasers.size,
        conversionRate,
        recentTrialCalls: trialCalls.slice(0, 10) as TrialCallData[],
      });
    } catch (error) {
      console.error("Error fetching trial analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const successRate = analytics.totalTrialCalls > 0 
    ? Math.round((analytics.completedCalls / analytics.totalTrialCalls) * 100) 
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "recording_available":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">✅ Completata</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">❌ Fallita</Badge>;
      case "no_answer":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">📵 Non risponde</Badge>;
      case "busy":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">📞 Occupato</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Trial Stats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Analisi Chiamate di Prova</CardTitle>
              <CardDescription>Dettaglio completo delle chiamate trial</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overview row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold text-purple-600">{analytics.totalTrialUsers}</p>
              <p className="text-xs text-muted-foreground">Utenti trial</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <PhoneCall className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold text-blue-600">{analytics.totalTrialCalls}</p>
              <p className="text-xs text-muted-foreground">Chiamate trial</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{successRate}%</p>
              <p className="text-xs text-muted-foreground">Tasso successo</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10">
              <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold text-amber-600">{analytics.conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Conversione</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div>
            <p className="text-sm font-medium mb-2">Esiti chiamate trial</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-green-600">{analytics.completedCalls}</p>
                  <p className="text-[10px] text-muted-foreground">Completate</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-red-600">{analytics.failedCalls}</p>
                  <p className="text-[10px] text-muted-foreground">Fallite</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <PhoneOff className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-orange-600">{analytics.noAnswerCalls}</p>
                  <p className="text-[10px] text-muted-foreground">Non risponde</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-yellow-600">{analytics.busyCalls + analytics.otherStatusCalls}</p>
                  <p className="text-[10px] text-muted-foreground">Occupato/Altro</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion detail */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/5 to-green-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-medium">Conversione Post-Trial</p>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{analytics.usersWhoPurchased}</span> utenti su{" "}
              <span className="font-bold text-foreground">{analytics.totalTrialUsers}</span> che hanno provato il trial hanno poi acquistato (
              <span className="font-bold text-amber-600">{analytics.conversionRate}%</span>)
            </p>
          </div>

          {/* Recent trial calls */}
          {analytics.recentTrialCalls.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Ultime chiamate trial</p>
              <div className="space-y-2">
                {analytics.recentTrialCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(call.created_at), "dd/MM HH:mm", { locale: it })}
                      </span>
                      <span className="truncate text-xs">{call.victim_phone}</span>
                    </div>
                    {getStatusBadge(call.call_status)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
