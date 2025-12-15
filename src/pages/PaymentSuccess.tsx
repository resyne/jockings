import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Phone, ArrowRight, Loader2 } from "lucide-react";
import saranoIcon from "@/assets/sarano-icon.png";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [pranksAdded, setPranksAdded] = useState<number | null>(null);
  const [totalPranks, setTotalPranks] = useState<number | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");
      const pranks = searchParams.get("pranks");
      
      if (!sessionId) {
        toast({
          title: "Errore",
          description: "Sessione di pagamento non trovata",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });

        if (error) throw error;

        if (data?.success) {
          setPranksAdded(data.pranks_added);
          setTotalPranks(data.total_pranks);
          toast({
            title: "Pagamento completato! 🎉",
            description: `Hai ricevuto ${data.pranks_added} prank`,
          });
        } else {
          // Payment not yet completed, might need to retry
          console.log("Payment status:", data);
          setPranksAdded(parseInt(pranks || "0"));
        }
      } catch (error: any) {
        console.error("Verify payment error:", error);
        // Don't show error toast, just set the pranks from URL
        setPranksAdded(parseInt(pranks || "0"));
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, toast, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          {verifying ? (
            <div className="mx-auto">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
          ) : (
            <div className="mx-auto bg-green-500/10 p-4 rounded-full">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
          )}
          <CardTitle className="text-2xl text-foreground mt-4">
            {verifying ? "Verificando pagamento..." : "Pagamento completato!"}
          </CardTitle>
          <CardDescription className="text-base">
            {verifying 
              ? "Attendere prego..." 
              : `Hai ricevuto ${pranksAdded} prank${pranksAdded !== 1 ? '' : ''}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!verifying && (
            <>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2">
                  <img src={saranoIcon} alt="" className="w-6 h-6" />
                  <span className="text-2xl font-bold text-primary">
                    {totalPranks ?? pranksAdded}
                  </span>
                  <span className="text-muted-foreground">prank disponibili</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full bg-primary text-primary-foreground"
                  onClick={() => navigate("/create-prank")}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Crea il tuo primo prank
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/dashboard")}
                >
                  Vai alla dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
