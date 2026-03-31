// Contact detail — info + financial summary
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Contact {
  id: number; type: string; first_name: string; last_name: string | null; company_name: string | null;
  email: string | null; phone: string | null; address_line1: string | null; city: string | null;
  state: string | null; zip: string | null; country: string; tax_id: string | null; notes: string | null; status: string;
  customer_summary?: { total_invoiced: number; total_paid: number; balance: number };
  vendor_summary?: { total_expenses: number };
}

export default function ContactDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setContact(await api.get<Contact>(`/contacts/${id}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!contact) return <Shell><p className="text-[#E07A5F]">Contact not found</p></Shell>;

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/contacts"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-[#5C4033]">{contact.first_name} {contact.last_name || ''}</h1>
        <Badge variant={contact.type === 'customer' ? 'success' : contact.type === 'vendor' ? 'warning' : 'info'}>{contact.type}</Badge>
        <Badge variant={contact.status === 'active' ? 'success' : 'secondary'}>{contact.status}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#E8DCC8] lg:col-span-2">
          <CardHeader><CardTitle className="text-[#5C4033]">Contact Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                {contact.company_name && <div><span className="text-xs text-[#8B7355]">Company</span><p className="font-medium">{contact.company_name}</p></div>}
                {contact.email && <div><span className="text-xs text-[#8B7355]">Email</span><p>{contact.email}</p></div>}
                {contact.phone && <div><span className="text-xs text-[#8B7355]">Phone</span><p>{contact.phone}</p></div>}
                {contact.tax_id && <div><span className="text-xs text-[#8B7355]">Tax ID</span><p className="font-mono">{contact.tax_id}</p></div>}
              </div>
              <div className="space-y-2">
                {contact.address_line1 && <div><span className="text-xs text-[#8B7355]">Address</span><p>{contact.address_line1}</p>
                  {(contact.city || contact.state || contact.zip) && <p>{[contact.city, contact.state, contact.zip].filter(Boolean).join(', ')}</p>}
                  <p>{contact.country}</p></div>}
              </div>
            </div>
            {contact.notes && <div className="mt-4 rounded-md bg-[#E8DCC8]/30 p-3"><p className="text-xs font-medium text-[#8B7355]">Notes</p><p className="mt-1 text-sm">{contact.notes}</p></div>}
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Financial Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(contact.type === 'customer' || contact.type === 'both') && contact.customer_summary && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#8B7355]">As Customer</p>
                <div className="flex justify-between text-sm"><span>Total Invoiced</span><span className="font-mono font-bold">{fmt(contact.customer_summary.total_invoiced)}</span></div>
                <div className="flex justify-between text-sm"><span>Total Paid</span><span className="font-mono text-[#2D6A4F]">{fmt(contact.customer_summary.total_paid)}</span></div>
                <div className="flex justify-between border-t border-[#E8DCC8] pt-1 text-sm font-bold"><span>Balance</span>
                  <span className={`font-mono ${contact.customer_summary.balance > 0 ? 'text-[#E07A5F]' : 'text-[#2D6A4F]'}`}>{fmt(contact.customer_summary.balance)}</span>
                </div>
              </div>
            )}
            {(contact.type === 'vendor' || contact.type === 'both') && contact.vendor_summary && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#8B7355]">As Vendor</p>
                <div className="flex justify-between text-sm"><span>Total Expenses</span><span className="font-mono font-bold">{fmt(contact.vendor_summary.total_expenses)}</span></div>
              </div>
            )}
            {!contact.customer_summary && !contact.vendor_summary && <p className="text-sm text-[#8B7355]">No financial activity yet</p>}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
