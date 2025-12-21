import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ShieldX, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import saranoWordmarkIcon from "@/assets/sarano-wordmark-icon.png";

const BlockAndReport = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("block");
  
  // Block form state
  const [blockPhone, setBlockPhone] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockSuccess, setBlockSuccess] = useState(false);
  
  // Report form state
  const [reportPhone, setReportPhone] = useState("");
  const [callDate, setCallDate] = useState("");
  const [callTime, setCallTime] = useState("");
  const [prankSubject, setPrankSubject] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\s+/g, "").replace(/-/g, "");
    if (!cleaned.startsWith("+")) {
      if (cleaned.startsWith("00")) {
        cleaned = "+" + cleaned.substring(2);
      } else if (cleaned.startsWith("0")) {
        cleaned = "+39" + cleaned.substring(1);
      } else if (cleaned.match(/^3\d{9}$/)) {
        cleaned = "+39" + cleaned;
      }
    }
    return cleaned;
  };

  const handleBlock = async () => {
    if (!blockPhone.trim()) {
      toast.error("Inserisci il tuo numero di telefono");
      return;
    }

    setIsBlocking(true);
    try {
      const formattedPhone = formatPhoneNumber(blockPhone);
      
      const { error } = await supabase
        .from("blocked_phone_numbers")
        .insert({
          phone_number: formattedPhone,
          reason: blockReason || null
        });

      if (error) {
        if (error.code === "23505") {
          toast.info("Questo numero è già nella lista di blocco");
          setBlockSuccess(true);
        } else {
          throw error;
        }
      } else {
        setBlockSuccess(true);
        toast.success("Numero bloccato con successo");
      }
    } catch (error) {
      console.error("Error blocking number:", error);
      toast.error("Errore durante il blocco. Riprova.");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleReport = async () => {
    if (!reportPhone.trim() || !callDate) {
      toast.error("Inserisci il tuo numero e la data della chiamata");
      return;
    }

    setIsReporting(true);
    try {
      const formattedPhone = formatPhoneNumber(reportPhone);
      
      const { error } = await supabase
        .from("abuse_reports")
        .insert({
          reporter_phone: formattedPhone,
          call_date: callDate,
          call_time: callTime || null,
          prank_subject: prankSubject || null,
          additional_details: additionalDetails || null
        });

      if (error) throw error;

      setReportSuccess(true);
      toast.success("Segnalazione inviata con successo");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Errore durante l'invio. Riprova.");
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/inizia")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Torna indietro</span>
        </button>
        <img 
          src={saranoWordmarkIcon} 
          alt="sarano.ai" 
          className="h-6"
        />
        <div className="w-24" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Segnala e Blocca
            </h1>
            <p className="text-muted-foreground">
              Blocca le chiamate al tuo numero o segnala un abuso
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="block" className="flex items-center gap-2">
                <ShieldX className="w-4 h-4" />
                Blocca
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Segnala
              </TabsTrigger>
            </TabsList>

            <TabsContent value="block">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Blocca chiamate al tuo numero</CardTitle>
                  <CardDescription>
                    Se non desideri ricevere scherzi telefonici da Sarano.ai, inserisci il tuo numero per bloccare le chiamate future.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {blockSuccess ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Numero bloccato!</h3>
                      <p className="text-muted-foreground text-sm">
                        Non riceverai più chiamate da Sarano.ai su questo numero.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="blockPhone">Il tuo numero di telefono</Label>
                        <Input
                          id="blockPhone"
                          type="tel"
                          placeholder="+39 333 1234567"
                          value={blockPhone}
                          onChange={(e) => setBlockPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="blockReason">Motivo (opzionale)</Label>
                        <Textarea
                          id="blockReason"
                          placeholder="Perché vuoi bloccare le chiamate?"
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button 
                        onClick={handleBlock} 
                        disabled={isBlocking}
                        className="w-full"
                      >
                        {isBlocking ? "Blocco in corso..." : "Blocca il mio numero"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Segnala un abuso</CardTitle>
                  <CardDescription>
                    Se ritieni di aver ricevuto una chiamata inappropriata, compila questo modulo per segnalarla. Analizzeremo il caso.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reportSuccess ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Segnalazione inviata!</h3>
                      <p className="text-muted-foreground text-sm">
                        Grazie per la segnalazione. Analizzeremo il caso e prenderemo provvedimenti se necessario.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="reportPhone">Il tuo numero di telefono *</Label>
                        <Input
                          id="reportPhone"
                          type="tel"
                          placeholder="+39 333 1234567"
                          value={reportPhone}
                          onChange={(e) => setReportPhone(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="callDate">Data chiamata *</Label>
                          <Input
                            id="callDate"
                            type="date"
                            value={callDate}
                            onChange={(e) => setCallDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="callTime">Ora (circa)</Label>
                          <Input
                            id="callTime"
                            type="time"
                            value={callTime}
                            onChange={(e) => setCallTime(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prankSubject">Oggetto dello scherzo</Label>
                        <Input
                          id="prankSubject"
                          placeholder="Es. finta vincita alla lotteria"
                          value={prankSubject}
                          onChange={(e) => setPrankSubject(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="additionalDetails">Dettagli aggiuntivi</Label>
                        <Textarea
                          id="additionalDetails"
                          placeholder="Descrivi cosa è successo e perché ritieni sia stato un abuso..."
                          value={additionalDetails}
                          onChange={(e) => setAdditionalDetails(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <Button 
                        onClick={handleReport} 
                        disabled={isReporting}
                        className="w-full"
                      >
                        {isReporting ? "Invio in corso..." : "Invia segnalazione"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Le segnalazioni ci aiutano a mantenere la piattaforma sicura e rispettosa.
          </p>
        </div>
      </main>
    </div>
  );
};

export default BlockAndReport;
