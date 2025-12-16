import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const { email } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`[PASSWORD-RESET] Request for: ${email}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("[PASSWORD-RESET] Error listing users:", userError);
      throw new Error("Errore nel sistema");
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Don't reveal if user exists or not for security
      console.log("[PASSWORD-RESET] User not found, returning success anyway");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate secure token
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user.id);

    // Store the token
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[PASSWORD-RESET] Error inserting token:", insertError);
      throw new Error("Errore nel creare il token");
    }

    // Send email
    const resetUrl = `https://sarano.ai/reset-password?token=${token}`;
    const firstName = user.user_metadata?.username || email.split('@')[0];

    const emailResponse = await resend.emails.send({
      from: "sarano.ai <noreply@sarano.ai>",
      to: [email],
      subject: "Reimposta la tua password 🔐",
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
                        Ciao ${firstName}! 🔐
                      </h2>
                      
                      <p style="color: #D2D2D2; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                        Hai richiesto di reimpostare la tua password. Nessun problema, capita a tutti!
                      </p>
                      
                      <p style="color: #D2D2D2; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
                        Clicca il pulsante qui sotto per scegliere una nuova password:
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" 
                               style="display: inline-block; background-color: #FFE12D; color: #0F0F0F; text-decoration: none; font-weight: bold; font-size: 16px; padding: 16px 32px; border-radius: 12px;">
                              Reimposta Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <div style="background-color: #1E1E1E; border-radius: 12px; padding: 20px; margin: 30px 0;">
                        <p style="color: #FF3B5C; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                          ⚠️ Link valido per 1 ora
                        </p>
                        <p style="color: #D2D2D2; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
                          Se non hai richiesto tu questo reset, ignora questa email.<br>
                          La tua password rimarrà invariata.
                        </p>
                      </div>
                      
                      <p style="color: #7A7A7A; font-size: 13px; line-height: 1.5; margin: 30px 0 0 0; text-align: center;">
                        Se il pulsante non funziona, copia e incolla questo link nel browser:<br>
                        <a href="${resetUrl}" style="color: #42ACFF; word-break: break-all;">${resetUrl}</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding-top: 30px; text-align: center;">
                      <p style="color: #7A7A7A; font-size: 12px; margin: 0;">
                        © 2024 sarano.ai - Laugh first, explain later.
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

    console.log("[PASSWORD-RESET] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[PASSWORD-RESET] Error:", error);
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
