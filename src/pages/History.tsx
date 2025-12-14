import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import PrankCard from "@/components/PrankCard";
import saranoIcon from "@/assets/sarano-icon.png";

interface Prank {
  id: string;
  victim_first_name: string;
  victim_last_name: string;
  prank_theme: string;
  call_status: string;
  recording_url: string | null;
  created_at: string;
}

const History = () => {
  const [pranks, setPranks] = useState<Prank[]>([]);
  const [filteredPranks, setFilteredPranks] = useState<Prank[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        fetchPranks(session.user.id);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (search.trim()) {
      const filtered = pranks.filter(
        (p) =>
          p.victim_first_name.toLowerCase().includes(search.toLowerCase()) ||
          p.victim_last_name.toLowerCase().includes(search.toLowerCase()) ||
          p.prank_theme.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredPranks(filtered);
    } else {
      setFilteredPranks(pranks);
    }
  }, [search, pranks]);

  const fetchPranks = async (userId: string) => {
    const { data, error } = await supabase
      .from("pranks")
      .select("id, victim_first_name, victim_last_name, prank_theme, call_status, recording_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPranks(data);
      setFilteredPranks(data);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "in_progress": return "bg-secondary/10 text-secondary border-secondary/20";
      case "initiated": return "bg-secondary/10 text-secondary border-secondary/20";
      case "ringing": return "bg-secondary/10 text-secondary border-secondary/20";
      case "failed": 
      case "no_answer":
      case "busy": return "bg-destructive/10 text-destructive border-destructive/20";
      case "recording_available": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "scheduled": return "bg-accent/10 text-accent border-accent/20";
      case "cancelled": return "bg-muted text-muted-foreground border-border";
      default: return "bg-accent/10 text-accent border-accent/20";
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

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img 
            src={saranoIcon} 
            alt="sarano.ai" 
            className="w-10 h-10 object-contain animate-bounce-in hover:animate-icon-wiggle cursor-pointer transition-transform" 
          />
          <div>
            <h1 className="font-bold">Cronologia Scherzi</h1>
            <p className="text-xs text-muted-foreground">{pranks.length} scherzi totali</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Search */}
        <div className="relative animate-slide-up">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <Input
            placeholder="Cerca per nome o tema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Pranks List */}
        {loading ? (
          <div className="text-center py-12">
            <Phone className="w-12 h-12 mx-auto text-primary animate-bounce-soft" />
            <p className="mt-4 text-muted-foreground">Caricamento...</p>
          </div>
        ) : filteredPranks.length === 0 ? (
          <Card className="text-center py-12 animate-slide-up">
            <CardContent>
              <Phone className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              {search ? (
                <p className="text-muted-foreground">Nessuno scherzo trovato per "{search}"</p>
              ) : (
                <>
                  <p className="text-muted-foreground">Nessuno scherzo ancora</p>
                  <Button
                    onClick={() => navigate("/create-prank")}
                    className="mt-4 gradient-primary"
                  >
                    Crea il primo scherzo
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPranks.map((prank, index) => (
              <div
                key={prank.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <PrankCard
                  prank={prank}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  onRepeat={() => navigate(`/create-prank?repeat=${prank.id}`)}
                  showDetails
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
