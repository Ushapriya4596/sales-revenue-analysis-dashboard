import { useState } from "react";
import { ArrowUpDown, Medal } from "lucide-react";
import { formatINR, formatNumber } from "@/lib/sales-data";
import type { ProductRow } from "@/lib/analytics";

type SortKey = "revenue" | "units" | "profit" | "growth";
const COLS: { key: SortKey; label: string }[] = [
  { key: "units", label: "Units Sold" },
  { key: "revenue", label: "Revenue" },
  { key: "profit", label: "Profit" },
  { key: "growth", label: "Growth %" },
];

export function ProductTable({ rows }: { rows: ProductRow[] }) {
  const [sort, setSort] = useState<SortKey>("revenue");
  const sorted = [...rows].sort((a, b) => b[sort] - a[sort]).slice(0, 15);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Rank</th>
            <th className="py-2 pr-3 font-medium">Product</th>
            <th className="py-2 pr-3 font-medium">Category</th>
            {COLS.map((c) => (
              <th key={c.key} className="py-2 pr-3 text-right font-medium">
                <button
                  className={`inline-flex items-center gap-1 hover:text-foreground ${sort === c.key ? "text-foreground" : ""}`}
                  onClick={() => setSort(c.key)}
                >
                  {c.label} <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={p.product} className={`border-b last:border-0 ${i < 3 ? "bg-primary/5" : ""}`}>
              <td className="py-2.5 pr-3">
                <span className="inline-flex items-center gap-1 font-semibold">
                  {i < 3 && <Medal className={`h-4 w-4 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-amber-700"}`} />}
                  {i + 1}
                </span>
              </td>
              <td className="py-2.5 pr-3 font-medium">{p.product}</td>
              <td className="py-2.5 pr-3 text-muted-foreground">{p.category}</td>
              <td className="py-2.5 pr-3 text-right">{formatNumber(p.units)}</td>
              <td className="py-2.5 pr-3 text-right font-medium">{formatINR(p.revenue)}</td>
              <td className="py-2.5 pr-3 text-right">{formatINR(p.profit)}</td>
              <td className={`py-2.5 pr-3 text-right font-medium ${p.growth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {p.growth >= 0 ? "+" : ""}{p.growth.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
