import { allKnowledge, type EcoKnowledgeItem } from "@/data/ecoKnowledge";
import type { QuestionnaireAnswers } from "@/lib/eco-score";

export interface EvidenceItem {
  evidence_id: string;
  type: "product" | "guide";
  title: string;
  snippet: string;
}

function buildUserKeywords(answers: QuestionnaireAnswers, followUpAnswers?: Record<string, string>): string[] {
  const kw: string[] = [];

  // Map answers to keywords
  if (answers.tip_objekta === "Kuća") kw.push("kuća", "dvorište", "bašta");
  if (answers.tip_objekta === "Stan") kw.push("stan");

  if (answers.najveci_trosak === "Struja") kw.push("struja", "energija", "ušteda", "uređaji");
  if (answers.najveci_trosak === "Voda") kw.push("voda", "curenje", "potrošnja");
  if (answers.najveci_trosak === "Oboje") kw.push("struja", "energija", "voda", "curenje", "ušteda");

  if (answers.dvoriste === "Da") kw.push("dvorište", "bašta", "navodnjavanje", "zalivanje");

  if (answers.glavni_cilj === "Smanjenje računa") kw.push("ušteda", "račun", "smanjenje");
  if (answers.glavni_cilj === "Ekološka odgovornost") kw.push("ekologija", "reciklaža", "kompost", "obnovljivi");
  if (answers.glavni_cilj === "Sprečavanje kvarova i štete") kw.push("curenje", "prevencija", "senzor", "šteta", "poplava");
  if (answers.glavni_cilj === "Sve navedeno") kw.push("ušteda", "račun", "curenje", "prevencija", "ekologija");

  const members = answers.broj_clanova;
  if (members === "5+" || members === "3–4") kw.push("potrošnja", "monitoring");

  // Incorporate follow-up answer keywords
  if (followUpAnswers) {
    Object.values(followUpAnswers).forEach((v) => {
      v.toLowerCase().split(/\s+/).forEach((w) => {
        if (w.length > 3) kw.push(w);
      });
    });
  }

  return [...new Set(kw)];
}

function scoreItem(item: EcoKnowledgeItem, userKeywords: string[], answers: QuestionnaireAnswers): number {
  let score = 0;

  // Keyword overlap
  const itemKw = item.keywords.map((k) => k.toLowerCase());
  for (const uk of userKeywords) {
    if (itemKw.some((ik) => ik.includes(uk) || uk.includes(ik))) {
      score += 2;
    }
  }

  // Category boost
  if (answers.najveci_trosak === "Struja" && item.type === "product" && item.category === "energy") score += 3;
  if (answers.najveci_trosak === "Voda" && item.type === "product" && item.category === "water") score += 3;
  if (answers.najveci_trosak === "Oboje") score += 1;

  // Prerequisite penalty
  if (item.type === "product" && item.prerequisites.length > 0) {
    if (item.prerequisites.includes("dvorište ili bašta") && answers.dvoriste === "Ne") {
      score -= 10; // hard filter
    }
    if (item.prerequisites.includes("solarni paneli")) {
      score -= 5; // unlikely
    }
  }

  // Goal alignment
  if (answers.glavni_cilj === "Sprečavanje kvarova i štete") {
    if (item.id.includes("leak") || item.id.includes("curenje") || item.id.includes("prevention")) score += 4;
  }

  return score;
}

export function retrieveKnowledge(
  answers: QuestionnaireAnswers,
  followUpAnswers?: Record<string, string>,
  k = 5
): EvidenceItem[] {
  const userKeywords = buildUserKeywords(answers, followUpAnswers);

  const scored = allKnowledge
    .map((item) => ({ item, score: scoreItem(item, userKeywords, answers) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored.map(({ item }) => ({
    evidence_id: item.id,
    type: item.type,
    title: item.title,
    snippet:
      item.type === "product"
        ? `${item.short_description} Cena: ${item.cost_range}. Uticaj: ${item.impact_range}.`
        : `${item.summary}`,
  }));
}
