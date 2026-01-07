import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentRule {
  category: string;
  keywords: string[];
  block_message: string;
  is_active: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prankTheme, realDetail, language } = await req.json();
    
    const contentToCheck = `${prankTheme || ''} ${realDetail || ''}`.trim();
    
    if (!contentToCheck || contentToCheck.length < 10) {
      return new Response(JSON.stringify({ 
        approved: true, 
        message: 'Contenuto approvato',
        needsMoreDetail: contentToCheck.length < 20
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['ai_content_checker_enabled', 'ai_content_checker_use_ai']);

    let checkerEnabled = true;
    let useAI = true;

    if (settings) {
      settings.forEach((s: { key: string; value: string }) => {
        if (s.key === 'ai_content_checker_enabled') checkerEnabled = s.value === 'true';
        if (s.key === 'ai_content_checker_use_ai') useAI = s.value === 'true';
      });
    }

    // If checker is disabled, approve everything
    if (!checkerEnabled) {
      console.log('Content checker is disabled, approving by default');
      return new Response(JSON.stringify({ 
        approved: true, 
        message: 'Contenuto approvato'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch active rules from database
    const { data: rules, error: rulesError } = await supabase
      .from('prank_content_rules')
      .select('category, keywords, block_message, is_active')
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching rules:', rulesError);
    }

    // Check keywords from database rules
    const lowerText = contentToCheck.toLowerCase();
    
    if (rules && rules.length > 0) {
      for (const rule of rules as ContentRule[]) {
        for (const keyword of rule.keywords) {
          if (lowerText.includes(keyword.toLowerCase())) {
            console.log('Blocked by keyword check:', rule.category, keyword);
            return new Response(JSON.stringify({ 
              approved: false, 
              blocked: true,
              category: rule.category,
              message: rule.block_message
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }

    // If AI analysis is disabled, approve after keyword check
    if (!useAI) {
      return new Response(JSON.stringify({ 
        approved: true, 
        message: 'Contenuto approvato'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // AI analysis for more subtle cases
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not set, approving by default');
      return new Response(JSON.stringify({ 
        approved: true, 
        message: 'Contenuto approvato'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Sei un moderatore di contenuti per un'app di scherzi telefonici. Devi analizzare la descrizione di uno scherzo e determinare se è appropriato.

BLOCCA IMMEDIATAMENTE se lo scherzo:
1. Simula eventi gravi o traumatici (morte, incidenti, ricoveri, arresti, suicidio, rapimenti, malattie gravi, incendi, esplosioni)
2. Richiede denaro, dati bancari, password, codici OTP, documenti personali
3. Contiene minacce, intimidazioni o pressioni psicologiche
4. Usa linguaggio violento, riferimenti a droghe, abusi o contenuti sessualmente espliciti
5. Impersona autorità (polizia, carabinieri, guardia di finanza, medici con notizie gravi)

APPROVA se lo scherzo è:
- Innocuo e divertente
- Non causa traumi psicologici
- Non simula emergenze reali
- Non richiede azioni pericolose al destinatario

Rispondi SOLO con un JSON nel formato:
{"approved": boolean, "blocked": boolean, "reason": "breve spiegazione", "category": "TRAUMA|SCAM|THREATS|SENSITIVE|NONE", "needsMoreDetail": boolean}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analizza questo scherzo:\n\nTema: ${prankTheme}\nDettagli personalizzati: ${realDetail || 'Nessuno'}\n\nLingua dello scherzo: ${language || 'Italiano'}` }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status);
      return new Response(JSON.stringify({ 
        approved: true, 
        message: 'Contenuto approvato'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse AI response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.blocked || parsed.approved === false) {
          // Find the matching rule message from database, or use AI reason
          let blockMessage = parsed.reason || 'Contenuto non appropriato per uno scherzo telefonico.';
          
          if (rules && parsed.category) {
            const matchingRule = (rules as ContentRule[]).find(r => r.category === parsed.category);
            if (matchingRule) {
              blockMessage = matchingRule.block_message;
            }
          }
          
          return new Response(JSON.stringify({ 
            approved: false, 
            blocked: true,
            category: parsed.category || 'SENSITIVE',
            message: blockMessage,
            aiReason: parsed.reason
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          approved: true,
          needsMoreDetail: parsed.needsMoreDetail || false,
          message: parsed.needsMoreDetail ? 'Lo scherzo potrebbe beneficiare di più dettagli per essere più efficace.' : 'Contenuto approvato'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    // Default to approved if parsing fails
    return new Response(JSON.stringify({ 
      approved: true, 
      message: 'Contenuto approvato'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-prank-content:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      approved: true // Fail open to not block users on errors
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
