import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie, X, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface CookiePreferences {
  technical: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

const COOKIE_CONSENT_KEY = "sarano_cookie_consent";
const COOKIE_POLICY_VERSION = "1.0";

const getStoredPreferences = (): CookiePreferences | null => {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading cookie preferences:", e);
  }
  return null;
};

const savePreferences = (preferences: Omit<CookiePreferences, "timestamp" | "version">) => {
  const fullPreferences: CookiePreferences = {
    ...preferences,
    timestamp: new Date().toISOString(),
    version: COOKIE_POLICY_VERSION,
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullPreferences));
  return fullPreferences;
};

export const useCookieConsent = () => {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    setPreferences(getStoredPreferences());
  }, []);

  const hasConsented = preferences !== null;
  const analyticsEnabled = preferences?.analytics ?? false;
  const marketingEnabled = preferences?.marketing ?? false;

  return { preferences, hasConsented, analyticsEnabled, marketingEnabled };
};

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const stored = getStoredPreferences();
    if (!stored) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    savePreferences({
      technical: true,
      analytics: true,
      marketing: true,
    });
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    savePreferences({
      technical: true,
      analytics: false,
      marketing: false,
    });
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    savePreferences({
      technical: true,
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    });
    setIsVisible(false);
    setShowPreferences(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-lg border-border animate-in slide-in-from-bottom-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Cookie</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRejectAll}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPreferences ? (
            <>
              <p className="text-sm text-muted-foreground">
                Utilizziamo cookie tecnici necessari al funzionamento del sito e, previo consenso, 
                cookie analitici e di marketing per migliorare l'esperienza e mostrarti contenuti pertinenti.{" "}
                <Link to="/cookie-policy" className="text-primary hover:underline">
                  Leggi la Cookie Policy
                </Link>
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleAcceptAll} className="flex-1">
                  Accetta tutti
                </Button>
                <Button variant="outline" onClick={handleRejectAll} className="flex-1">
                  Rifiuta
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowPreferences(true)}
                  className="flex-1"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Gestisci
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Cookie tecnici</Label>
                    <p className="text-xs text-muted-foreground">
                      Necessari al funzionamento del sito. Sempre attivi.
                    </p>
                  </div>
                  <Switch checked disabled className="data-[state=checked]:bg-primary" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <Label htmlFor="analytics" className="text-sm font-medium">Cookie analitici</Label>
                    <p className="text-xs text-muted-foreground">
                      Ci aiutano a migliorare il servizio raccogliendo statistiche anonime.
                    </p>
                  </div>
                  <Switch 
                    id="analytics"
                    checked={analyticsEnabled} 
                    onCheckedChange={setAnalyticsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <Label htmlFor="marketing" className="text-sm font-medium">Cookie di marketing</Label>
                    <p className="text-xs text-muted-foreground">
                      Utilizzati per mostrarti contenuti e annunci personalizzati.
                    </p>
                  </div>
                  <Switch 
                    id="marketing"
                    checked={marketingEnabled} 
                    onCheckedChange={setMarketingEnabled}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button onClick={handleSavePreferences} className="flex-1">
                  Salva preferenze
                </Button>
                <Button variant="outline" onClick={handleAcceptAll} className="flex-1">
                  Accetta tutti
                </Button>
                <Button variant="ghost" onClick={handleRejectAll} className="flex-1">
                  Rifiuta
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieBanner;
