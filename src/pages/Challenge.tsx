import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Trophy, Heart } from "lucide-react";
import saranoWordmarkIcon from "@/assets/sarano-wordmark-icon.png";

const Challenge = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-center">
        <img 
          src={saranoWordmarkIcon} 
          alt="sarano.ai" 
          className="h-8"
        />
      </header>

      <main className="flex-1 px-4 md:px-6 pb-12">
        {/* HERO */}
        <section className="text-center py-12 md:py-16">
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4 tracking-tight">
            SARANO CHALLENGE
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Scherzi telefonici con l'intelligenza artificiale.
          </p>

          {/* Promo Code Block */}
          <div className="inline-block bg-primary/10 border-2 border-primary rounded-2xl px-6 py-4 mb-8">
            <p className="text-sm text-muted-foreground mb-1">Codice promo:</p>
            <p className="text-2xl md:text-3xl font-bold text-primary tracking-widest">PRANK10</p>
            <p className="text-base text-foreground mt-2 font-medium">→ 3 scherzi gratis</p>
          </div>

          <div className="flex justify-center">
            <Button 
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 rounded-full font-semibold shadow-lg"
              onClick={() => navigate("/auth?mode=signup")}
            >
              👉 Partecipa ora
            </Button>
          </div>
        </section>

        {/* COME FUNZIONA */}
        <section className="max-w-xl mx-auto py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
            Come partecipare
          </h2>

          <ol className="space-y-4 text-left">
            {[
              "Fai uno scherzo con Sarano AI",
              <>Registri lo scherzo<br /><span className="text-muted-foreground text-sm">(screen, reaction o entrambi)</span></>,
              "Pubblichi il video su TikTok o Instagram",
              "Tagghi @sarano.ai",
              "Ci mandi il video in DM o tramite form"
            ].map((step, index) => (
              <li key={index} className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <span className="text-foreground pt-1">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 space-y-2 text-center">
            <p className="text-muted-foreground">👉 Nessuna pressione.</p>
            <p className="text-muted-foreground">👉 Tutti possono partecipare.</p>
          </div>
        </section>

        {/* REGOLA D'ORO */}
        <section className="max-w-xl mx-auto py-10">
          <div className="bg-secondary/50 border border-secondary rounded-2xl p-6 text-center">
            <Heart className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Solo per ridere.
            </h3>
            <p className="text-lg text-foreground font-medium mb-4">
              Se non fa ridere, si chiude.
            </p>
            <p className="text-sm text-muted-foreground italic">
              Rispetta sempre chi risponde.
            </p>
          </div>
        </section>

        {/* PREMIO */}
        <section className="max-w-xl mx-auto py-10 text-center">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Cosa puoi vincere
          </h2>
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-8">
            <p className="text-lg text-foreground mb-4">
              Il video che ci fa ridere di più,<br />
              scelto dal team Sarano,<br />
              vince
            </p>
            <p className="text-5xl md:text-6xl font-black text-primary">100€</p>
          </div>
        </section>

        {/* CTA FINALE */}
        <section className="max-w-xl mx-auto py-10 text-center">
          <Button 
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-10 py-6 rounded-full font-semibold shadow-lg"
            onClick={() => navigate("/auth?mode=signup")}
          >
            👉 Partecipa alla Challenge
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Il codice <span className="font-mono font-bold text-primary">PRANK10</span> è valido per partecipare.
          </p>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border py-8 px-4 text-center">
        <p className="font-semibold text-foreground mb-1">Sarano AI</p>
        <p className="text-sm text-muted-foreground mb-4">
          Scherzi telefonici con l'intelligenza artificiale
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-xs text-muted-foreground">
          <span>• Solo per intrattenimento</span>
          <span>• Partecipazione facoltativa</span>
          <span>• Selezione editoriale del vincitore</span>
        </div>
      </footer>
    </div>
  );
};

export default Challenge;
