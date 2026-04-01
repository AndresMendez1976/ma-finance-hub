'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface Summary { total_assets: number; total_value: number; total_depreciation: number }
interface AssetRow { id: number; asset_number: string; name: string; category: string; purchase_price: number; accumulated_depreciation: number; book_value: number; status: string }
interface Report { summary: Summary; assets: AssetRow[] }

export default function FixedAssetsReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Report>('/reports/fixed-assets').then(setReport).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    if (!report) return;
    const header = 'Asset#,Name,Category,Purchase Price,Accumulated Depreciation,Book Value,Status\n';
    const rows = report.assets.map((a) => `${a.asset_number},${a.name},${a.category},${a.purchase_price},${a.accumulated_depreciation},${a.book_value},${a.status}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'fixed-assets-report.csv'; link.click();
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Fixed Assets Report</h1>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>

      {loading && <p className="text-[#5C4033]">Loading...</p>}

      {report && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#5C4033]">Total Assets</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-[#2C1810]">{report.summary.total_assets}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#5C4033]">Total Value</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-[#2D6A4F]">${report.summary.total_value.toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#5C4033]">Total Depreciation</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-[#D4A854]">${report.summary.total_depreciation.toFixed(2)}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <THead><TR><TH>Asset#</TH><TH>Name</TH><TH>Category</TH><TH className="text-right">Purchase Price</TH><TH className="text-right">Accum. Depr.</TH><TH className="text-right">Book Value</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {report.assets.map((a) => (
                    <TR key={a.id}>
                      <TD className="font-mono text-sm">{a.asset_number}</TD><TD>{a.name}</TD><TD>{a.category}</TD>
                      <TD className="text-right font-mono">${a.purchase_price.toFixed(2)}</TD>
                      <TD className="text-right font-mono">${a.accumulated_depreciation.toFixed(2)}</TD>
                      <TD className="text-right font-mono">${a.book_value.toFixed(2)}</TD>
                      <TD>{a.status}</TD>
                    </TR>
                  ))}
                  {!report.assets.length && <TR><TD colSpan={7} className="text-center text-[#5C4033]">No assets</TD></TR>}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </Shell>
  );
}
