import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Headphones } from "lucide-react";
import saranoWordmarkIcon from "@/assets/sarano-wordmark-icon.png";

const Inizia = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-center">
        <img 
          src={saranoWordmarkIcon} 
          alt="sarano.ai" 
          className="h-8 animate-bounce-in"
        />
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Section Label */}
        <span 
          className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          Si comincia.
        </span>

        {/* H1 Title */}
        <h1 
          className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight opacity-0 animate-fade-in"
          style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}
        >
          Lo scherzo è servito.
        </h1>

        {/* H2 Subtitle */}
        <h2 
          className="text-xl md:text-2xl font-medium text-secondary-foreground mb-6 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          Telefonate AI personalizzate per ridere forte.
        </h2>

        {/* Supporting Line */}
        <p 
          className="text-base text-muted-foreground mb-2 max-w-sm opacity-0 animate-fade-in"
          style={{ animationDelay: '0.55s', animationFillMode: 'forwards' }}
        >
          Inserisci nome, cognome e contesto.
          <br />
          Poi goditi la scena.
        </p>

        {/* Micro-wink */}
        <p 
          className="text-sm text-muted-foreground/70 italic mb-10 max-w-xs opacity-0 animate-fade-in"
          style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}
        >
          Preferibilmente a qualcuno che ti inviterà ancora a cena.
        </p>

        {/* CTA Section */}
        <div 
          className="flex flex-col items-center gap-3 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.85s', animationFillMode: 'forwards' }}
        >
          <Button 
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 rounded-full font-semibold shadow-lg hover:scale-105 transition-transform"
            onClick={() => navigate("/auth")}
          >
            Prova uno scherzo
          </Button>

          {/* Micro-copy */}
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
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
