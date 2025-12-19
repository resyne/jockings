import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Ticket, Copy, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  description: string | null;
  is_active: boolean;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
  use_count?: number;
}

const AdminPromoCodes = () => {
  const navigate = useNavigate();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState(10);
  const [newDescription, setNewDescription] = useState("");
  const [newMaxUses, setNewMaxUses] = useState<string>("");
  const [newExpiresAt, setNewExpiresAt] = useState("");

  const fetchPromoCodes = async () => {
    setLoading(true);
    
    // Fetch promo codes
    const { data: codes, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching promo codes:", error);
      toast.error("Errore nel caricamento dei codici promo");
      setLoading(false);
      return;
    }

    // Fetch use counts for each code
    const codesWithCounts = await Promise.all(
      (codes || []).map(async (code) => {
        const { count } = await supabase
          .from("promo_code_uses")
          .select("*", { count: "exact", head: true })
          .eq("promo_code_id", code.id);
        
        return { ...code, use_count: count || 0 };
      })
    );

    setPromoCodes(codesWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const handleCreate = async () => {
    if (!newCode.trim()) {
      toast.error("Inserisci un codice");
      return;
    }

    if (newDiscount < 1 || newDiscount > 100) {
      toast.error("Lo sconto deve essere tra 1% e 100%");
      return;
    }

    const { error } = await supabase.from("promo_codes").insert({
      code: newCode.toUpperCase().trim(),
      discount_percentage: newDiscount,
      description: newDescription.trim() || null,
      max_uses: newMaxUses ? parseInt(newMaxUses) : null,
      expires_at: newExpiresAt || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Questo codice esiste già");
      } else {
        toast.error("Errore nella creazione del codice");
        console.error(error);
      }
    } else {
      toast.success("Codice promo creato!");
      setNewCode("");
      setNewDiscount(10);
      setNewDescription("");
      setNewMaxUses("");
      setNewExpiresAt("");
      setIsDialogOpen(false);
      fetchPromoCodes();
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Errore nell'aggiornamento");
      console.error(error);
    } else {
      toast.success(currentState ? "Codice disattivato" : "Codice attivato");
      fetchPromoCodes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo codice promo?")) return;

    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Errore nell'eliminazione");
      console.error(error);
    } else {
      toast.success("Codice eliminato");
      fetchPromoCodes();
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Codice copiato!");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Codici Promo</h1>
              <p className="text-muted-foreground">
                Gestisci i codici sconto per i tuoi utenti
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Codice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Codice Promo</DialogTitle>
                <DialogDescription>
                  Crea un nuovo codice sconto. Ogni utente può usarlo una sola volta.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Codice</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="es. SCONTO20"
                      className="uppercase"
                    />
                    <Button variant="outline" onClick={generateRandomCode}>
                      Genera
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Sconto (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min={1}
                    max={100}
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione (opzionale)</Label>
                  <Input
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="es. Sconto lancio estate 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Numero massimo utilizzi (opzionale)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min={1}
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(e.target.value)}
                    placeholder="Lascia vuoto per illimitato"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Data scadenza (opzionale)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={newExpiresAt}
                    onChange={(e) => setNewExpiresAt(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleCreate}>
                  Crea Codice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Codici Attivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Caricamento...</p>
            ) : promoCodes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessun codice promo creato
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Sconto</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Utilizzi</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Attivo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                            {promo.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(promo.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-primary font-semibold">
                          -{promo.discount_percentage}%
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {promo.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {promo.use_count || 0}
                            {promo.max_uses && ` / ${promo.max_uses}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {promo.expires_at
                          ? format(new Date(promo.expires_at), "dd MMM yyyy HH:mm", { locale: it })
                          : "Mai"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={promo.is_active}
                          onCheckedChange={() => handleToggleActive(promo.id, promo.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(promo.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPromoCodes;
