// Product detail — info card, stock by location, transaction history
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

interface Product { id: number; sku: string; name: string; product_type: string; description: string | null; category: string | null; unit_of_measure: string; sale_price: string; purchase_price: string | null; costing_method: string | null; track_lots: boolean; track_serials: boolean; reorder_point: number; reorder_quantity: number; stock_on_hand: number }
interface StockRow { location_id: number; location_name: string; on_hand: number; available: number }
interface Transaction { id: number; date: string; type: string; reference: string | null; quantity: number; unit_cost: string; total: string; location_name: string }

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, t] = await Promise.all([
        api.get<Product>(`/products/${id}`),
        api.get<StockRow[]>(`/products/${id}/stock`).catch(() => []),
        api.get<Transaction[]>(`/products/${id}/transactions`).catch(() => []),
      ]);
      setProduct(p); setStock(s); setTransactions(t);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!product) return <Shell><p className="text-[#E07A5F]">{error || 'Product not found'}</p></Shell>;

  const isLowStock = product.product_type === 'inventory' && product.stock_on_hand <= product.reorder_point && product.reorder_point > 0;

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/products"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-[#5C4033]">{product.name}</h1>
        <Badge variant={product.product_type === 'inventory' ? 'success' : product.product_type === 'service' ? 'info' : 'warning'}>{product.product_type}</Badge>
      </div>

      {isLowStock && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">
          <AlertTriangle className="h-4 w-4" />Low stock: {product.stock_on_hand} on hand, reorder point is {product.reorder_point}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Product info */}
        <Card className="border-[#E8DCC8] lg:col-span-2">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">Product Details</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><p className="text-xs text-[#8B7355]">SKU</p><p className="font-mono font-medium text-[#5C4033]">{product.sku}</p></div>
              <div><p className="text-xs text-[#8B7355]">Category</p><p className="font-medium text-[#5C4033]">{product.category || '—'}</p></div>
              <div><p className="text-xs text-[#8B7355]">Sale Price</p><p className="font-mono font-medium text-[#5C4033]">${Number(product.sale_price).toFixed(2)}</p></div>
              <div><p className="text-xs text-[#8B7355]">Purchase Price</p><p className="font-mono font-medium text-[#5C4033]">{product.purchase_price ? `$${Number(product.purchase_price).toFixed(2)}` : '—'}</p></div>
              <div><p className="text-xs text-[#8B7355]">Unit</p><p className="text-[#5C4033]">{product.unit_of_measure}</p></div>
              {product.costing_method && <div><p className="text-xs text-[#8B7355]">Costing Method</p><p className="text-[#5C4033] uppercase">{product.costing_method}</p></div>}
              {product.track_lots && <div><Badge variant="info">Lot Tracked</Badge></div>}
              {product.track_serials && <div><Badge variant="info">Serial Tracked</Badge></div>}
            </div>
            {product.description && <p className="mt-4 text-sm text-[#8B7355]">{product.description}</p>}
          </CardContent>
        </Card>
        {/* Summary sidebar */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Stock Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className={`text-3xl font-bold ${isLowStock ? 'text-[#E07A5F]' : 'text-[#5C4033]'}`}>{product.stock_on_hand}</p>
              <p className="text-xs text-[#8B7355]">total on hand</p>
            </div>
            <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Reorder Point</span><span className="font-mono">{product.reorder_point || '—'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#8B7355]">Reorder Qty</span><span className="font-mono">{product.reorder_quantity || '—'}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Stock by location */}
      {stock.length > 0 && (
        <Card className="mt-4 border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Stock by Location</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Location</TH><TH className="text-right">On Hand</TH><TH className="text-right">Available</TH></TR></THead>
              <TBody>
                {stock.map((s) => (
                  <TR key={s.location_id}><TD className="font-medium">{s.location_name}</TD><TD className="text-right font-mono">{s.on_hand}</TD><TD className="text-right font-mono">{s.available}</TD></TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Transaction history */}
      <Card className="mt-4 border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Transaction History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Date</TH><TH>Type</TH><TH>Reference</TH><TH>Location</TH><TH className="text-right">Qty</TH><TH className="text-right">Unit Cost</TH><TH className="text-right">Total</TH></TR></THead>
            <TBody>
              {transactions.map((t) => (
                <TR key={t.id}>
                  <TD>{t.date}</TD><TD><Badge variant={t.quantity > 0 ? 'success' : 'warning'}>{t.type}</Badge></TD>
                  <TD className="text-sm">{t.reference || '—'}</TD><TD>{t.location_name}</TD>
                  <TD className="text-right font-mono">{t.quantity}</TD><TD className="text-right font-mono">${Number(t.unit_cost).toFixed(2)}</TD><TD className="text-right font-mono">${Number(t.total).toFixed(2)}</TD>
                </TR>
              ))}
              {!transactions.length && <TR><TD colSpan={7} className="text-center text-[#8B7355]">No transactions yet</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
