export interface QuestionnaireAnswers {
  tip_objekta: string;
  broj_clanova: string;
  najveci_trosak: string;
  dvoriste: string;
  glavni_cilj: string;
}

export function computeEcoScore(answers: QuestionnaireAnswers): number {
  let score = 15; // base score

  // Tip objekta
  if (answers.tip_objekta === "Kuća") score += 10;

  // Broj članova
  switch (answers.broj_clanova) {
    case "5+": score += 15; break;
    case "3–4": score += 10; break;
    case "2": score += 5; break;
  }

  // Najveći trošak
  switch (answers.najveci_trosak) {
    case "Oboje": score += 20; break;
    case "Struja": score += 15; break;
    case "Voda": score += 10; break;
  }

  // Dvorište
  if (answers.dvoriste === "Da") score += 15;

  // Glavni cilj
  switch (answers.glavni_cilj) {
    case "Sve navedeno": score += 25; break;
    case "Smanjenje računa": score += 15; break;
    case "Ekološka odgovornost": score += 15; break;
    case "Sprečavanje kvarova i štete": score += 10; break;
  }

  return Math.min(100, Math.max(0, score));
}

export const PRODUCT_URL_MAP: Record<string, string> = {
  "Pametni termostat": "https://forestgreen-gerbil-565708.hostingersite.com/product/pametni-termostat/",
  "Pametni merač potrošnje struje": "https://forestgreen-gerbil-565708.hostingersite.com/product/pametni-merac-potrosnje-struje/",
  "Pametni LED sistem osvetljenja": "https://forestgreen-gerbil-565708.hostingersite.com/product/led-sistem/",
  "Pametan sistem za navodnjavanje": "https://forestgreen-gerbil-565708.hostingersite.com/product/pametan-sistem-za-navodnjavanje/",
  "Pametan senzor curenja vode": "https://forestgreen-gerbil-565708.hostingersite.com/product/pametan-senzor-curenja-vode/",
  "Pametna boca za vodu": "https://forestgreen-gerbil-565708.hostingersite.com/product/pametna-boca-za-vodu/",
  "Pametna kanta za reciklažu": "https://forestgreen-gerbil-565708.hostingersite.com/product/pametna-kanta-za-reciklazu/",
};

export const PRODUCT_PRICE_MAP: Record<string, string> = {
  "Pametna boca za vodu": "4.990 RSD",
  "Pametna kanta za reciklažu": "7.990 RSD",
  "Pametni LED sistem osvetljenja": "9.900 RSD",
  "Pametan senzor curenja vode": "5.990 RSD",
  "Pametan sistem za navodnjavanje": "10.999 RSD",
  "Pametni merač potrošnje struje": "14.999 RSD",
  "Pametni termostat": "12.990 RSD",
};

export interface Recommendation {
  product_name: string;
  why: string;
  estimated_impact: string;
  priority_level: string;
}

export interface AIResponse {
  summary: string;
  top_recommendations: Recommendation[];
  additional_tips: string[];
  eco_score_interpretation: string;
  disclaimer: string;
}

export function parseAIResponse(raw: string): AIResponse {
  let parsed: AIResponse;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try extracting JSON from surrounding text
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      if (import.meta.env.DEV) {
        console.error("Failed to extract JSON from AI response:", raw);
      }
      throw new Error("Invalid JSON response");
    }
    parsed = JSON.parse(match[0]);
  }

  // Validate required fields
  if (!parsed.summary || !Array.isArray(parsed.top_recommendations)) {
    throw new Error("Missing required fields in AI response");
  }

  // Filter to only known products and override URLs
  parsed.top_recommendations = parsed.top_recommendations
    .filter((r) => r.product_name in PRODUCT_URL_MAP)
    .slice(0, 7);

  if (import.meta.env.DEV) {
    console.log("Parsed AI response:", parsed);
  }

  return parsed;
}
