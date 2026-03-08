import { useState } from "react";
import { MessageCircleQuestion, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = [
  { value: "bug", label: "🐛 Bug / Errore" },
  { value: "suggestion", label: "💡 Suggerimento" },
  { value: "payment", label: "💳 Problema pagamento" },
  { value: "other", label: "❓ Altro" },
];

const FloatingHelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!category || !message.trim()) {
      toast({
        title: "Compila tutti i campi",
        description: "Seleziona una categoria e scrivi un messaggio",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Save ticket to database
      await supabase.from("support_tickets").insert({
        category,
        message: message.trim(),
        contact_email: email.trim() || null,
        user_email: user?.email || null,
        user_id: user?.id || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      });

      // Also send email notification
      const { error } = await supabase.functions.invoke("send-help-report", {
        body: {
          category,
          message: message.trim(),
          email: email.trim() || user?.email || "Non fornita",
          userEmail: user?.email || null,
          userId: user?.id || null,
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      });

      if (error) throw error;

      toast({
        title: "Segnalazione inviata! ✅",
        description: "Ti risponderemo al più presto",
      });
      setIsOpen(false);
      setCategory("");
      setMessage("");
      setEmail("");
    } catch (err: any) {
      console.error("Help report error:", err);
      toast({
        title: "Errore",
        description: "Impossibile inviare la segnalazione. Riprova.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform animate-fade-in"
          aria-label="Serve aiuto?"
        >
          <MessageCircleQuestion className="w-6 h-6" />
        </button>
      )}

      {/* Help Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100%-2rem)] max-w-sm animate-scale-in">
          <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-primary px-4 py-3">
              <span className="font-semibold text-primary-foreground text-sm">
                Serve aiuto? 🤝
              </span>
              <button onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-3">
              <div>
                <Label className="text-xs mb-1.5">Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5">Messaggio *</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descrivi il problema o il suggerimento..."
                  className="text-sm min-h-[80px] resize-none"
                  maxLength={1000}
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5">Email (opzionale)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Per ricevere una risposta"
                  className="h-9 text-sm"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={sending}
                className="w-full"
                size="sm"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {sending ? "Invio..." : "Invia segnalazione"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingHelpButton;
