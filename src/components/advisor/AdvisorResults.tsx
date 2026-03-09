import { motion } from "framer-motion";
import { ExternalLink, Lightbulb, ShieldAlert, Zap, Droplets, TreePine, Leaf, ChevronDown, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SimulateImprovements } from "./SimulateImprovements";
import { PRODUCT_URL_MAP, PRODUCT_PRICE_MAP } from "@/lib/eco-score";
import type { AdvisorResponse } from "@/lib/advisorSchema";
import { allKnowledge } from "@/data/ecoKnowledge";

interface Props {
  result: AdvisorResponse;
  ecoScore: number;
  onRegenerate: (newScore: number) => void;
  isRegenerating: boolean;
}

function getProductIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("termostat")) return <Zap className="h-5 w-5" />;
  if (lower.includes("merač") || lower.includes("led") || lower.includes("utikač")) return <Lightbulb className="h-5 w-5" />;
  if (lower.includes("navodnjavanje")) return <TreePine className="h-5 w-5" />;
  if (lower.includes("curenja") || lower.includes("senzor") || lower.includes("vod")) return <Droplets className="h-5 w-5" />;
  if (lower.includes("boca")) return <Droplets className="h-5 w-5" />;
  if (lower.includes("kanta") || lower.includes("reciklaž")) return <Leaf className="h-5 w-5" />;
  return <Leaf className="h-5 w-5" />;
}

function getEvidenceTitle(id: string): string {
  const item = allKnowledge.find((k) => k.id === id);
  return item?.title ?? id;
}

export function AdvisorResults({ result, ecoScore, onRegenerate, isRegenerating }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Eco Score + Drivers */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-lg">Vaš Eco Score</span>
            <Badge variant="secondary" className="text-lg px-4 py-1 font-bold">
              {ecoScore}/100
            </Badge>
          </div>
          <Progress value={ecoScore} className="h-3" />

          {result.eco_score_explanation?.drivers?.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-muted-foreground">Ključni pokretači:</p>
              {result.eco_score_explanation.drivers.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{d.driver}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{d.weight}</Badge>
                    <span className="text-muted-foreground text-xs">{d.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reasoning Summary */}
      {result.reasoning_summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Kako smo došli do ovih preporuka?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.reasoning_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Top akcije za vas</h2>
        {result.recommendations.map((rec, i) => {
          const avgConfidence = rec.confidence;
          // Match products to URL map
          const matchedProduct = rec.products?.find((p) => p in PRODUCT_URL_MAP) || rec.title;
          const productUrl = PRODUCT_URL_MAP[matchedProduct];

          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
            >
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {getProductIcon(rec.title)}
                      <h3 className="font-bold text-lg">{rec.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">P{rec.priority}</Badge>
                      <ConfidenceBadge confidence={avgConfidence} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="secondary">{rec.impact_range}</Badge>
                    <Badge variant="secondary">{rec.effort_level}</Badge>
                    {matchedProduct && PRODUCT_PRICE_MAP[matchedProduct] ? (
                      <Badge variant="secondary" className="font-semibold">{PRODUCT_PRICE_MAP[matchedProduct]}</Badge>
                    ) : (
                      <Badge variant="secondary">{rec.cost_range}</Badge>
                    )}
                  </div>

                  {rec.priority_reason && (
                    <p className="text-sm text-primary font-medium italic">
                      {rec.priority_reason}
                    </p>
                  )}

                  {/* Reasoning accordion */}
                  <Accordion type="single" collapsible>
                    <AccordionItem value="why" className="border-none">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        Zašto ovo preporučujemo?
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {rec.reasoning_bullets.map((b, j) => (
                            <li key={j} className="flex gap-2">
                              <span className="text-primary font-bold">•</span>
                              {b}
                            </li>
                          ))}
                        </ul>

                        {rec.evidence_ids.length > 0 && (
                          <div className="mt-3 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Zasnovano na:</p>
                            <div className="flex flex-wrap gap-1">
                              {rec.evidence_ids.map((eid) => (
                                <Badge key={eid} variant="outline" className="text-xs">
                                  {getEvidenceTitle(eid)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {rec.assumptions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Pretpostavke:</p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {rec.assumptions.map((a, j) => (
                                <li key={j}>⚠ {a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {productUrl && (
                    <Button asChild variant="outline" className="gap-2">
                      <a href={productUrl} target="_blank" rel="noopener noreferrer">
                        Pogledaj proizvod
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Action Plan */}
      {result.action_plan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Akcioni plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.action_plan.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  <Badge variant="outline" className="text-xs mt-1">{step.timeframe}</Badge>
                </div>
              </div>
            ))}

            {result.action_plan.quick_wins.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">⚡ Brze pobede:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {result.action_plan.quick_wins.map((qw, i) => (
                    <li key={i}>• {qw}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Safety Notes */}
      {result.safety_notes?.length > 0 && (
        <Card className="border-border bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-5 w-5 text-accent-foreground" />
              <span className="font-semibold text-sm">Napomene o bezbednosti</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {result.safety_notes.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Simulate */}
      <SimulateImprovements
        baseScore={ecoScore}
        onRegenerate={onRegenerate}
        isLoading={isRegenerating}
      />

      {/* Disclaimer */}
      {result.disclaimer && (
        <p className="text-xs text-muted-foreground text-center px-4">
          {result.disclaimer}
        </p>
      )}
    </motion.div>
  );
}
