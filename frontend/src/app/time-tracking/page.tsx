'use client';
import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { Plus, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/format';

interface TimeEntry {
  id: number; project_id: number; project_name: string; date: string;
  duration_minutes: number; description: string; billable: boolean;
}

function getWeekDates(offset: number): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day === 0 ? 7 : day) - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [timerRunning, setTimerRunning] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: weekDates[0], to: weekDates[6] });
      const res = await api.get<unknown>(`/time-entries?${params}`);
      setEntries(extractArray<TimeEntry>(res)); setInitialLoad(false);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [weekDates]);

  if (initialLoad && !loading) { void load(); }

  // Group by project
  const projects = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    entries.forEach((e) => {
      if (!map.has(e.project_name)) map.set(e.project_name, {});
      const proj = map.get(e.project_name)!;
      proj[e.date] = (proj[e.date] || 0) + e.duration_minutes;
    });
    return Array.from(map.entries()).map(([name, days]) => ({ name, days }));
  }, [entries]);

  const startTimer = async () => {
    setTimerRunning(true);
    try { await api.post('/time-entries/timer/start'); }
    catch { setTimerRunning(false); }
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Time Tracking</h1>
        <div className="flex gap-2">
          <Button size="lg" onClick={startTimer} disabled={timerRunning}
            className="bg-[#2D6A4F] text-white hover:bg-[#40916C]">
            <Timer className="mr-2 h-5 w-5" />{timerRunning ? 'Timer Running...' : 'Start Timer'}
          </Button>
          <Link href="/time-tracking/new"><Button variant="outline"><Plus className="mr-2 h-4 w-4" />Manual Entry</Button></Link>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => { setWeekOffset(weekOffset - 1); setInitialLoad(true); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-[#5C4033]">{formatDate(weekDates[0])} to {formatDate(weekDates[6])}</span>
        <Button size="sm" variant="outline" onClick={() => { setWeekOffset(weekOffset + 1); setInitialLoad(true); }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setWeekOffset(0); setInitialLoad(true); }}>Today</Button>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR>
                <TH>Project</TH>
                {DAY_LABELS.map((d, i) => <TH key={i} className="text-center">{d}<br /><span className="text-xs font-normal">{weekDates[i]?.slice(5)}</span></TH>)}
                <TH className="text-right">Total</TH>
              </TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={9} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && projects.map((p) => {
                const total = weekDates.reduce((s, d) => s + (p.days[d] || 0), 0);
                return (
                  <TR key={p.name}>
                    <TD className="font-medium">{p.name}</TD>
                    {weekDates.map((d) => (
                      <TD key={d} className="text-center font-mono text-sm">
                        {p.days[d] ? (p.days[d] / 60).toFixed(1) : <span className="text-[#8B7355]/40">-</span>}
                      </TD>
                    ))}
                    <TD className="text-right font-mono font-bold">{(total / 60).toFixed(1)}h</TD>
                  </TR>
                );
              })}
              {!loading && projects.length === 0 && (
                <TR><TD colSpan={9} className="text-center text-[#8B7355]">No time entries this week</TD></TR>
              )}
              {!loading && projects.length > 0 && (
                <TR className="bg-[#E8DCC8]/20 font-bold">
                  <TD>Total</TD>
                  {weekDates.map((d) => {
                    const dayTotal = projects.reduce((s, p) => s + (p.days[d] || 0), 0);
                    return <TD key={d} className="text-center font-mono">{dayTotal ? (dayTotal / 60).toFixed(1) : '-'}</TD>;
                  })}
                  <TD className="text-right font-mono">
                    {(projects.reduce((s, p) => s + weekDates.reduce((ss, d) => ss + (p.days[d] || 0), 0), 0) / 60).toFixed(1)}h
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
