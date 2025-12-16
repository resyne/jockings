import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Phone, ArrowRight, RefreshCw, Check } from "lucide-react";
import saranoIcon from "@/assets/sarano-icon.png";

const COUNTRY_CODES = [
  { code: "+39", flag: "🇮🇹", name: "Italia" },
  { code: "+49", flag: "🇩🇪", name: "Germania" },
  { code: "+33", flag: "🇫🇷", name: "Francia" },
  { code: "+34", flag: "🇪🇸", name: "Spagna" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+41", flag: "🇨🇭", name: "Svizzera" },
  { code: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "+31", flag: "🇳🇱", name: "Olanda" },
  { code: "+32", flag: "🇧🇪", name: "Belgio" },
  { code: "+351", flag: "🇵🇹", name: "Portogallo" },
  { code: "+48", flag: "🇵🇱", name: "Polonia" },
  { code: "+30", flag: "🇬🇷", name: "Grecia" },
];

type Step = "phone" | "otp" | "success";

const VerifyPhone = () => {
  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+39");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if already verified
  useEffect(() => {
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_verified, phone_number")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.phone_verified) {
        navigate("/dashboard");
      }
    };
    checkVerification();
  }, [navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 6) {
      toast({
        title: "Errore",
        description: "Inserisci un numero di telefono valido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const fullPhone = `${countryCode}${phoneNumber.replace(/\s/g, "")}`;

    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phoneNumber: fullPhone },
      });

      if (error) throw error;

      toast({
        title: "Codice inviato! 📱",
        description: `SMS inviato a ${fullPhone}`,
      });
      setStep("otp");
      setResendCooldown(60);
      
      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      console.error("Send OTP error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare l'SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, "");
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast({
        title: "Errore",
        description: "Inserisci il codice completo a 6 cifre",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { otp: otpString },
      });

      if (error) throw error;

      setStep("success");
      toast({
        title: "Verificato! ✅",
        description: "Numero di telefono verificato con successo",
      });

      // Redirect after brief success display
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      toast({
        title: "Errore",
        description: error.message || "Codice non valido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    await handleSendOtp();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl shadow-card mb-2 overflow-hidden bg-card">
          <img src={saranoIcon} alt="sarano.ai" className="w-10 h-10 object-contain" />
        </div>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">
            {step === "phone" && "Verifica il tuo numero 📱"}
            {step === "otp" && "Inserisci il codice 🔢"}
            {step === "success" && "Verificato! ✅"}
          </CardTitle>
          <CardDescription>
            {step === "phone" && "Per la tua sicurezza, verifica il tuo numero di telefono"}
            {step === "otp" && "Abbiamo inviato un SMS con il codice di 6 cifre"}
            {step === "success" && "Il tuo numero è stato verificato con successo"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === "phone" && (
            <>
              <div className="space-y-2">
                <Label>Numero di telefono</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[100px] h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.code}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="123 456 7890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSendOtp}
                className="w-full h-12 bg-primary text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-pulse">Invio in corso...</span>
                ) : (
                  <>
                    Invia codice
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Questo numero sarà usato per la tua prova gratuita
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-mono"
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyOtp}
                className="w-full h-12 bg-primary text-primary-foreground"
                disabled={loading || otp.join("").length !== 6}
              >
                {loading ? (
                  <span className="animate-pulse">Verifica in corso...</span>
                ) : (
                  <>
                    Verifica
                    <Check className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  {resendCooldown > 0 ? `Rinvia tra ${resendCooldown}s` : "Rinvia codice"}
                </button>
              </div>

              <button
                onClick={() => setStep("phone")}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                ← Cambia numero
              </button>
            </>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <p className="text-muted-foreground">Reindirizzamento in corso...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyPhone;
