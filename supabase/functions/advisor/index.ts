import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = [500, 502, 503, 504];

interface EvidenceItem {
  evidence_id: string;
  type: string;
  title: string;
  snippet: string;
}

interface AdvisorRequest {
  answers: Record<string, string>;
  ecoScore: number;
  followUpAnswers?: Record<string, string>;
  requestedStep: "generate_followups" | "generate_plan";
  retrievedEvidence: EvidenceItem[];
}

// --- Deterministic fallback plan generator ---
function buildFallbackPlan(
  answers: Record<string, string>,
  ecoScore: number,
  evidence: EvidenceItem[],
): Record<string, unknown> {
  const costDriverMap: Record<string, { driver: string; weight: string; reason: string }> = {
    "Struja": { driver: "Potrošnja električne energije", weight: "50%", reason: "Prema odgovorima, struja je jedan od značajnijih troškova u domaćinstvu." },
    "Grejanje": { driver: "Troškovi grejanja", weight: "50%", reason: "Prema odgovorima, grejanje predstavlja zapažen deo mesečnih izdataka." },
    "Voda": { driver: "Potrošnja vode", weight: "50%", reason: "Prema odgovorima, voda je jedan od značajnijih troškova." },
    "Otpad": { driver: "Upravljanje otpadom", weight: "50%", reason: "Upravljanje otpadom može biti prostor za optimizaciju troškova." },
  };

  const goalDriverMap: Record<string, { driver: string; weight: string; reason: string }> = {
    "Smanjenje računa": { driver: "Finansijska optimizacija", weight: "30%", reason: "Korisnik je naznačio interes za smanjenje mesečnih troškova." },
    "Zdraviji život": { driver: "Zdravlje i kvalitet života", weight: "30%", reason: "Korisnik je istakao zdravlje kao jedan od prioriteta." },
    "Zaštita životne sredine": { driver: "Ekološki otisak", weight: "30%", reason: "Korisnik je izrazio interes za smanjenje ekološkog otiska." },
    "Energetska nezavisnost": { driver: "Energetska nezavisnost", weight: "30%", reason: "Korisnik je naveo interes za veću energetsku samostalnost." },
  };

  const costDriver = costDriverMap[answers.najveci_trosak] || { driver: "Opšta potrošnja resursa", weight: "50%", reason: "Optimizacija potrošnje resursa." };
  const goalDriver = goalDriverMap[answers.glavni_cilj] || { driver: "Održivost domaćinstva", weight: "30%", reason: "Unapređenje održivosti." };

  const constraints: string[] = [];
  if (answers.dvoriste === "Ne") constraints.push("Nema dvorište/baštu");
  if (answers.tip_objekta === "Stan") constraints.push("Stanovanje u stanu — ograničene mogućnosti za spoljne instalacije");

  // Build recommendations from evidence
  const recommendations = evidence.slice(0, 5).map((ev, i) => {
    const isProduct = ev.type === "product";
    const categoryGuess = ev.evidence_id.includes("water") || ev.title.toLowerCase().includes("vod") ? "water"
      : ev.evidence_id.includes("waste") || ev.title.toLowerCase().includes("otpad") ? "waste"
      : "energy";

    const priorityReasonParts: string[] = [];
    if (answers.najveci_trosak) priorityReasonParts.push(`prema odgovorima, ${answers.najveci_trosak.toLowerCase()} je među značajnijim troškovima`);
    if (answers.tip_objekta) priorityReasonParts.push(`tip objekta je ${answers.tip_objekta.toLowerCase()}`);
    const priorityReason = `Ova mera je relevantna jer ${priorityReasonParts.join(", a ")}.`;

    return {
      id: `fallback-rec-${i + 1}`,
      title: isProduct ? `Razmotrite: ${ev.title}` : ev.title,
      category: categoryGuess,
      priority: i + 1,
      impact_range: "Procena nedostupna — pogledajte detalje",
      effort_level: i < 2 ? "Nizak" : "Srednji",
      cost_range: "Pogledajte opis proizvoda",
      reasoning_bullets: [
        ev.snippet.substring(0, 120) + (ev.snippet.length > 120 ? "..." : ""),
        `Relevantno za vaš cilj: ${answers.glavni_cilj || "održivost"}`,
        `Povezano sa troškom: ${answers.najveci_trosak || "opšti troškovi"}`,
      ],
      assumptions: ["AI servis privremeno nedostupan — plan je generisan iz baze znanja"],
      confidence: 0.35 + (i < 2 ? 0.15 : 0.05),
      evidence_ids: [ev.evidence_id],
      products: isProduct ? [ev.title] : [],
      priority_reason: priorityReason,
    };
  });

  // Action plan
  const quickWins = evidence
    .filter((e) => e.type === "guide")
    .slice(0, 3)
    .map((e) => e.title);
  if (quickWins.length === 0) quickWins.push("Možete razmotriti pregled navika potrošnje resursa");

  const longerTerm = evidence
    .filter((e) => e.type === "product")
    .slice(0, 3)
    .map((e) => `Možete razmotriti nabavku: ${e.title}`);
  if (longerTerm.length === 0) longerTerm.push("Sledeći logičan korak je istraživanje pametnih uređaja za uštedu");

  const phaseLabels = ["Faza 1 – Brze optimizacije", "Faza 2 – Tehnička unapređenja", "Faza 3 – Strukturne mere"];
  const steps = recommendations.slice(0, 3).map((r, i) => ({
    title: r.title,
    description: r.reasoning_bullets[0],
    timeframe: phaseLabels[i] || phaseLabels[phaseLabels.length - 1],
  }));

  // Build reasoning summary from user inputs
  const reasoningParts: string[] = [];
  if (answers.najveci_trosak) reasoningParts.push(`${answers.najveci_trosak.toLowerCase()} je naveden kao jedan od značajnijih mesečnih troškova`);
  if (answers.tip_objekta) reasoningParts.push(`tip objekta je ${answers.tip_objekta.toLowerCase()}`);
  if (answers.dvoriste === "Da") reasoningParts.push("postoji dvorište ili bašta");
  if (answers.dvoriste === "Ne") reasoningParts.push("nema dvorište ni baštu");
  if (answers.glavni_cilj) reasoningParts.push(`naznačen cilj je ${answers.glavni_cilj.toLowerCase()}`);
  const reasoningSummary = `Na osnovu odgovora — ${reasoningParts.slice(0, 3).join(", ")} — preporuke su usmerene ka merama koje odgovaraju ovom profilu domaćinstva.`;

  return {
    user_summary: {
      objectType: answers.tip_objekta || "Nepoznato",
      householdSize: answers.broj_clanova || "Nepoznato",
      mainConcern: answers.najveci_trosak || "Nepoznato",
      budgetSensitivity: answers.glavni_cilj === "Smanjenje računa" ? "Visoka" : "Srednja",
      constraints,
    },
    eco_score_explanation: {
      score: ecoScore,
      drivers: [
        costDriver,
        goalDriver,
        { driver: "Veličina domaćinstva", weight: "20%", reason: `Domaćinstvo sa ${answers.broj_clanova || "nepoznatim brojem"} članova.` },
      ],
    },
    reasoning_summary: reasoningSummary,
    follow_up_questions: [],
    recommendations,
    action_plan: { steps, quick_wins: quickWins, longer_term: longerTerm },
    safety_notes: [
      "Za električne radove konsultujte stručnjaka.",
      "Pre instalacije bilo kog uređaja proverite kompatibilnost sa vašim sistemom.",
    ],
    disclaimer: "Ovaj plan je generisan automatski iz baze znanja jer AI servis trenutno nije dostupan. Za personalizovanije preporuke, pokušajte ponovo kasnije.",
  };
}

// --- Retry helper with exponential backoff + jitter ---
async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<{ response: Response | null; lastStatus: number }> {
  let lastStatus = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt - 1) * 400 + Math.random() * 150;
      console.log(`Retry attempt ${attempt}, waiting ${Math.round(delay)}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const response = await fetch(url, options);
      lastStatus = response.status;

      // Non-retryable errors: return immediately
      if (response.ok || !RETRYABLE_STATUSES.includes(lastStatus)) {
        return { response, lastStatus };
      }

      const errorText = await response.text();
      console.error(`Gateway ${lastStatus} (attempt ${attempt}):`, errorText.substring(0, 300));
    } catch (err) {
      console.error(`Network error (attempt ${attempt}):`, err);
      lastStatus = 0;
    }
  }

  return { response: null, lastStatus };
}

// --- JSON extraction + repair ---
function tryParseJson(content: string): unknown | null {
  // 1. Direct parse
  try {
    return JSON.parse(content);
  } catch { /* continue */ }

  // 2. Extract from markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch { /* continue */ }
  }

  // 3. Extract outermost {...}
  const match = content.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { /* continue */ }

    // 4. Basic repair: trailing commas, missing closures
    let repaired = match[0]
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");

    let braces = 0, brackets = 0;
    for (const c of repaired) {
      if (c === "{") braces++;
      if (c === "}") braces--;
      if (c === "[") brackets++;
      if (c === "]") brackets--;
    }
    while (brackets > 0) { repaired += "]"; brackets--; }
    while (braces > 0) { repaired += "}"; braces--; }

    try {
      return JSON.parse(repaired);
    } catch { /* continue */ }
  }

  return null;
}

async function repairJsonWithModel(
  rawContent: string,
  schema: string,
  apiKey: string,
): Promise<unknown | null> {
  console.log("Attempting JSON repair via model call...");

  const { response } = await fetchWithRetry(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Return strictly valid JSON only, matching the provided schema. No extra text, no markdown, no explanation.",
        },
        {
          role: "user",
          content: `Schema:\n${schema}\n\nInvalid JSON to repair:\n${rawContent.substring(0, 3000)}`,
        },
      ],
      stream: false,
    }),
  });

  if (!response?.ok) return null;

  try {
    const data = await response.json();
    const repairedContent = data.choices?.[0]?.message?.content;
    if (!repairedContent) return null;
    return tryParseJson(repairedContent);
  } catch {
    return null;
  }
}

// --- Schema definitions (inline for prompt) ---
const FOLLOWUP_SCHEMA = `{
  "user_summary": { "objectType": "string", "householdSize": "string", "mainConcern": "string", "budgetSensitivity": "string (optional)", "constraints": ["string"] },
  "eco_score_explanation": { "score": number, "drivers": [{"driver":"string","weight":"string","reason":"string"}] },
  "follow_up_questions": [{ "id": "string", "question": "string (Serbian latinica)", "type": "single_choice|free_text", "options": ["string"] (optional), "why_asking": "string", "maps_to": "string" }]
}`;

const PLAN_SCHEMA = `{
  "user_summary": { "objectType": "string", "householdSize": "string", "mainConcern": "string", "budgetSensitivity": "string (optional)", "constraints": ["string"] },
  "eco_score_explanation": { "score": number, "drivers": [{"driver":"string","weight":"string","reason":"string"}] },
  "reasoning_summary": "string — 2-3 rečenice analitičkog obrazloženja, neutralan ton. Navedi najmanje 2 korisnikova odgovora. Bez alarmizma, apsolutnih tvrdnji ili spekulacija.",
  "follow_up_questions": [],
  "recommendations": [{ "id": "string", "title": "string", "category": "energy|water|waste", "priority": 1-5, "impact_range": "string", "effort_level": "string", "cost_range": "string", "reasoning_bullets": ["string (3-5 items)"], "assumptions": ["string"], "confidence": 0.0-1.0, "evidence_ids": ["string - MUST match provided evidence IDs"], "products": ["string"], "priority_reason": "string — jedna rečenica koja počinje sa 'Ova mera je relevantna jer…', specifična za korisnikove odgovore, bez preterivanja" }],
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
    const activeSchema = requestedStep === "generate_followups" ? FOLLOWUP_SCHEMA : PLAN_SCHEMA;

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
8. action_plan mora imati quick_wins i longer_term. Za polje "timeframe" u steps koristi fazni pristup prema nivou napora: "Faza 1 – Brze optimizacije", "Faza 2 – Tehnička unapređenja", "Faza 3 – Strukturne mere". NIKADA ne koristi vremenske oznake poput "Dan 1", "Nedelja 1", "Mesec 1" itd.
9. OBAVEZNO: "reasoning_summary" mora sadržati 2-3 rečenice analitičkog obrazloženja. Navedi najmanje 2 korisnikova odgovora i objasni logiku izbora preporuka. Koristi neutralan, savetodavni ton. ZABRANJENO: alarmistični izrazi ("hitna", "visoka verovatnoća", "direktno utiče"), apsolutne tvrdnje ("najveći trošak"), spekulacije o skrivenim problemima, dramatično ekološko uokviravanje. Umesto toga koristi formulacije poput "prema odgovorima", "jedan od značajnijih", "može se razmotriti".
10. OBAVEZNO: Svaka preporuka mora imati "priority_reason" — jednu rečenicu koja počinje sa "Ova mera je relevantna jer…" Rečenica mora biti specifična za korisnikove odgovore, bez preterivanja i emocionalnog uokviravanja.
11. DIFERENCIJACIJA: Rezultati MORAJU da se značajno razlikuju za Stan vs Kuća, Dvorište Da vs Ne, Struja vs Voda. Ako korisnik nema dvorište, NIKADA ne preporučuj navodnjavanje. Ako je stan, izbegavaj spoljne instalacije. Scenario sa strujom ne sme pominjati logiku vezanu za vodu i obrnuto.
12. TON: Profesionalan, analitičan, savetodavni. Bez marketinškog jezika, bez alarmiranja, bez emocionalnog ubeđivanja. Koristi meke glagole u akcionom planu: "Možete razmotriti…", "Preporučuje se započeti sa…", "Sledeći logičan korak je…". NIKADA ne koristi imperativne naredbe.

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

    // --- Main AI call with retry ---
    const { response, lastStatus } = await fetchWithRetry(GATEWAY_URL, {
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
    });

    // Handle non-retryable client errors
    if (response && !response.ok) {
      if (lastStatus === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (lastStatus === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // All retries exhausted for 5xx — generate deterministic fallback
    if (!response || !response.ok) {
      console.log("AI unavailable, generating fallback plan from knowledge base.");

      if (requestedStep === "generate_followups") {
        // Skip follow-ups, go straight to fallback plan
        const fallbackContent = buildFallbackPlan(answers, ecoScore, retrievedEvidence);
        return new Response(
          JSON.stringify({ mode: "fallback", error: "upstream_5xx", content: fallbackContent, step: "generate_plan" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fallbackContent = buildFallbackPlan(answers, ecoScore, retrievedEvidence);
      return new Response(
        JSON.stringify({ mode: "fallback", error: "upstream_5xx", content: fallbackContent, step: requestedStep }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.log("No content in AI response, returning fallback.");
      const fallbackContent = buildFallbackPlan(answers, ecoScore, retrievedEvidence);
      return new Response(
        JSON.stringify({ mode: "fallback", content: fallbackContent, step: requestedStep }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- JSON parsing pipeline: parse → extract → repair ---
    let parsed = tryParseJson(content);

    if (!parsed) {
      // Attempt ONE repair call with the same model
      parsed = await repairJsonWithModel(content, activeSchema, LOVABLE_API_KEY);
    }

    if (!parsed) {
      console.error("All JSON parsing attempts failed, returning fallback. Raw (first 500 chars):", content.substring(0, 500));
      const fallbackContent = buildFallbackPlan(answers, ecoScore, retrievedEvidence);
      return new Response(
        JSON.stringify({ mode: "fallback", content: fallbackContent, step: requestedStep }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
