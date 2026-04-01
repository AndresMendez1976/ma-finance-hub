// Bank account detail — transactions, reconciliation, CSV import
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { ArrowLeft, Upload, Check, X } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/format';

interface Txn { id: number; date: string; description: string; amount: string; type: string; reference: string | null; reconciled: boolean; journal_entry_id: number | null }
interface TxnResponse { data: Txn[]; pagination: { page: number; total: number; pages: number } }
interface Summary { bank_balance: number; book_balance: number; unreconciled_count: number; unreconciled_amount: number; difference: number }

export default function BankAccountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [txns, setTxns] = useState<TxnResponse | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState('');
  const [page, setPage] = useState(1);

  const loadTxns = useCallback(async (p = 1) => {
    try {
      const qp = new URLSearchParams();
      if (filter) qp.set('reconciled', filter);
      qp.set('page', String(p));
      setTxns(await api.get<TxnResponse>(`/bank-accounts/${id}/transactions?${qp}`));
      setPage(p);
    } catch { /* */ }
  }, [id, filter]);

  const loadSummary = useCallback(async () => {
    try { setSummary(await api.get<Summary>(`/bank-accounts/${id}/reconciliation-summary`)); } catch { /* */ }
  }, [id]);

  useEffect(() => { Promise.all([loadTxns(), loadSummary()]).finally(() => setLoading(false)); }, [loadTxns, loadSummary]);

  const reconcile = async (txnId: number) => {
    try { await api.post(`/bank-transactions/${txnId}/reconcile`, {}); await loadTxns(page); await loadSummary(); }
    catch (e: unknown) { setImportResult((e as Error).message); }
  };

  const unreconcile = async (txnId: number) => {
    try { await api.post(`/bank-transactions/${txnId}/unreconcile`); await loadTxns(page); await loadSummary(); }
    catch (e: unknown) { setImportResult((e as Error).message); }
  };

  const importCsv = async () => {
    if (!csvText.trim()) return;
    try {
      const res = await api.post<{ imported: number; errors: string[] }>(`/bank-accounts/${id}/import-csv`, { csv: csvText });
      setImportResult(`Imported ${res.imported} transactions. ${res.errors.length > 0 ? `Errors: ${res.errors.join('; ')}` : ''}`);
      setCsvText(''); setShowImport(false);
      await loadTxns(1); await loadSummary();
    } catch (e: unknown) { setImportResult((e as Error).message); }
  };

  const fmt = (n: number) => formatCurrency(Math.abs(n));

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/bank-accounts"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-[#2C1810]">Transactions</h1>
      </div>

      {/* Reconciliation summary */}
      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center"><p className="text-xs text-[#5C4033]">Bank Balance</p><p className="text-xl font-bold text-[#2C1810]">{fmt(summary.bank_balance)}</p></CardContent></Card>
          <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center"><p className="text-xs text-[#5C4033]">Book Balance</p><p className="text-xl font-bold text-[#2D6A4F]">{fmt(summary.book_balance)}</p></CardContent></Card>
          <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center"><p className="text-xs text-[#5C4033]">Difference</p><p className={`text-xl font-bold ${summary.difference === 0 ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>{fmt(summary.difference)}</p></CardContent></Card>
          <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center"><p className="text-xs text-[#5C4033]">Unreconciled</p><p className="text-xl font-bold text-[#D4A854]">{summary.unreconciled_count}</p></CardContent></Card>
          <Card className="border-[#E8DCC8]"><CardContent className="pt-4 text-center"><p className="text-xs text-[#5C4033]">Unrec. Amount</p><p className="text-xl font-bold">{fmt(summary.unreconciled_amount)}</p></CardContent></Card>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select value={filter} onChange={(e) => { setFilter(e.target.value); }} className="h-10 rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#2C1810]">
          <option value="">All</option><option value="false">Unreconciled</option><option value="true">Reconciled</option>
        </select>
        <Button variant="outline" onClick={() => loadTxns(1)}>Filter</Button>
        <Button variant="outline" onClick={() => setShowImport(!showImport)}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
      </div>

      {importResult && <div className="mb-3 rounded-md bg-[#2D6A4F]/10 p-2 text-sm text-[#2D6A4F]">{importResult}</div>}

      {showImport && (
        <Card className="mb-4 border-[#D4A854]/30 bg-[#D4A854]/5">
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm text-[#2C1810]">Paste CSV (format: date,description,amount):</p>
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6}
              className="w-full rounded-md border border-[#D4C4A8] bg-white p-3 font-mono text-xs text-[#2C1810]"
              placeholder="2026-01-15,Office supplies,-45.99&#10;2026-01-16,Client payment,1500.00" />
            <div className="flex gap-2"><Button onClick={importCsv}>Import</Button><Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      )}

      {/* Transactions table */}
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          {loading ? <p className="text-center text-[#5C4033]">Loading...</p> : (
            <Table>
              <THead><TR><TH>Date</TH><TH>Description</TH><TH>Type</TH><TH className="text-right">Amount</TH><TH>Ref</TH><TH>Reconciled</TH><TH>Action</TH></TR></THead>
              <TBody>
                {txns?.data.map((t) => (
                  <TR key={t.id}>
                    <TD>{formatDate(t.date)}</TD>
                    <TD>{t.description}</TD>
                    <TD><Badge variant={Number(t.amount) >= 0 ? 'success' : 'warning'}>{t.type}</Badge></TD>
                    <TD className={`text-right font-mono font-bold ${Number(t.amount) >= 0 ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>
                      {Number(t.amount) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(Number(t.amount)))}
                    </TD>
                    <TD className="text-xs">{t.reference || '—'}</TD>
                    <TD>{t.reconciled ? <Badge variant="success">Yes</Badge> : <Badge variant="info">No</Badge>}</TD>
                    <TD>
                      {!t.reconciled ? <Button size="sm" variant="ghost" onClick={() => reconcile(t.id)} title="Reconcile"><Check className="h-4 w-4 text-[#2D6A4F]" /></Button>
                        : <Button size="sm" variant="ghost" onClick={() => unreconcile(t.id)} title="Unreconcile"><X className="h-4 w-4 text-[#E07A5F]" /></Button>}
                    </TD>
                  </TR>
                ))}
                {!txns?.data.length && <TR><TD colSpan={7} className="text-center text-[#5C4033]">No transactions</TD></TR>}
              </TBody>
            </Table>
          )}
          {txns && txns.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#5C4033]">
              <span>Page {page} of {txns.pagination.pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => loadTxns(page - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= txns.pagination.pages} onClick={() => loadTxns(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
