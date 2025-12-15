import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Phone, ArrowLeft, Check, Sparkles, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import saranoIcon from "@/assets/sarano-icon.png";

interface PricingPackage {
  id: string;
  name: string;
  pranks: number;
  price: number;
  pricePerPrank: string;
  recommended?: boolean;
}

const packages: PricingPackage[] = [
  {
    id: "pack_10",
    name: "Mega Pack",
    pranks: 10,
    price: 24.99,
    pricePerPrank: "2,50",
  },
  {
    id: "pack_3",
    name: "Starter Pack",
    pranks: 3,
    price: 9.99,
    pricePerPrank: "3,33",
    recommended: true,
  },
  {
    id: "pack_1",
    name: "Singolo",
    pranks: 1,
    price: 3.99,
    pricePerPrank: "3,99",
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(null);

  const handlePackageClick = (pkg: PricingPackage) => {
    setSelectedPackage(pkg);
    setShowUpsell(true);
  };

  const handleCheckout = async (packageType: string) => {
    setLoading(packageType);
    setShowUpsell(false);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { packageType },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile avviare il pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img 
            src={saranoIcon} 
            alt="sarano.ai" 
            className="w-8 h-8 object-contain" 
          />
          <h1 className="font-bold text-lg text-foreground">Acquista Prank</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Scegli il tuo pacchetto</h2>
          <p className="text-muted-foreground">
            Più prank compri, più risparmi!
          </p>
        </div>

        {/* Packages */}
        <div className="space-y-4">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id}
              className={`relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
                pkg.recommended 
                  ? "border-primary shadow-lg ring-2 ring-primary/20" 
                  : "border-border"
              }`}
              onClick={() => handlePackageClick(pkg)}
            >
              {pkg.recommended && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Consigliato
                </Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-xl text-foreground">{pkg.name}</CardTitle>
                <CardDescription>
                  {pkg.pranks} {pkg.pranks === 1 ? "chiamata prank" : "chiamate prank"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-primary">€{pkg.price.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    €{pkg.pricePerPrank} per prank
                  </span>
                  <Button 
                    className="bg-primary text-primary-foreground"
                    disabled={loading === pkg.id}
                  >
                    {loading === pkg.id ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Caricamento...
                      </span>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 mr-2" />
                        Acquista
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features */}
        <Card className="bg-muted/30 border-border">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-foreground mb-4">Ogni prank include:</h3>
            <ul className="space-y-2">
              {[
                "Voce AI ultra-realistica",
                "Registrazione della chiamata",
                "Temi personalizzabili",
                "Supporto multilingua",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>

      {/* Upsell Modal */}
      <Dialog open={showUpsell} onOpenChange={setShowUpsell}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl text-center text-foreground">
              <Zap className="w-8 h-8 mx-auto mb-2 text-primary" />
              Vuoi risparmiare?
            </DialogTitle>
            <DialogDescription className="text-center space-y-2" asChild>
              <div>
                <span className="block text-base">
                  Con <span className="font-bold text-primary">€9,99 al mese</span> ottieni{" "}
                  <span className="font-bold">5 prank</span>,
                </span>
                <span className="block text-muted-foreground">
                  meno del pacchetto da 3 prank!
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 pt-4">
            <Button 
              className="w-full bg-primary text-primary-foreground py-6 text-lg"
              onClick={() => handleCheckout("subscription")}
              disabled={loading === "subscription"}
            >
              {loading === "subscription" ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Caricamento...
                </span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Attiva abbonamento mensile
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => selectedPackage && handleCheckout(selectedPackage.id)}
              disabled={loading === selectedPackage?.id}
            >
              {loading === selectedPackage?.id ? (
                "Caricamento..."
              ) : (
                `Continua con il pacchetto (€${selectedPackage?.price.toFixed(2).replace(".", ",")})`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
