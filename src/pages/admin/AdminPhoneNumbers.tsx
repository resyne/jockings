import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Phone, Globe, Users, EyeOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PhoneNumber {
  id: string;
  phone_number: string;
  country_code: string;
  country_name: string;
  friendly_name: string | null;
  is_active: boolean;
  max_concurrent_calls: number;
  current_calls: number;
  caller_id_anonymous: boolean;
  created_at: string;
}

interface QueueEntry {
  id: string;
  prank_id: string;
  phone_number_id: string | null;
  status: string;
  position: number | null;
  scheduled_for: string | null;
  started_at: string | null;
  created_at: string;
}

const COUNTRIES = [
  { code: "IT", name: "Italia", prefix: "+39" },
  { code: "US", name: "Stati Uniti", prefix: "+1" },
  { code: "GB", name: "Regno Unito", prefix: "+44" },
  { code: "DE", name: "Germania", prefix: "+49" },
  { code: "FR", name: "Francia", prefix: "+33" },
  { code: "ES", name: "Spagna", prefix: "+34" },
  { code: "CH", name: "Svizzera", prefix: "+41" },
  { code: "AT", name: "Austria", prefix: "+43" },
];

const AdminPhoneNumbers = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("IT");
  const [friendlyName, setFriendlyName] = useState("");
  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState(1);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchPhoneNumbers();
      fetchQueueEntries();
    }
  }, [isAdmin]);

  const fetchPhoneNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from("twilio_phone_numbers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhoneNumbers(data || []);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      toast.error("Errore nel caricamento dei numeri");
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("call_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setQueueEntries(data || []);
    } catch (error) {
      console.error("Error fetching queue entries:", error);
    }
  };

  const handleAddPhoneNumber = async () => {
    const country = COUNTRIES.find(c => c.code === selectedCountry);
    if (!country) return;

    const fullNumber = newPhoneNumber.startsWith("+") 
      ? newPhoneNumber 
      : `${country.prefix}${newPhoneNumber.replace(/^0/, "")}`;

    try {
      const { error } = await supabase
        .from("twilio_phone_numbers")
        .insert({
          phone_number: fullNumber,
          country_code: country.code,
          country_name: country.name,
          friendly_name: friendlyName || null,
          max_concurrent_calls: maxConcurrentCalls,
          is_active: true,
        });

      if (error) throw error;

      toast.success("Numero aggiunto con successo");
      setIsDialogOpen(false);
      setNewPhoneNumber("");
      setFriendlyName("");
      setMaxConcurrentCalls(1);
      fetchPhoneNumbers();
    } catch (error: any) {
      console.error("Error adding phone number:", error);
      if (error.code === "23505") {
        toast.error("Questo numero esiste già");
      } else {
        toast.error("Errore nell'aggiunta del numero");
      }
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("twilio_phone_numbers")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;

      setPhoneNumbers(prev => 
        prev.map(p => p.id === id ? { ...p, is_active: !currentState } : p)
      );
      toast.success(`Numero ${!currentState ? "attivato" : "disattivato"}`);
    } catch (error) {
      console.error("Error toggling phone number:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleToggleAnonymous = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("twilio_phone_numbers")
        .update({ caller_id_anonymous: !currentState })
        .eq("id", id);

      if (error) throw error;

      setPhoneNumbers(prev => 
        prev.map(p => p.id === id ? { ...p, caller_id_anonymous: !currentState } : p)
      );
      toast.success(`Caller ID ${!currentState ? "anonimo" : "visibile"}`);
    } catch (error) {
      console.error("Error toggling anonymous:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleDeletePhoneNumber = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo numero?")) return;

    try {
      const { error } = await supabase
        .from("twilio_phone_numbers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPhoneNumbers(prev => prev.filter(p => p.id !== id));
      toast.success("Numero eliminato");
    } catch (error) {
      console.error("Error deleting phone number:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleUpdateMaxCalls = async (id: string, value: number) => {
    try {
      const { error } = await supabase
        .from("twilio_phone_numbers")
        .update({ max_concurrent_calls: value })
        .eq("id", id);

      if (error) throw error;

      setPhoneNumbers(prev =>
        prev.map(p => p.id === id ? { ...p, max_concurrent_calls: value } : p)
      );
      toast.success("Limite aggiornato");
    } catch (error) {
      console.error("Error updating max calls:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "queued": return "bg-yellow-500/20 text-yellow-400";
      case "processing": return "bg-blue-500/20 text-blue-400";
      case "completed": return "bg-green-500/20 text-green-400";
      case "failed": return "bg-red-500/20 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Numeri Twilio</h1>
            <p className="text-muted-foreground text-sm">
              Gestisci i numeri di telefono e le code delle chiamate
            </p>
          </div>
        </div>

        {/* Phone Numbers Section */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Numeri di Telefono
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Numero
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aggiungi Nuovo Numero</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Paese</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name} ({country.prefix})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Numero di Telefono</Label>
                    <Input
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      placeholder="Es: 3401234567"
                    />
                    <p className="text-xs text-muted-foreground">
                      Inserisci il numero senza prefisso internazionale
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Descrittivo (opzionale)</Label>
                    <Input
                      value={friendlyName}
                      onChange={(e) => setFriendlyName(e.target.value)}
                      placeholder="Es: Numero principale Italia"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Chiamate Contemporanee</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={maxConcurrentCalls}
                      onChange={(e) => setMaxConcurrentCalls(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <Button onClick={handleAddPhoneNumber} className="w-full">
                    Aggiungi Numero
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {phoneNumbers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun numero configurato</p>
                <p className="text-sm">Aggiungi il primo numero Twilio</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Paese</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Max Chiamate</TableHead>
                    <TableHead className="text-center">In Corso</TableHead>
                    <TableHead className="text-center">Anonimo</TableHead>
                    <TableHead className="text-center">Attivo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phoneNumbers.map((phone) => (
                    <TableRow key={phone.id}>
                      <TableCell className="font-mono">{phone.phone_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          {phone.country_name}
                        </div>
                      </TableCell>
                      <TableCell>{phone.friendly_name || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={phone.max_concurrent_calls}
                          onChange={(e) => handleUpdateMaxCalls(phone.id, parseInt(e.target.value) || 1)}
                          className="w-16 text-center mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          phone.current_calls > 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {phone.current_calls}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={phone.caller_id_anonymous}
                          onCheckedChange={() => handleToggleAnonymous(phone.id, phone.caller_id_anonymous)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={phone.is_active}
                          onCheckedChange={() => handleToggleActive(phone.id, phone.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePhoneNumber(phone.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Queue Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Coda Chiamate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna chiamata in coda</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Prank</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Posizione</TableHead>
                    <TableHead>Programmata per</TableHead>
                    <TableHead>Creata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">
                        {entry.prank_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(entry.status)}`}>
                          {entry.status}
                        </span>
                      </TableCell>
                      <TableCell>{entry.position || "-"}</TableCell>
                      <TableCell>
                        {entry.scheduled_for 
                          ? new Date(entry.scheduled_for).toLocaleString("it-IT")
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {new Date(entry.created_at).toLocaleString("it-IT")}
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

export default AdminPhoneNumbers;
