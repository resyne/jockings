import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Star, Phone, RotateCcw, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VerifiedCallerId {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  is_default: boolean;
  is_active: boolean;
  current_calls: number;
  max_concurrent_calls: number;
  vapi_phone_number_id: string | null;
  created_at: string;
}

const AdminCallerIds = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [callerIds, setCallerIds] = useState<VerifiedCallerId[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCallerId, setEditingCallerId] = useState<VerifiedCallerId | null>(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newFriendlyName, setNewFriendlyName] = useState("");
  const [newVapiPhoneNumberId, setNewVapiPhoneNumberId] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editFriendlyName, setEditFriendlyName] = useState("");
  const [editMaxConcurrentCalls, setEditMaxConcurrentCalls] = useState(1);
  const [editVapiPhoneNumberId, setEditVapiPhoneNumberId] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    fetchCallerIds();
  }, []);

  const fetchCallerIds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("verified_caller_ids")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Errore nel caricamento dei Caller ID");
      console.error(error);
    } else {
      setCallerIds(data || []);
    }
    setLoading(false);
  };

  const handleAddCallerId = async () => {
    if (!newPhoneNumber.trim()) {
      toast.error("Inserisci un numero di telefono");
      return;
    }

    const { error } = await supabase.from("verified_caller_ids").insert({
      phone_number: newPhoneNumber.trim(),
      friendly_name: newFriendlyName.trim() || null,
      vapi_phone_number_id: newVapiPhoneNumberId.trim() || null,
      is_default: callerIds.length === 0, // First one is default
    });

    if (error) {
      toast.error("Errore nell'aggiunta del Caller ID");
      console.error(error);
    } else {
      toast.success("Caller ID aggiunto con successo");
      setNewPhoneNumber("");
      setNewFriendlyName("");
      setNewVapiPhoneNumberId("");
      setIsDialogOpen(false);
      fetchCallerIds();
    }
  };

  const handleSetDefault = async (id: string) => {
    const { error } = await supabase
      .from("verified_caller_ids")
      .update({ is_default: true })
      .eq("id", id);

    if (error) {
      toast.error("Errore nell'impostazione del Caller ID predefinito");
      console.error(error);
    } else {
      toast.success("Caller ID predefinito aggiornato");
      fetchCallerIds();
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("verified_caller_ids")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Errore nell'aggiornamento dello stato");
      console.error(error);
    } else {
      toast.success(`Caller ID ${!currentState ? "attivato" : "disattivato"}`);
      fetchCallerIds();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo Caller ID?")) return;

    const { error } = await supabase
      .from("verified_caller_ids")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Errore nell'eliminazione del Caller ID");
      console.error(error);
    } else {
      toast.success("Caller ID eliminato");
      fetchCallerIds();
    }
  };

  const handleResetCounter = async (id: string) => {
    const { error } = await supabase
      .from("verified_caller_ids")
      .update({ current_calls: 0 })
      .eq("id", id);

    if (error) {
      toast.error("Errore nel reset del contatore");
      console.error(error);
    } else {
      toast.success("Contatore resettato");
      fetchCallerIds();
    }
  };

  const handleEditClick = (callerId: VerifiedCallerId) => {
    setEditingCallerId(callerId);
    setEditPhoneNumber(callerId.phone_number);
    setEditFriendlyName(callerId.friendly_name || "");
    setEditMaxConcurrentCalls(callerId.max_concurrent_calls);
    setEditVapiPhoneNumberId(callerId.vapi_phone_number_id || "");
    setIsEditDialogOpen(true);
  };

  const handleEditCallerId = async () => {
    if (!editingCallerId) return;
    
    if (!editPhoneNumber.trim()) {
      toast.error("Inserisci un numero di telefono");
      return;
    }

    const { error } = await supabase
      .from("verified_caller_ids")
      .update({
        phone_number: editPhoneNumber.trim(),
        friendly_name: editFriendlyName.trim() || null,
        max_concurrent_calls: editMaxConcurrentCalls,
        vapi_phone_number_id: editVapiPhoneNumberId.trim() || null,
      })
      .eq("id", editingCallerId.id);

    if (error) {
      toast.error("Errore nella modifica del Caller ID");
      console.error(error);
    } else {
      toast.success("Caller ID modificato con successo");
      setIsEditDialogOpen(false);
      setEditingCallerId(null);
      fetchCallerIds();
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Caller ID Verificati</h1>
            <p className="text-sm text-muted-foreground">Gestisci i numeri verificati per le chiamate</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Caller ID Verificati
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aggiungi Caller ID Verificato</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Numero di telefono</Label>
                    <Input
                      placeholder="+39..."
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome descrittivo (opzionale)</Label>
                    <Input
                      placeholder="es. Numero principale"
                      value={newFriendlyName}
                      onChange={(e) => setNewFriendlyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>VAPI Phone Number ID (opzionale)</Label>
                    <Input
                      placeholder="PN..."
                      value={newVapiPhoneNumberId}
                      onChange={(e) => setNewVapiPhoneNumberId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      ID dal VAPI Dashboard (formato: PN...). Richiesto per chiamate VAPI.
                    </p>
                  </div>
                  <Button onClick={handleAddCallerId} className="w-full">
                    Aggiungi Caller ID
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifica Caller ID</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Numero di telefono</Label>
                    <Input
                      placeholder="+39..."
                      value={editPhoneNumber}
                      onChange={(e) => setEditPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome descrittivo (opzionale)</Label>
                    <Input
                      placeholder="es. Numero principale"
                      value={editFriendlyName}
                      onChange={(e) => setEditFriendlyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chiamate simultanee massime</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={editMaxConcurrentCalls}
                      onChange={(e) => setEditMaxConcurrentCalls(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>VAPI Phone Number ID (opzionale)</Label>
                    <Input
                      placeholder="PN..."
                      value={editVapiPhoneNumberId}
                      onChange={(e) => setEditVapiPhoneNumberId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      ID dal VAPI Dashboard (formato: PN...). Richiesto per chiamate VAPI.
                    </p>
                  </div>
                  <Button onClick={handleEditCallerId} className="w-full">
                    Salva modifiche
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {callerIds.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nessun Caller ID verificato configurato
              </p>
            ) : (
              <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>VAPI ID</TableHead>
                    <TableHead>Chiamate</TableHead>
                    <TableHead>Predefinito</TableHead>
                    <TableHead>Attivo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callerIds.map((callerId) => (
                    <TableRow key={callerId.id}>
                      <TableCell className="font-mono">
                        {callerId.phone_number}
                      </TableCell>
                      <TableCell>
                        {callerId.friendly_name || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {callerId.vapi_phone_number_id ? (
                          <span className="text-green-600">{callerId.vapi_phone_number_id}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={callerId.current_calls > 0 ? "text-orange-500 font-medium" : ""}>
                            {callerId.current_calls}/{callerId.max_concurrent_calls}
                          </span>
                          {callerId.current_calls > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleResetCounter(callerId.id)}
                              title="Reset contatore"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {callerId.is_default ? (
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(callerId.id)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={callerId.is_active}
                          onCheckedChange={() =>
                            handleToggleActive(callerId.id, callerId.is_active)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(callerId)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(callerId.id)}
                            disabled={callerId.is_default}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Come funziona</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              I Caller ID verificati sono numeri che hai verificato nel tuo account Twilio.
              Questi numeri possono essere usati come identificativo chiamante per le chiamate in uscita.
            </p>
            <p>
              <strong>Per chiamate VAPI:</strong> Devi aggiungere il VAPI Phone Number ID (formato: PN...) 
              dal VAPI Dashboard. Solo i Caller ID con VAPI ID configurato verranno usati per le chiamate VAPI.
            </p>
            <p>
              <strong>Nota:</strong> Per verificare un nuovo Caller ID, vai nella console Twilio:
              Phone Numbers → Verified Caller IDs → Add a Caller ID
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminCallerIds;
