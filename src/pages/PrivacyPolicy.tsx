import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/auth?mode=signup">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla registrazione
          </Button>
        </Link>

        <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-lg text-primary font-semibold">Sarano AI</p>
          <p className="text-muted-foreground">Ultimo aggiornamento: 21 dicembre 2025</p>

          <h2>1. Titolare del Trattamento</h2>
          <p>Il Titolare del trattamento dei dati personali è:</p>
          <p>
            <strong>Sarano AI</strong><br />
            Sede legale: Via Piaia 44, 67034 Pettorano sul Gizio (AQ) – Italy<br />
            Email di contatto: <a href="mailto:prank@sarano.ai" className="text-primary">prank@sarano.ai</a>
          </p>

          <h2>2. Tipologie di Dati Trattati</h2>
          <p>Sarano AI tratta le seguenti categorie di dati personali:</p>
          
          <h3>Dati forniti dall'utente</h3>
          <ul>
            <li>nome e/o nickname;</li>
            <li>indirizzo email;</li>
            <li>numero di telefono;</li>
            <li>credenziali di accesso;</li>
            <li>dati inseriti per la creazione delle interazioni vocali.</li>
          </ul>

          <h3>Dati relativi all'utilizzo del servizio</h3>
          <ul>
            <li>log di accesso;</li>
            <li>timestamp delle attività;</li>
            <li>dati tecnici relativi alle chiamate effettuate;</li>
            <li>stato delle interazioni (avviata, terminata, interrotta).</li>
          </ul>

          <h3>Dati vocali</h3>
          <ul>
            <li>contenuti vocali generati dall'intelligenza artificiale;</li>
            <li>eventuali registrazioni delle interazioni, se abilitate dall'utente.</li>
          </ul>

          <h3>Dati tecnici</h3>
          <ul>
            <li>indirizzo IP;</li>
            <li>tipo di dispositivo e browser;</li>
            <li>sistema operativo;</li>
            <li>cookie e tecnologie simili (vedi Cookie Policy).</li>
          </ul>

          <h2>3. Finalità del Trattamento</h2>
          <p>I dati personali sono trattati per le seguenti finalità:</p>

          <h3>a) Erogazione del servizio</h3>
          <ul>
            <li>registrazione e gestione dell'account;</li>
            <li>utilizzo delle funzionalità di Sarano AI;</li>
            <li>gestione tecnica delle chiamate e delle interazioni vocali.</li>
          </ul>
          <p><em>Base giuridica: esecuzione del contratto (art. 6.1.b GDPR).</em></p>

          <h3>b) Sicurezza e prevenzione abusi</h3>
          <ul>
            <li>prevenzione di utilizzi illeciti o abusivi;</li>
            <li>gestione di segnalazioni;</li>
            <li>rispetto degli obblighi legali.</li>
          </ul>
          <p><em>Base giuridica: legittimo interesse del Titolare (art. 6.1.f GDPR).</em></p>

          <h3>c) Adempimenti legali</h3>
          <ul>
            <li>obblighi fiscali, contabili o normativi;</li>
            <li>richieste delle autorità competenti.</li>
          </ul>
          <p><em>Base giuridica: obbligo legale (art. 6.1.c GDPR).</em></p>

          <h3>d) Comunicazioni promozionali (facoltative)</h3>
          <ul>
            <li>invio di email informative, promozionali o di aggiornamento sul servizio.</li>
          </ul>
          <p>
            <em>Base giuridica: consenso dell'utente (art. 6.1.a GDPR).</em><br />
            Il consenso è facoltativo e revocabile in qualsiasi momento.
          </p>

          <h2>4. Modalità del Trattamento</h2>
          <p>Il trattamento avviene mediante strumenti informatici e telematici, nel rispetto dei principi di:</p>
          <ul>
            <li>liceità;</li>
            <li>correttezza;</li>
            <li>trasparenza;</li>
            <li>minimizzazione dei dati;</li>
            <li>sicurezza.</li>
          </ul>
          <p>Sarano AI adotta misure tecniche e organizzative adeguate a garantire la protezione dei dati personali.</p>

          <h2>5. Registrazione delle Comunicazioni Vocali</h2>
          <p>L'utente riconosce che:</p>
          <ul>
            <li>le interazioni vocali possono essere registrate, ove previsto dal servizio;</li>
            <li>l'utente è responsabile del rispetto delle normative applicabili in materia di registrazione delle comunicazioni;</li>
            <li>Sarano AI non verifica l'esistenza del consenso del destinatario alla registrazione.</li>
          </ul>
          <p>L'uso illecito delle registrazioni è imputabile esclusivamente all'utente.</p>

          <h2>6. Conservazione dei Dati</h2>
          <p>I dati personali sono conservati:</p>
          <ul>
            <li>per il tempo necessario all'erogazione del servizio;</li>
            <li>per il periodo richiesto da obblighi di legge;</li>
            <li>fino alla richiesta di cancellazione dell'account, ove compatibile con obblighi normativi.</li>
          </ul>
          <p>I dati relativi alle comunicazioni promozionali sono trattati fino alla revoca del consenso.</p>

          <h2>7. Comunicazione e Trasferimento dei Dati</h2>
          <p>I dati possono essere comunicati a:</p>
          <ul>
            <li>fornitori di servizi tecnologici (es. hosting, servizi di comunicazione);</li>
            <li>provider di servizi vocali e di intelligenza artificiale;</li>
            <li>soggetti autorizzati per obblighi di legge.</li>
          </ul>
          <p>I dati non sono diffusi.</p>
          <p>
            Qualora i dati siano trasferiti verso Paesi extra-UE, il trasferimento avverrà nel rispetto delle garanzie previste dal GDPR, incluse le Clausole Contrattuali Standard.
          </p>

          <h2>8. Diritti dell'Interessato</h2>
          <p>L'utente ha il diritto di:</p>
          <ul>
            <li>accedere ai propri dati personali;</li>
            <li>richiederne la rettifica o la cancellazione;</li>
            <li>limitarne il trattamento;</li>
            <li>opporsi al trattamento;</li>
            <li>richiedere la portabilità dei dati;</li>
            <li>revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento precedente.</li>
          </ul>
          <p>
            Le richieste possono essere inviate a: <a href="mailto:prank@sarano.ai" className="text-primary">prank@sarano.ai</a>
          </p>

          <h2>9. Cookie</h2>
          <p>
            Sarano AI utilizza cookie tecnici necessari al funzionamento del sito e, previo consenso, cookie analitici e di marketing.
          </p>
          <p>Per maggiori informazioni si rimanda alla Cookie Policy dedicata.</p>

          <h2>10. Modifiche alla Privacy Policy</h2>
          <p>
            La presente Privacy Policy può essere soggetta a modifiche.
            Gli utenti saranno informati tramite il sito o altri canali appropriati.
          </p>

          <h2>11. Autorità di Controllo</h2>
          <p>
            L'utente ha il diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (
            <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-primary">
              www.garanteprivacy.it
            </a>
            ) o all'autorità competente del proprio Stato.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
