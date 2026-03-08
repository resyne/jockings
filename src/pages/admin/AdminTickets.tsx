import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
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
import {
  ArrowLeft,
  Shield,
  Ticket,
  Mail,
  Sparkles,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

type SupportTicket = {
  id: string;
  category: string;
  message: string;
  contact_email: string | null;
  user_email: string | null;
  user_id: string | null;
  page_url: string | null;
  user_agent: string | null;
  status: string;
  admin_notes: string | null;
  ai_response: string | null;
  responded_at: string | null;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "🐛 Bug",
  suggestion: "💡 Suggerimento",
  payment: "💳 Pagamento",
  other: "❓ Altro",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Aperto", variant: "destructive" },
  in_progress: { label: "In Lavorazione", variant: "default" },
  resolved: { label: "Risolto", variant: "secondary" },
  closed: { label: "Chiuso", variant: "outline" },
};

const AdminTickets = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/auth");
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchTickets();
  }, [isAdmin]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setTickets(data as SupportTicket[]);
    setLoadingTickets(false);
  };

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAiResponse(ticket.ai_response || "");
    setAdminNotes(ticket.admin_notes || "");
  };

  const generateAiResponse = async () => {
    if (!selectedTicket) return;
    setGeneratingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke("ticket-ai-reply", {
        body: {
          action: "generate",
          ticketId: selectedTicket.id,
          category: selectedTicket.category,
          message: selectedTicket.message,
          userEmail: selectedTicket.contact_email || selectedTicket.user_email,
        },
      });
      if (error) throw error;
      setAiResponse(data.response);
      toast({ title: "Risposta AI generata ✨" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Errore generazione AI", variant: "destructive" });
    } finally {
      setGeneratingAi(false);
    }
  };

  const sendResponse = async () => {
    if (!selectedTicket || !aiResponse.trim()) return;
    const recipientEmail = selectedTicket.contact_email || selectedTicket.user_email;
    if (!recipientEmail) {
      toast({ title: "Nessuna email di contatto", variant: "destructive" });
      return;
    }
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("ticket-ai-reply", {
        body: {
          action: "send",
          ticketId: selectedTicket.id,
          recipientEmail,
          responseText: aiResponse.trim(),
          adminNotes: adminNotes.trim(),
        },
      });
      if (error) throw error;

      toast({ title: "Email inviata con successo! ✅" });
      setSelectedTicket(null);
      fetchTickets();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Errore invio email", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const updateStatus = async (ticketId: string, newStatus: string) => {
    await supabase
      .from("support_tickets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    fetchTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const filteredTickets = filterStatus === "all"
    ? tickets
    : tickets.filter((t) => t.status === filterStatus);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Shield className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            <div>
              <h1 className="font-bold">Ticket Supporto</h1>
              <p className="text-xs text-muted-foreground">
                {tickets.filter((t) => t.status === "open").length} aperti
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={fetchTickets}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti ({tickets.length})</SelectItem>
              <SelectItem value="open">Aperti ({tickets.filter((t) => t.status === "open").length})</SelectItem>
              <SelectItem value="in_progress">In Lavorazione ({tickets.filter((t) => t.status === "in_progress").length})</SelectItem>
              <SelectItem value="resolved">Risolti ({tickets.filter((t) => t.status === "resolved").length})</SelectItem>
              <SelectItem value="closed">Chiusi ({tickets.filter((t) => t.status === "closed").length})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ticket List */}
        {loadingTickets ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nessun ticket trovato
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => openTicket(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </span>
                        <Badge variant={STATUS_CONFIG[ticket.status]?.variant || "outline"}>
                          {STATUS_CONFIG[ticket.status]?.label || ticket.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleDateString("it-IT", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {ticket.contact_email || ticket.user_email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {ticket.contact_email || ticket.user_email}
                          </span>
                        ) : null}
                        {ticket.responded_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            Risposto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
                  <Badge variant={STATUS_CONFIG[selectedTicket.status]?.variant || "outline"}>
                    {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Message */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <strong>Email:</strong>{" "}
                    {selectedTicket.contact_email || selectedTicket.user_email || "N/A"}
                  </div>
                  <div>
                    <strong>User ID:</strong>{" "}
                    {selectedTicket.user_id?.slice(0, 8) || "N/A"}
                  </div>
                  <div>
                    <strong>Pagina:</strong> {selectedTicket.page_url || "N/A"}
                  </div>
                  <div>
                    <strong>Data:</strong>{" "}
                    {new Date(selectedTicket.created_at).toLocaleString("it-IT")}
                  </div>
                </div>

                {/* Status Change */}
                <div>
                  <label className="text-xs font-medium mb-1 block">Stato</label>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(v) => updateStatus(selectedTicket.id, v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aperto</SelectItem>
                      <SelectItem value="in_progress">In Lavorazione</SelectItem>
                      <SelectItem value="resolved">Risolto</SelectItem>
                      <SelectItem value="closed">Chiuso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="text-xs font-medium mb-1 block">Note Admin</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Note interne..."
                    className="text-sm min-h-[60px]"
                  />
                </div>

                {/* AI Response */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium">Risposta (editabile)</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateAiResponse}
                      disabled={generatingAi}
                    >
                      {generatingAi ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 mr-1" />
                      )}
                      Genera con AI
                    </Button>
                  </div>
                  <Textarea
                    value={aiResponse}
                    onChange={(e) => setAiResponse(e.target.value)}
                    placeholder="Scrivi o genera una risposta..."
                    className="text-sm min-h-[120px]"
                  />
                </div>

                {/* Send */}
                <Button
                  className="w-full"
                  onClick={sendResponse}
                  disabled={sendingEmail || !aiResponse.trim()}
                >
                  {sendingEmail ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Invia Risposta via Email
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTickets;
