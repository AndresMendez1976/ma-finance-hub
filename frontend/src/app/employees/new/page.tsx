// New Employee form
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', address: '', ssn_last4: '',
    hire_date: new Date().toISOString().slice(0, 10), pay_type: 'salary', pay_rate: '',
    pay_frequency: 'biweekly', department: '', position: '',
    federal_filing_status: 'single', federal_allowances: 0,
    state_filing_status: 'single', state_allowances: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string | number) => setForm({ ...form, [field]: value });

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.pay_rate) {
      setError('First name, last name, email, and pay rate are required'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.post<{ id: number }>('/employees', {
        ...form, pay_rate: parseFloat(form.pay_rate),
      });
      router.push(`/employees/${res.id}`);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const inputClass = "text-sm font-medium text-[#5C4033]";

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Employee</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={inputClass}>First Name *</label><Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} /></div>
              <div><label className={inputClass}>Last Name *</label><Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} /></div>
            </div>
            <div><label className={inputClass}>Email *</label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div><label className={inputClass}>Phone</label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div><label className={inputClass}>Address</label>
              <textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2}
                className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" />
            </div>
            <div><label className={inputClass}>SSN Last 4</label><Input value={form.ssn_last4} onChange={(e) => set('ssn_last4', e.target.value)} maxLength={4} className="w-24" /></div>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Employment Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className={inputClass}>Hire Date</label><Input type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={inputClass}>Pay Type</label>
                <select value={form.pay_type} onChange={(e) => set('pay_type', e.target.value)}
                  className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                  <option value="salary">Salary</option><option value="hourly">Hourly</option>
                </select>
              </div>
              <div><label className={inputClass}>Pay Rate *</label><Input type="number" value={form.pay_rate} onChange={(e) => set('pay_rate', e.target.value)} step={0.01} /></div>
            </div>
            <div><label className={inputClass}>Pay Frequency</label>
              <select value={form.pay_frequency} onChange={(e) => set('pay_frequency', e.target.value)}
                className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                <option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option>
              </select>
            </div>
            <div><label className={inputClass}>Department</label><Input value={form.department} onChange={(e) => set('department', e.target.value)} /></div>
            <div><label className={inputClass}>Position</label><Input value={form.position} onChange={(e) => set('position', e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8] lg:col-span-2">
          <CardHeader><CardTitle className="text-[#5C4033]">Tax Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div><label className={inputClass}>Federal Filing Status</label>
                <select value={form.federal_filing_status} onChange={(e) => set('federal_filing_status', e.target.value)}
                  className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                  <option value="single">Single</option><option value="married">Married</option><option value="head_of_household">Head of Household</option>
                </select>
              </div>
              <div><label className={inputClass}>Federal Allowances</label><Input type="number" value={form.federal_allowances} onChange={(e) => set('federal_allowances', parseInt(e.target.value) || 0)} min={0} /></div>
              <div><label className={inputClass}>State Filing Status</label>
                <select value={form.state_filing_status} onChange={(e) => set('state_filing_status', e.target.value)}
                  className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#5C4033]">
                  <option value="single">Single</option><option value="married">Married</option>
                </select>
              </div>
              <div><label className={inputClass}>State Allowances</label><Input type="number" value={form.state_allowances} onChange={(e) => set('state_allowances', parseInt(e.target.value) || 0)} min={0} /></div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Employee'}</Button>
      </div>
    </Shell>
  );
}
