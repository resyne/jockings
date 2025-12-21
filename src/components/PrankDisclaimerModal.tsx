import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Send, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DISCLAIMER_VERSION = "1.0";

interface PrankDisclaimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  userId: string;
  prankId?: string;
}

// Simple hash function for IP
const hashIP = async (ip: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + DISCLAIMER_VERSION);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
};

const PrankDisclaimerModal = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  userId,
  prankId,
}: PrankDisclaimerModalProps) => {
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!confirmed) return;
    
    setSaving(true);
    try {
      // Get IP address (will be hashed)
      let ipHash = null;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipHash = await hashIP(ipData.ip);
      } catch (e) {
        console.log('Could not get IP for logging');
      }

      // If we have a prankId, log the acceptance
      if (prankId) {
        await supabase.from('prank_disclaimer_acceptances').insert({
          user_id: userId,
          prank_id: prankId,
          ip_hash: ipHash,
          disclaimer_version: DISCLAIMER_VERSION,
        });
      }

      onConfirm();
    } catch (error) {
      console.error('Error saving disclaimer acceptance:', error);
      // Still proceed even if logging fails
      onConfirm();
    } finally {
      setSaving(false);
    }
  };

  const isLoading = loading || saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Conferma Responsabilità</DialogTitle>
              <DialogDescription>
                Prima di avviare lo scherzo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground space-y-3 bg-muted/50 p-4 rounded-lg">
            <p>Confermo che lo scherzo è a scopo ludico, non offensivo e non ingannevole.</p>
            <p>Non simula emergenze, autorità o conseguenze reali.</p>
            <p>Interromperò la chiamata in caso di dissenso del destinatario.</p>
            <p className="font-medium text-foreground">Mi assumo ogni responsabilità.</p>
          </div>

          <div className="flex items-start gap-3 p-4 border rounded-lg bg-card">
            <Checkbox
              id="disclaimer-confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
              className="mt-0.5"
            />
            <Label 
              htmlFor="disclaimer-confirm" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              Confermo di aver letto e accettato le condizioni sopra indicate
            </Label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annulla
          </Button>
          <Button
            className="flex-1 gradient-primary"
            onClick={handleConfirm}
            disabled={!confirmed || isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Avvio...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Avvia Scherzo
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrankDisclaimerModal;
