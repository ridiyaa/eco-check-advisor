import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircleQuestion, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { FollowUpQuestion } from "@/lib/advisorSchema";

interface Props {
  questions: FollowUpQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  isLoading: boolean;
}

export function FollowUpQuestions({ questions, onSubmit, isLoading }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <MessageCircleQuestion className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">AI postavlja dodatna pitanja</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Da bismo vam dali preciznije preporuke, potrebno nam je još par informacija.
      </p>

      {questions.map((q, i) => (
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{q.question}</CardTitle>
              <p className="text-xs text-muted-foreground italic">{q.why_asking}</p>
            </CardHeader>
            <CardContent>
              {q.type === "single_choice" && q.options ? (
                <RadioGroup
                  value={answers[q.id] || ""}
                  onValueChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                  className="flex flex-wrap gap-2"
                >
                  {q.options.map((opt) => (
                    <Label
                      key={opt}
                      htmlFor={`fu-${q.id}-${opt}`}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium ${
                        answers[q.id] === opt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={opt} id={`fu-${q.id}-${opt}`} className="sr-only" />
                      {opt}
                    </Label>
                  ))}
                </RadioGroup>
              ) : (
                <Input
                  placeholder="Vaš odgovor..."
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      <Button
        onClick={() => onSubmit(answers)}
        disabled={!allAnswered || isLoading}
        size="lg"
        className="w-full text-base font-semibold h-14 gap-2"
      >
        <Send className="h-5 w-5" />
        {isLoading ? "Generišemo plan..." : "Dobij moj personalizovani plan"}
      </Button>
    </motion.div>
  );
}
