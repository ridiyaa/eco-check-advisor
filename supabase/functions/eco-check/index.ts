import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuestionnaireAnswers {
  tip_objekta: string;
  broj_clanova: string;
  najveci_trosak: string;
  dvoriste: string;
  glavni_cilj: string;
  eco_score: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers } = (await req.json()) as { answers: QuestionnaireAnswers };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Ti si EcoCheck AI savetnik za održivost iz kompanije EcoSense Market.
    
You MUST return ONLY valid JSON. No text, no markdown, no explanation outside the JSON object. Do not wrap in code blocks.

You can ONLY recommend from these 5 products (use exact names):
- Pametni termostat
- Pametni merač potrošnje struje
- Pametni LED sistem
- Pametni sistem za navodnjavanje
- Senzor curenja vode

Maximum 3 product recommendations.

Rules:
- If "Oboje" (electricity + water) → recommend combination of energy and water products
- If "Kuća" + "Da" (dvorište) → strongly consider "Pametni sistem za navodnjavanje"
- If "Sprečavanje kvarova i štete" → prioritize "Senzor curenja vode"
- If electricity dominant → prioritize "Pametni termostat" and "Pametni merač potrošnje struje"

Return this exact JSON schema:
{
  "summary": "string - personalized summary in Serbian (latinica), 2-3 sentences",
  "top_recommendations": [
    {
      "product_name": "string - exact product name from the list above",
      "why": "string - personalized reason in Serbian",
      "estimated_impact": "string - estimated savings/impact in Serbian",
      "priority_level": "string - Visok/Srednji/Nizak"
    }
  ],
  "additional_tips": ["string - eco tips in Serbian, 2-3 tips"],
  "eco_score_interpretation": "string - interpretation of the user's eco score in Serbian, 1-2 sentences",
  "disclaimer": "string - short disclaimer in Serbian"
}

IMPORTANT: Return ONLY the JSON object. No other text.`;

    const userPrompt = `Korisnik je popunio EcoCheck upitnik sa sledećim odgovorima:
- Tip objekta: ${answers.tip_objekta}
- Broj članova domaćinstva: ${answers.broj_clanova}
- Najveći mesečni trošak: ${answers.najveci_trosak}
- Da li ima dvorište ili baštu: ${answers.dvoriste}
- Glavni cilj: ${answers.glavni_cilj}

Korisnikov Eco Score je ${answers.eco_score}/100.

Na osnovu ovih odgovora, generiši personalizovanu preporuku. Vrati SAMO validan JSON objekat.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "ai_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "empty_response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("eco-check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
