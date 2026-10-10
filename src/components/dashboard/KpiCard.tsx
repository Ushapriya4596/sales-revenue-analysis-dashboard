import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  change: number;
  icon: LucideIcon;
  hint?: string;
}) {
  const up = change >= 0;
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-sm">
          <span className={`inline-flex items-center gap-0.5 font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
            {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">{hint ?? "vs previous period"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
