import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import saranoIcon from "@/assets/sarano-icon.png";

const CardSetupSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      navigate("/dashboard");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-card-setup", {
          body: { session_id: sessionId },
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || "Verifica fallita");
        }

        setVerifying(false);
        toast({
          title: "Carta verificata! 🎉",
          description: "Hai 1 chiamata inclusa. Divertiti!",
        });

        // Redirect to create-prank after 2 seconds
        setTimeout(() => navigate("/create-prank"), 2000);
      } catch (err: any) {
        console.error("Card verification error:", err);
        toast({
          title: "Errore",
          description: err.message || "Impossibile verificare la carta",
          variant: "destructive",
        });
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    };

    verify();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-card shadow-lg mb-4 overflow-hidden flex items-center justify-center">
        <img src={saranoIcon} alt="Sarano" className="w-12 h-12 object-contain" />
      </div>

      {verifying ? (
        <>
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Verifico la carta...</h1>
          <p className="text-sm text-muted-foreground">Un momento, quasi fatto!</p>
        </>
      ) : (
        <>
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Tutto pronto! 🎉</h1>
          <p className="text-sm text-muted-foreground mb-1">La tua carta è stata verificata.</p>
          <p className="text-sm font-medium text-primary">Hai 1 chiamata inclusa!</p>
          <p className="text-xs text-muted-foreground mt-4">Reindirizzamento in corso...</p>
        </>
      )}
    </div>
  );
};

export default CardSetupSuccess;
