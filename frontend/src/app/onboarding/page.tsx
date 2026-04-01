'use client';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENCIES = ['USD','EUR','GBP','CAD','MXN','BRL','JPY','CNY','AUD'];
const INDUSTRIES = ['Retail','Manufacturing','Services','Tech','Healthcare','Other'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fiscalStart, setFiscalStart] = useState('1');
  const [currency, setCurrency] = useState('USD');
  const [industry, setIndustry] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const finish = async () => {
    setSaving(true);
    try {
      await api.post('/onboarding', {
        company_name: companyName, address, phone, email,
        fiscal_start_month: Number(fiscalStart), currency, industry,
        bank: bankAccountName ? { name: bankAccountName, account_number: bankAccountNumber, bank_name: bankName } : null,
      });
      setStep(5);
    } catch { /* */ }
    finally { setSaving(false); }
  };

  const pct = ((step - 1) / 4) * 100;

  return (
    <Shell>
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-[#2C1810]">Setup Your Account</h1>
        <p className="mb-4 text-center text-sm text-[#5C4033]">Step {step} of 5</p>
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-[#E8DCC8]">
          <div className="h-full rounded-full bg-[#2D6A4F] transition-all" style={{ width: `${pct}%` }} />
        </div>

        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">
            {step === 1 && 'Company Information'}
            {step === 2 && 'Fiscal Year & Currency'}
            {step === 3 && 'Industry'}
            {step === 4 && 'Bank Account (Optional)'}
            {step === 5 && 'All Done!'}
          </CardTitle></CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-4">
                <div><label className="mb-1 block text-xs font-medium text-[#5C4033]">Company Name</label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company" /></div>
                <div><label className="mb-1 block text-xs font-medium text-[#5C4033]">Address</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" /></div>
                <div><label className="mb-1 block text-xs font-medium text-[#5C4033]">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" /></div>
                <div><label className="mb-1 block text-xs font-medium text-[#5C4033]">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="company@example.com" /></div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <div><label className="mb-1 block text-xs font-medium text-[#5C4033]">Fiscal Year Start Month</label>
                  <select value={fiscalStart} onChange={(e) => setFiscalStart(e.target.value)} className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#2C1810]">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select></div>
                <div><label className="mb-1 block text-xs font-medium text-[#5C4033]">Base Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#2C1810]">
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
              </div>
            )}
            {step === 3 && (
              <div className="grid grid-cols-2 gap-3">
                {INDUSTRIES.map((ind) => (
                  <button key={ind} onClick={() => setIndustry(ind)}
                    className={`rounded-lg border-2 p-4 text-center text-sm font-medium transition-colors ${industry === ind ? 'border-[#2D6A4F] bg-[#2D6A4F]/10 text-[#2D6A4F]' : 'border-[#E8DCC8] text-[#2C1810] hover:border-[#D4A854]'}`}>
                    {ind}
                  </button>
                ))}
              </div>
            )}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-[#5C4033]">You can skip this and add bank accounts later.</p>
                <div><label className="mb-1 block text-xs font-medium text-[#5C4033]">Account Name</label>
                  <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="e.g. Operating Account" /></div>
                <div><label className="mb-1 block text-xs font-medium text-[#5C4033]">Account Number</label>
                  <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Account number" /></div>
                <div><label className="mb-1 block text-xs font-medium text-[#5C4033]">Bank Name</label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" /></div>
              </div>
            )}
            {step === 5 && (
              <div className="py-6 text-center">
                <p className="mb-4 text-4xl text-[#2D6A4F]">&#10003;</p>
                <p className="text-lg font-semibold text-[#2D6A4F]">Setup Complete!</p>
                <p className="mt-2 text-sm text-[#5C4033]">Your account is ready. Head to the dashboard to get started.</p>
                <Button className="mt-6" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
              </div>
            )}
            {step < 5 && (
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={prev} disabled={step === 1}>Back</Button>
                {step < 4 && <Button onClick={next}>Next</Button>}
                {step === 4 && <Button onClick={finish} disabled={saving}>{saving ? 'Saving...' : 'Finish Setup'}</Button>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
