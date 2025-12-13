import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Headphones } from "lucide-react";
import saranoWordmarkIcon from "@/assets/sarano-wordmark-icon.png";
import saranoIcon from "@/assets/sarano-icon.png";

const FloatingIcon = ({ 
  className, 
  style 
}: { 
  className?: string; 
  style?: React.CSSProperties;
}) => (
  <img 
    src={saranoIcon} 
    alt="" 
    className={`absolute opacity-[0.03] pointer-events-none ${className}`}
    style={style}
  />
);

const Inizia = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Floating Background Icons */}
      <div className="absolute inset-0 pointer-events-none">
        <FloatingIcon 
          className="w-24 h-24 animate-float" 
          style={{ top: '10%', left: '5%', animationDelay: '0s' }} 
        />
        <FloatingIcon 
          className="w-16 h-16 animate-float" 
          style={{ top: '20%', right: '10%', animationDelay: '1s' }} 
        />
        <FloatingIcon 
          className="w-20 h-20 animate-float" 
          style={{ top: '50%', left: '8%', animationDelay: '2s' }} 
        />
        <FloatingIcon 
          className="w-12 h-12 animate-float" 
          style={{ top: '70%', right: '15%', animationDelay: '0.5s' }} 
        />
        <FloatingIcon 
          className="w-14 h-14 animate-float" 
          style={{ top: '80%', left: '20%', animationDelay: '1.5s' }} 
        />
        <FloatingIcon 
          className="w-18 h-18 animate-float" 
          style={{ top: '30%', right: '5%', animationDelay: '2.5s' }} 
        />
      </div>

      {/* Header */}
      <header className="p-4 flex justify-center relative z-10">
        <img 
          src={saranoWordmarkIcon} 
          alt="sarano.ai" 
          className="h-8 animate-bounce-in"
        />
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10">
        {/* Section Label */}
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">
          Si comincia.
        </span>

        {/* H1 Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
          Lo scherzo è servito.
        </h1>

        {/* H2 Subtitle */}
        <h2 className="text-xl md:text-2xl font-medium text-secondary-foreground mb-6">
          Telefonate AI personalizzate per ridere forte.
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
