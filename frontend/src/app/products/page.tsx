// Products list — tabs for All/Inventory/Non-Inventory/Services, search, low stock highlight
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
import { formatCurrency } from '@/lib/format';

interface Product { id: number; sku: string; name: string; product_type: string; sale_price: string; stock_on_hand: number; reorder_point: number }
interface ProductResponse { data: Product[]; pagination: { page: number; total: number; pages: number } }

const TABS = [
  { label: 'All', value: '' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Non-Inventory', value: 'non_inventory' },
  { label: 'Services', value: 'service' },
];

export default function ProductsPage() {
  const [data, setData] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [init, setInit] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set('product_type', type);
      if (search) params.set('search', search);
      params.set('page', String(p));
      setData(await api.get<ProductResponse>(`/products?${params}`));
      setPage(p); setInit(false);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [type, search]);

  if (init && !loading) { void load(); }

  const isLowStock = (p: Product) => p.product_type === 'inventory' && p.stock_on_hand <= p.reorder_point && p.reorder_point > 0;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Products</h1>
        <Link href="/products/new"><Button><Plus className="mr-2 h-4 w-4" />New Product</Button></Link>
      </div>
      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => { setType(t.value); setTimeout(() => load(1), 0); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${type === t.value ? 'bg-[#2D6A4F] text-white' : 'bg-white text-[#5C4033] border border-[#D4C4A8] hover:bg-[#E8DCC8]'}`}>
            {t.label}
          </button>
        ))}
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or SKU..." className="ml-auto w-64"
          onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <Button variant="outline" onClick={() => load(1)}>Search</Button>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead><TR><TH>SKU</TH><TH>Name</TH><TH>Type</TH><TH className="text-right">Price</TH><TH className="text-right">Stock</TH><TH className="text-right">Reorder Pt</TH><TH>Actions</TH></TR></THead>
            <TBody>
              {loading && <TR><TD colSpan={7} className="text-center text-[#8B7355]">Loading...</TD></TR>}
              {!loading && data?.data.map((p) => (
                <TR key={p.id} className={isLowStock(p) ? 'bg-[#E07A5F]/10' : ''}>
                  <TD className="font-mono text-sm">{p.sku}</TD>
                  <TD className="font-medium">{p.name}</TD>
                  <TD><Badge variant={p.product_type === 'inventory' ? 'success' : p.product_type === 'service' ? 'info' : 'warning'}>{p.product_type}</Badge></TD>
                  <TD className="text-right font-mono">{formatCurrency(p.sale_price)}</TD>
                  <TD className="text-right font-mono">{p.product_type === 'service' ? '—' : p.stock_on_hand}</TD>
                  <TD className="text-right font-mono">{p.reorder_point > 0 ? p.reorder_point : '—'}</TD>
                  <TD><Link href={`/products/${p.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TD>
                </TR>
              ))}
              {!loading && !data?.data.length && <TR><TD colSpan={7} className="text-center text-[#8B7355]">No products found</TD></TR>}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#8B7355]">
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
