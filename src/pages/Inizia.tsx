import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Headphones } from "lucide-react";
import saranoLogoPayoff from "@/assets/sarano-logo-payoff.png";

const Inizia = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Logo with payoff */}
        <img 
          src={saranoLogoPayoff} 
          alt="sarano.ai - Laugh first. Explain later." 
          className="h-10 md:h-12 mb-10 animate-bounce-in"
        />

        {/* Section Label */}
        <span className="text-xs font-mono uppercase tracking-widest text-secondary mb-6">
          Si comincia.
        </span>

        {/* H1 Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
          Lo scherzo è <span className="text-primary">servito.</span>
        </h1>

        {/* H2 Subtitle */}
        <h2 className="text-xl md:text-2xl font-medium text-secondary-foreground mb-6">
          Telefonate <span className="text-secondary">AI</span> personalizzate per ridere forte.
        </h2>

        {/* Supporting Line */}
        <p className="text-base text-muted-foreground mb-2 max-w-sm">
          Inserisci nome, cognome e contesto.
          <br />
          Poi goditi la scena.
        </p>

        {/* Micro-wink */}
        <p className="text-sm text-muted-foreground/70 italic mb-10 max-w-xs">
          Preferibilmente a qualcuno che ti inviterà ancora a cena.
        </p>

        {/* CTA Section */}
        <div className="flex flex-col items-center gap-3">
          <Button 
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 rounded-full font-semibold shadow-lg"
            onClick={() => navigate("/auth")}
          >
            Prova uno scherzo
          </Button>

          {/* Micro-copy */}
          <p className="text-xs text-secondary flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5" />
            Prima lo provi su di te. Gratis.
          </p>
        </div>
      </main>

      {/* Footer spacer */}
      <div className="h-16" />
    </div>
  );
};

export default Inizia;
