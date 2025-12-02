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
      .select("id, victim_first_name, victim_last_name, prank_theme, call_status, recording_url, created_at")
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Arrivederci! 👋", description: "Logout effettuato con successo" });
    navigate("/auth");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "in_progress": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "failed": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "recording_available": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      default: return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "In attesa";
      case "in_progress": return "In corso";
      case "completed": return "Completata";
      case "failed": return "Fallita";
      case "recording_available": return "Registrazione";
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
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="gradient-primary text-primary-foreground">
                {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{profile?.username || "Utente"}</p>
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
        <Card className="gradient-primary text-primary-foreground shadow-glow animate-slide-up overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Ciao, {profile?.username || "amico"}! 🎭</CardTitle>
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
            className="h-auto py-6 flex flex-col gap-2 gradient-primary shadow-soft hover:shadow-glow transition-all animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <Plus className="w-8 h-8" />
            <span className="font-semibold">Nuovo Scherzo</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/history")}
            className="h-auto py-6 flex flex-col gap-2 shadow-soft hover:bg-accent/10 transition-all animate-slide-up"
            style={{ animationDelay: "0.15s" }}
          >
            <History className="w-8 h-8 text-primary" />
            <span className="font-semibold">Cronologia</span>
          </Button>
        </div>

        {/* Recent Pranks */}
        <section className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Scherzi Recenti</h2>
            {pranks.length > 0 && (
              <Button variant="link" className="text-primary p-0" onClick={() => navigate("/history")}>
                Vedi tutti →
              </Button>
            )}
          </div>

          {pranks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Phone className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Nessuno scherzo ancora</p>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  Crea il tuo primo scherzo telefonico AI!
                </p>
                <Button onClick={() => navigate("/create-prank")} className="gradient-primary">
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
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t px-4 py-2 safe-area-bottom">
        <div className="flex justify-around max-w-lg mx-auto">
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate("/dashboard")}>
            <Phone className="w-5 h-5 text-primary" />
            <span className="text-xs">Home</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate("/create-prank")}>
            <Plus className="w-5 h-5" />
            <span className="text-xs">Nuovo</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate("/history")}>
            <History className="w-5 h-5" />
            <span className="text-xs">Storia</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate("/settings")}>
            <Settings className="w-5 h-5" />
            <span className="text-xs">Profilo</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
