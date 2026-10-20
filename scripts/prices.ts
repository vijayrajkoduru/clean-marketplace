/**
 * Price sheet for editing all prices in Excel or Google Sheets.
 *
 *   npm run prices:export   writes prisma/prices.csv from the database
 *   npm run prices:import   reads prisma/prices.csv and updates the database
 *
 * In the sheet, change only "Price", "Original price" and "Minutes".
 * Leave "Original price" empty to show no crossed-out price.
 * Rows are matched by "Service key" and "Option", so do not edit those two columns.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const FILE = process.env.PRICES_FILE ?? join(process.cwd(), "prisma", "prices.csv");
const HEADER = ["Category", "Service", "Option", "Price", "Original price", "Minutes", "Service key"];
const db = new PrismaClient();

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Parses CSV with quoted fields. Accepts comma or semicolon separators (Excel uses either). */
function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** "₹1,299" or " 1299 " -> 1299. Empty -> null. */
function toInt(v: string | undefined): number | null {
  const s = (v ?? "").replace(/[₹,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
}

async function exportSheet() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { services: { orderBy: { sortOrder: "asc" }, include: { variants: { orderBy: { sortOrder: "asc" } } } } },
  });
  const lines = [HEADER.join(",")];
  let count = 0;
  for (const c of categories) {
    for (const s of c.services) {
      for (const v of s.variants) {
        lines.push([c.name, s.name, v.name, v.price, v.mrp, v.durationMins, s.slug].map(csvCell).join(","));
        count++;
      }
    }
  }
  writeFileSync(FILE, lines.join("\r\n") + "\r\n", "utf8");
  console.log(`Wrote ${count} price options to prisma/prices.csv`);
}

async function importSheet(ifExists: boolean) {
  if (!existsSync(FILE)) {
    if (ifExists) return;
    throw new Error("prisma/prices.csv not found. Run npm run prices:export first.");
  }
  const [head, ...rows] = parseCsv(readFileSync(FILE, "utf8"));
  const col = (name: string) => head.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const iOption = col("Option"), iPrice = col("Price"), iMrp = col("Original price"), iMins = col("Minutes"), iKey = col("Service key");
  if ([iOption, iPrice, iMrp, iMins, iKey].some((i) => i < 0)) throw new Error(`The sheet needs the columns: ${HEADER.join(", ")}`);

  const errors: string[] = [];
  let changed = 0, same = 0;
  for (const [n, r] of rows.entries()) {
    const line = n + 2;
    const slug = (r[iKey] ?? "").trim();
    const option = (r[iOption] ?? "").trim();
    const price = toInt(r[iPrice]);
    const mrp = toInt(r[iMrp]);
    const mins = toInt(r[iMins]);
    if (!slug || !option) { errors.push(`Row ${line}: missing service key or option`); continue; }
    if (price === null || Number.isNaN(price) || price < 1 || price > 500000) { errors.push(`Row ${line} (${option}): price must be a whole number of rupees`); continue; }
    if (mrp !== null && (Number.isNaN(mrp) || mrp < price)) { errors.push(`Row ${line} (${option}): original price must be empty or at least the price`); continue; }
    if (mins === null || Number.isNaN(mins) || mins < 10 || mins > 2880) { errors.push(`Row ${line} (${option}): minutes must be between 10 and 2880`); continue; }
    const variant = await db.serviceVariant.findFirst({ where: { name: option, service: { slug } }, include: { service: { select: { name: true } } } });
    if (!variant) { errors.push(`Row ${line}: no option "${option}" for service key "${slug}"`); continue; }
    if (variant.price === price && variant.mrp === mrp && variant.durationMins === mins) { same++; continue; }
    await db.serviceVariant.update({ where: { id: variant.id }, data: { price, mrp, durationMins: mins } });
    console.log(`  ${variant.service.name} / ${option}: Rs ${variant.price} -> Rs ${price}${mrp ? ` (was Rs ${mrp})` : ""}`);
    changed++;
  }
  console.log(`Updated ${changed} price options, ${same} unchanged.`);
  if (errors.length) {
    console.log(`\n${errors.length} rows were skipped:`);
    for (const e of errors) console.log("  " + e);
    process.exitCode = 1;
  }
  if (changed) console.log("\nRestart the app (or the dev server) so the website shows the new prices.");
}

const [cmd, flag] = process.argv.slice(2);
(cmd === "export" ? exportSheet() : cmd === "import" ? importSheet(flag === "--if-exists") : Promise.reject(new Error("Use: export | import")))
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
