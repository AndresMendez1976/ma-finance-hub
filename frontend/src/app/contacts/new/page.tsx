'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { User, Mail, MapPin, Truck, CreditCard, StickyNote } from 'lucide-react';

const PREFIXES = ['', 'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];
const SOURCES = ['', 'Referral', 'Website', 'Cold Call', 'Trade Show', 'Other'];
const inputCls = 'flex h-10 w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]';

export default function NewContactPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const [f, setF] = useState({
    type: 'customer', prefix: '', first_name: '', middle_name: '', last_name: '',
    company_name: '', job_title: '',
    email: '', secondary_email: '', phone: '', mobile: '', fax: '', website: '',
    bill_line1: '', bill_line2: '', bill_city: '', bill_state: '', bill_zip: '', bill_country: 'US',
    ship_line1: '', ship_line2: '', ship_city: '', ship_state: '', ship_zip: '', ship_country: 'US',
    payment_terms: 'Net 30', credit_limit: '', account_number: '', tax_id: '',
    notes: '', tags: '', source: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [field]: e.target.value }));

  const save = async () => {
    if (!f.first_name) { setError('First name is required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/contacts', {
        type: f.type, first_name: f.first_name, last_name: f.last_name || undefined,
        middle_name: f.middle_name || undefined, prefix: f.prefix || undefined,
        company_name: f.company_name || undefined, job_title: f.job_title || undefined,
        email: f.email || undefined, secondary_email: f.secondary_email || undefined,
        phone: f.phone || undefined, mobile: f.mobile || undefined,
        fax: f.fax || undefined, website: f.website || undefined,
        address_line1: f.bill_line1 || undefined, address_line2: f.bill_line2 || undefined,
        city: f.bill_city || undefined, state: f.bill_state || undefined,
        zip: f.bill_zip || undefined, country: f.bill_country || undefined,
        shipping_line1: sameAsBilling ? f.bill_line1 : f.ship_line1 || undefined,
        shipping_line2: sameAsBilling ? f.bill_line2 : f.ship_line2 || undefined,
        shipping_city: sameAsBilling ? f.bill_city : f.ship_city || undefined,
        shipping_state: sameAsBilling ? f.bill_state : f.ship_state || undefined,
        shipping_zip: sameAsBilling ? f.bill_zip : f.ship_zip || undefined,
        shipping_country: sameAsBilling ? f.bill_country : f.ship_country || undefined,
        payment_terms: f.payment_terms || undefined,
        credit_limit: f.credit_limit ? parseFloat(f.credit_limit) : undefined,
        account_number: f.account_number || undefined, tax_id: f.tax_id || undefined,
        notes: f.notes || undefined, tags: f.tags ? f.tags.split(',').map((t) => t.trim()) : undefined,
        source: f.source || undefined,
      });
      router.push('/contacts');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base" style={{ color: '#2C1810' }}>
        <Icon className="h-4 w-4" style={{ color: '#8B5E3C' }} />{title}
      </CardTitle>
    </CardHeader>
  );

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold" style={{ color: '#2C1810' }}>New Contact</h1>
      {error && <div className="mb-4 rounded-md p-3 text-sm" style={{ backgroundColor: '#E07A5F20', color: '#E07A5F' }}>{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Basic Info */}
        <Card className="border-[#E8DCC8]">
          <SectionHeader icon={User} title="Basic Info" />
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Type *</label>
              <select value={f.type} onChange={set('type')} className={inputCls}>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Prefix</label>
                <select value={f.prefix} onChange={set('prefix')} className={inputCls}>
                  {PREFIXES.map((p) => <option key={p} value={p}>{p || '---'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>First *</label>
                <Input value={f.first_name} onChange={set('first_name')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Middle</label>
                <Input value={f.middle_name} onChange={set('middle_name')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Last</label>
                <Input value={f.last_name} onChange={set('last_name')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Company</label>
                <Input value={f.company_name} onChange={set('company_name')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Job Title</label>
                <Input value={f.job_title} onChange={set('job_title')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card className="border-[#E8DCC8]">
          <SectionHeader icon={Mail} title="Contact Details" />
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Email</label>
                <Input type="email" value={f.email} onChange={set('email')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Secondary Email</label>
                <Input type="email" value={f.secondary_email} onChange={set('secondary_email')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Phone</label>
                <Input value={f.phone} onChange={set('phone')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Mobile</label>
                <Input value={f.mobile} onChange={set('mobile')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Fax</label>
                <Input value={f.fax} onChange={set('fax')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Website</label>
                <Input value={f.website} onChange={set('website')} placeholder="https://" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card className="border-[#E8DCC8]">
          <SectionHeader icon={MapPin} title="Billing Address" />
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Line 1</label>
              <Input value={f.bill_line1} onChange={set('bill_line1')} />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Line 2</label>
              <Input value={f.bill_line2} onChange={set('bill_line2')} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>City</label>
                <Input value={f.bill_city} onChange={set('bill_city')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>State</label>
                <Input value={f.bill_state} onChange={set('bill_state')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>ZIP</label>
                <Input value={f.bill_zip} onChange={set('bill_zip')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Country</label>
                <Input value={f.bill_country} onChange={set('bill_country')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card className="border-[#E8DCC8]">
          <SectionHeader icon={Truck} title="Shipping Address" />
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm" style={{ color: '#2C1810' }}>
              <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)}
                className="h-4 w-4 rounded border-[#C4B5A0]" />
              Same as billing address
            </label>
            {!sameAsBilling && (
              <>
                <div>
                  <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Line 1</label>
                  <Input value={f.ship_line1} onChange={set('ship_line1')} />
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Line 2</label>
                  <Input value={f.ship_line2} onChange={set('ship_line2')} />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#2C1810' }}>City</label>
                    <Input value={f.ship_city} onChange={set('ship_city')} />
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#2C1810' }}>State</label>
                    <Input value={f.ship_state} onChange={set('ship_state')} />
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#2C1810' }}>ZIP</label>
                    <Input value={f.ship_zip} onChange={set('ship_zip')} />
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Country</label>
                    <Input value={f.ship_country} onChange={set('ship_country')} />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Financial */}
        <Card className="border-[#E8DCC8]">
          <SectionHeader icon={CreditCard} title="Financial" />
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Payment Terms</label>
                <select value={f.payment_terms} onChange={set('payment_terms')} className={inputCls}>
                  {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Credit Limit</label>
                <Input type="number" value={f.credit_limit} onChange={set('credit_limit')} step={0.01} min={0} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Account Number</label>
                <Input value={f.account_number} onChange={set('account_number')} />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Tax ID (EIN/SSN)</label>
                <Input value={f.tax_id} onChange={set('tax_id')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Internal */}
        <Card className="border-[#E8DCC8]">
          <SectionHeader icon={StickyNote} title="Internal" />
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Notes</label>
              <textarea value={f.notes} onChange={set('notes')} rows={3}
                className="flex w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Tags</label>
                <Input value={f.tags} onChange={set('tags')} placeholder="Comma-separated tags" />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#2C1810' }}>Source</label>
                <select value={f.source} onChange={set('source')} className={inputCls}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s || 'Select source...'}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex gap-3">
        <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Contact'}</Button>
        <Button variant="outline" onClick={() => router.push('/contacts')}>Cancel</Button>
      </div>
    </Shell>
  );
}
