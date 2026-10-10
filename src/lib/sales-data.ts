export interface SaleRecord {
  orderId: string;
  date: string; // ISO yyyy-mm-dd
  product: string;
  category: string;
  region: string;
  customer: string;
  customerType: "New" | "Returning";
  quantity: number;
  unitPrice: number;
  revenue: number;
  cost: number;
  profit: number;
  channel: string;
}

export const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Home & Kitchen",
  "Beauty",
  "Sports",
  "Grocery",
] as const;

export const REGIONS = ["North", "South", "East", "West", "Central"] as const;

export const CHANNELS = ["Online", "Retail Store", "Wholesale"] as const;

const PRODUCTS: Record<string, { name: string; price: number; costRatio: number }[]> = {
  Electronics: [
    { name: "Wireless Earbuds Pro", price: 2999, costRatio: 0.62 },
    { name: "Smartphone X5", price: 18999, costRatio: 0.7 },
    { name: "Laptop Slim 14", price: 54990, costRatio: 0.74 },
    { name: "Smart Watch Fit", price: 4499, costRatio: 0.58 },
    { name: "Bluetooth Speaker", price: 1899, costRatio: 0.55 },
    { name: "LED Monitor 24\"", price: 9499, costRatio: 0.68 },
  ],
  Clothing: [
    { name: "Cotton Kurti", price: 899, costRatio: 0.5 },
    { name: "Denim Jeans", price: 1499, costRatio: 0.52 },
    { name: "Formal Shirt", price: 1099, costRatio: 0.48 },
    { name: "Winter Jacket", price: 2799, costRatio: 0.55 },
    { name: "Saree - Silk Blend", price: 3499, costRatio: 0.6 },
  ],
  "Home & Kitchen": [
    { name: "Non-Stick Cookware Set", price: 2299, costRatio: 0.57 },
    { name: "Mixer Grinder 750W", price: 3199, costRatio: 0.6 },
    { name: "Air Fryer 4L", price: 6999, costRatio: 0.65 },
    { name: "Cotton Bedsheet Set", price: 1299, costRatio: 0.5 },
    { name: "Steel Water Bottle", price: 499, costRatio: 0.42 },
  ],
  Beauty: [
    { name: "Vitamin C Serum", price: 649, costRatio: 0.4 },
    { name: "Matte Lipstick Set", price: 799, costRatio: 0.38 },
    { name: "Herbal Shampoo 340ml", price: 349, costRatio: 0.45 },
    { name: "Face Moisturizer SPF30", price: 549, costRatio: 0.42 },
  ],
  Sports: [
    { name: "Yoga Mat 6mm", price: 799, costRatio: 0.45 },
    { name: "Cricket Bat English Willow", price: 4999, costRatio: 0.6 },
    { name: "Running Shoes", price: 2499, costRatio: 0.55 },
    { name: "Dumbbell Set 10kg", price: 1899, costRatio: 0.58 },
  ],
  Grocery: [
    { name: "Basmati Rice 5kg", price: 649, costRatio: 0.72 },
    { name: "Cold Pressed Oil 1L", price: 399, costRatio: 0.7 },
    { name: "Organic Honey 500g", price: 449, costRatio: 0.6 },
    { name: "Masala Spice Combo", price: 299, costRatio: 0.55 },
    { name: "Dry Fruits Mix 1kg", price: 999, costRatio: 0.68 },
  ],
};

const FIRST = ["Aarav", "Priya", "Rohan", "Sneha", "Vikram", "Ananya", "Karan", "Divya", "Arjun", "Meera", "Rahul", "Ishita", "Aditya", "Kavya", "Nikhil", "Pooja", "Sandeep", "Ritika", "Manish", "Shreya"];
const LAST = ["Sharma", "Patel", "Iyer", "Khan", "Gupta", "Reddy", "Nair", "Singh", "Mehta", "Das", "Kulkarni", "Joshi", "Verma", "Chopra", "Bose"];

// Deterministic PRNG so the sample dataset is stable between reloads.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSampleData(): SaleRecord[] {
  const rand = mulberry32(20261010);
  const records: SaleRecord[] = [];
  // 24 months: Oct 2024 – Sep 2026 (current + previous year comparison)
  const start = new Date(2024, 9, 1);
  const end = new Date(2026, 9, 1);
  let orderNum = 10001;

  const months: Date[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  months.forEach((month, mi) => {
    // Growth trend over time + festive seasonality (Oct-Nov spike)
    const yearProgress = mi / months.length;
    const festive = month.getMonth() === 9 || month.getMonth() === 10 ? 1.5 : 1;
    const base = 7 + Math.round(yearProgress * 6);
    const count = Math.round(base * festive * (0.85 + rand() * 0.3));

    for (let i = 0; i < count; i++) {
      const cat = CATEGORIES[Math.floor(rand() * CATEGORIES.length)]!;
      const list = PRODUCTS[cat]!;
      const prod = list[Math.floor(rand() * list.length)]!;
      const day = 1 + Math.floor(rand() * 28);
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      const quantity = 1 + Math.floor(rand() * 5);
      const unitPrice = Math.round(prod.price * (0.92 + rand() * 0.16));
      const revenue = unitPrice * quantity;
      const cost = Math.round(revenue * prod.costRatio * (0.95 + rand() * 0.1));
      const customer = `${FIRST[Math.floor(rand() * FIRST.length)]!} ${LAST[Math.floor(rand() * LAST.length)]!}`;
      records.push({
        orderId: `ORD-${orderNum++}`,
        date: date.toISOString().slice(0, 10),
        product: prod.name,
        category: cat,
        region: REGIONS[Math.floor(rand() * REGIONS.length)]!,
        customer,
        customerType: rand() < 0.42 ? "New" : "Returning",
        quantity,
        unitPrice,
        revenue,
        cost,
        profit: revenue - cost,
        channel: CHANNELS[Math.floor(rand() * CHANNELS.length)]!,
      });
    }
  });

  return records.sort((a, b) => a.date.localeCompare(b.date));
}

export function formatINR(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}
