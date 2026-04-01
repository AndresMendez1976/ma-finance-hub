'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api, extractArray } from '@/lib/api';
import { Plus } from 'lucide-react';
import Link from 'next/link';

interface Schedule {
  id: number; title: string; asset_name: string; frequency: string;
  next_due_date: string; is_active: boolean;
}

export default function MaintenanceSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<unknown>('/maintenance/schedules')
      .then((r) => setSchedules(extractArray<Schedule>(r)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Maintenance Schedules</h1>
        <Link href="/maintenance/schedules/new"><Button><Plus className="mr-2 h-4 w-4" />New Schedule</Button></Link>
      </div>
      <Card>
        <CardHeader><CardTitle>Recurring Schedules</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Title</TH><TH>Asset</TH><TH>Frequency</TH><TH>Next Due</TH><TH>Active</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={5} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && schedules.map((s) => (
                <TR key={s.id}>
                  <TD>{s.title}</TD>
                  <TD>{s.asset_name}</TD>
                  <TD className="capitalize">{s.frequency}</TD>
                  <TD>{s.next_due_date}</TD>
                  <TD>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.is_active ? 'bg-[#2D6A4F] text-white' : 'bg-[#8B7355] text-white'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TD>
                </TR>
              ))}
              {!loading && !schedules.length && <TR><TD colSpan={5} className="text-center text-[#8B7355]">No schedules found</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
