import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/inizia">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla home
          </Button>
        </Link>

        <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Cookie Policy</h1>
          <p className="text-lg text-primary font-semibold">Sarano AI</p>
          <p className="text-muted-foreground">Ultimo aggiornamento: 21 dicembre 2025</p>

          <h2>1. Cosa sono i cookie</h2>
          <p>
            I cookie sono piccoli file di testo che i siti web visitati dall'utente inviano al suo dispositivo, 
            dove vengono memorizzati per essere poi ritrasmessi agli stessi siti alla visita successiva.
          </p>
          <p>
            Sarano AI utilizza cookie e tecnologie simili per garantire il corretto funzionamento del sito e, 
            previo consenso, per analisi statistiche e finalità di marketing.
          </p>

          <h2>2. Tipologie di cookie utilizzati</h2>

          <h3>🟢 Cookie tecnici (necessari)</h3>
          <p>Questi cookie sono indispensabili per il funzionamento del sito e non richiedono il consenso dell'utente.</p>
          <p>Servono, ad esempio, a:</p>
          <ul>
            <li>consentire l'accesso all'area riservata;</li>
            <li>mantenere la sessione attiva;</li>
            <li>garantire la sicurezza del servizio;</li>
            <li>ricordare preferenze tecniche.</li>
          </ul>
          <p><em>Base giuridica: legittimo interesse del Titolare (art. 6.1.f GDPR).</em></p>

          <h3>🟡 Cookie analitici (facoltativi)</h3>
          <p>
            Questi cookie consentono di raccogliere informazioni in forma aggregata e anonima sull'utilizzo del sito, 
            al fine di migliorarne prestazioni e contenuti.
          </p>
          <p>Esempi di utilizzo:</p>
          <ul>
            <li>analisi delle pagine visitate;</li>
            <li>monitoraggio delle performance;</li>
            <li>statistiche di utilizzo.</li>
          </ul>
          <p>Questi cookie vengono installati solo previo consenso dell'utente.</p>
          <p><em>Base giuridica: consenso dell'utente (art. 6.1.a GDPR).</em></p>

          <h3>🔴 Cookie di marketing e profilazione (facoltativi)</h3>
          <p>Questi cookie sono utilizzati per:</p>
          <ul>
            <li>mostrare contenuti promozionali personalizzati;</li>
            <li>effettuare attività di remarketing;</li>
            <li>misurare l'efficacia delle campagne pubblicitarie.</li>
          </ul>
          <p>Vengono installati solo previo consenso esplicito dell'utente.</p>
          <p><em>Base giuridica: consenso dell'utente (art. 6.1.a GDPR).</em></p>

          <h2>3. Cookie di terze parti</h2>
          <p>
            Sarano AI può utilizzare servizi forniti da terze parti che installano cookie propri 
            (es. strumenti di analisi, piattaforme pubblicitarie).
          </p>
          <p>Tali soggetti agiscono come titolari autonomi del trattamento dei dati raccolti tramite i propri cookie.</p>
          <p>L'elenco aggiornato delle terze parti è consultabile attraverso il pannello di gestione delle preferenze cookie.</p>

          <h2>4. Gestione del consenso</h2>
          <p>Al primo accesso al sito, l'utente visualizza un banner cookie che consente di:</p>
          <ul>
            <li>accettare tutti i cookie;</li>
            <li>rifiutare i cookie non necessari;</li>
            <li>gestire le preferenze in modo granulare.</li>
          </ul>
          <p>
            L'utente può modificare o revocare il consenso in qualsiasi momento tramite l'apposito 
            link "Gestisci cookie" presente nel footer del sito.
          </p>

          <h2>5. Come disabilitare i cookie dal browser</h2>
          <p>
            L'utente può inoltre gestire o disabilitare i cookie direttamente dalle impostazioni del proprio browser.
            La disabilitazione dei cookie tecnici potrebbe compromettere il corretto funzionamento del sito.
          </p>

          <h2>6. Trasferimento dei dati</h2>
          <p>
            Qualora i cookie comportino il trasferimento di dati verso Paesi extra-UE, tale trasferimento 
            avverrà nel rispetto delle garanzie previste dal GDPR, incluse le Clausole Contrattuali Standard.
          </p>

          <h2>7. Titolare del Trattamento</h2>
          <p>
            <strong>Sarano AI</strong><br />
            Sede legale: Via Piaia 44, 67034 Pettorano sul Gizio (AQ) – Italy<br />
            Email di contatto: <a href="mailto:prank@sarano.ai" className="text-primary">prank@sarano.ai</a>
          </p>

          <h2>8. Modifiche alla Cookie Policy</h2>
          <p>
            La presente Cookie Policy può essere soggetta a modifiche.
            Gli utenti saranno informati tramite il sito o altri canali appropriati.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
