'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ForecastRow {
  account_name: string;
  historical: { month: string; amount: number }[];
  projected: { month: string; amount: number }[];
}
interface ForecastData { rows: ForecastRow[]; chart_data: { month: string; actual?: number; projected?: number }[] }

export default function ForecastPage() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<ForecastData>(`/reports/forecast?months=${months}`);
      setData(res);
    } catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Forecast</h1>
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#5C4033]">Months to Project</label>
            <Input type="number" min={1} max={24} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-24" />
          </div>
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </div>
      </div>

      {data && (
        <>
          <Card className="mb-6">
            <CardHeader><CardTitle>Forecast Chart</CardTitle></CardHeader>
            <CardContent>
              {data.chart_data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DCC8" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8B7355' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8B7355' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#2D6A4F" strokeWidth={2} dot={{ r: 3 }} name="Actual" />
                    <Line type="monotone" dataKey="projected" stroke="#D4A854" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Projected" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-[#5C4033]">No chart data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Account Forecasts</CardTitle></CardHeader>
            <CardContent>
              {data.rows.map((row, i) => (
                <div key={i} className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-[#2C1810]">{row.account_name}</h4>
                  <Table>
                    <THead>
                      <TR>
                        {row.historical.map((h) => <TH key={h.month} className="text-right text-xs">{h.month}</TH>)}
                        {row.projected.map((p) => <TH key={p.month} className="text-right text-xs text-[#D4A854]">{p.month}*</TH>)}
                      </TR>
                    </THead>
                    <TBody>
                      <TR>
                        {row.historical.map((h) => <TD key={h.month} className="text-right font-mono text-xs">${h.amount.toFixed(2)}</TD>)}
                        {row.projected.map((p) => <TD key={p.month} className="text-right font-mono text-xs text-[#D4A854]">${p.amount.toFixed(2)}</TD>)}
                      </TR>
                    </TBody>
                  </Table>
                </div>
              ))}
              {!data.rows.length && <p className="text-center text-[#5C4033]">No forecast data</p>}
            </CardContent>
          </Card>
        </>
      )}
    </Shell>
  );
}
