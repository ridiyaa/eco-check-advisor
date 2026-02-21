import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: Props) {
  if (confidence >= 0.7) {
    return (
      <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30">
        <TrendingUp className="h-3 w-3" /> Visok uticaj
      </Badge>
    );
  }
  if (confidence >= 0.4) {
    return (
      <Badge variant="outline" className="gap-1 bg-accent text-accent-foreground border-border">
        <Minus className="h-3 w-3" /> Srednji uticaj
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 bg-destructive/10 text-destructive border-destructive/30">
      <TrendingDown className="h-3 w-3" /> Niži uticaj
    </Badge>
  );
}
