import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsAndConditions = () => {
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Termini e Condizioni di Utilizzo</h1>
          <p className="text-lg text-primary font-semibold">Sarano AI</p>

          <h2>1. Accettazione dei Termini</h2>
          <p>
            L'accesso e l'utilizzo dell'applicazione web Sarano AI comportano l'accettazione integrale dei presenti Termini e Condizioni.
            Qualora l'utente non intenda accettarli, è tenuto a non utilizzare il servizio.
          </p>

          <h2>2. Descrizione del Servizio</h2>
          <p>
            Sarano AI fornisce strumenti basati su intelligenza artificiale per la simulazione di interazioni vocali a scopo ludico e di intrattenimento.
          </p>
          <p>Il servizio non è destinato a:</p>
          <ul>
            <li>comunicazioni professionali;</li>
            <li>servizi di emergenza;</li>
            <li>telemarketing;</li>
            <li>attività informative, istituzionali o commerciali reali.</li>
          </ul>
          <p>
            Sarano AI non garantisce che le interazioni generate riflettano la realtà o producano risultati accurati, coerenti o veritieri.
          </p>

          <h2>3. Requisiti dell'Utente</h2>
          <p>L'utente dichiara e garantisce di:</p>
          <ul>
            <li>avere almeno 18 anni compiuti;</li>
            <li>utilizzare il servizio nel rispetto delle leggi applicabili;</li>
            <li>assumersi piena responsabilità per ogni utilizzo del servizio e per le interazioni generate;</li>
            <li>non utilizzare il servizio in modo abusivo, illecito o lesivo di diritti altrui.</li>
          </ul>

          <h2>4. Uso del Servizio e Contesto Ludico</h2>
          <p>Sarano AI è progettato per la simulazione di chiamate a carattere ludico, ironico o scherzoso.</p>
          <p>L'utente riconosce e accetta che:</p>
          <ul>
            <li>le interazioni possono avvenire in assenza di consenso preventivo, esclusivamente in un contesto di scherzo leggero e non offensivo;</li>
            <li>il destinatario non deve essere indotto a credere di trovarsi in situazioni di pericolo, emergenza, obbligo legale, sanzioni o conseguenze reali;</li>
            <li>qualora il destinatario manifesti disagio, dissenso, richiesta di interruzione o rifiuto esplicito, l'utente è obbligato a interrompere immediatamente l'interazione.</li>
          </ul>
          <p>È in ogni caso vietato utilizzare il servizio per:</p>
          <ul>
            <li>molestie reiterate o insistenti;</li>
            <li>intimidazioni o minacce;</li>
            <li>simulazioni di eventi gravi, plausibilmente dannosi o ingannevoli;</li>
            <li>contatti ripetuti verso soggetti che abbiano espresso rifiuto.</li>
          </ul>
          <p>La responsabilità per il rispetto di tali limiti ricade esclusivamente sull'utente.</p>

          <h2>5. Obbligo di Trasparenza sull'Utilizzo dell'IA</h2>
          <p>
            L'utente si impegna a non celare intenzionalmente la natura artificiale della comunicazione qualora ciò sia richiesto dalle normative applicabili.
          </p>
          <p>
            Il destinatario non deve essere indotto a credere di interagire con una persona reale in contesti che possano risultare ingannevoli, dannosi o contrari alla legge.
          </p>

          <h2>6. Divieto di Impersonificazione</h2>
          <p>È severamente vietato utilizzare Sarano AI per:</p>
          <ul>
            <li>impersonare persone reali identificabili;</li>
            <li>impersonare celebrità, personaggi pubblici o privati;</li>
            <li>simulare enti pubblici, forze dell'ordine, autorità, aziende o organizzazioni reali;</li>
            <li>indurre il destinatario a credere di interagire con soggetti reali o istituzionali.</li>
          </ul>
          <p>
            La violazione di tali divieti comporta la sospensione immediata o la chiusura dell'account, fatta salva ogni ulteriore azione prevista dalla legge.
          </p>

          <h2>7. Registrazione delle Comunicazioni</h2>
          <p>
            L'utente riconosce che le interazioni vocali generate tramite Sarano AI possono essere registrate, archiviate o rese disponibili all'utente stesso.
          </p>
          <p>L'utente è l'unico responsabile del rispetto delle normative applicabili in materia di:</p>
          <ul>
            <li>registrazione delle comunicazioni;</li>
            <li>tutela della privacy;</li>
            <li>informazione e consenso del destinatario, ove richiesto.</li>
          </ul>
          <p>
            Sarano AI non verifica né garantisce che l'utente abbia ottenuto i consensi eventualmente necessari.
            Qualsiasi utilizzo illecito delle registrazioni è imputabile esclusivamente all'utente.
          </p>

          <h2>8. Proprietà Intellettuale</h2>
          <p>
            Tutti i contenuti, il software, i modelli di intelligenza artificiale, i marchi e gli elementi grafici utilizzati da Sarano AI sono protetti da diritti di proprietà intellettuale.
          </p>
          <p>È vietata qualsiasi forma di:</p>
          <ul>
            <li>copia;</li>
            <li>modifica;</li>
            <li>distribuzione;</li>
            <li>reverse engineering;</li>
            <li>utilizzo non autorizzato.</li>
          </ul>

          <h2>9. Limitazione di Responsabilità e Disclaimer Tecnico</h2>
          <p>Il servizio è fornito "così com'è", senza garanzie espresse o implicite.</p>
          <p>Nei limiti massimi consentiti dalla legge:</p>
          <ul>
            <li>Sarano AI non garantisce l'assenza di errori, interruzioni o comportamenti imprevisti dell'IA;</li>
            <li>Sarano AI non è responsabile per danni diretti o indiretti derivanti dall'uso del servizio;</li>
            <li>le interazioni generate dall'IA sono frutto di elaborazioni probabilistiche e possono risultare incoerenti o inappropriate;</li>
            <li>ogni conseguenza legale derivante dalle chiamate è esclusiva responsabilità dell'utente.</li>
          </ul>
          <p>L'utente si impegna a interrompere l'utilizzo del servizio qualora rilevi comportamenti indesiderati o non conformi.</p>

          <h2>10. Sospensione e Interruzione del Servizio</h2>
          <p>Sarano AI si riserva il diritto di:</p>
          <ul>
            <li>sospendere o interrompere l'accesso al servizio;</li>
            <li>bloccare chiamate in corso;</li>
            <li>limitare o disabilitare account;</li>
          </ul>
          <p>in caso di:</p>
          <ul>
            <li>violazione dei presenti Termini;</li>
            <li>segnalazioni di abuso;</li>
            <li>richieste da parte di autorità competenti;</li>
            <li>rischi legali, tecnici o reputazionali per la piattaforma,</li>
          </ul>
          <p>anche senza preavviso.</p>

          <h2>11. Ambito Territoriale e Normativo</h2>
          <p>
            L'utente è responsabile di verificare che l'utilizzo del servizio sia conforme alle leggi vigenti nel Paese del destinatario della chiamata.
          </p>
          <p>
            Sarano AI non garantisce la liceità del servizio in tutte le giurisdizioni e declina ogni responsabilità per utilizzi non conformi alle normative locali.
          </p>

          <h2>12. Manleva</h2>
          <p>L'utente accetta di manlevare e tenere indenne Sarano AI da qualsiasi reclamo, sanzione, responsabilità, danno o costo derivante da:</p>
          <ul>
            <li>uso illecito o improprio del servizio;</li>
            <li>violazione dei presenti Termini;</li>
            <li>violazione di leggi o diritti di terzi.</li>
          </ul>

          <h2>13. Modifiche ai Termini</h2>
          <p>
            Sarano AI si riserva il diritto di modificare i presenti Termini in qualsiasi momento.
            L'uso continuato del servizio dopo la pubblicazione delle modifiche costituisce accettazione delle nuove condizioni.
          </p>

          <h2>14. Legge Applicabile e Foro Competente</h2>
          <p>
            I presenti Termini sono regolati dalla legge italiana.
            Per ogni controversia sarà competente il Foro di Torre Annunziata, fatto salvo quanto previsto dalle norme inderogabili a tutela del consumatore.
          </p>

          <h2>15. Privacy</h2>
          <p>
            Il trattamento dei dati personali avviene secondo quanto descritto nella{" "}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            di Sarano AI, che l'utente dichiara di aver visionato e compreso.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
