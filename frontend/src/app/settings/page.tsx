// Settings / Company Profile page
'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface Settings {
  company_name: string | null; company_email: string | null; company_phone: string | null;
  company_address_line1: string | null; company_address_line2: string | null;
  company_city: string | null; company_state: string | null; company_zip: string | null;
  company_country: string; tax_id: string | null; fiscal_year_start_month: number;
  default_currency: string; invoice_prefix: string; invoice_next_number: number;
  expense_prefix: string; expense_next_number: number;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get<Settings>('/settings').then(setS).catch(() => {}).finally(() => setLoading(false)); }, []);

  const update = (field: keyof Settings, value: string | number) => {
    if (s) setS({ ...s, [field]: value });
  };

  const save = async () => {
    if (!s) return;
    setSaving(true); setMsg('');
    try {
      const res = await api.put<Settings>('/settings', s);
      setS(res); setMsg('Settings saved successfully');
    } catch (e: unknown) { setMsg((e as Error).message); }
    finally { setSaving(false); }
  };

  if (loading) return <Shell><p className="text-[#5C4033]">Loading settings...</p></Shell>;
  if (!s) return <Shell><p className="text-[#E07A5F]">Failed to load settings</p></Shell>;

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold text-[#2C1810]">Settings</h1>
      {msg && <div className={`mb-4 rounded-md p-3 text-sm ${msg.includes('success') ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]' : 'bg-[#E07A5F]/10 text-[#E07A5F]'}`}>{msg}</div>}

      <div className="space-y-6">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="text-sm font-medium text-[#2C1810]">Company Name</label><Input value={s.company_name || ''} onChange={(e) => update('company_name', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Tax ID (EIN)</label><Input value={s.tax_id || ''} onChange={(e) => update('tax_id', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Email</label><Input type="email" value={s.company_email || ''} onChange={(e) => update('company_email', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Phone</label><Input value={s.company_phone || ''} onChange={(e) => update('company_phone', e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium text-[#2C1810]">Address Line 1</label><Input value={s.company_address_line1 || ''} onChange={(e) => update('company_address_line1', e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Address Line 2</label><Input value={s.company_address_line2 || ''} onChange={(e) => update('company_address_line2', e.target.value)} /></div>
            <div className="grid grid-cols-4 gap-3">
              <div><label className="text-sm font-medium text-[#2C1810]">City</label><Input value={s.company_city || ''} onChange={(e) => update('company_city', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">State</label><Input value={s.company_state || ''} onChange={(e) => update('company_state', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">ZIP</label><Input value={s.company_zip || ''} onChange={(e) => update('company_zip', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Country</label><Input value={s.company_country} onChange={(e) => update('company_country', e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Fiscal Configuration</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#2C1810]">Fiscal Year Start Month</label>
              <select value={s.fiscal_year_start_month} onChange={(e) => update('fiscal_year_start_month', parseInt(e.target.value, 10))}
                className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810]">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium text-[#2C1810]">Default Currency</label><Input value={s.default_currency} onChange={(e) => update('default_currency', e.target.value)} /></div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-[#E8DCC8]">
            <CardHeader><CardTitle className="text-[#2C1810]">Invoice Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#2C1810]">Prefix</label><Input value={s.invoice_prefix} onChange={(e) => update('invoice_prefix', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Next Number</label><Input type="number" value={s.invoice_next_number} onChange={(e) => update('invoice_next_number', parseInt(e.target.value, 10) || 1)} min={1} /></div>
            </CardContent>
          </Card>

          <Card className="border-[#E8DCC8]">
            <CardHeader><CardTitle className="text-[#2C1810]">Expense Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#2C1810]">Prefix</label><Input value={s.expense_prefix} onChange={(e) => update('expense_prefix', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Next Number</label><Input type="number" value={s.expense_next_number} onChange={(e) => update('expense_next_number', parseInt(e.target.value, 10) || 1)} min={1} /></div>
            </CardContent>
          </Card>
        </div>

        <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
      </div>
    </Shell>
  );
}
