import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOCKED_CATEGORIES = {
  TRAUMA: {
    keywords: ['morte', 'morto', 'morta', 'decesso', 'incidente', 'ospedale', 'ricovero', 'arresto', 'arrestato', 'suicidio', 'rapimento', 'rapito', 'malattia grave', 'cancro', 'tumore', 'incendio', 'esplosione', 'bomba'],
    message: 'Questo scherzo simula eventi traumatici o gravi che potrebbero causare forte stress psicologico. Non è consentito.'
  },
  SCAM: {
    keywords: ['pagamento', 'bonifico', 'iban', 'carta di credito', 'otp', 'codice', 'password', 'pin', 'documenti', 'documento', 'soldi urgenti', 'versamento'],
    message: 'Questo scherzo potrebbe essere interpretato come una truffa. Richieste di denaro o dati personali non sono consentite.'
  },
  THREATS: {
    keywords: ['minaccia', 'minaccio', 'conseguenze', 'ti faccio', 'ti succede', 'ti ammazzo', 'ti uccido', 'ti picchio', 'te la faccio pagare'],
    message: 'Questo scherzo contiene minacce o intimidazioni. Non è consentito.'
  },
  SENSITIVE: {
    keywords: ['sangue', 'droga', 'violenza', 'stupro', 'abuso'],
    message: 'Questo scherzo contiene contenuti sensibili o potenzialmente traumatici. Non è consentito.'
  }
};

function checkKeywords(text: string): { blocked: boolean; category: string; message: string } | null {
  const lowerText = text.toLowerCase();
  
  for (const [category, data] of Object.entries(BLOCKED_CATEGORIES)) {
    for (const keyword of data.keywords) {
      if (lowerText.includes(keyword)) {
        return { blocked: true, category, message: data.message };
      }
    }
  }
  return null;
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

    // First, quick keyword check
    const keywordResult = checkKeywords(contentToCheck);
    if (keywordResult) {
      console.log('Blocked by keyword check:', keywordResult.category);
      return new Response(JSON.stringify({ 
        approved: false, 
        blocked: true,
        category: keywordResult.category,
        message: keywordResult.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Then, AI analysis for more subtle cases
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
      // Fallback to approved if AI fails
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
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.blocked || parsed.approved === false) {
          const messages: Record<string, string> = {
            TRAUMA: 'Questo scherzo simula eventi traumatici o gravi. Non è consentito per proteggere il benessere psicologico del destinatario.',
            SCAM: 'Questo scherzo potrebbe essere interpretato come una truffa. Richieste di denaro o dati personali non sono consentite.',
            THREATS: 'Questo scherzo contiene elementi intimidatori o minacciosi. Non è consentito.',
            SENSITIVE: 'Questo scherzo contiene contenuti sensibili o potenzialmente dannosi. Non è consentito.'
          };
          
          return new Response(JSON.stringify({ 
            approved: false, 
            blocked: true,
            category: parsed.category || 'SENSITIVE',
            message: messages[parsed.category] || parsed.reason || 'Contenuto non appropriato per uno scherzo telefonico.',
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
      status: 200, // Return 200 even on error to not break flow
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
