'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface PipelineRow {
  id: number; title: string; contact_name: string; stage_name: string;
  value: number; probability: number; expected_close_date: string; status: string;
}

export default function SalesPipelineReportPage() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: PipelineRow[] }>('/reports/sales-pipeline').then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    const header = 'Title,Contact,Stage,Value,Probability,Expected Close,Status\n';
    const csv = rows.map((r) => `"${r.title}","${r.contact_name}","${r.stage_name}",${r.value},${r.probability},${r.expected_close_date},${r.status}`).join('\n');
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'sales-pipeline-report.csv'; link.click();
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Sales Pipeline Report</h1>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          {loading && <p className="text-center text-[#8B7355]">Loading...</p>}
          {!loading && (
            <Table>
              <THead>
                <TR><TH>Title</TH><TH>Contact</TH><TH>Stage</TH><TH className="text-right">Value</TH><TH className="text-right">Probability</TH><TH>Expected Close</TH><TH>Status</TH></TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD>{r.title}</TD><TD>{r.contact_name}</TD><TD>{r.stage_name}</TD>
                    <TD className="text-right font-mono">${Number(r.value).toLocaleString()}</TD>
                    <TD className="text-right">{r.probability}%</TD>
                    <TD>{r.expected_close_date}</TD>
                    <TD><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === 'won' ? 'bg-[#2D6A4F] text-white' : r.status === 'lost' ? 'bg-[#E07A5F] text-white' : 'bg-[#B4D4E7] text-[#5C4033]'}`}>{r.status}</span></TD>
                  </TR>
                ))}
                {!rows.length && <TR><TD colSpan={7} className="text-center text-[#8B7355]">No data</TD></TR>}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
