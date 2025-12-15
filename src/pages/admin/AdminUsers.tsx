import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Shield, ShieldCheck, ShieldOff, Phone } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  available_pranks: number | null;
  created_at: string;
  isAdmin?: boolean;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading, userId: currentUserId } = useAdminCheck();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/auth");
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    
    // Fetch profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      setLoadingUsers(false);
      return;
    }

    // Fetch admin roles
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    const usersWithRoles = (profiles || []).map(profile => ({
      ...profile,
      isAdmin: adminUserIds.has(profile.user_id),
    }));

    setUsers(usersWithRoles);
    setLoadingUsers(false);
  };

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (userId === currentUserId) {
      toast({ title: "Errore", description: "Non puoi rimuovere il tuo ruolo admin", variant: "destructive" });
      return;
    }

    if (isCurrentlyAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Ruolo rimosso", description: "L'utente non è più admin" });
        fetchUsers();
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Ruolo assegnato", description: "L'utente è ora admin" });
        fetchUsers();
      }
    }
  };

  const updatePranks = async (userId: string, newPranks: number) => {
    const { error } = await supabase
      .from("profiles")
      .update({ available_pranks: newPranks })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Prank aggiornati" });
      fetchUsers();
    }
  };

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
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h1 className="font-bold">Gestione Utenti</h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto">
        {loadingUsers ? (
          <div className="text-center py-12 text-muted-foreground">
            Caricamento utenti...
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {user.username?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.username || "Senza nome"}</p>
                          {user.isAdmin && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Registrato il {format(new Date(user.created_at), "d MMM yyyy", { locale: it })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        <input
                          type="number"
                          value={user.available_pranks || 0}
                          onChange={(e) => updatePranks(user.user_id, parseInt(e.target.value) || 0)}
                          className="w-16 text-center bg-muted rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <Button
                        variant={user.isAdmin ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => toggleAdminRole(user.user_id, user.isAdmin || false)}
                        disabled={user.user_id === currentUserId}
                      >
                        {user.isAdmin ? (
                          <>
                            <ShieldOff className="w-4 h-4 mr-1" />
                            Rimuovi
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 mr-1" />
                            Admin
                          </>
                        )}
                      </Button>
                    </div>
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

export default AdminUsers;
