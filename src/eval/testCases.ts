import type { QuestionnaireAnswers } from "@/lib/eco-score";

export interface TestCase {
  id: string;
  persona: string;
  answers: QuestionnaireAnswers;
  followUpAnswers: Record<string, string>;
  expectedConstraints: string[];
}

export const testCases: TestCase[] = [
  {
    id: "tc-01",
    persona: "Stan, 1 osoba, struja, bez dvorišta, smanjenje računa",
    answers: { tip_objekta: "Stan", broj_clanova: "1", najveci_trosak: "Struja", dvoriste: "Ne", glavni_cilj: "Smanjenje računa" },
    followUpAnswers: {},
    expectedConstraints: ["NO irrigation (nema dvorišta)", "energy products prioritized"],
  },
  {
    id: "tc-02",
    persona: "Kuća, 5+, oboje, dvorište, sve navedeno",
    answers: { tip_objekta: "Kuća", broj_clanova: "5+", najveci_trosak: "Oboje", dvoriste: "Da", glavni_cilj: "Sve navedeno" },
    followUpAnswers: {},
    expectedConstraints: ["irrigation recommended", "leak sensor recommended", "energy products included"],
  },
  {
    id: "tc-03",
    persona: "Stan, 2, voda, ne, sprečavanje kvarova",
    answers: { tip_objekta: "Stan", broj_clanova: "2", najveci_trosak: "Voda", dvoriste: "Ne", glavni_cilj: "Sprečavanje kvarova i štete" },
    followUpAnswers: {},
    expectedConstraints: ["leak sensor high priority", "NO irrigation"],
  },
  {
    id: "tc-04",
    persona: "Kuća, 3-4, struja, da, ekološka odgovornost",
    answers: { tip_objekta: "Kuća", broj_clanova: "3–4", najveci_trosak: "Struja", dvoriste: "Da", glavni_cilj: "Ekološka odgovornost" },
    followUpAnswers: {},
    expectedConstraints: ["LED or thermostat recommended", "irrigation possible"],
  },
  {
    id: "tc-05",
    persona: "Stan, 1, voda, ne, smanjenje računa",
    answers: { tip_objekta: "Stan", broj_clanova: "1", najveci_trosak: "Voda", dvoriste: "Ne", glavni_cilj: "Smanjenje računa" },
    followUpAnswers: {},
    expectedConstraints: ["water products prioritized", "NO irrigation"],
  },
  {
    id: "tc-06",
    persona: "Kuća, 5+, struja, da, sprečavanje kvarova",
    answers: { tip_objekta: "Kuća", broj_clanova: "5+", najveci_trosak: "Struja", dvoriste: "Da", glavni_cilj: "Sprečavanje kvarova i štete" },
    followUpAnswers: {},
    expectedConstraints: ["leak sensor recommended", "thermostat recommended"],
  },
  {
    id: "tc-07",
    persona: "Stan, 3-4, oboje, ne, sve navedeno",
    answers: { tip_objekta: "Stan", broj_clanova: "3–4", najveci_trosak: "Oboje", dvoriste: "Ne", glavni_cilj: "Sve navedeno" },
    followUpAnswers: {},
    expectedConstraints: ["NO irrigation", "both energy and water products"],
  },
  {
    id: "tc-08",
    persona: "Kuća, 2, voda, da, ekološka odgovornost",
    answers: { tip_objekta: "Kuća", broj_clanova: "2", najveci_trosak: "Voda", dvoriste: "Da", glavni_cilj: "Ekološka odgovornost" },
    followUpAnswers: {},
    expectedConstraints: ["irrigation recommended", "water meter or leak sensor"],
  },
  {
    id: "tc-09",
    persona: "Stan, 5+, struja, ne, smanjenje računa",
    answers: { tip_objekta: "Stan", broj_clanova: "5+", najveci_trosak: "Struja", dvoriste: "Ne", glavni_cilj: "Smanjenje računa" },
    followUpAnswers: {},
    expectedConstraints: ["thermostat or meter recommended", "high household → monitoring"],
  },
  {
    id: "tc-10",
    persona: "Kuća, 1, oboje, da, sprečavanje kvarova",
    answers: { tip_objekta: "Kuća", broj_clanova: "1", najveci_trosak: "Oboje", dvoriste: "Da", glavni_cilj: "Sprečavanje kvarova i štete" },
    followUpAnswers: {},
    expectedConstraints: ["leak sensor high priority", "irrigation possible"],
  },
  {
    id: "tc-11",
    persona: "Stan, 2, struja, ne, ekološka odgovornost",
    answers: { tip_objekta: "Stan", broj_clanova: "2", najveci_trosak: "Struja", dvoriste: "Ne", glavni_cilj: "Ekološka odgovornost" },
    followUpAnswers: {},
    expectedConstraints: ["LED system recommended", "NO irrigation"],
  },
  {
    id: "tc-12",
    persona: "Kuća, 3-4, voda, ne, smanjenje računa",
    answers: { tip_objekta: "Kuća", broj_clanova: "3–4", najveci_trosak: "Voda", dvoriste: "Ne", glavni_cilj: "Smanjenje računa" },
    followUpAnswers: {},
    expectedConstraints: ["water products prioritized", "NO irrigation (nema dvorišta)"],
  },
  {
    id: "tc-13",
    persona: "Stan, 1, oboje, ne, sve navedeno",
    answers: { tip_objekta: "Stan", broj_clanova: "1", najveci_trosak: "Oboje", dvoriste: "Ne", glavni_cilj: "Sve navedeno" },
    followUpAnswers: {},
    expectedConstraints: ["mixed products", "NO irrigation"],
  },
  {
    id: "tc-14",
    persona: "Kuća, 5+, voda, da, sve navedeno",
    answers: { tip_objekta: "Kuća", broj_clanova: "5+", najveci_trosak: "Voda", dvoriste: "Da", glavni_cilj: "Sve navedeno" },
    followUpAnswers: {},
    expectedConstraints: ["irrigation recommended", "leak sensor", "water meter"],
  },
  {
    id: "tc-15",
    persona: "Kuća, 2, struja, da, smanjenje računa",
    answers: { tip_objekta: "Kuća", broj_clanova: "2", najveci_trosak: "Struja", dvoriste: "Da", glavni_cilj: "Smanjenje računa" },
    followUpAnswers: {},
    expectedConstraints: ["thermostat recommended", "LED system possible"],
  },
];
