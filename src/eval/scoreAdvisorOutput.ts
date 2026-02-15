import type { AdvisorResponse } from "@/lib/advisorSchema";
import { allKnowledge } from "@/data/ecoKnowledge";

export interface EvalResult {
  testId: string;
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
}

const validEvidenceIds = new Set(allKnowledge.map((k) => k.id));

export function scoreAdvisorOutput(
  testId: string,
  output: AdvisorResponse,
  expectedConstraints: string[]
): EvalResult {
  const checks: EvalResult["checks"] = [];

  // 1. Has recommendations
  const hasRecs = output.recommendations?.length > 0;
  checks.push({
    name: "has_recommendations",
    passed: hasRecs,
    detail: hasRecs ? `${output.recommendations.length} recommendations` : "No recommendations",
  });

  // 2. All evidence_ids are valid
  const allEvidenceValid = output.recommendations.every((r) =>
    r.evidence_ids.every((eid) => validEvidenceIds.has(eid))
  );
  const invalidIds = output.recommendations
    .flatMap((r) => r.evidence_ids)
    .filter((eid) => !validEvidenceIds.has(eid));
  checks.push({
    name: "valid_evidence_ids",
    passed: allEvidenceValid,
    detail: allEvidenceValid ? "All evidence IDs valid" : `Invalid IDs: ${invalidIds.join(", ")}`,
  });

  // 3. Each recommendation has evidence
  const allHaveEvidence = output.recommendations.every((r) => r.evidence_ids.length > 0);
  checks.push({
    name: "all_have_evidence",
    passed: allHaveEvidence,
    detail: allHaveEvidence ? "All grounded" : "Some recommendations lack evidence",
  });

  // 4. Confidence and assumptions present
  const hasConfidence = output.recommendations.every(
    (r) => typeof r.confidence === "number" && r.confidence >= 0 && r.confidence <= 1
  );
  checks.push({
    name: "has_confidence",
    passed: hasConfidence,
    detail: hasConfidence ? "All have valid confidence" : "Missing or invalid confidence values",
  });

  const hasAssumptions = output.recommendations.every((r) => Array.isArray(r.assumptions));
  checks.push({
    name: "has_assumptions",
    passed: hasAssumptions,
    detail: hasAssumptions ? "All have assumptions array" : "Missing assumptions",
  });

  // 5. No invented products (check against known product titles)
  const knownProducts = new Set(allKnowledge.filter((k) => k.type === "product").map((k) => k.title));
  const inventedProducts = output.recommendations
    .flatMap((r) => r.products || [])
    .filter((p) => !knownProducts.has(p));
  const noInvented = inventedProducts.length === 0;
  checks.push({
    name: "no_invented_products",
    passed: noInvented,
    detail: noInvented ? "All products known" : `Invented: ${inventedProducts.join(", ")}`,
  });

  // 6. Has action_plan
  const hasPlan = output.action_plan?.steps?.length > 0;
  checks.push({
    name: "has_action_plan",
    passed: hasPlan,
    detail: hasPlan ? `${output.action_plan.steps.length} steps` : "No action plan",
  });

  // 7. Has disclaimer
  const hasDisclaimer = !!output.disclaimer?.trim();
  checks.push({
    name: "has_disclaimer",
    passed: hasDisclaimer,
    detail: hasDisclaimer ? "Present" : "Missing disclaimer",
  });

  // 8. Constraint checks (heuristic)
  for (const constraint of expectedConstraints) {
    const lower = constraint.toLowerCase();
    let passed = true;
    let detail = constraint;

    if (lower.includes("no irrigation")) {
      const hasIrrigation = output.recommendations.some(
        (r) => r.title.toLowerCase().includes("navodnjavanje") || r.products?.some((p) => p.toLowerCase().includes("navodnjavanje"))
      );
      passed = !hasIrrigation;
      detail = passed ? "Correctly excluded irrigation" : "Incorrectly included irrigation";
    }

    checks.push({ name: `constraint: ${constraint}`, passed, detail });
  }

  return {
    testId,
    passed: checks.every((c) => c.passed),
    checks,
  };
}
