"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, DollarSign, TrendingUp, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, InvoiceStatus, Matter, Contact } from "@/types";

const statusVariant: Record<InvoiceStatus, "success" | "info" | "warning" | "destructive" | "default" | "secondary"> = {
  paid: "success",
  current: "info",
  "30+": "warning",
  "60+": "destructive",
  "90+": "destructive",
  written_off: "secondary",
};

type AgingBucket = "current" | "30+" | "60+" | "90+";
const agingBuckets: AgingBucket[] = ["current", "30+", "60+", "90+"];

const agingColors: Record<AgingBucket, string> = {
  current: "bg-blue-500",
  "30+": "bg-amber-500",
  "60+": "bg-orange-500",
  "90+": "bg-red-500",
};

const agingIconColors: Record<AgingBucket, string> = {
  current: "text-blue-600 bg-blue-50",
  "30+": "text-amber-600 bg-amber-50",
  "60+": "text-orange-600 bg-orange-50",
  "90+": "text-red-600 bg-red-50",
};

export default function RevenuePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/revenue");
    const data = await res.json();
    setInvoices(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const outstanding = invoices.filter(i => i.status !== "paid" && i.status !== "written_off");
  const totalOutstanding = outstanding.reduce((sum, i) => sum + (i.amount_billed - i.amount_collected), 0);
  const totalBilled = invoices.reduce((sum, i) => sum + i.amount_billed, 0);
  const totalCollected = invoices.reduce((sum, i) => sum + i.amount_collected, 0);
  const overdue90 = invoices.filter(i => i.status === "90+").reduce((sum, i) => sum + (i.amount_billed - i.amount_collected), 0);

  const agingTotals: Record<AgingBucket, number> = {
    current: invoices.filter(i => i.status === "current").reduce((sum, i) => sum + (i.amount_billed - i.amount_collected), 0),
    "30+": invoices.filter(i => i.status === "30+").reduce((sum, i) => sum + (i.amount_billed - i.amount_collected), 0),
    "60+": invoices.filter(i => i.status === "60+").reduce((sum, i) => sum + (i.amount_billed - i.amount_collected), 0),
    "90+": invoices.filter(i => i.status === "90+").reduce((sum, i) => sum + (i.amount_billed - i.amount_collected), 0),
  };

  const statusFilters: Array<InvoiceStatus | "all"> = ["all", "current", "30+", "60+", "90+", "paid"];
  const filtered = invoices.filter(i => statusFilter === "all" || i.status === statusFilter);

  const getClientLabel = (invoice: Invoice) => {
    const matter = invoice.matter as (Matter & { client?: Contact }) | undefined;
    if (!matter) return null;
    const client = matter.client;
    if (!client) return matter.title;
    return client.company ? `${client.name} / ${client.company}` : client.name;
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header
        title="Revenue & Invoices"
        subtitle={loading ? "Loading..." : `${formatCurrency(totalOutstanding)} outstanding AR`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Billed (YTD)</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(totalBilled)}</p>
                </div>
                <div className="rounded-lg p-2 bg-slate-50"><TrendingUp className="h-5 w-5 text-slate-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Collected (YTD)</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(totalCollected)}</p>
                </div>
                <div className="rounded-lg p-2 bg-green-50"><DollarSign className="h-5 w-5 text-green-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Outstanding AR</p>
                  <p className="text-xl font-bold text-amber-700">{formatCurrency(totalOutstanding)}</p>
                </div>
                <div className="rounded-lg p-2 bg-amber-50"><Clock className="h-5 w-5 text-amber-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">90+ Day AR</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(overdue90)}</p>
                </div>
                <div className="rounded-lg p-2 bg-red-50"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aging Breakdown */}
        {!loading && outstanding.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">AR Aging Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {agingBuckets.map(bucket => {
                  const [textColor, bgColor] = agingIconColors[bucket].split(" ");
                  return (
                    <div key={bucket} className="text-center">
                      <div className={`rounded-lg p-3 ${bgColor}`}>
                        <p className={`text-lg font-bold ${textColor}`}>
                          {formatCurrency(agingTotals[bucket])}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {bucket === "current" ? "Current" : `${bucket} Days`}
                        </p>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${agingColors[bucket]} transition-all`}
                          style={{ width: `${totalOutstanding > 0 ? (agingTotals[bucket] / totalOutstanding) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {statusFilters.map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === f
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f === "all" ? "All Invoices" : f}
                </button>
              ))}
            </div>
            <Button size="sm" disabled>
              <Plus className="h-3.5 w-3.5" />
              New Invoice
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              Loading invoices...
            </div>
          )}

          {!loading && invoices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-slate-500 font-medium">No invoices yet</p>
              <p className="text-slate-400 text-sm mt-1">Import invoices via the Import Data page.</p>
            </div>
          )}

          {!loading && invoices.length > 0 && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Invoice #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Matter / Client</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Invoice Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Due Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Billed</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Collected</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(invoice => {
                      const matter = invoice.matter as Matter | undefined;
                      const balance = invoice.amount_billed - invoice.amount_collected;
                      return (
                        <tr key={invoice.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {invoice.invoice_number ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 text-xs">{matter?.title ?? "—"}</p>
                            <p className="text-xs text-slate-500">{getClientLabel(invoice)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant[invoice.status]} className="text-[10px]">
                              {invoice.status === "paid" ? "Paid" : invoice.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(invoice.invoice_date)}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(invoice.due_date)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(invoice.amount_billed)}</td>
                          <td className="px-4 py-3 text-right text-green-700">{formatCurrency(invoice.amount_collected)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${balance > 0 ? "text-red-600" : "text-slate-400"}`}>
                            {balance > 0 ? formatCurrency(balance) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Notes section */}
              {filtered.some(i => i.notes) && (
                <div className="border-t border-slate-100 p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Notes</p>
                  {filtered.filter(i => i.notes).map(i => (
                    <div key={i.id} className="flex gap-2 text-xs">
                      <span className="font-mono text-slate-400 shrink-0">{i.invoice_number ?? i.id.slice(0, 8)}</span>
                      <span className="text-slate-600">{i.notes}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
