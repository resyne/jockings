import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AbuseReportRequest {
  reportId: string;
  reporterPhone: string;
  callDate: string;
  callTime?: string;
  prankSubject?: string;
  additionalDetails?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      reportId,
      reporterPhone, 
      callDate, 
      callTime, 
      prankSubject, 
      additionalDetails 
    }: AbuseReportRequest = await req.json();

    console.log("=== SENDING ABUSE REPORT NOTIFICATION ===");
    console.log(`Report ID: ${reportId}`);
    console.log(`Reporter phone: ${reporterPhone}`);

    const emailHtml = `
      <h1>🚨 Nuova Segnalazione di Abuso</h1>
      
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">ID Segnalazione</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${reportId}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Numero Segnalante</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${reporterPhone}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Data Chiamata</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${callDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Ora Chiamata</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${callTime || 'Non specificata'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Oggetto Scherzo</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${prankSubject || 'Non specificato'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Dettagli Aggiuntivi</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${additionalDetails || 'Nessuno'}</td>
        </tr>
      </table>
      
      <p style="margin-top: 20px;">
        <a href="https://sarano.ai/admin/abuse-reports" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Gestisci Segnalazione
        </a>
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Questa email è stata generata automaticamente da Sarano.ai
      </p>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Sarano.ai <noreply@sarano.ai>",
        to: ["prank@sarano.ai"],
        subject: `🚨 Nuova Segnalazione Abuso - ${reporterPhone}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending abuse report notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
