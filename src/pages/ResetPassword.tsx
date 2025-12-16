import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import saranoIcon from "@/assets/sarano-icon.png";
import saranoWordmark from "@/assets/sarano-wordmark.png";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: "Errore",
        description: "La password deve avere almeno 8 caratteri",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non coincidono",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { token, newPassword: password },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      toast({
        title: "Password reimpostata! 🎉",
        description: "Ora puoi accedere con la nuova password",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore nel reimpostare la password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="mb-4 sm:mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl shadow-card mb-2 sm:mb-4 overflow-hidden bg-card">
            <img src={saranoIcon} alt="sarano.ai" className="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
          </div>
          <img src={saranoWordmark} alt="sarano.ai" className="h-6 sm:h-8 mx-auto" />
        </div>

        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl text-destructive">Link non valido</CardTitle>
            <CardDescription>
              Il link per reimpostare la password non è valido o è scaduto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate("/auth")}
            >
              Torna al login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="mb-4 sm:mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl shadow-card mb-2 sm:mb-4 overflow-hidden bg-card">
            <img src={saranoIcon} alt="sarano.ai" className="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
          </div>
          <img src={saranoWordmark} alt="sarano.ai" className="h-6 sm:h-8 mx-auto" />
        </div>

        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Password reimpostata! 🎉</CardTitle>
            <CardDescription>
              La tua password è stata cambiata con successo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full bg-primary text-primary-foreground" 
              onClick={() => navigate("/auth")}
            >
              Vai al login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="mb-4 sm:mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl shadow-card mb-2 sm:mb-4 overflow-hidden bg-card">
          <img src={saranoIcon} alt="sarano.ai" className="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
        </div>
        <img src={saranoWordmark} alt="sarano.ai" className="h-6 sm:h-8 mx-auto" />
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Scherzi telefonici con AI</p>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center pb-2 sm:pb-4 pt-4 sm:pt-6">
          <CardTitle className="text-xl sm:text-2xl">Nuova password 🔐</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Scegli una nuova password per il tuo account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nuova Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-10 sm:h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Min. 8 caratteri</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-10 sm:h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-10 sm:h-12 text-base sm:text-lg bg-primary text-primary-foreground" 
              disabled={loading}
            >
              {loading ? (
                <span className="animate-pulse">Reimpostando...</span>
              ) : (
                "Reimposta Password"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline"
            >
              ← Torna al login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
