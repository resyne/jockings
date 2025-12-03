import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Phone, Shield, Search, Play, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PrankCall {
  id: string;
  victim_first_name: string;
  victim_last_name: string;
  victim_phone: string;
  prank_theme: string;
  call_status: string;
  recording_url: string | null;
  created_at: string;
  language: string;
  voice_gender: string;
  user_id: string;
}

const AdminCalls = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  const [calls, setCalls] = useState<PrankCall[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [search, setSearch] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchCalls();
    }
  }, [isAdmin]);

  const fetchCalls = async () => {
    setLoadingCalls(true);

    const { data, error } = await supabase
      .from("pranks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setCalls(data as PrankCall[]);
    }
    setLoadingCalls(false);
  };

  const playRecording = async (prankId: string) => {
    setLoadingAudio(prankId);
    try {
      const { data, error } = await supabase.functions.invoke("get-recording", {
        body: { prankId },
      });

      if (error) throw error;
      if (data?.audioUrl) {
        setAudioUrl(data.audioUrl);
      }
    } catch (error) {
      console.error("Error loading recording:", error);
    } finally {
      setLoadingAudio(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "failed":
      case "no_answer":
      case "busy":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "recording_available":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "scheduled":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "In attesa";
      case "initiated": return "Avviata";
      case "ringing": return "Squilla";
      case "in_progress": return "In corso";
      case "completed": return "Completata";
      case "failed": return "Fallita";
      case "no_answer": return "Non risponde";
      case "busy": return "Occupato";
      case "recording_available": return "🎙️ Registrazione";
      case "scheduled": return "Programmata";
      case "cancelled": return "Annullata";
      default: return status;
    }
  };

  const filteredCalls = calls.filter(
    (call) =>
      call.victim_first_name.toLowerCase().includes(search.toLowerCase()) ||
      call.victim_last_name.toLowerCase().includes(search.toLowerCase()) ||
      call.victim_phone.includes(search) ||
      call.prank_theme.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Shield className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-500" />
              <h1 className="font-bold">Tutte le Chiamate</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCalls}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, telefono, tema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <audio src={audioUrl} controls autoPlay className="w-full" />
            </CardContent>
          </Card>
        )}

        {/* Calls List */}
        {loadingCalls ? (
          <div className="text-center py-12 text-muted-foreground">
            Caricamento chiamate...
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {filteredCalls.length} chiamate trovate
            </p>
            {filteredCalls.map((call) => (
              <Card key={call.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {call.victim_first_name} {call.victim_last_name}
                        </p>
                        <Badge variant="outline" className={getStatusColor(call.call_status)}>
                          {getStatusLabel(call.call_status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {call.victim_phone} • {call.language} • {call.voice_gender === "male" ? "M" : call.voice_gender === "female" ? "F" : "N"}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {call.prank_theme}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(call.created_at), "d MMM yyyy HH:mm", { locale: it })}
                      </p>
                    </div>

                    {call.recording_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => playRecording(call.id)}
                        disabled={loadingAudio === call.id}
                      >
                        {loadingAudio === call.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminCalls;
