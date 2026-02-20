import { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Loader2, RotateCcw, ExternalLink, Lightbulb, AlertTriangle, Droplets, Zap, TreePine, BrainCircuit, Bolt, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  computeEcoScore,
  parseAIResponse,
  PRODUCT_URL_MAP,
  type QuestionnaireAnswers,
  type AIResponse,
} from "@/lib/eco-score";
import { AdvisorMode } from "@/components/advisor/AdvisorMode";

const questions = [
  { key: "tip_objekta" as const, label: "Tip objekta", options: ["Stan", "Kuća"] },
  { key: "broj_clanova" as const, label: "Broj članova domaćinstva", options: ["1", "2", "3–4", "5+"] },
  { key: "najveci_trosak" as const, label: "Najveći mesečni trošak", options: ["Struja", "Voda", "Oboje"] },
  { key: "dvoriste" as const, label: "Da li imate dvorište ili baštu?", options: ["Da", "Ne"] },
  { key: "glavni_cilj" as const, label: "Glavni cilj", options: ["Smanjenje računa", "Ekološka odgovornost", "Sprečavanje kvarova i štete", "Sve navedeno"] },
];

type AppState = "form" | "loading" | "results" | "error" | "advisor";
type Mode = "quick" | "advisor";

const Index = () => {
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";
  const isDev = searchParams.get("dev") === "1";

  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({});
  const [state, setState] = useState<AppState>("form");
  const [mode, setMode] = useState<Mode>("quick");
  const [result, setResult] = useState<AIResponse | null>(null);
  const [ecoScore, setEcoScore] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    const missing = questions.filter((q) => !answers[q.key]).map((q) => q.key);
    if (missing.length > 0) {
      setValidationErrors(missing);
      return;
    }
    setValidationErrors([]);
    const fullAnswers = answers as QuestionnaireAnswers;

    if (mode === "advisor") {
      setState("advisor");
      return;
    }

    // Quick mode (existing)
    const score = computeEcoScore(fullAnswers);
    setEcoScore(score);
    setState("loading");

    try {
      const { data, error } = await supabase.functions.invoke("eco-check", {
        body: { answers: { ...fullAnswers, eco_score: score } },
      });
      if (error) throw new Error(error.message || "Greška pri pozivu servera");
      if (data?.error) {
        if (data.error === "rate_limit") setErrorMsg("Sistem je trenutno preopterećen. Pokušajte ponovo za nekoliko minuta.");
        else if (data.error === "payment_required") setErrorMsg("Usluga trenutno nije dostupna. Kontaktirajte podršku.");
        else setErrorMsg("Došlo je do greške prilikom generisanja preporuke. Molimo pokušajte ponovo.");
        setState("error");
        return;
      }
      if (data?.mode === "fallback") {
        setIsFallback(true);
        const parsed = parseAIResponse(data.content);
        setResult(parsed);
        setState("results");
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        return;
      }
      setIsFallback(false);
      const parsed = parseAIResponse(data.content);
      setResult(parsed);
      setState("results");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      if (import.meta.env.DEV) console.error("EcoCheck error:", e);
      setErrorMsg("Došlo je do greške prilikom generisanja preporuke. Molimo pokušajte ponovo.");
      setState("error");
    }
  };

  const handleRetry = () => {
    setState("form");
    setResult(null);
    setErrorMsg("");
    setIsFallback(false);
  };

  const priorityColor = (level: string) => {
    switch (level) {
      case "Visok": return "bg-destructive/10 text-destructive border-destructive/20";
      case "Srednji": return "bg-accent text-accent-foreground border-border";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getProductIcon = (name: string) => {
    if (name.includes("termostat")) return <Zap className="h-5 w-5" />;
    if (name.includes("merač") || name.includes("LED")) return <Lightbulb className="h-5 w-5" />;
    if (name.includes("navodnjavanje")) return <TreePine className="h-5 w-5" />;
    if (name.includes("curenja") || name.includes("Senzor")) return <Droplets className="h-5 w-5" />;
    return <Leaf className="h-5 w-5" />;
  };

  return (
    <div className={`min-h-screen bg-background ${isEmbed ? "p-2" : ""}`}>
      {/* Hero - hidden in embed mode */}
      {!isEmbed && (
        <header className="bg-primary text-primary-foreground py-12 px-4 sm:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/logo.png" alt="EcoSense Market logo" className="h-10 w-10" />
              <span className="text-sm font-medium tracking-widest uppercase opacity-80">EcoSense Market</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
              EcoCheck – Pametna preporuka za održiv dom
            </h1>
            <p className="text-lg opacity-90 max-w-xl mx-auto">
              Odgovorite na nekoliko pitanja i saznajte kako da smanjite potrošnju energije i vode.
            </p>
          </div>
        </header>
      )}

      <main className={`max-w-2xl mx-auto px-4 ${isEmbed ? "py-4" : "py-8 sm:py-12"}`}>
        <AnimatePresence mode="wait">
          {/* Form */}
          {(state === "form" || state === "loading") && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl">Vaš upitnik</CardTitle>
                  {/* Mode toggle */}
                  <div className="flex gap-1 mt-3 p-1 bg-muted rounded-lg w-fit">
                    <button
                      onClick={() => setMode("quick")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        mode === "quick" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Bolt className="h-4 w-4" />
                      Brzi rezultat
                    </button>
                    <button
                      onClick={() => setMode("advisor")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        mode === "advisor" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <BrainCircuit className="h-4 w-4" />
                      AI Savetnik
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {questions.map((q) => (
                    <div
                      key={q.key}
                      className={`space-y-3 p-4 rounded-lg transition-colors ${
                        validationErrors.includes(q.key) ? "bg-destructive/10 ring-1 ring-destructive/30" : "bg-muted/30"
                      }`}
                    >
                      <Label className="text-base font-semibold">{q.label}</Label>
                      {validationErrors.includes(q.key) && (
                        <p className="text-sm text-destructive">Molimo izaberite odgovor</p>
                      )}
                      <RadioGroup
                        value={answers[q.key] || ""}
                        onValueChange={(val) => {
                          setAnswers((prev) => ({ ...prev, [q.key]: val }));
                          setValidationErrors((prev) => prev.filter((k) => k !== q.key));
                        }}
                        className="flex flex-wrap gap-2"
                      >
                        {q.options.map((opt) => (
                          <Label
                            key={opt}
                            htmlFor={`${q.key}-${opt}`}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium ${
                              answers[q.key] === opt
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:border-primary/50"
                            }`}
                          >
                            <RadioGroupItem value={opt} id={`${q.key}-${opt}`} className="sr-only" />
                            {opt}
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}

                  <Button onClick={handleSubmit} disabled={state === "loading"} size="lg" className="w-full text-base font-semibold h-14">
                    {state === "loading" ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Analiziramo vaše odgovore...
                      </span>
                    ) : mode === "advisor" ? (
                      <span className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5" />
                        Pokreni AI Savetnika
                      </span>
                    ) : (
                      "Dobij moju EcoCheck preporuku"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Advisor Mode */}
          {state === "advisor" && (
            <motion.div key="advisor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AdvisorMode answers={answers as QuestionnaireAnswers} onReset={handleRetry} />
            </motion.div>
          )}

          {/* Error */}
          {state === "error" && (
            <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="pt-8 text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
                  <p className="text-lg font-medium">{errorMsg}</p>
                  <Button onClick={handleRetry} variant="outline" className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Pokušaj ponovo
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Quick Results */}
          {state === "results" && result && (
            <motion.div key="results" ref={resultsRef} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
              {isFallback && (
                <Card className="border-accent bg-accent/30">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <Info className="h-5 w-5 text-accent-foreground shrink-0" />
                    <p className="text-sm text-accent-foreground">
                      AI servis je trenutno nedostupan — prikazujemo brzi rezultat bez AI.
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <p className="text-lg leading-relaxed">{result.summary}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-lg">Vaš Eco Score</span>
                    <Badge variant="secondary" className="text-lg px-4 py-1 font-bold">{ecoScore}/100</Badge>
                  </div>
                  <Progress value={ecoScore} className="h-3 mb-3" />
                  <p className="text-sm text-muted-foreground">{result.eco_score_interpretation}</p>
                </CardContent>
              </Card>

              {result.top_recommendations.length > 0 ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">Preporučeni proizvodi</h2>
                  {result.top_recommendations.map((rec, i) => (
                    <motion.div key={rec.product_name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
                      <Card>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {getProductIcon(rec.product_name)}
                              <h3 className="font-bold text-lg">{rec.product_name}</h3>
                            </div>
                            <Badge className={priorityColor(rec.priority_level)}>{rec.priority_level}</Badge>
                          </div>
                          <p className="text-muted-foreground">{rec.why}</p>
                          <p className="text-sm font-medium">📊 {rec.estimated_impact}</p>
                          {PRODUCT_URL_MAP[rec.product_name] && (
                            <Button asChild variant="outline" className="gap-2 mt-2">
                              <a href={PRODUCT_URL_MAP[rec.product_name]} target="_blank" rel="noopener noreferrer">
                                Pogledaj proizvod <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card><CardContent className="pt-6 text-center text-muted-foreground">Nema specifičnih preporuka za vaš profil.</CardContent></Card>
              )}

              {result.additional_tips?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-accent-foreground" /> Dodatni saveti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.additional_tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-muted-foreground">
                          <span className="text-primary font-bold">•</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {result.disclaimer && <p className="text-xs text-muted-foreground text-center px-4">{result.disclaimer}</p>}

              <div className="text-center pt-2">
                <Button onClick={handleRetry} variant="ghost" className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Ponovi test
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Embed hint */}
        {!isEmbed && (
          <p className="text-xs text-muted-foreground text-center mt-8">
            Dodaj u WordPress: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">&lt;iframe src="?embed=1"&gt;</code>
          </p>
        )}
      </main>
    </div>
  );
};

export default Index;
