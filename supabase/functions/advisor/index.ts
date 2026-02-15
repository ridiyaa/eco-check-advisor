import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AdvisorRequest {
  answers: Record<string, string>;
  ecoScore: number;
  followUpAnswers?: Record<string, string>;
  requestedStep: "generate_followups" | "generate_plan";
  retrievedEvidence: Array<{
    evidence_id: string;
    type: string;
    title: string;
    snippet: string;
  }>;
}

const FOLLOWUP_SCHEMA = `{
  "user_summary": { "objectType": "string", "householdSize": "string", "mainConcern": "string", "budgetSensitivity": "string (optional)", "constraints": ["string"] },
  "eco_score_explanation": { "score": number, "drivers": [{"driver":"string","weight":"string","reason":"string"}] },
  "follow_up_questions": [{ "id": "string", "question": "string (Serbian latinica)", "type": "single_choice|free_text", "options": ["string"] (optional), "why_asking": "string", "maps_to": "string" }]
}`;

const PLAN_SCHEMA = `{
  "user_summary": { "objectType": "string", "householdSize": "string", "mainConcern": "string", "budgetSensitivity": "string (optional)", "constraints": ["string"] },
  "eco_score_explanation": { "score": number, "drivers": [{"driver":"string","weight":"string","reason":"string"}] },
  "follow_up_questions": [],
  "recommendations": [{ "id": "string", "title": "string", "category": "energy|water|waste", "priority": 1-5, "impact_range": "string", "effort_level": "string", "cost_range": "string", "reasoning_bullets": ["string (3-5 items)"], "assumptions": ["string"], "confidence": 0.0-1.0, "evidence_ids": ["string - MUST match provided evidence IDs"], "products": ["string"] }],
  "action_plan": { "steps": [{"title":"string","description":"string","timeframe":"string"}], "quick_wins": ["string"], "longer_term": ["string"] },
  "safety_notes": ["string"],
  "disclaimer": "string"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as AdvisorRequest;
    const { answers, ecoScore, followUpAnswers, requestedStep, retrievedEvidence } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const evidenceBlock = retrievedEvidence
      .map((e) => `[${e.evidence_id}] (${e.type}) ${e.title}: ${e.snippet}`)
      .join("\n");

    const baseContext = `Korisnikovi odgovori:
- Tip objekta: ${answers.tip_objekta}
- Broj članova: ${answers.broj_clanova}
- Najveći trošak: ${answers.najveci_trosak}
- Dvorište/bašta: ${answers.dvoriste}
- Glavni cilj: ${answers.glavni_cilj}
- Eco Score: ${ecoScore}/100`;

    const followUpContext = followUpAnswers
      ? `\n\nDodatni odgovori korisnika:\n${Object.entries(followUpAnswers)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}`
      : "";

    let systemPrompt: string;
    let userPrompt: string;

    if (requestedStep === "generate_followups") {
      systemPrompt = `Ti si EcoCheck AI savetnik iz kompanije EcoSense Market. Specijalizovan si za održivost domaćinstva.

PRAVILA:
1. Odgovaraj ISKLJUČIVO na srpskom (latinica).
2. Vraćaj ISKLJUČIVO validan JSON. Nikakav tekst, markdown ili objašnjenje izvan JSON objekta.
3. MORAŠ da ground-uješ preporuke u priloženim evidencijama. Koristi evidence_id iz priloženog knowledge base-a.
4. Ako nemaš dovoljno informacija za preporuku, MORAŠ da postaviš follow-up pitanje.
5. Generiši 1–3 follow-up pitanja koja ti nedostaju za preciznu preporuku.
6. Svako pitanje mora imati "why_asking" (zašto pitaš) i "maps_to" (šta ćeš saznati).

JSON schema za odgovor:
${FOLLOWUP_SCHEMA}

Vraćaj SAMO JSON objekat. Ništa drugo.`;

      userPrompt = `${baseContext}

KNOWLEDGE BASE (koristi evidence_ids iz ovog spiska):
${evidenceBlock}

Na osnovu ovih odgovora i dostupnih evidencija, generiši:
1. Sažetak korisnikovog profila (user_summary)
2. Objašnjenje eco score-a sa driverima (eco_score_explanation)
3. 1–3 dopunska pitanja koja bi ti pomogla da daš preciznije preporuke (follow_up_questions)

Vrati SAMO validan JSON.`;
    } else {
      systemPrompt = `Ti si EcoCheck AI savetnik iz kompanije EcoSense Market. Specijalizovan si za održivost domaćinstva.

PRAVILA:
1. Odgovaraj ISKLJUČIVO na srpskom (latinica).
2. Vraćaj ISKLJUČIVO validan JSON. Nikakav tekst, markdown ili objašnjenje izvan JSON objekta.
3. MORAŠ da ground-uješ preporuke u priloženim evidencijama. Koristi evidence_id vrednosti.
4. Svaka preporuka MORA da ima evidence_ids[] sa bar jednim validnim ID-jem iz priloženog knowledge base-a.
5. Ako evidencija nije dovoljna, postavi confidence na 0.3 ili niže i navedi u assumptions.
6. Preporuči 3–5 akcija, rangirane po prioritetu.
7. Svaka preporuka ima reasoning_bullets (3–5), assumptions, confidence (0–1).
8. action_plan mora imati quick_wins i longer_term.

JSON schema za odgovor:
${PLAN_SCHEMA}

Vraćaj SAMO JSON objekat. Ništa drugo.`;

      userPrompt = `${baseContext}${followUpContext}

KNOWLEDGE BASE (koristi evidence_ids iz ovog spiska):
${evidenceBlock}

Na osnovu SVIH odgovora i evidencija, generiši kompletan plan:
1. user_summary
2. eco_score_explanation sa driverima
3. recommendations (3–5, grounded u evidencijama)
4. action_plan sa steps, quick_wins, longer_term
5. safety_notes
6. disclaimer

Vrati SAMO validan JSON.`;
    }

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

    // Try to parse as JSON to validate
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from the content
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          console.error("Failed to parse extracted JSON:", match[0].substring(0, 200));
          return new Response(
            JSON.stringify({ error: "invalid_json", raw: content.substring(0, 500) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error("No JSON found in AI response:", content.substring(0, 200));
        return new Response(
          JSON.stringify({ error: "invalid_json" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ content: parsed, step: requestedStep }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
