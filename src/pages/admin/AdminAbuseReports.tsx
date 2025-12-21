import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  AlertTriangle, 
  ShieldX, 
  CheckCircle, 
  Clock, 
  Trash2,
  Search,
  Ban,
  UserX
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface AbuseReport {
  id: string;
  reporter_phone: string;
  call_date: string;
  call_time: string | null;
  prank_subject: string | null;
  additional_details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

interface BlockedNumber {
  id: string;
  phone_number: string;
  reason: string | null;
  blocked_at: string;
  created_at: string;
}

const AdminAbuseReports = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: isAdminLoading } = useAdminCheck();
  const [activeTab, setActiveTab] = useState("reports");
  
  // Reports state
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  
  // Blocked numbers state
  const [blockedNumbers, setBlockedNumbers] = useState<BlockedNumber[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(true);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isAdmin) {
      fetchReports();
      fetchBlockedNumbers();
    }
  }, [isAdmin]);

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from("abuse_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Errore nel caricamento delle segnalazioni");
    } finally {
      setIsLoadingReports(false);
    }
  };

  const fetchBlockedNumbers = async () => {
    setIsLoadingBlocked(true);
    try {
      const { data, error } = await supabase
        .from("blocked_phone_numbers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBlockedNumbers(data || []);
    } catch (error) {
      console.error("Error fetching blocked numbers:", error);
      toast.error("Errore nel caricamento dei numeri bloccati");
    } finally {
      setIsLoadingBlocked(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("abuse_reports")
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (error) throw error;
      
      toast.success(`Stato aggiornato a "${newStatus}"`);
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const blockUserFromReport = async (reporterPhone: string) => {
    try {
      // Find pranks that called this number to identify the user
      const { data: pranks, error: pranksError } = await supabase
        .from("pranks")
        .select("user_id, victim_phone")
        .or(`victim_phone.eq.${reporterPhone}`);

      if (pranksError) throw pranksError;

      if (!pranks || pranks.length === 0) {
        toast.error("Nessun prank trovato per questo numero");
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(pranks.map(p => p.user_id))];
      
      toast.info(`Trovati ${userIds.length} utenti che hanno chiamato questo numero`);
      
      // For now, we can add logic to block users or set their pranks to 0
      // This would require additional confirmation
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Errore nel blocco utente");
    }
  };

  const unblockNumber = async (id: string) => {
    try {
      const { error } = await supabase
        .from("blocked_phone_numbers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Numero sbloccato");
      fetchBlockedNumbers();
    } catch (error) {
      console.error("Error unblocking number:", error);
      toast.error("Errore nello sblocco");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500"><Clock className="w-3 h-3 mr-1" />In attesa</Badge>;
      case "reviewed":
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-500"><CheckCircle className="w-3 h-3 mr-1" />Revisionata</Badge>;
      case "resolved":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Risolta</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-500/20 text-red-500"><ShieldX className="w-3 h-3 mr-1" />Respinta</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredReports = reports.filter(r => 
    r.reporter_phone.includes(searchQuery) ||
    r.prank_subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.additional_details?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBlocked = blockedNumbers.filter(b =>
    b.phone_number.includes(searchQuery) ||
    b.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Segnalazioni e Blocchi</h1>
            <p className="text-muted-foreground">Gestisci segnalazioni abuso e numeri bloccati</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === "pending").length}</p>
                  <p className="text-xs text-muted-foreground">In attesa</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === "resolved").length}</p>
                  <p className="text-xs text-muted-foreground">Risolte</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ShieldX className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{blockedNumbers.length}</p>
                  <p className="text-xs text-muted-foreground">Numeri bloccati</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{reports.length}</p>
                  <p className="text-xs text-muted-foreground">Totale segnalazioni</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per numero, oggetto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Segnalazioni ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="blocked" className="flex items-center gap-2">
              <ShieldX className="w-4 h-4" />
              Numeri Bloccati ({blockedNumbers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            {isLoadingReports ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nessuna segnalazione trovata
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {report.reporter_phone}
                            {getStatusBadge(report.status)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Chiamata del {format(new Date(report.call_date), "d MMMM yyyy", { locale: it })}
                            {report.call_time && ` alle ${report.call_time}`}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Segnalato il {format(new Date(report.created_at), "d MMM yyyy HH:mm", { locale: it })}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {report.prank_subject && (
                        <p className="text-sm mb-2">
                          <span className="font-medium">Oggetto:</span> {report.prank_subject}
                        </p>
                      )}
                      {report.additional_details && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {report.additional_details}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateReportStatus(report.id, "reviewed")}
                          disabled={report.status === "reviewed"}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Segna come revisionata
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-500 border-green-500/50"
                          onClick={() => updateReportStatus(report.id, "resolved")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Risolta
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-500 border-red-500/50"
                          onClick={() => updateReportStatus(report.id, "rejected")}
                        >
                          <ShieldX className="w-4 h-4 mr-1" />
                          Respingi
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => blockUserFromReport(report.reporter_phone)}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Trova ordinante
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="blocked">
            {isLoadingBlocked ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredBlocked.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nessun numero bloccato
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredBlocked.map((blocked) => (
                  <Card key={blocked.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Ban className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium">{blocked.phone_number}</p>
                            <p className="text-sm text-muted-foreground">
                              Bloccato il {format(new Date(blocked.blocked_at), "d MMM yyyy HH:mm", { locale: it })}
                            </p>
                            {blocked.reason && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Motivo: {blocked.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => unblockNumber(blocked.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Sblocca
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminAbuseReports;
