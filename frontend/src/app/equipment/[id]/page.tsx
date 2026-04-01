// Equipment detail — info, usage history, utilization chart placeholder
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

interface UsageEntry { id: number; date: string; project_name: string; hours: number; cost: string; operator: string | null }
interface Equipment {
  id: number; equipment_number: string; name: string; category: string; make: string | null; model: string | null;
  serial_number: string | null; year: number | null; hourly_rate: string; daily_rate: string | null; monthly_rate: string | null;
  status: string; total_hours: number; total_cost: string; usage: UsageEntry[];
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-[#2D6A4F] text-white', assigned: 'bg-[#D4A854] text-[#5C4033]',
  maintenance: 'bg-[#E07A5F] text-white', retired: 'bg-[#8B7355] text-white',
};

export default function EquipmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [eq, setEq] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setEq(await api.get<Equipment>(`/equipment/${id}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!eq) return <Shell><p className="text-[#E07A5F]">Equipment not found</p></Shell>;

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/equipment"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-[#5C4033]">{eq.equipment_number} — {eq.name}</h1>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[eq.status] || ''}`}>{eq.status}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><span className="text-xs text-[#8B7355]">Category</span><p className="font-medium">{eq.category}</p></div>
            {eq.make && <div><span className="text-xs text-[#8B7355]">Make / Model</span><p>{eq.make} {eq.model || ''}</p></div>}
            {eq.serial_number && <div><span className="text-xs text-[#8B7355]">Serial #</span><p className="font-mono">{eq.serial_number}</p></div>}
            {eq.year && <div><span className="text-xs text-[#8B7355]">Year</span><p>{eq.year}</p></div>}
            <div className="border-t border-[#E8DCC8] pt-2 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Hourly</span><span className="font-mono">{formatCurrency(eq.hourly_rate)}</span></div>
              {eq.daily_rate && <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Daily</span><span className="font-mono">{formatCurrency(eq.daily_rate)}</span></div>}
              {eq.monthly_rate && <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Monthly</span><span className="font-mono">{formatCurrency(eq.monthly_rate)}</span></div>}
            </div>
            <div className="border-t border-[#E8DCC8] pt-2">
              <div className="flex justify-between text-sm font-bold"><span>Total Hours</span><span>{eq.total_hours.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm font-bold"><span>Total Cost</span><span className="font-mono">{formatCurrency(eq.total_cost)}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8] lg:col-span-2">
          <CardHeader><CardTitle className="text-[#5C4033]">Usage History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Date</TH><TH>Project</TH><TH className="text-right">Hours</TH><TH className="text-right">Cost</TH><TH>Operator</TH></TR></THead>
              <TBody>
                {eq.usage?.map((u) => (
                  <TR key={u.id}>
                    <TD>{formatDate(u.date)}</TD>
                    <TD>{u.project_name}</TD>
                    <TD className="text-right font-mono">{u.hours}</TD>
                    <TD className="text-right font-mono">{formatCurrency(u.cost)}</TD>
                    <TD className="text-sm text-[#8B7355]">{u.operator || '—'}</TD>
                  </TR>
                ))}
                {!eq.usage?.length && <TR><TD colSpan={5} className="text-center text-[#8B7355]">No usage records</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4 border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Utilization</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-[#8B7355]">
          <div className="text-center">
            <p className="text-sm">Utilization chart — hours by month</p>
            <p className="text-xs mt-1 text-[#D4A854]">Chart integration pending</p>
            <p className="text-xs mt-2">As of {formatDate(new Date().toISOString())}</p>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
