import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL, type Filters } from "@/lib/analytics";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function FiltersBar({
  filters,
  onChange,
  options,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  options: { regions: string[]; categories: string[]; products: string[]; channels: string[] };
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const reset = () =>
    onChange({ from: filters.from, to: filters.to, region: ALL, category: ALL, product: ALL, customerType: ALL, channel: ALL });
  const sel = (key: keyof Filters, label: string, items: string[]) => (
    <Field label={label}>
      <Select value={filters[key] as string} onValueChange={(v) => set({ [key]: v })}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All {label}s</SelectItem>
          {items.map((i) => (
            <SelectItem key={i} value={i}>
              {i}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      <Field label="From">
        <Input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} />
      </Field>
      <Field label="To">
        <Input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} />
      </Field>
      {sel("region", "Region", options.regions)}
      {sel("category", "Category", options.categories)}
      {sel("product", "Product", options.products)}
      {sel("customerType", "Customer Type", ["New", "Returning"])}
      {sel("channel", "Sales Channel", options.channels)}
      <div className="flex items-end">
        <Button variant="outline" className="w-full" onClick={reset}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}
