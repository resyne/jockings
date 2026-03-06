// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "stanislaoelefante@gmail.com";

async function sendResendEmail(params: { to: string; subject: string; html: string }) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "sarano.ai <welcome@sarano.ai>",
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message || data?.error || `Resend error: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    console.log(`[NOTIFY-ADMIN] Type: ${type}`, data);

    let subject = "";
    let html = "";

    if (type === "new_user") {
      subject = `🆕 Nuovo utente registrato: ${data.email}`;
      html = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #FFE12D; background: #0F0F0F; padding: 16px; border-radius: 8px;">
            Nuovo utente registrato su Sarano.ai
          </h2>
          <table style="border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${data.email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Nome:</td><td style="padding: 8px;">${data.name || '-'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Data:</td><td style="padding: 8px;">${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}</td></tr>
          </table>
        </div>
      `;
    } else if (type === "purchase") {
      subject = `💰 Nuovo acquisto: ${data.packageType} da ${data.email}`;
      html = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #4CAF50; background: #0F0F0F; padding: 16px; border-radius: 8px;">
            Nuovo acquisto su Sarano.ai
          </h2>
          <table style="border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${data.email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Pacchetto:</td><td style="padding: 8px;">${data.packageType}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Prank aggiunti:</td><td style="padding: 8px;">${data.pranksAdded}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Importo:</td><td style="padding: 8px;">€${data.amountPaid || '-'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Data:</td><td style="padding: 8px;">${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}</td></tr>
          </table>
        </div>
      `;
    } else {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const result = await sendResendEmail({ to: ADMIN_EMAIL, subject, html });
    console.log("[NOTIFY-ADMIN] Email sent:", result);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[NOTIFY-ADMIN] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
