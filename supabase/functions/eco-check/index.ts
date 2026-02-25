import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [400, 900, 1800];

interface QuestionnaireAnswers {
  tip_objekta: string;
  broj_clanova: string;
  najveci_trosak: string;
  dvoriste: string;
  glavni_cilj: string;
  eco_score: number;
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response | null> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;

      const status = res.status;
      const text = await res.text();

      // Non-retryable errors
      if (status === 429) throw { type: "rate_limit", status };
      if (status === 402) throw { type: "payment_required", status };
      if (status < 500 || status > 504) throw { type: "ai_error", status, text };

      console.error(`Gateway ${status} (attempt ${i}): ${text}`);
      if (i < MAX_ATTEMPTS - 1) {
        const delay = BACKOFF_MS[i] + Math.random() * 150;
        console.log(`Retry attempt ${i + 1}, waiting ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (e) {
      if (e && typeof e === "object" && "type" in e) throw e;
      console.error(`Network error (attempt ${i}):`, e);
      if (i < MAX_ATTEMPTS - 1) {
        const delay = BACKOFF_MS[i] + Math.random() * 150;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return null; // all retries exhausted
}

interface Recommendation {
  product_name: string;
  why: string;
  estimated_impact: string;
  priority_level: string;
}

const CANONICAL_PRODUCTS = [
  "Pametna boca za vodu",
  "Pametna kanta za reciklažu",
  "Pametni LED sistem osvetljenja",
  "Pametan senzor curenja vode",
  "Pametan sistem za navodnjavanje",
  "Pametni merač potrošnje struje",
  "Pametni termostat",
];

function buildFallbackContent(answers: QuestionnaireAnswers): string {
  const products: { name: string; why: string; impact: string; priority: string; forCost: string[]; forGoal: string[] }[] = [
    { name: "Pametni termostat", why: "Kontrola grejanja smanjuje potrošnju energije.", impact: "Ušteda do 15% na grejanju.", priority: "Visok", forCost: ["Struja", "Oboje"], forGoal: ["Smanjenje računa", "Sve navedeno", "Ekološka odgovornost"] },
    { name: "Pametni merač potrošnje struje", why: "Praćenje potrošnje pomaže u identifikaciji rasipanja.", impact: "Uvid u realnu potrošnju, ušteda 5–10%.", priority: "Srednji", forCost: ["Struja", "Oboje"], forGoal: ["Smanjenje računa", "Sve navedeno", "Ekološka odgovornost"] },
    { name: "Pametni LED sistem osvetljenja", why: "LED rasveta troši do 80% manje energije.", impact: "Značajno smanjenje računa za struju.", priority: "Srednji", forCost: ["Struja", "Oboje"], forGoal: ["Smanjenje računa", "Ekološka odgovornost", "Sve navedeno"] },
    { name: "Pametan sistem za navodnjavanje", why: "Automatsko navodnjavanje štedi vodu i vreme.", impact: "Ušteda do 40% vode za baštu.", priority: "Visok", forCost: ["Voda", "Oboje"], forGoal: ["Smanjenje računa", "Ekološka odgovornost", "Sve navedeno"] },
    { name: "Pametan senzor curenja vode", why: "Rano otkrivanje curenja sprečava skupu štetu.", impact: "Prevencija velikih kvarova i popravki.", priority: "Visok", forCost: ["Voda", "Oboje"], forGoal: ["Sprečavanje kvarova i štete", "Sve navedeno"] },
    { name: "Pametna boca za vodu", why: "Smanjuje upotrebu jednokratne plastike.", impact: "Smanjenje plastičnog otpada do 80%.", priority: "Nizak", forCost: ["Voda", "Oboje"], forGoal: ["Ekološka odgovornost", "Sve navedeno"] },
    { name: "Pametna kanta za reciklažu", why: "Pomaže u pravilnom sortiranju otpada.", impact: "Smanjenje mešanog otpada za 40–60%.", priority: "Srednji", forCost: ["Struja", "Voda", "Oboje"], forGoal: ["Ekološka odgovornost", "Sve navedeno"] },
  ];

  // Filter out irrigation if no yard
  let candidates = products;
  if (answers.dvoriste === "Ne") {
    candidates = candidates.filter(p => p.name !== "Pametan sistem za navodnjavanje");
  }

  // Score each product by relevance
  const scored = candidates.map(p => {
    let score = 0;
    if (p.forCost.includes(answers.najveci_trosak)) score += 2;
    if (p.forGoal.includes(answers.glavni_cilj)) score += 2;
    if (answers.glavni_cilj === "Sprečavanje kvarova i štete" && p.name === "Pametan senzor curenja vode") score += 3;
    if (answers.tip_objekta === "Kuća" && answers.dvoriste === "Da" && p.name === "Pametan sistem za navodnjavanje") score += 2;
    return { ...p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, 3).filter(s => s.score > 0);

  // Ensure at least 2
  if (selected.length < 2) {
    for (const c of scored) {
      if (!selected.find(s => s.name === c.name)) {
        selected.push(c);
        if (selected.length >= 2) break;
      }
    }
  }

  const recs: Recommendation[] = selected.map(s => ({
    product_name: s.name,
    why: s.why,
    estimated_impact: s.impact,
    priority_level: s.priority,
  }));

  const scoreVal = answers.eco_score;
  const scoreText = scoreVal >= 70
    ? `Vaš Eco Score od ${scoreVal}/100 ukazuje na visoku ekološku svest.`
    : scoreVal >= 40
    ? `Vaš Eco Score od ${scoreVal}/100 pokazuje prosečnu ekološku svest sa prostora za poboljšanje.`
    : `Vaš Eco Score od ${scoreVal}/100 ukazuje na značajan potencijal za unapređenje.`;

  const result = {
    summary: `Na osnovu vaših odgovora, preporučujemo ${recs.length} proizvoda koji mogu pomoći u ${answers.glavni_cilj === "Smanjenje računa" ? "smanjenju troškova" : answers.glavni_cilj === "Ekološka odgovornost" ? "ekološkoj odgovornosti" : "unapređenju vašeg doma"}.`,
    top_recommendations: recs,
    additional_tips: [
      "Redovno proveravajte potrošnju energije i vode.",
      "Isključujte uređaje iz struje kada ih ne koristite.",
    ],
    eco_score_interpretation: scoreText,
    disclaimer: "AI servis privremeno nedostupan — prikaz je generisan deterministički.",
  };

  return JSON.stringify(result);
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

You can ONLY recommend from these 7 products (use EXACT names, no changes):
- Pametna boca za vodu
- Pametna kanta za reciklažu
- Pametni LED sistem osvetljenja
- Pametan senzor curenja vode
- Pametan sistem za navodnjavanje
- Pametni merač potrošnje struje
- Pametni termostat

Maximum 3 product recommendations.

Rules:
- NEVER invent new products. If the user needs something not directly covered, pick the CLOSEST product from the list.
- If "Oboje" (electricity + water) → recommend combination of energy and water products
- If "Kuća" + "Da" (dvorište) → strongly consider "Pametan sistem za navodnjavanje"
- If "Sprečavanje kvarova i štete" → prioritize "Pametan senzor curenja vode"
- If electricity dominant → prioritize "Pametni termostat" and "Pametni merač potrošnje struje"
- action_plan.steps[].timeframe MUST be a string. Allowed values: "odmah", "1-2 nedelje", "1-3 meseca", "3-6 meseci"

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

    let response: Response | null = null;
    try {
      response = await fetchWithRetry(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: false,
          }),
        }
      );
    } catch (e: any) {
      if (e?.type === "rate_limit") {
        return new Response(
          JSON.stringify({ error: "rate_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (e?.type === "payment_required") {
        return new Response(
          JSON.stringify({ error: "payment_required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Fall through to fallback
      response = null;
    }

    // All retries exhausted → fallback
    if (!response) {
      console.log("AI unavailable, returning deterministic fallback for quick mode.");
      const fallbackContent = buildFallbackContent(answers);
      return new Response(
        JSON.stringify({ mode: "fallback", content: fallbackContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      const fallbackContent = buildFallbackContent(answers);
      return new Response(
        JSON.stringify({ mode: "fallback", content: fallbackContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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