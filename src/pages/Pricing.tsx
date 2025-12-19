import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Phone, ArrowLeft, Check, Sparkles, Zap, Tag, X, CheckCircle } from "lucide-react";
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

interface PromoCodeInfo {
  code: string;
  discount_percentage: number;
  id: string;
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
  
  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeInfo | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const handlePackageClick = (pkg: PricingPackage) => {
    setSelectedPackage(pkg);
    setShowUpsell(true);
  };

  const validatePromoCode = async () => {
    if (!promoInput.trim()) return;
    
    setPromoLoading(true);
    setPromoError(null);

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPromoError("Devi essere loggato per usare un codice promo");
        setPromoLoading(false);
        return;
      }

      // Fetch the promo code
      const { data: promoCode, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoInput.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!promoCode) {
        setPromoError("Codice non valido o scaduto");
        setPromoLoading(false);
        return;
      }

      // Check expiration
      if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
        setPromoError("Codice scaduto");
        setPromoLoading(false);
        return;
      }

      // Check max uses
      if (promoCode.max_uses) {
        const { count } = await supabase
          .from("promo_code_uses")
          .select("*", { count: "exact", head: true })
          .eq("promo_code_id", promoCode.id);
        
        if (count && count >= promoCode.max_uses) {
          setPromoError("Codice esaurito");
          setPromoLoading(false);
          return;
        }
      }

      // Check if user already used this code
      const { data: existingUse } = await supabase
        .from("promo_code_uses")
        .select("id")
        .eq("promo_code_id", promoCode.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingUse) {
        setPromoError("Hai già utilizzato questo codice");
        setPromoLoading(false);
        return;
      }

      // Code is valid
      setAppliedPromo({
        code: promoCode.code,
        discount_percentage: promoCode.discount_percentage,
        id: promoCode.id,
      });
      setPromoInput("");
      toast({
        title: "Codice applicato!",
        description: `Sconto del ${promoCode.discount_percentage}% applicato`,
      });
    } catch (error: any) {
      console.error("Promo validation error:", error);
      setPromoError("Errore nella validazione del codice");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
  };

  const getDiscountedPrice = (price: number) => {
    if (!appliedPromo) return price;
    return price * (1 - appliedPromo.discount_percentage / 100);
  };

  const handleCheckout = async (packageType: string) => {
    setLoading(packageType);
    setShowUpsell(false);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          packageType,
          promoCodeId: appliedPromo?.id,
          promoCode: appliedPromo?.code,
        },
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
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

        {/* Promo Code Section */}
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Hai un codice promo?</span>
            </div>
            
            {appliedPromo ? (
              <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-mono font-semibold">{appliedPromo.code}</span>
                  <Badge variant="secondary">-{appliedPromo.discount_percentage}%</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={removePromoCode}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Inserisci codice"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoError(null);
                  }}
                  className="uppercase font-mono"
                  onKeyDown={(e) => e.key === "Enter" && validatePromoCode()}
                />
                <Button 
                  variant="outline" 
                  onClick={validatePromoCode}
                  disabled={promoLoading || !promoInput.trim()}
                >
                  {promoLoading ? (
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    "Applica"
                  )}
                </Button>
              </div>
            )}
            
            {promoError && (
              <p className="text-destructive text-sm mt-2">{promoError}</p>
            )}
          </CardContent>
        </Card>

        {/* Packages */}
        <div className="space-y-4">
          {packages.map((pkg) => {
            const discountedPrice = getDiscountedPrice(pkg.price);
            const hasDiscount = appliedPromo && discountedPrice < pkg.price;
            
            return (
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
                  <div className="flex items-baseline gap-2">
                    {hasDiscount ? (
                      <>
                        <span className="text-4xl font-bold text-primary">
                          €{discountedPrice.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-lg text-muted-foreground line-through">
                          €{pkg.price.toFixed(2).replace(".", ",")}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-primary">
                        €{pkg.price.toFixed(2).replace(".", ",")}
                      </span>
                    )}
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
            );
          })}
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
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
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
                <>
                  Continua con il pacchetto 
                  {selectedPackage && appliedPromo ? (
                    <span className="ml-1">
                      (€{getDiscountedPrice(selectedPackage.price).toFixed(2).replace(".", ",")})
                    </span>
                  ) : (
                    <span className="ml-1">
                      (€{selectedPackage?.price.toFixed(2).replace(".", ",")})
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
