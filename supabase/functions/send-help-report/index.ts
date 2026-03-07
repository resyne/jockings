import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "stanislaoelefante@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, message, email, userEmail, userId, url, userAgent } = await req.json();

    if (!category || !message) {
      throw new Error("Category and message are required");
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const categoryLabels: Record<string, string> = {
      bug: "🐛 Bug / Errore",
      suggestion: "💡 Suggerimento",
      payment: "💳 Problema pagamento",
      other: "❓ Altro",
    };

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">📩 Nuova segnalazione da Sarano</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Categoria</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${categoryLabels[category] || category}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email contatto</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email || "Non fornita"}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email account</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${userEmail || "Non loggato"}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">User ID</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${userId || "N/A"}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Pagina</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${url || "N/A"}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Browser</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${userAgent || "N/A"}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
          <strong>Messaggio:</strong>
          <p style="white-space: pre-wrap; margin-top: 8px;">${message}</p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sarano Help <noreply@sarano.ai>",
        to: [ADMIN_EMAIL],
        subject: `[Sarano] ${categoryLabels[category] || category} - Segnalazione utente`,
        html: htmlBody,
        reply_to: email || userEmail || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      throw new Error(data?.message || "Failed to send email");
    }

    console.log("Help report sent successfully:", data.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Send help report error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
