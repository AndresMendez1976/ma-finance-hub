// Contacts list — tabs for All/Customers/Vendors, search, status badges
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Plus, Eye } from 'lucide-react';

interface Contact { id: number; type: string; company_name: string | null; first_name: string; last_name: string | null; email: string | null; phone: string | null; status: string }
interface ContactResponse { data: Contact[]; pagination: { page: number; total: number; pages: number } }

const TABS = [
  { label: 'All', value: '' },
  { label: 'Customers', value: 'customer' },
  { label: 'Vendors', value: 'vendor' },
];

export default function ContactsPage() {
  const [data, setData] = useState<ContactResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [init, setInit] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (search) params.set('search', search);
      params.set('page', String(p));
      setData(await api.get<ContactResponse>(`/contacts?${params}`));
      setPage(p); setInit(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [type, search]);

  if (init && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Contacts</h1>
        <Link href="/contacts/new"><Button><Plus className="mr-2 h-4 w-4" />New Contact</Button></Link>
      </div>
      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => { setType(t.value); setTimeout(() => load(1), 0); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${type === t.value ? 'bg-[#2D6A4F] text-white' : 'bg-white text-[#2C1810] border border-[#D4C4A8] hover:bg-[#E8DCC8]'}`}>
            {t.label}
          </button>
        ))}
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company, email..." className="ml-auto w-64"
          onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <Button variant="outline" onClick={() => load(1)}>Search</Button>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>Name</TH><TH>Company</TH><TH>Type</TH><TH>Email</TH><TH>Phone</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={7} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data?.data.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.first_name} {c.last_name || ''}</TD>
                  <TD>{c.company_name || '—'}</TD>
                  <TD><Badge variant={c.type === 'customer' ? 'success' : c.type === 'vendor' ? 'warning' : 'info'}>{c.type}</Badge></TD>
                  <TD className="text-sm">{c.email || '—'}</TD>
                  <TD className="text-sm">{c.phone || '—'}</TD>
                  <TD><Badge variant={c.status === 'active' ? 'success' : 'secondary'}>{c.status}</Badge></TD>
                  <TD><Link href={`/contacts/${c.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={7} className="text-center text-[#5C4033]">No contacts found</TD></TR>}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#5C4033]">
              <span>Page {page} of {data.pagination.pages} ({data.pagination.total} total)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= data.pagination.pages} onClick={() => load(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
