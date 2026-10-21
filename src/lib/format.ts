const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹1,299 */
export function rupees(amount: number): string {
  return `₹${inr.format(amount)}`;
}

const IST = "Asia/Kolkata";

export function formatDate(d: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" }).format(new Date(d));
}

export function formatTime(d: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));
}

export function formatDateTime(d: Date | string): string {
  return `${formatDate(d)}, ${formatTime(d)}`;
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 8 && m === 0 && h % 8 === 0) return `${h / 8} day${h > 8 ? "s" : ""}`;
  return m ? `${h} hr ${m} min` : `${h} hr${h > 1 ? "s" : ""}`;
}

export function maskPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 2)}xxxxxx${phone.slice(8)}` : phone;
}

export function percentOff(price: number, mrp: number | null): number | null {
  if (!mrp || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function parseList<T = string>(json: string | null | undefined): T[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

/** "Haircut (Classic cut, Beard trim x2), Facial (Gold)": each service once, with the options booked. */
export function serviceSummary(items: { serviceName: string; variantName: string; quantity: number }[]): string {
  const groups = new Map<string, string[]>();
  for (const i of items) {
    const options = groups.get(i.serviceName) ?? [];
    options.push(i.quantity > 1 ? `${i.variantName} x${i.quantity}` : i.variantName);
    groups.set(i.serviceName, options);
  }
  return [...groups].map(([name, options]) => `${name} (${options.join(", ")})`).join(", ");
}
