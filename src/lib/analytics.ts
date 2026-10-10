import type { SaleRecord } from "./sales-data";

export interface Filters {
  from: string;
  to: string;
  region: string;
  category: string;
  product: string;
  customerType: string;
  channel: string;
}

export const ALL = "all";

export function applyFilters(data: SaleRecord[], f: Filters, ignoreDate = false) {
  return data.filter(
    (r) =>
      (ignoreDate || ((!f.from || r.date >= f.from) && (!f.to || r.date <= f.to))) &&
      (f.region === ALL || r.region === f.region) &&
      (f.category === ALL || r.category === f.category) &&
      (f.product === ALL || r.product === f.product) &&
      (f.customerType === ALL || r.customerType === f.customerType) &&
      (f.channel === ALL || r.channel === f.channel),
  );
}

/** Same-length window immediately before [from, to]. */
export function previousPeriod(data: SaleRecord[], f: Filters) {
  if (!f.from || !f.to) return [];
  const from = new Date(f.from);
  const to = new Date(f.to);
  const span = to.getTime() - from.getTime();
  const pTo = new Date(from.getTime() - 86400000);
  const pFrom = new Date(pTo.getTime() - span);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return applyFilters(data, { ...f, from: iso(pFrom), to: iso(pTo) });
}

export function kpis(rows: SaleRecord[]) {
  const revenue = sum(rows, "revenue");
  const sales = sum(rows, "quantity");
  const profit = sum(rows, "profit");
  const orders = new Set(rows.map((r) => r.orderId)).size;
  return {
    revenue,
    sales,
    profit,
    orders,
    aov: orders ? revenue / orders : 0,
    margin: revenue ? (profit / revenue) * 100 : 0,
  };
}
export type Kpis = ReturnType<typeof kpis>;

export function growth(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function sum(rows: SaleRecord[], k: "revenue" | "quantity" | "profit" | "cost") {
  return rows.reduce((a, r) => a + r[k], 0);
}

export type Metric = "revenue" | "sales" | "profit" | "orders";

function metricOf(rows: SaleRecord[], m: Metric) {
  if (m === "orders") return new Set(rows.map((r) => r.orderId)).size;
  if (m === "sales") return sum(rows, "quantity");
  return sum(rows, m);
}

export function groupBy(rows: SaleRecord[], key: (r: SaleRecord) => string) {
  const map = new Map<string, SaleRecord[]>();
  for (const r of rows) {
    const k = key(r);
    if (!map["has"](k)) map["set"](k, []);
    map["get"](k)!.push(r);
  }
  return map;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monthLabel(ym: string) {
  const [y = "", m = "1"] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}

export function monthlyTrend(rows: SaleRecord[]) {
  const g = groupBy(rows, (r) => r.date.slice(0, 7));
  return [...g.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, rs]) => ({
      month: monthLabel(ym),
      revenue: metricOf(rs, "revenue"),
      sales: metricOf(rs, "sales"),
      profit: metricOf(rs, "profit"),
      orders: metricOf(rs, "orders"),
    }));
}

export function byDimension(rows: SaleRecord[], key: "category" | "region") {
  const g = groupBy(rows, (r) => r[key]);
  return [...g.entries()]
    .map(([name, rs]) => ({
      name,
      revenue: metricOf(rs, "revenue"),
      sales: metricOf(rs, "sales"),
      profit: metricOf(rs, "profit"),
      orders: metricOf(rs, "orders"),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function productTable(rows: SaleRecord[], prev: SaleRecord[]) {
  const prevRev = new Map<string, number>();
  for (const r of prev) prevRev.set(r.product, (prevRev.get(r.product) ?? 0) + r.revenue);
  const g = groupBy(rows, (r) => r.product);
  return [...g.entries()].map(([product, rs]) => {
    const revenue = sum(rs, "revenue");
    return {
      product,
      category: rs[0]!.category,
      units: sum(rs, "quantity"),
      revenue,
      profit: sum(rs, "profit"),
      growth: growth(revenue, prevRev.get(product) ?? 0),
    };
  });
}
export type ProductRow = ReturnType<typeof productTable>[number];

/** Current-year vs previous-year monthly revenue, anchored on the latest date in data. */
export function yearComparison(rows: SaleRecord[], all: SaleRecord[]) {
  const latest = all.reduce((m, r) => (r.date > m ? r.date : m), "");
  if (!latest) return [];
  const end = new Date(latest);
  const out = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const pym = `${d.getFullYear() - 1}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      month: MONTHS[d.getMonth()],
      current: sum(rows.filter((r) => r.date.startsWith(ym)), "revenue"),
      previous: sum(rows.filter((r) => r.date.startsWith(pym)), "revenue"),
    });
  }
  return out;
}

export function customerStats(rows: SaleRecord[]) {
  const byCust = groupBy(rows, (r) => r.customer);
  const total = byCust.size;
  const newSet = new Set(rows.filter((r) => r.customerType === "New").map((r) => r.customer));
  const returningSet = new Set(rows.filter((r) => r.customerType === "Returning").map((r) => r.customer));
  let repeat = 0;
  const values: number[] = [];
  for (const rs of byCust.values()) {
    if (new Set(rs.map((r) => r.orderId)).size > 1) repeat++;
    values.push(sum(rs, "revenue"));
  }
  const revenue = sum(rows, "revenue");
  const avg = total ? revenue / total : 0;
  const latest = rows.reduce((m, r) => (r.date > m ? r.date : m), "");
  const cutoff = latest ? new Date(new Date(latest).getTime() - 120 * 86400000).toISOString().slice(0, 10) : "";
  let high = 0, atRisk = 0, newSeg = 0, ret = 0;
  for (const rs of byCust.values()) {
    const v = sum(rs, "revenue");
    const last = rs.reduce((m, r) => (r.date > m ? r.date : m), "");
    if (v >= avg * 2) high++;
    else if (last < cutoff) atRisk++;
    else if (rs.every((r) => r.customerType === "New")) newSeg++;
    else ret++;
  }
  return {
    total,
    newCustomers: newSet.size,
    returning: returningSet.size,
    repeatRate: total ? (repeat / total) * 100 : 0,
    avgValue: avg,
    segments: [
      { name: "New", value: newSeg },
      { name: "Returning", value: ret },
      { name: "High Value", value: high },
      { name: "At Risk", value: atRisk },
    ],
  };
}

export function insights(rows: SaleRecord[], prev: SaleRecord[], fmt: (n: number) => string): string[] {
  if (!rows.length) return [];
  const out: string[] = [];
  const k = kpis(rows);
  const pk = kpis(prev);
  const cats = byDimension(rows, "category");
  const top = cats[0]!;
  out.push(`${top.name} generated the highest revenue (${fmt(top.revenue)}), contributing ${((top.revenue / k.revenue) * 100).toFixed(1)}% of total revenue.`);
  const low = cats[cats.length - 1]!;
  if (cats.length > 1) out.push(`${low.name} is the lowest-performing category at ${((low.revenue / k.revenue) * 100).toFixed(1)}% of revenue.`);
  const prods = productTable(rows, prev).sort((a, b) => b.revenue - a.revenue);
  if (prods[0]) out.push(`Best-performing product: ${prods[0].product} with ${fmt(prods[0].revenue)} in revenue from ${prods[0].units} units.`);
  if (prev.length) {
    const pr = new Map(byDimension(prev, "region").map((r) => [r.name, r.revenue]));
    const reg = byDimension(rows, "region")
      .filter((r) => pr.get(r.name))
      .map((r) => ({ name: r.name, g: growth(r.revenue, pr.get(r.name)!) }))
      .sort((a, b) => b.g - a.g);
    if (reg[0]) out.push(`The ${reg[0].name} region recorded the fastest growth at ${reg[0].g.toFixed(1)}% vs the previous period.`);
    const rg = growth(k.revenue, pk.revenue);
    out.push(`Revenue ${rg >= 0 ? "grew" : "declined"} ${Math.abs(rg).toFixed(1)}% and average order value ${k.aov >= pk.aov ? "increased" : "decreased"} ${Math.abs(growth(k.aov, pk.aov)).toFixed(1)}% compared with the previous period.`);
    const md = k.margin - pk.margin;
    out.push(`Profit margin ${md >= 0 ? "improved" : "slipped"} by ${Math.abs(md).toFixed(1)} percentage points to ${k.margin.toFixed(1)}%.`);
    const falling = prods.filter((p) => p.growth < -20).slice(0, 3);
    if (falling.length) out.push(`Products requiring attention: ${falling.map((p) => `${p.product} (${p.growth.toFixed(0)}%)`).join(", ")}.`);
  }
  const months = monthlyTrend(rows);
  const best = [...months].sort((a, b) => b.revenue - a.revenue)[0];
  if (best) out.push(`${best.month} was the highest-revenue month at ${fmt(best.revenue)}.`);
  return out;
}

const REQUIRED = ["date", "product", "category", "region", "quantity", "revenue"] as const;
const ALIASES: Record<string, string[]> = {
  orderId: ["order id", "orderid", "order_id", "order"],
  date: ["date", "order date", "order_date"],
  product: ["product", "product name", "item"],
  category: ["category"],
  region: ["region", "zone"],
  customer: ["customer", "customer name"],
  customerType: ["customer type", "customertype", "customer_type", "type"],
  quantity: ["quantity", "qty", "units", "sales"],
  unitPrice: ["unit price", "unitprice", "price"],
  revenue: ["revenue", "amount", "total"],
  cost: ["cost"],
  profit: ["profit"],
  channel: ["sales channel", "channel"],
};

function toIsoDate(v: unknown): string {
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function parseRows(raw: Record<string, unknown>[]): { data?: SaleRecord[]; error?: string } {
  if (!raw.length) return { error: "The file has no data rows." };
  const headers = Object.keys(raw[0] ?? {});
  const map: Record<string, string> = {};
  for (const [field, names] of Object.entries(ALIASES)) {
    const h = headers.find((h) => names.includes(h.trim().toLowerCase()));
    if (h) map[field] = h;
  }
  const missing = REQUIRED.filter((r) => !map[r]);
  if (missing.length) return { error: `Missing required columns: ${missing.join(", ")}. Found: ${headers.join(", ")}.` };
  const num = (v: unknown) => Number(String(v ?? "0").replace(/[₹,\s]/g, "")) || 0;
  const data: SaleRecord[] = [];
  raw.forEach((r, i) => {
    const date = toIsoDate(r[map["date"]!]);
    if (!date) return;
    const quantity = num(r[map["quantity"]!]);
    const revenue = num(r[map["revenue"]!]);
    const cost = map["cost"] ? num(r[map["cost"]!]) : map["profit"] ? revenue - num(r[map["profit"]!]) : revenue * 0.6;
    const profit = map["profit"] ? num(r[map["profit"]!]) : revenue - cost;
    const ct = String(r[map["customerType"]!] ?? "").toLowerCase().startsWith("new") ? "New" : "Returning";
    data.push({
      orderId: map["orderId"] ? String(r[map["orderId"]!]) : `ROW-${i + 1}`,
      date,
      product: String(r[map["product"]!]),
      category: String(r[map["category"]!]),
      region: String(r[map["region"]!]),
      customer: map["customer"] ? String(r[map["customer"]!]) : "Unknown",
      customerType: ct,
      quantity,
      unitPrice: map["unitPrice"] ? num(r[map["unitPrice"]!]) : quantity ? revenue / quantity : 0,
      revenue,
      cost,
      profit,
      channel: map["channel"] ? String(r[map["channel"]!]) : "Unknown",
    });
  });
  if (!data.length) return { error: "No rows had a valid date." };
  return { data: data.sort((a, b) => a.date.localeCompare(b.date)) };
}

export function toCsv(rows: SaleRecord[]) {
  const head = ["Order ID", "Date", "Product", "Category", "Region", "Customer", "Customer Type", "Quantity", "Unit Price", "Revenue", "Cost", "Profit", "Sales Channel"];
  const esc = (v: unknown) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [r.orderId, r.date, r.product, r.category, r.region, r.customer, r.customerType, r.quantity, r.unitPrice, r.revenue, r.cost, r.profit, r.channel].map(esc).join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export function download(name: string, content: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
