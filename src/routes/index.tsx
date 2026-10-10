import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BarChart3, Download, IndianRupee, LayoutDashboard, Lightbulb, Menu, Package,
  Percent, RefreshCw, ShoppingCart, Sparkles, TrendingUp, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FiltersBar } from "@/components/dashboard/FiltersBar";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ProductTable } from "@/components/dashboard/ProductTable";
import { DataImporter } from "@/components/dashboard/DataImporter";
import { generateSampleData, formatINR, formatNumber, type SaleRecord } from "@/lib/sales-data";
import {
  ALL, applyFilters, byDimension, customerStats, download, growth, insights, kpis,
  monthlyTrend, previousPeriod, productTable, toCsv, yearComparison, type Filters, type Metric,
} from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sales & Revenue Analysis Dashboard" },
      { name: "description", content: "Interactive dashboard to analyze sales performance, revenue trends, products, customers and regions." },
      { property: "og:title", content: "Sales & Revenue Analysis Dashboard" },
      { property: "og:description", content: "Analyze sales performance, revenue trends, products and customers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const NAV = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "sales", label: "Sales Overview", icon: TrendingUp },
  { id: "products", label: "Products", icon: Package },
  { id: "customers", label: "Customers", icon: Users },
  { id: "regions", label: "Regional Analysis", icon: BarChart3 },
  { id: "insights", label: "Business Insights", icon: Lightbulb },
];

const PIE_COLORS = ["#2563eb", "#0ea5e9", "#6366f1", "#14b8a6", "#f59e0b", "#8b5cf6"];
const METRIC_LABEL: Record<Metric, string> = { revenue: "Revenue", sales: "Sales", profit: "Profit", orders: "Orders" };

const fmtTick = (v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v));

function DashboardPage() {
  const [data, setData] = useState<SaleRecord[]>(() => generateSampleData());
  const bounds = useMemo(
    () => ({ min: data[0]?.date ?? "", max: data[data.length - 1]?.date ?? "" }),
    [data],
  );
  const [filters, setFilters] = useState<Filters>({
    from: bounds.min, to: bounds.max, region: ALL, category: ALL, product: ALL, customerType: ALL, channel: ALL,
  });
  const [trendMetric, setTrendMetric] = useState<Metric>("revenue");
  const [regionMetric, setRegionMetric] = useState<Metric>("revenue");
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const rows = useMemo(() => applyFilters(data, filters), [data, filters]);
  const prev = useMemo(() => previousPeriod(data, filters), [data, filters]);
  const k = useMemo(() => kpis(rows), [rows]);
  const pk = useMemo(() => kpis(prev), [prev]);
  const trend = useMemo(() => monthlyTrend(rows), [rows]);
  const cats = useMemo(() => byDimension(rows, "category"), [rows]);
  const regions = useMemo(() => byDimension(rows, "region"), [rows]);
  const products = useMemo(() => productTable(rows, prev), [rows, prev]);
  const customers = useMemo(() => customerStats(rows), [rows]);
  const yearCmp = useMemo(() => yearComparison(rows, data), [rows, data]);
  const notes = useMemo(() => insights(rows, prev, (n) => formatINR(n, true)), [rows, prev]);
  const options = useMemo(
    () => ({
      regions: [...new Set(data.map((r) => r.region))].sort(),
      categories: [...new Set(data.map((r) => r.category))].sort(),
      products: [...new Set(data.map((r) => r.product))].sort(),
      channels: [...new Set(data.map((r) => r.channel))].sort(),
    }),
    [data],
  );

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setData(generateSampleData());
      setRefreshing(false);
      toast.success("Data refreshed", { description: "Latest sales records loaded." });
    }, 600);
  };

  const exportReport = () => {
    download(`sales-report-${filters.from}-to-${filters.to}.csv`, toCsv(rows));
    toast.success("Report exported", { description: `${rows.length} filtered records downloaded as CSV.` });
  };

  const metricSelect = (value: Metric, onChange: (m: Metric) => void) => (
    <Select value={value} onValueChange={(v) => onChange(v as Metric)}>
      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
      <SelectContent>
        {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
          <SelectItem key={m} value={m}>{METRIC_LABEL[m]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const empty = rows.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 border-r bg-white transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <div className="flex items-center gap-2 font-bold">
            <div className="rounded-lg bg-blue-600 p-1.5 text-white"><BarChart3 className="h-5 w-5" /></div>
            SalesIQ
          </div>
          <button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => scrollTo(n.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
        </nav>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="lg:pl-60">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold sm:text-xl">Sales & Revenue Analysis</h1>
              <p className="hidden text-sm text-muted-foreground sm:block">
                Analyze sales performance, revenue trends, products and customers
              </p>
            </div>
            <DataImporter onImport={(d) => setData(d)} />
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={exportReport} className="bg-blue-600 hover:bg-blue-700">
              <Download className="mr-1.5 h-4 w-4" /> Export Report
            </Button>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6">
          <FiltersBar filters={filters} onChange={setFilters} options={options} />

          {empty ? (
            <div className="rounded-xl border bg-white p-16 text-center text-muted-foreground">
              No records match the current filters. Try widening the date range or resetting filters.
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <section ref={(el) => { sectionRefs.current.overview = el; }} className="scroll-mt-24">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                  <KpiCard title="Total Sales" value={formatNumber(k.sales)} change={growth(k.sales, pk.sales)} icon={ShoppingCart} />
                  <KpiCard title="Total Revenue" value={formatINR(k.revenue)} change={growth(k.revenue, pk.revenue)} icon={IndianRupee} />
                  <KpiCard title="Total Orders" value={formatNumber(k.orders)} change={growth(k.orders, pk.orders)} icon={Package} />
                  <KpiCard title="Avg Order Value" value={formatINR(k.aov)} change={growth(k.aov, pk.aov)} icon={TrendingUp} />
                  <KpiCard title="Total Profit" value={formatINR(k.profit)} change={growth(k.profit, pk.profit)} icon={Sparkles} />
                  <KpiCard title="Profit Margin" value={`${k.margin.toFixed(1)}%`} change={k.margin - pk.margin} icon={Percent} hint="pts vs previous" />
                </div>
              </section>

              {/* Trend + category */}
              <section ref={(el) => { sectionRefs.current.sales = el; }} className="grid scroll-mt-24 grid-cols-1 gap-4 xl:grid-cols-3">
                <ChartCard
                  title="Sales & Revenue Trend"
                  subtitle="Monthly performance over the selected period"
                  action={metricSelect(trendMetric, setTrendMetric)}
                  className="xl:col-span-2"
                >
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tickFormatter={fmtTick} tick={{ fontSize: 12 }} stroke="#94a3b8" width={48} />
                        <Tooltip formatter={(v: number) => trendMetric === "revenue" || trendMetric === "profit" ? formatINR(v) : formatNumber(v)} />
                        <Legend />
                        <Area type="monotone" dataKey={trendMetric} name={METRIC_LABEL[trendMetric]} stroke="#2563eb" strokeWidth={2} fill="url(#trendFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="Sales by Category" subtitle="Revenue contribution">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={cats} dataKey="revenue" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                          {cats.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatINR(v)} />
                        <Legend formatter={(v: string) => {
                          const c = cats.find((x) => x.name === v);
                          return c ? `${v} (${((c.revenue / k.revenue) * 100).toFixed(0)}%)` : v;
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </section>

              {/* Year comparison + regions */}
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartCard title="Monthly Sales Performance" subtitle="Current year vs previous year revenue">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearCmp} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tickFormatter={fmtTick} tick={{ fontSize: 12 }} stroke="#94a3b8" width={48} />
                        <Tooltip formatter={(v: number) => formatINR(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="current" name="Current Year" stroke="#2563eb" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="previous" name="Previous Year" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <div ref={(el) => { sectionRefs.current.regions = el; }} className="scroll-mt-24">
                  <ChartCard
                    title="Regional Sales Analysis"
                    subtitle="Compare regions across metrics"
                    action={metricSelect(regionMetric, setRegionMetric)}
                    className="h-full"
                  >
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={regions} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <YAxis tickFormatter={fmtTick} tick={{ fontSize: 12 }} stroke="#94a3b8" width={48} />
                          <Tooltip formatter={(v: number) => regionMetric === "revenue" || regionMetric === "profit" ? formatINR(v) : formatNumber(v)} />
                          <Bar dataKey={regionMetric} name={METRIC_LABEL[regionMetric]} fill="#2563eb" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>
              </section>

              {/* Products */}
              <section ref={(el) => { sectionRefs.current.products = el; }} className="scroll-mt-24">
                <ChartCard title="Top-Performing Products" subtitle="Ranked by selected metric — top 3 highlighted">
                  <ProductTable rows={products} />
                </ChartCard>
              </section>

              {/* Customers */}
              <section ref={(el) => { sectionRefs.current.customers = el; }} className="grid scroll-mt-24 grid-cols-1 gap-4 xl:grid-cols-3">
                <ChartCard title="Customer Analysis" subtitle="Key customer metrics" className="xl:col-span-2">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {[
                      { label: "Total Customers", value: formatNumber(customers.total) },
                      { label: "New Customers", value: formatNumber(customers.newCustomers) },
                      { label: "Returning Customers", value: formatNumber(customers.returning) },
                      { label: "Repeat Purchase Rate", value: `${customers.repeatRate.toFixed(1)}%` },
                      { label: "Avg Customer Value", value: formatINR(customers.avgValue) },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border bg-slate-50 p-4">
                        <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                        <p className="mt-1 text-xl font-bold">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </ChartCard>
                <ChartCard title="Customer Segments" subtitle="Distribution by segment">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={customers.segments} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                          {customers.segments.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </section>

              {/* Insights */}
              <section ref={(el) => { sectionRefs.current.insights = el; }} className="scroll-mt-24">
                <ChartCard title="AI Business Insights" subtitle="Generated automatically from the current dataset">
                  <ul className="space-y-3">
                    {notes.map((n, i) => (
                      <li key={i} className="flex gap-3 rounded-lg border bg-blue-50/60 p-3.5 text-sm">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </ChartCard>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
