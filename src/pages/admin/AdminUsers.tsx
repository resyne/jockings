import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Shield, ShieldCheck, ShieldOff, Phone, Search, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  available_pranks: number | null;
  created_at: string;
  phone_number: string | null;
  isAdmin?: boolean;
  pranks_made?: number;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading, userId: currentUserId } = useAdminCheck();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.username?.toLowerCase().includes(query) ||
            user.user_id.toLowerCase().includes(query) ||
            user.phone_number?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    
    const [profilesRes, adminRolesRes, pranksCountRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
      supabase.from("pranks").select("user_id"),
    ]);

    if (profilesRes.error) {
      toast({ title: "Errore", description: profilesRes.error.message, variant: "destructive" });
      setLoadingUsers(false);
      return;
    }

    const adminUserIds = new Set(adminRolesRes.data?.map(r => r.user_id) || []);
    
    // Count pranks per user
    const pranksCounts: Record<string, number> = {};
    pranksCountRes.data?.forEach(p => {
      pranksCounts[p.user_id] = (pranksCounts[p.user_id] || 0) + 1;
    });

    const usersWithRoles = (profilesRes.data || []).map(profile => ({
      ...profile,
      isAdmin: adminUserIds.has(profile.user_id),
      pranks_made: pranksCounts[profile.user_id] || 0,
    }));

    setUsers(usersWithRoles);
    setFilteredUsers(usersWithRoles);
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userToDelete.user_id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Utente eliminato", description: `${userToDelete.username || "Utente"} è stato eliminato` });
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
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
          <Badge variant="secondary" className="ml-auto">
            {filteredUsers.length} / {users.length}
          </Badge>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, ID o telefono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {loadingUsers ? (
          <div className="text-center py-12 text-muted-foreground">
            Caricamento utenti...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? "Nessun utente trovato" : "Nessun utente"}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-primary">
                          {user.username?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{user.username || "Senza nome"}</p>
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
                        {user.phone_number && (
                          <p className="text-xs text-muted-foreground truncate">{user.phone_number}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Pranks made (read-only) */}
                      <div className="flex items-center gap-1 text-muted-foreground" title="Prank effettuati">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm font-medium">{user.pranks_made || 0}</span>
                      </div>
                      
                      {/* Available pranks (editable) */}
                      <div className="flex items-center gap-1" title="Crediti disponibili (modificabile)">
                        <span className="text-xs text-primary">💰</span>
                        <input
                          type="number"
                          value={user.available_pranks || 0}
                          onChange={(e) => updatePranks(user.user_id, parseInt(e.target.value) || 0)}
                          className="w-12 text-center bg-muted rounded px-1 py-1 text-sm"
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setUserToDelete(user)}
                        disabled={user.user_id === currentUserId}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo utente?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare <strong>{userToDelete?.username || "Senza nome"}</strong>. 
              Questa azione è irreversibile e cancellerà tutti i dati associati all'utente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
