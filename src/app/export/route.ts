/* eslint-disable @typescript-eslint/no-explicit-any -- rows from several tables with different shapes */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/finance";
import { todayLagos } from "@/lib/format";

const QUERIES: Record<string, { table: string; select: string; order: string; head: string[]; row: (r: Record<string, any>) => unknown[] }> = {
  sales: { table: "sale_status", select: "sale_date, customer_name, crates, unit_price, amount, paid, due, notes", order: "sale_date",
    head: ["Date", "Customer", "Crates", "Price per crate", "Amount", "Paid", "Still owed", "Note"],
    row: (r) => [r.sale_date, r.customer_name, r.crates, r.unit_price, r.amount, r.paid, r.due, r.notes] },
  payments: { table: "payments", select: "paid_on, amount, method, notes, customers(name)", order: "paid_on",
    head: ["Date", "Customer", "Amount", "Method", "Note"], row: (r) => [r.paid_on, r.customers?.name, r.amount, r.method, r.notes] },
  customers: { table: "customer_balances", select: "name, phone, crates_bought, total_bought, total_paid, balance, last_sale, last_payment", order: "name",
    head: ["Customer", "Phone", "Crates bought", "Total bought", "Total paid", "Balance owed", "Last sale", "Last payment"],
    row: (r) => [r.name, r.phone, r.crates_bought, r.total_bought, r.total_paid, r.balance, r.last_sale, r.last_payment] },
  expenses: { table: "expenses", select: "spent_on, category, amount, notes", order: "spent_on",
    head: ["Date", "Category", "Amount", "Note"], row: (r) => [r.spent_on, r.category, r.amount, r.notes] },
  stock: { table: "stock_movements", select: "moved_on, kind, crates, unit_cost, supplier, notes", order: "moved_on",
    head: ["Date", "Type", "Crates", "Cost per crate", "Supplier", "Note"], row: (r) => [r.moved_on, r.kind, r.crates, r.unit_cost, r.supplier, r.notes] },
  orders: { table: "orders", select: "created_at, status, crates, unit_price, due_date, notes, customers(name)", order: "created_at",
    head: ["Added", "Customer", "Crates", "Price per crate", "Deliver by", "Status", "Note"],
    row: (r) => [String(r.created_at).slice(0, 10), r.customers?.name, r.crates, r.unit_price, r.due_date, r.status, r.notes] },
};

const cell = (v: unknown) => {
  if (v == null) return "";
  let s = String(v);
  if (/^[=+\-@]/.test(s) && isNaN(Number(s))) s = "'" + s; // stop spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { data: member } = await supabase.from("members").select("role").eq("user_id", user.id).maybeSingle();
  if (member?.role !== "owner") return new NextResponse("Only the owner can download reports.", { status: 403 });

  const type = request.nextUrl.searchParams.get("type") ?? "";
  const q = QUERIES[type];
  if (!q) return new NextResponse("Unknown report", { status: 400 });
  const rows = await fetchAll<Record<string, any>>((a, b) => supabase.from(q.table).select(q.select).order(q.order).range(a, b) as any);
  const csv = "﻿" + [q.head, ...rows.map(q.row)].map((r) => r.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flaky-egg-${type}-${todayLagos()}.csv"`,
    },
  });
}
