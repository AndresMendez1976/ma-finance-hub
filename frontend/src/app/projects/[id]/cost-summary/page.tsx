// Project Cost Summary — cost code breakdown with variance and progress bars
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CostLine { cost_code: string; cost_code_name: string; budgeted: string; actual: string; variance: string; pct_complete: number }
interface CostSummary { project_name: string; as_of: string; lines: CostLine[]; total_budgeted: string; total_actual: string; total_variance: string }

export default function CostSummaryPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get<CostSummary>(`/projects/${id}/cost-summary`)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!data) return <Shell><p className="text-[#E07A5F]">Cost summary not available</p></Shell>;

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/projects/${id}`}><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-[#5C4033]">{data.project_name} - Cost Summary</h1>
      </div>
      <p className="mb-4 text-sm text-[#8B7355]">As of {formatDate(data.as_of)}</p>
      <Card className="border-[#E8DCC8]">
        <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">Cost by Code</CardTitle></CardHeader>
        <CardContent className="pt-4">
          <Table>
            <THead><TR><TH>Cost Code</TH><TH className="text-right">Budgeted</TH><TH className="text-right">Actual</TH><TH className="text-right">Variance</TH><TH>% Complete</TH></TR></THead>
            <TBody>
              {data.lines.map((l, i) => (
                <TR key={i}>
                  <TD><span className="font-mono text-sm">{l.cost_code}</span> <span className="text-[#8B7355]">{l.cost_code_name}</span></TD>
                  <TD className="text-right font-mono">{formatCurrency(l.budgeted)}</TD>
                  <TD className="text-right font-mono">{formatCurrency(l.actual)}</TD>
                  <TD className={`text-right font-mono ${Number(l.variance) < 0 ? 'text-[#E07A5F]' : 'text-[#2D6A4F]'}`}>{formatCurrency(l.variance)}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-[#E8DCC8]">
                        <div className="h-2 rounded-full bg-[#2D6A4F]" style={{ width: `${Math.min(l.pct_complete, 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono w-10 text-right">{l.pct_complete}%</span>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="mt-4 border-t border-[#E8DCC8] pt-4 flex justify-between font-bold text-[#5C4033]">
            <span>Totals</span>
            <div className="flex gap-8 font-mono">
              <span>{formatCurrency(data.total_budgeted)}</span>
              <span>{formatCurrency(data.total_actual)}</span>
              <span className={Number(data.total_variance) < 0 ? 'text-[#E07A5F]' : 'text-[#2D6A4F]'}>{formatCurrency(data.total_variance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
