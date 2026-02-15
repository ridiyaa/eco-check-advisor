import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const improvements = [
  { id: "led", label: "Prešao/la na LED osvetljenje", bonus: 8 },
  { id: "leak", label: "Popravljeno curenje vode", bonus: 6 },
  { id: "standby", label: "Smanjen standby potrošnja", bonus: 5 },
  { id: "thermostat", label: "Instaliran pametni termostat", bonus: 10 },
  { id: "irrigation", label: "Instalirano pametno navodnjavanje", bonus: 7 },
];

interface Props {
  baseScore: number;
  onRegenerate: (newScore: number) => void;
  isLoading: boolean;
}

export function SimulateImprovements({ baseScore, onRegenerate, isLoading }: Props) {
  const [checked, setChecked] = useState<string[]>([]);

  const bonus = improvements
    .filter((i) => checked.includes(i.id))
    .reduce((sum, i) => sum + i.bonus, 0);
  const newScore = Math.min(100, baseScore + bonus);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Simuliraj poboljšanja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {improvements.map((imp) => (
            <Label
              key={imp.id}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Checkbox
                checked={checked.includes(imp.id)}
                onCheckedChange={(val) =>
                  setChecked((prev) =>
                    val ? [...prev, imp.id] : prev.filter((id) => id !== imp.id)
                  )
                }
              />
              <span className="text-sm">{imp.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                +{imp.bonus}
              </Badge>
            </Label>
          ))}
        </div>

        {checked.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Novi Eco Score</span>
              <Badge variant="secondary" className="text-lg px-4 py-1 font-bold">
                {newScore}/100
              </Badge>
            </div>
            <Progress value={newScore} className="h-3" />
            <Button
              onClick={() => onRegenerate(newScore)}
              disabled={isLoading}
              variant="outline"
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isLoading ? "Regenerišem plan..." : "Regeneriši plan sa novim score-om"}
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
