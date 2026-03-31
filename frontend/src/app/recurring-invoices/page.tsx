'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Plus, Pause, Play, Zap } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#2D6A4F] text-white',
  paused: 'bg-[#D4A854] text-[#5C4033]',
  ended: 'bg-[#8B7355] text-white',
};

interface RecurringInvoice {
  id: number;
  template_name: string;
  customer_name: string;
  frequency: string;
  next_run_date: string;
  status: string;
  total: string;
}

export default function RecurringInvoicesPage() {
  const [data, setData] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<RecurringInvoice[]>('/recurring-invoices');
      setData(res);
      setInitialLoad(false);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, []);

  if (initialLoad && !loading) { void load(); }

  const toggleStatus = async (id: number, current: string) => {
    const action = current === 'active' ? 'pause' : 'resume';
    await api.post(`/recurring-invoices/${id}/${action}`);
    void load();
  };

  const generateNow = async (id: number) => {
    await api.post(`/recurring-invoices/${id}/generate`);
    void load();
  };

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Recurring Invoices</h1>
        <Link href="/recurring-invoices/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Template</Button>
        </Link>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Template Name</TH><TH>Customer</TH><TH>Frequency</TH><TH>Next Run</TH><TH>Status</TH><TH className="text-right">Total</TH><TH>Actions</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={7} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data.map((ri) => (
                <TR key={ri.id}>
                  <TD className="font-medium">{ri.template_name}</TD>
                  <TD>{ri.customer_name}</TD>
                  <TD className="capitalize">{ri.frequency}</TD>
                  <TD>{ri.next_run_date}</TD>
                  <TD>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[ri.status] || ''}`}>
                      {ri.status}
                    </span>
                  </TD>
                  <TD className="text-right font-mono">${Number(ri.total).toFixed(2)}</TD>
                  <TD>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleStatus(ri.id, ri.status)} title={ri.status === 'active' ? 'Pause' : 'Resume'}>
                        {ri.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => generateNow(ri.id)} title="Generate Now">
                        <Zap className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
              {!loading && data.length === 0 && (
                <TR><TD colSpan={7} className="text-center text-[#8B7355]">No recurring invoices yet</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
