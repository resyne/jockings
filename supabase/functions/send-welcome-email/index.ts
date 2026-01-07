import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`[WELCOME-EMAIL] Sending to: ${email}`);

    const firstName = name || email.split('@')[0];

    const emailResponse = await resend.emails.send({
      from: "sarano.ai <welcome@sarano.ai>",
      to: [email],
      subject: "Benvenuto nella famiglia degli scherzi! 🎭",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0F0F0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding-bottom: 30px;">
                      <h1 style="color: #FFE12D; font-size: 32px; margin: 0; font-weight: bold;">
                        sarano.ai
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="background-color: #161616; border-radius: 16px; padding: 40px 30px;">
                      <h2 style="color: #FFFFFF; font-size: 24px; margin: 0 0 20px 0; text-align: center;">
                        Ciao ${firstName}! 👋
                      </h2>
                      
                      <p style="color: #D2D2D2; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                        Benvenuto nel club esclusivo di chi preferisce <span style="color: #FFE12D; font-weight: bold;">ridere prima e spiegare dopo</span>.
                      </p>
                      
                      <p style="color: #D2D2D2; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                        Hai appena sbloccato il potere di far squillare telefoni con voci AI che neanche tua nonna saprebbe distinguere da quelle vere.
                      </p>
                      
                      <div style="background-color: #1E1E1E; border-radius: 12px; padding: 20px; margin: 30px 0;">
                        <p style="color: #FF3B5C; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                          ⚠️ Disclaimer importante
                        </p>
                        <p style="color: #D2D2D2; font-size: 14px; line-height: 1.5; margin: 0; text-align: center; font-style: italic;">
                          Non ci assumiamo responsabilità per amicizie rovinate, pranzi di Natale imbarazzanti, 
                          o quel cugino che non ti parlerà più per sei mesi.
                        </p>
                      </div>
                      
                      <p style="color: #D2D2D2; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
                        Ma ehi, almeno avrai delle storie incredibili da raccontare. 🎤
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td align="center">
                            <a href="https://sarano.ai/dashboard" 
                               style="display: inline-block; background-color: #FFE12D; color: #0F0F0F; text-decoration: none; font-weight: bold; font-size: 16px; padding: 16px 32px; border-radius: 12px;">
                              Crea il tuo primo scherzo 🎭
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #7A7A7A; font-size: 13px; line-height: 1.5; margin: 30px 0 0 0; text-align: center;">
                        P.S. Se qualcuno ti chiede come hai fatto... tu non sai niente. 🤫
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding-top: 30px; text-align: center;">
                      <p style="color: #7A7A7A; font-size: 12px; margin: 0;">
                        © 2024 sarano.ai - Laugh first, explain later.
                      </p>
                      <p style="color: #7A7A7A; font-size: 11px; margin: 10px 0 0 0;">
                        Questa email è stata inviata perché ti sei registrato su sarano.ai.<br>
                        Se non sei stato tu... beh, qualcuno ha già iniziato a scherzerti.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("[WELCOME-EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[WELCOME-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
