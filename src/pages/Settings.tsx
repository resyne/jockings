import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Coins, LogOut, Save } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import saranoIcon from "@/assets/sarano-icon.png";

interface Profile {
  username: string | null;
  credits: number;
  avatar_url: string | null;
}

const Settings = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, credits, avatar_url")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
      setUsername(data.username || "");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim() })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvato! ✨", description: "Profilo aggiornato con successo" });
      setProfile((prev) => prev ? { ...prev, username: username.trim() } : null);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Arrivederci! 👋", description: "Logout effettuato con successo" });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src={saranoIcon} alt="sarano.ai" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="font-bold">Impostazioni</h1>
            <p className="text-xs text-muted-foreground">Gestisci il tuo account</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Profile Card */}
        <Card className="animate-slide-up">
          <CardHeader className="text-center pb-2">
            <Avatar className="w-20 h-20 mx-auto border-4 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="gradient-primary text-primary-foreground text-2xl">
                {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4">{profile?.username || "Utente"}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary/10">
              <Coins className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg">{profile?.credits || 0}</span>
              <span className="text-sm text-muted-foreground">crediti disponibili</span>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Profilo</CardTitle>
                <CardDescription>Modifica le tue informazioni</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Il tuo nickname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="pl-10 h-12 opacity-60"
                />
              </div>
            </div>
            <Button
              onClick={handleSave}
              className="w-full h-12 gradient-primary"
              disabled={loading || username === profile?.username}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-14 text-destructive border-destructive/20 hover:bg-destructive/10 animate-slide-up"
          style={{ animationDelay: "0.2s" }}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Esci dall'account
        </Button>
      </main>
    </div>
  );
};

export default Settings;
