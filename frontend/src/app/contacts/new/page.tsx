// New contact form — customer, vendor, or both
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function NewContactPage() {
  const router = useRouter();
  const [type, setType] = useState('customer');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!firstName) { setError('First name is required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/contacts', {
        type, first_name: firstName, last_name: lastName || undefined,
        company_name: companyName || undefined, email: email || undefined, phone: phone || undefined,
        address_line1: addressLine1 || undefined, city: city || undefined,
        state: state || undefined, zip: zip || undefined, tax_id: taxId || undefined, notes: notes || undefined,
      });
      router.push('/contacts');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">New Contact</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-[#2C1810]">Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810]">
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-[#2C1810]">First Name *</label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Last Name</label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium text-[#2C1810]">Company</label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-[#2C1810]">Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Phone</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium text-[#2C1810]">Tax ID (EIN/SSN)</label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Address & Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className="text-sm font-medium text-[#2C1810]">Address</label><Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium text-[#2C1810]">City</label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">State</label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">ZIP</label><Input value={zip} onChange={(e) => setZip(e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium text-[#2C1810]">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" />
            </div>
            <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Contact'}</Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
