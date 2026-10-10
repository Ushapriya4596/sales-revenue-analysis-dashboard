import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseRows } from "@/lib/analytics";
import type { SaleRecord } from "@/lib/sales-data";

export function DataImporter({ onImport }: { onImport: (rows: SaleRecord[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      toast.error("Unsupported file format", { description: "Please choose a .csv, .xlsx or .xls file." });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size === 0) {
      toast.error("Empty file", { description: "The selected file contains no data." });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setBusy(true);
    const tid = toast.loading(`Importing ${file.name}…`);
    try {
      let raw: Record<string, unknown>[];
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
        const split = (l: string) => {
          const out: string[] = [];
          let cur = "", q = false;
          for (const ch of l) {
            if (ch === '"') q = !q;
            else if (ch === "," && !q) { out.push(cur); cur = ""; }
            else cur += ch;
          }
          out.push(cur);
          return out.map((s) => s.trim());
        };
        const headers = split(lines[0] ?? "");
        raw = lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [headers[i] ?? `col${i}`, v])));
      } else {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
        raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!]!, { defval: "" });
      }
      const { data, error } = parseRows(raw);
      if (error) {
        toast.error("Import failed", { id: tid, description: error });
      } else if (data) {
        onImport(data);
        toast.success(`Imported ${data.length} rows`, { id: tid, description: `${raw.length - data.length > 0 ? `${raw.length - data.length} invalid rows skipped. ` : ""}Dashboard updated.` });
      }
    } catch {
      toast.error("Import failed", { id: tid, description: "Could not read the file. It may be corrupted or not a valid CSV/Excel file." });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Upload className="mr-1.5 h-4 w-4" /> {busy ? "Importing…" : "Import Data"}
      </Button>
    </>
  );
}
