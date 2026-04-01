'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate, formatCurrency } from '@/lib/format';

interface Asset {
  id: number; asset_number: string; name: string; category: string; status: string;
  purchase_date: string; purchase_price: string; book_value: string; salvage_value: string;
  useful_life_months: number; depreciation_method: string; location: string; serial_number: string;
}
interface DepEntry { period: string; depreciation: number; accumulated: number; book_value: number }
interface Maintenance { id: number; title: string; type: string; scheduled_date: string; status: string; cost: string }

export default function AssetDetailPage() {
  const { id } = useParams();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [schedule, setSchedule] = useState<DepEntry[]>([]);
  const [maint, setMaint] = useState<Maintenance[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<Asset>(`/fixed-assets/${id}`).then(setAsset).catch(() => {});
    api.get<DepEntry[]>(`/fixed-assets/${id}/depreciation-schedule`).then(setSchedule).catch(() => {});
    api.get<{ data: Maintenance[] }>(`/fixed-assets/${id}/maintenance`).then((r) => setMaint(r.data)).catch(() => {});
  }, [id]);

  const action = async (act: string) => {
    try {
      await api.post(`/fixed-assets/${id}/${act}`);
      setMsg(`${act} completed`);
      const a = await api.get<Asset>(`/fixed-assets/${id}`);
      setAsset(a);
    } catch (e: unknown) { setMsg((e as Error).message); }
  };

  if (!asset) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">{asset.name} ({asset.asset_number})</h1>
      {msg && <div className="mb-3 rounded-md bg-[#2D6A4F]/10 p-2 text-sm text-[#2D6A4F]">{msg}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Asset Info</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-[#8B7355]">Category</dt><dd>{asset.category}</dd>
              <dt className="text-[#8B7355]">Status</dt><dd>{asset.status}</dd>
              <dt className="text-[#8B7355]">Purchase Date</dt><dd>{formatDate(asset.purchase_date)}</dd>
              <dt className="text-[#8B7355]">Purchase Price</dt><dd className="font-mono">{formatCurrency(asset.purchase_price)}</dd>
              <dt className="text-[#8B7355]">Book Value</dt><dd className="font-mono">{formatCurrency(asset.book_value)}</dd>
              <dt className="text-[#8B7355]">Salvage Value</dt><dd className="font-mono">{formatCurrency(asset.salvage_value)}</dd>
              <dt className="text-[#8B7355]">Method</dt><dd>{asset.depreciation_method}</dd>
              <dt className="text-[#8B7355]">Useful Life</dt><dd>{asset.useful_life_months} months</dd>
              <dt className="text-[#8B7355]">Location</dt><dd>{asset.location}</dd>
              <dt className="text-[#8B7355]">Serial#</dt><dd>{asset.serial_number}</dd>
            </dl>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => action('run-depreciation')}>Run Depreciation</Button>
              <Button size="sm" variant="destructive" onClick={() => action('dispose')}>Dispose</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Book Value Over Time</CardTitle></CardHeader>
          <CardContent>
            {schedule.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={schedule}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC8" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#8B7355' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8B7355' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="book_value" stroke="#2D6A4F" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-[#8B7355]">No schedule data</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Depreciation Schedule</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Period</TH><TH className="text-right">Depreciation</TH><TH className="text-right">Accumulated</TH><TH className="text-right">Book Value</TH></TR></THead>
            <TBody>
              {schedule.map((s, i) => (
                <TR key={i}><TD>{s.period}</TD><TD className="text-right font-mono">{formatCurrency(s.depreciation)}</TD><TD className="text-right font-mono">{formatCurrency(s.accumulated)}</TD><TD className="text-right font-mono">{formatCurrency(s.book_value)}</TD></TR>
              ))}
              {!schedule.length && <TR><TD colSpan={4} className="text-center text-[#8B7355]">No schedule</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Maintenance History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Title</TH><TH>Type</TH><TH>Date</TH><TH>Status</TH><TH className="text-right">Cost</TH></TR></THead>
            <TBody>
              {maint.map((m) => (
                <TR key={m.id}><TD>{m.title}</TD><TD>{m.type}</TD><TD>{formatDate(m.scheduled_date)}</TD><TD>{m.status}</TD><TD className="text-right font-mono">{formatCurrency(m.cost)}</TD></TR>
              ))}
              {!maint.length && <TR><TD colSpan={5} className="text-center text-[#8B7355]">No maintenance records</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
