export interface EcoProduct {
  id: string;
  title: string;
  category: "energy" | "water" | "waste";
  prerequisites: string[];
  impact_range: string;
  cost_range: string;
  short_description: string;
  keywords: string[];
}

export interface EcoGuide {
  id: string;
  title: string;
  topic: string;
  summary: string;
  steps: string[];
  safety_notes: string[];
  keywords: string[];
}

export type EcoKnowledgeItem =
  | ({ type: "product" } & EcoProduct)
  | ({ type: "guide" } & EcoGuide);

export const ecoProducts: EcoProduct[] = [
  {
    id: "prod-thermostat",
    title: "Pametni termostat",
    category: "energy",
    prerequisites: ["centralno grejanje ili klima uređaj"],
    impact_range: "15–25% ušteda na grejanju/hlađenju",
    cost_range: "8.000–15.000 RSD",
    short_description: "Automatski reguliše temperaturu prema rasporedu i navikama. Smanjuje račun za grejanje bez gubitka komfora.",
    keywords: ["grejanje", "hlađenje", "termostat", "struja", "temperatura", "klima", "energija", "ušteda"],
  },
  {
    id: "prod-meter",
    title: "Pametni merač potrošnje struje",
    category: "energy",
    prerequisites: [],
    impact_range: "10–20% ušteda identifikovanjem rasipanja",
    cost_range: "5.000–10.000 RSD",
    short_description: "Prati potrošnju struje u realnom vremenu. Identifikuje uređaje koji troše najviše i pomaže u optimizaciji.",
    keywords: ["struja", "merač", "potrošnja", "monitoring", "račun", "energija", "ušteda", "uređaji"],
  },
  {
    id: "prod-led",
    title: "Pametni LED sistem",
    category: "energy",
    prerequisites: [],
    impact_range: "40–60% ušteda na osvetljenju",
    cost_range: "3.000–8.000 RSD",
    short_description: "LED sijalice sa daljinskim upravljanjem i automatizacijom. Smanjuju potrošnju osvetljenja i produžavaju vek trajanja.",
    keywords: ["led", "sijalice", "osvetljenje", "struja", "svetlo", "automatizacija", "energija"],
  },
  {
    id: "prod-irrigation",
    title: "Pametni sistem za navodnjavanje",
    category: "water",
    prerequisites: ["dvorište ili bašta"],
    impact_range: "30–50% ušteda vode za zalivanje",
    cost_range: "10.000–25.000 RSD",
    short_description: "Automatski zalivanje na osnovu vlažnosti zemljišta i vremenske prognoze. Sprečava prekomerno zalivanje.",
    keywords: ["navodnjavanje", "bašta", "dvorište", "voda", "zalivanje", "vlažnost", "zemlja"],
  },
  {
    id: "prod-leak-sensor",
    title: "Senzor curenja vode",
    category: "water",
    prerequisites: [],
    impact_range: "Sprečava štetu od 50.000–500.000 RSD",
    cost_range: "3.000–7.000 RSD",
    short_description: "Detektuje curenje vode i šalje upozorenje. Sprečava poplave i oštećenja u domu.",
    keywords: ["curenje", "voda", "senzor", "poplava", "šteta", "prevencija", "zaštita"],
  },
  {
    id: "prod-smart-plug",
    title: "Pametni utikač sa merenjem",
    category: "energy",
    prerequisites: [],
    impact_range: "5–15% ušteda eliminisanjem standby potrošnje",
    cost_range: "2.000–5.000 RSD",
    short_description: "Kontroliše uređaje na daljinu i meri njihovu potrošnju. Eliminiše standby potrošnju automatski.",
    keywords: ["utikač", "standby", "struja", "daljinsko", "merenje", "kontrola", "uređaji"],
  },
  {
    id: "prod-water-meter",
    title: "Pametni merač vode",
    category: "water",
    prerequisites: [],
    impact_range: "10–20% ušteda vode identifikovanjem navika",
    cost_range: "6.000–12.000 RSD",
    short_description: "Prati potrošnju vode po zoni. Identifikuje neobične obrasce koji ukazuju na curenje ili rasipanje.",
    keywords: ["voda", "merač", "potrošnja", "monitoring", "curenje", "račun"],
  },
  {
    id: "prod-solar-monitor",
    title: "Monitor solarnih panela",
    category: "energy",
    prerequisites: ["solarni paneli"],
    impact_range: "Optimizuje prinos solarne energije za 10–15%",
    cost_range: "8.000–15.000 RSD",
    short_description: "Prati proizvodnju i potrošnju solarne energije. Optimizuje korišćenje sopstvene struje.",
    keywords: ["solar", "paneli", "energija", "struja", "proizvodnja", "obnovljivi"],
  },
];

export const ecoGuides: EcoGuide[] = [
  {
    id: "guide-standby",
    title: "Eliminacija standby potrošnje",
    topic: "energy",
    summary: "Standby potrošnja čini 5–10% ukupnog računa za struju. Evo kako da je eliminišete.",
    steps: [
      "Identifikujte uređaje koji stalno troše struju (TV, računar, punjači)",
      "Koristite produžne kablove sa prekidačem za grupisanje uređaja",
      "Instalirajte pametne utikače za automatsko isključivanje",
      "Proverite potrošnju nakon mesec dana i uporedite račune",
    ],
    safety_notes: ["Ne isključujte frižider ili zamrzivač iz standby režima"],
    keywords: ["standby", "struja", "ušteda", "utikač", "uređaji", "račun"],
  },
  {
    id: "guide-heating",
    title: "Optimizacija grejanja u stanu",
    topic: "energy",
    summary: "Grejanje je najveći trošak u zimskim mesecima. Optimizacijom možete uštedeti 15–30%.",
    steps: [
      "Postavite termostat na 20–21°C (svaki stepen više = 6% veći račun)",
      "Koristite programabilni termostat za automatsko snižavanje noću",
      "Proverite zaptivenost prozora i vrata",
      "Ne blokirajte radijatore nameštajem",
    ],
    safety_notes: ["Ne smanjujte temperaturu ispod 16°C da biste sprečili vlagu i buđ"],
    keywords: ["grejanje", "termostat", "temperatura", "zima", "stan", "radijator", "izolacija"],
  },
  {
    id: "guide-water-saving",
    title: "Smanjenje potrošnje vode u domaćinstvu",
    topic: "water",
    summary: "Prosečno domaćinstvo može da uštedi 20–40% vode jednostavnim promenama navika.",
    steps: [
      "Instalirajte perlatore na slavine (smanjuju protok za 50%)",
      "Koristite kraće tuširanje (5 min umesto 10 min)",
      "Pokrenite veš mašinu i mašinu za sudove samo kad su pune",
      "Proverite da li slavine cure (kap na 1s = 10.000L godišnje)",
    ],
    safety_notes: ["Perlatori nisu preporučljivi za kuhinjske slavine gde je potreban jak protok"],
    keywords: ["voda", "ušteda", "slavina", "tuš", "perla", "potrošnja"],
  },
  {
    id: "guide-garden-water",
    title: "Efikasno zalivanje bašte",
    topic: "water",
    summary: "Zalivanje bašte može da čini 30–50% letnjeg računa za vodu. Pametno zalivanje drastično smanjuje potrošnju.",
    steps: [
      "Zalivajte rano ujutru ili uveče (manje isparavanje)",
      "Koristite sistem kap po kap umesto prskalica",
      "Instalirajte senzor vlažnosti zemljišta",
      "Koristite malč za zadržavanje vlage",
    ],
    safety_notes: ["Izbegavajte zalivanje lišća u podne – može doći do opekotina"],
    keywords: ["bašta", "dvorište", "zalivanje", "navodnjavanje", "voda", "malč", "vlažnost"],
  },
  {
    id: "guide-leak-prevention",
    title: "Prevencija curenja i poplava",
    topic: "water",
    summary: "Jedno neotkriveno curenje može da prouzrokuje štetu od stotina hiljada dinara. Prevencija je ključna.",
    steps: [
      "Instalirajte senzore curenja pored veš mašine, bojlera i ispod sudopere",
      "Redovno proveravajte cevi u podrumu i kupatilu",
      "Zamenite gumene creva veš mašine svakih 5 godina",
      "Poznajte lokaciju glavnog ventila za vodu",
    ],
    safety_notes: ["Ako primetite vlažne zidove ili podove, odmah pozovite vodoinstalatera"],
    keywords: ["curenje", "poplava", "prevencija", "senzor", "voda", "šteta", "ventil", "cevi"],
  },
  {
    id: "guide-energy-audit",
    title: "Kako uraditi energetski audit doma",
    topic: "energy",
    summary: "Energetski audit pomaže da identifikujete gde gubite najviše energije i novca.",
    steps: [
      "Pregledajte račune za struju za poslednjih 12 meseci",
      "Identifikujte sezonske varijacije u potrošnji",
      "Proverite izolaciju zidova, tavana i podova",
      "Testirajte prozore i vrata na propuštanje vazduha",
      "Instalirajte pametni merač za praćenje u realnom vremenu",
    ],
    safety_notes: ["Za profesionalni audit, angažujte licenciranog energetskog savetnika"],
    keywords: ["audit", "energija", "struja", "izolacija", "potrošnja", "analiza", "račun"],
  },
  {
    id: "guide-appliance-efficiency",
    title: "Izbor energetski efikasnih uređaja",
    topic: "energy",
    summary: "Energetska klasa A+++ troši do 60% manje struje od klase A. Dugoročno se isplati.",
    steps: [
      "Proverite energetsku oznaku pre kupovine",
      "Računajte TCO (ukupni trošak vlasništva) – cena + struja za 10 godina",
      "Prioritet: frižider, veš mašina, bojler (najveći potrošači)",
      "Razmotrite inverter klima uređaje umesto klasičnih",
    ],
    safety_notes: ["Stare uređaje reciklirajte pravilno – ne bacajte u komunalni otpad"],
    keywords: ["uređaji", "energetska klasa", "efikasnost", "frižider", "klima", "veš mašina"],
  },
  {
    id: "guide-composting",
    title: "Kućno kompostiranje za početnike",
    topic: "waste",
    summary: "Kompostiranjem smanjujete otpad za 30% i dobijate besplatno đubrivo za baštu.",
    steps: [
      "Izaberite komposter ili odredite mesto u dvorištu",
      "Dodajte mešavinu zelenog (ostaci hrane) i smeđeg (lišće, karton) materijala",
      "Mešajte kompost jednom nedeljno",
      "Kompost je spreman za 3–6 meseci",
    ],
    safety_notes: ["Ne kompostirajte meso, mlečne proizvode ili bolesne biljke"],
    keywords: ["kompost", "otpad", "bašta", "đubrivo", "reciklaža", "dvorište"],
  },
];

export const allKnowledge: EcoKnowledgeItem[] = [
  ...ecoProducts.map((p) => ({ type: "product" as const, ...p })),
  ...ecoGuides.map((g) => ({ type: "guide" as const, ...g })),
];
