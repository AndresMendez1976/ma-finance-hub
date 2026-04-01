// Equipment Cost Report — cost by equipment and project
'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';

interface EquipCostLine { equipment_number: string; equipment_name: string; project_name: string; hours: number; hourly_rate: string; total_cost: string }
interface EquipCostReport { data: EquipCostLine[]; totals: { total_hours: number; total_cost: string } }

export default function EquipmentCostReportPage() {
  const [data, setData] = useState<EquipCostReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      setData(await api.get<EquipCostReport>(`/reports/equipment-cost?${params}`));
    } catch { /* */ }
    finally { setLoading(false); }
  }, [startDate, endDate]);

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">Equipment Cost Report</h1>
      <div className="mb-4 flex gap-3 items-end">
        <div><label className="text-xs font-medium text-[#5C4033]">Start Date</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" /></div>
        <div><label className="text-xs font-medium text-[#5C4033]">End Date</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" /></div>
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Run Report'}</Button>
      </div>
      {data && (
        <Card className="border-[#E8DCC8]">
          <CardHeader className="bg-[#E8DCC8]/30">
            <CardTitle className="text-[#5C4033]">
              Cost by Equipment & Project{startDate && ` | ${formatDate(startDate)} - ${formatDate(endDate)}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <THead><TR><TH>Equipment #</TH><TH>Equipment</TH><TH>Project</TH><TH className="text-right">Hours</TH><TH className="text-right">Rate</TH><TH className="text-right">Total Cost</TH></TR></THead>
              <TBody>
                {data.data.map((d, i) => (
                  <TR key={i}>
                    <TD className="font-mono text-sm">{d.equipment_number}</TD>
                    <TD className="font-medium">{d.equipment_name}</TD>
                    <TD>{d.project_name}</TD>
                    <TD className="text-right font-mono">{d.hours}</TD>
                    <TD className="text-right font-mono">{formatCurrency(d.hourly_rate)}/hr</TD>
                    <TD className="text-right font-mono font-medium">{formatCurrency(d.total_cost)}</TD>
                  </TR>
                ))}
                {!data.data.length && <TR><TD colSpan={6} className="text-center text-[#8B7355]">No data</TD></TR>}
              </TBody>
            </Table>
            <div className="mt-4 border-t border-[#E8DCC8] pt-3 flex justify-between font-bold text-[#5C4033]">
              <span>Totals: {data.totals.total_hours.toLocaleString()} hours</span>
              <span className="font-mono">{formatCurrency(data.totals.total_cost)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
