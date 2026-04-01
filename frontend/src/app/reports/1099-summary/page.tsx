// 1099 Summary Report — vendor payments with eligibility
'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, extractArray } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { Download, AlertTriangle } from 'lucide-react';

interface Vendor1099 { vendor_name: string; tax_id_last4: string; total_paid: string; is_1099_eligible: boolean }
interface Report1099 { year: number; data: Vendor1099[]; eligible_count: number; total_eligible_amount: string }

export default function Report1099Page() {
  const [data, setData] = useState<Report1099 | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get<Report1099>(`/reports/1099-summary?year=${year}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [year]);

  const exportCsv = () => {
    if (!data) return;
    const header = 'Vendor,Tax ID (Last 4),Total Paid,1099 Eligible\n';
    const rows = data.data.map((v) => `"${v.vendor_name}",***-${v.tax_id_last4},${v.total_paid},${v.is_1099_eligible ? 'Yes' : 'No'}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `1099-summary-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">1099 Summary</h1>
      <div className="mb-4 rounded-md border border-[#D4A854] bg-[#D4A854]/10 p-3 flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-[#D4A854] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#5C4033]">Tax Reporting Disclaimer</p>
          <p className="text-xs text-[#8B7355]">This report is for informational purposes only and does not constitute tax advice. Verify all amounts with your tax professional before filing. IRS threshold for 1099-NEC is $600.</p>
        </div>
      </div>
      <div className="mb-4 flex gap-3 items-end">
        <div><label className="text-xs font-medium text-[#5C4033]">Tax Year</label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" /></div>
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Run Report'}</Button>
        {data && <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>}
      </div>
      {data && (
        <>
          <div className="mb-4 flex gap-4 text-sm text-[#8B7355]">
            <span>Tax Year: <strong className="text-[#5C4033]">{data.year}</strong></span>
            <span>Eligible Vendors: <strong className="text-[#5C4033]">{data.eligible_count}</strong></span>
            <span>Eligible Total: <strong className="text-[#2D6A4F] font-mono">{formatCurrency(data.total_eligible_amount)}</strong></span>
            <span>Report Date: {formatDate(new Date().toISOString())}</span>
          </div>
          <Card className="border-[#E8DCC8]">
            <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">Vendor Payments — {data.year}</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <Table>
                <THead><TR><TH>Vendor</TH><TH>Tax ID (Last 4)</TH><TH className="text-right">Total Paid</TH><TH>1099 Eligible</TH></TR></THead>
                <TBody>
                  {data.data.map((v, i) => (
                    <TR key={i}>
                      <TD className="font-medium">{v.vendor_name}</TD>
                      <TD className="font-mono text-sm text-[#8B7355]">***-**-{v.tax_id_last4}</TD>
                      <TD className="text-right font-mono font-medium">{formatCurrency(v.total_paid)}</TD>
                      <TD>
                        {v.is_1099_eligible
                          ? <Badge variant="success">Eligible ($600+)</Badge>
                          : <Badge variant="secondary">Below threshold</Badge>
                        }
                      </TD>
                    </TR>
                  ))}
                  {!data.data.length && <TR><TD colSpan={4} className="text-center text-[#8B7355]">No vendor payments found</TD></TR>}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </Shell>
  );
}
