import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { computeEcoScore, type QuestionnaireAnswers } from "@/lib/eco-score";
import { retrieveKnowledge } from "@/lib/retrieval";
import { FollowUpResponseSchema, AdvisorResponseSchema, type FollowUpQuestion, type AdvisorResponse } from "@/lib/advisorSchema";
import { FollowUpQuestions } from "./FollowUpQuestions";
import { AdvisorResults } from "./AdvisorResults";

type AdvisorState = "idle" | "loading_followups" | "followups" | "loading_plan" | "results" | "error";

interface Props {
  answers: QuestionnaireAnswers;
  onReset: () => void;
}

export function AdvisorMode({ answers, onReset }: Props) {
  const [state, setState] = useState<AdvisorState>("idle");
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [result, setResult] = useState<AdvisorResponse | null>(null);
  const [ecoScore, setEcoScore] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleError = (msg: string) => {
    setErrorMsg(msg);
    setState("error");
  };

  const callAdvisor = async (
    step: "generate_followups" | "generate_plan",
    fuAnswers?: Record<string, string>,
    overrideScore?: number
  ) => {
    const score = overrideScore ?? computeEcoScore(answers);
    setEcoScore(score);

    const evidence = retrieveKnowledge(answers, fuAnswers);

    if (import.meta.env.DEV) {
      console.log(`[Advisor] Step: ${step}, Evidence:`, evidence);
    }

    try {
      const { data, error } = await supabase.functions.invoke("advisor", {
        body: {
          answers,
          ecoScore: score,
          followUpAnswers: fuAnswers || {},
          requestedStep: step,
          retrievedEvidence: evidence,
        },
      });

      if (error) throw new Error(error.message || "Greška pri pozivu servera");

      if (data?.error) {
        if (data.error === "rate_limit") {
          handleError("Sistem je trenutno preopterećen. Pokušajte ponovo za nekoliko minuta.");
        } else if (data.error === "payment_required") {
          handleError("Usluga trenutno nije dostupna. Kontaktirajte podršku.");
        } else if (data.error === "invalid_json") {
          handleError("AI nije vratio validan odgovor. Pokušajte ponovo.");
        } else if (data.error === "upstream_5xx") {
          handleError("AI servis je privremeno nedostupan (server greška). Pokušajte ponovo za minut.");
        } else {
          handleError("Došlo je do greške. Molimo pokušajte ponovo.");
        }
        return null;
      }

      return data.content;
    } catch (e) {
      if (import.meta.env.DEV) console.error("[Advisor] Error:", e);
      handleError("Došlo je do greške prilikom komunikacije sa AI savetkom. Molimo pokušajte ponovo.");
      return null;
    }
  };

  const startAdvisor = async () => {
    setState("loading_followups");

    const content = await callAdvisor("generate_followups");
    if (!content) return;

    const parsed = FollowUpResponseSchema.safeParse(content);
    if (!parsed.success) {
      if (import.meta.env.DEV) console.error("[Advisor] Follow-up parse error:", parsed.error, "Raw:", content);
      handleError("AI odgovor nije u očekivanom formatu. Pokušajte ponovo.");
      return;
    }
    if (parsed.data.follow_up_questions.length > 0) {
      setFollowUpQuestions(parsed.data.follow_up_questions);
      setState("followups");
    } else {
      await generatePlan({});
    }
  };

  const generatePlan = async (fuAnswers: Record<string, string>, overrideScore?: number) => {
    setFollowUpAnswers(fuAnswers);
    setState("loading_plan");

    const content = await callAdvisor("generate_plan", fuAnswers, overrideScore);
    if (!content) return;

    const parsed = AdvisorResponseSchema.safeParse(content);
    if (!parsed.success) {
      if (import.meta.env.DEV) console.error("[Advisor] Plan parse error:", parsed.error, "Raw:", content);
      handleError("AI odgovor nije u očekivanom formatu. Pokušajte ponovo.");
      return;
    }
    setResult(parsed.data);
    setState("results");
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleRegenerate = async (newScore: number) => {
    await generatePlan(followUpAnswers, newScore);
  };

  // Auto-start on mount
  if (state === "idle") {
    startAdvisor();
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {(state === "loading_followups" || state === "loading_plan") && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <p className="text-lg font-medium">
                  {state === "loading_followups"
                    ? "AI analizira vaše odgovore..."
                    : "AI generiše personalizovani plan..."}
                </p>
                <p className="text-sm text-muted-foreground">Ovo može potrajati do 15 sekundi</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {state === "followups" && (
          <motion.div key="followups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FollowUpQuestions
              questions={followUpQuestions}
              onSubmit={(ans) => generatePlan(ans)}
              isLoading={false}
            />
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-8 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
                <p className="text-lg font-medium">{errorMsg}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => { setState("idle"); }} variant="default" className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Pokušaj ponovo
                  </Button>
                  <Button onClick={onReset} variant="outline">
                    Nazad na upitnik
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {state === "results" && result && (
          <div ref={resultsRef} key="results">
            <AdvisorResults
              result={result}
              ecoScore={ecoScore}
              onRegenerate={handleRegenerate}
              isRegenerating={false}
            />
            <div className="text-center pt-4">
              <Button onClick={onReset} variant="ghost" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Ponovi test
              </Button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
