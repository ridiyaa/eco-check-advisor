import { useState } from "react";
import { testCases } from "@/eval/testCases";
import { scoreAdvisorOutput, type EvalResult } from "@/eval/scoreAdvisorOutput";
import { computeEcoScore } from "@/lib/eco-score";
import { retrieveKnowledge } from "@/lib/retrieval";
import { AdvisorResponseSchema } from "@/lib/advisorSchema";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function DevEval() {
  const [results, setResults] = useState<(EvalResult & { persona: string; error?: string })[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runAll = async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      setProgress(i + 1);

      try {
        const score = computeEcoScore(tc.answers);
        const evidence = retrieveKnowledge(tc.answers, tc.followUpAnswers);

        const { data, error } = await supabase.functions.invoke("advisor", {
          body: {
            answers: tc.answers,
            ecoScore: score,
            followUpAnswers: tc.followUpAnswers,
            requestedStep: "generate_plan",
            retrievedEvidence: evidence,
          },
        });

        if (error || data?.error) {
          setResults((prev) => [
            ...prev,
            { testId: tc.id, persona: tc.persona, passed: false, checks: [], error: data?.error || error?.message },
          ]);
          continue;
        }

        const parsed = AdvisorResponseSchema.safeParse(data.content);
        if (!parsed.success) {
          setResults((prev) => [
            ...prev,
            { testId: tc.id, persona: tc.persona, passed: false, checks: [], error: `Zod: ${parsed.error.message.substring(0, 200)}` },
          ]);
          continue;
        }

        const evalResult = scoreAdvisorOutput(tc.id, parsed.data, tc.expectedConstraints);
        setResults((prev) => [...prev, { ...evalResult, persona: tc.persona }]);
      } catch (e) {
        setResults((prev) => [
          ...prev,
          { testId: tc.id, persona: tc.persona, passed: false, checks: [], error: String(e) },
        ]);
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 2000));
    }

    setRunning(false);
  };

  const passCount = results.filter((r) => r.passed).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">EcoCheck Advisor – Dev Eval</h1>
      <p className="text-muted-foreground mb-6">
        {testCases.length} test cases. Pokreće "generate_plan" za svaki i heuristički ocenjuje izlaz.
      </p>

      <Button onClick={runAll} disabled={running} size="lg" className="mb-6 gap-2">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {running ? `Pokrećem ${progress}/${testCases.length}...` : "Pokreni sve testove"}
      </Button>

      {results.length > 0 && (
        <div className="mb-4">
          <Badge variant={passCount === results.length ? "default" : "destructive"} className="text-sm">
            {passCount}/{results.length} passed
          </Badge>
        </div>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Card key={r.testId} className={r.passed ? "border-primary/30" : "border-destructive/30"}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>
                  {r.testId}: {r.persona}
                </span>
                <Badge variant={r.passed ? "default" : "destructive"}>{r.passed ? "PASS" : "FAIL"}</Badge>
              </CardTitle>
            </CardHeader>
            {(r.error || r.checks.some((c) => !c.passed)) && (
              <CardContent className="pt-0">
                {r.error && <p className="text-sm text-destructive mb-2">{r.error}</p>}
                {r.checks
                  .filter((c) => !c.passed)
                  .map((c, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      ✗ {c.name}: {c.detail}
                    </p>
                  ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
