import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Phone, Plus, History, Settings, LogOut, Coins, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import PrankCard from "@/components/PrankCard";
import saranoIcon from "@/assets/sarano-icon.png";
import saranoWordmark from "@/assets/sarano-wordmark.png";

interface Profile {
  username: string | null;
  credits: number;
  avatar_url: string | null;
}

interface Prank {
  id: string;
  victim_first_name: string;
  victim_last_name: string;
  prank_theme: string;
  call_status: string;
  recording_url: string | null;
  created_at: string;
  scheduled_at: string | null;
}

const Dashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pranks, setPranks] = useState<Prank[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPranks();

      // Realtime subscription for pranks updates
      const channel = supabase
        .channel('pranks-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pranks',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Realtime update:', payload);
            if (payload.eventType === 'UPDATE') {
              setPranks(prev => prev.map(p => 
                p.id === payload.new.id 
                  ? { ...p, call_status: payload.new.call_status, recording_url: payload.new.recording_url }
                  : p
              ));
            } else if (payload.eventType === 'INSERT') {
              fetchPranks(); // Refresh list for new pranks
            } else if (payload.eventType === 'DELETE') {
              setPranks(prev => prev.filter(p => p.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("username, credits, avatar_url")
      .eq("user_id", user.id)
      .single();
    
    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setProfile(data);
    }
  };

  const fetchPranks = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("pranks")
      .select("id, victim_first_name, victim_last_name, prank_theme, call_status, recording_url, created_at, scheduled_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (error) {
      console.error("Error fetching pranks:", error);
    } else {
      setPranks(data || []);
    }
    setLoading(false);
  };

  const handleCancelPrank = async (prankId: string) => {
    const { error } = await supabase
      .from("pranks")
      .update({ call_status: "cancelled" })
      .eq("id", prankId);
    
    if (error) {
      toast({ title: "Errore", description: "Impossibile annullare lo scherzo", variant: "destructive" });
    } else {
      toast({ title: "Scherzo annullato", description: "Lo scherzo programmato è stato annullato" });
      fetchPranks();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Arrivederci! 👋", description: "Logout effettuato con successo" });
    navigate("/auth");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Phone className="w-12 h-12 mx-auto text-primary animate-bounce-soft" />
          <p className="mt-4 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <img src={saranoIcon} alt="sarano.ai" className="w-10 h-10 object-contain" />
            <div>
              <p className="font-semibold text-sm text-foreground">{profile?.username || "Utente"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Welcome Card */}
        <Card className="bg-primary text-primary-foreground shadow-card animate-slide-up overflow-hidden relative">
          <CardHeader className="pb-2">
            <img src={saranoWordmark} alt="sarano.ai" className="h-4 object-contain brightness-0 invert opacity-80 mb-2" />
            <CardTitle className="text-xl text-primary-foreground">Ciao, {profile?.username || "amico"}! 🎭</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Pronto a fare qualche scherzo?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              <span className="font-bold text-lg">{profile?.credits || 0}</span>
              <span className="text-sm opacity-80">crediti disponibili</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate("/create-prank")}
            className="h-auto py-6 flex flex-col gap-2 bg-primary text-primary-foreground shadow-card hover:bg-primary/90 transition-all animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <Plus className="w-8 h-8" />
            <span className="font-semibold">Nuovo Scherzo</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/history")}
            className="h-auto py-6 flex flex-col gap-2 shadow-card hover:bg-muted transition-all animate-slide-up border-border"
            style={{ animationDelay: "0.15s" }}
          >
            <History className="w-8 h-8 text-primary" />
            <span className="font-semibold text-foreground">Cronologia</span>
          </Button>
        </div>

        {/* Recent Pranks */}
        <section className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Scherzi Recenti</h2>
          {pranks.length > 0 && (
              <Button variant="link" className="text-secondary p-0" onClick={() => navigate("/history")}>
                Vedi tutti →
              </Button>
            )}
          </div>

          {pranks.length === 0 ? (
            <Card className="text-center py-12 shadow-card">
              <CardContent>
                <Phone className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Nessuno scherzo ancora</p>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  Crea il tuo primo scherzo telefonico AI!
                </p>
                <Button onClick={() => navigate("/create-prank")} className="bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Scherzo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pranks.map((prank) => (
                <PrankCard
                  key={prank.id}
                  prank={prank}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  onRepeat={() => navigate(`/create-prank?repeat=${prank.id}`)}
                  onCancel={() => handleCancelPrank(prank.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border px-4 py-2 safe-area-bottom">
        <div className="flex justify-around max-w-lg mx-auto">
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate("/dashboard")}>
            <Phone className="w-5 h-5 text-primary" />
            <span className="text-xs text-primary">Home</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate("/create-prank")}>
            <Plus className="w-5 h-5 text-secondary" />
            <span className="text-xs text-muted-foreground">Nuovo</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate("/history")}>
            <History className="w-5 h-5 text-secondary" />
            <span className="text-xs text-muted-foreground">Storia</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate("/settings")}>
            <Settings className="w-5 h-5 text-secondary" />
            <span className="text-xs text-muted-foreground">Profilo</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
