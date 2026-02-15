import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

interface Props {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: Props) {
  if (confidence >= 0.7) {
    return (
      <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30">
        <ShieldCheck className="h-3 w-3" /> Visoka pouzdanost
      </Badge>
    );
  }
  if (confidence >= 0.4) {
    return (
      <Badge variant="outline" className="gap-1 bg-accent text-accent-foreground border-border">
        <ShieldAlert className="h-3 w-3" /> Srednja pouzdanost
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 bg-destructive/10 text-destructive border-destructive/30">
      <ShieldQuestion className="h-3 w-3" /> Niska pouzdanost
    </Badge>
  );
}
