// New product form — type selector, costing method, tracking options
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface Account { id: number; account_code: string; name: string; account_type: string }

export default function NewProductPage() {
  const router = useRouter();
  const [productType, setProductType] = useState('inventory');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('each');
  const [salePrice, setSalePrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [costingMethod, setCostingMethod] = useState('average_cost');
  const [trackLots, setTrackLots] = useState(false);
  const [trackSerials, setTrackSerials] = useState(false);
  const [revenueAccountId, setRevenueAccountId] = useState('');
  const [cogsAccountId, setCogsAccountId] = useState('');
  const [inventoryAccountId, setInventoryAccountId] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');
  const [reorderQty, setReorderQty] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Account[]>('/accounts').then(setAccounts).catch(() => {});
  }, []);

  const revenueAccounts = accounts.filter((a) => a.account_type === 'revenue');
  const expenseAccounts = accounts.filter((a) => a.account_type === 'expense' || a.account_type === 'cost_of_goods_sold');
  const assetAccounts = accounts.filter((a) => a.account_type === 'asset');

  const save = async () => {
    if (!sku || !name || !salePrice) { setError('SKU, name, and sale price are required'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/products', {
        product_type: productType, sku, name, description: description || undefined,
        category: category || undefined, unit_of_measure: unitOfMeasure,
        sale_price: parseFloat(salePrice), purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        costing_method: productType === 'inventory' ? costingMethod : undefined,
        track_lots: productType === 'inventory' ? trackLots : undefined,
        track_serials: productType === 'inventory' ? trackSerials : undefined,
        revenue_account_id: revenueAccountId ? parseInt(revenueAccountId, 10) : undefined,
        cogs_account_id: cogsAccountId ? parseInt(cogsAccountId, 10) : undefined,
        inventory_account_id: inventoryAccountId ? parseInt(inventoryAccountId, 10) : undefined,
        expense_account_id: expenseAccountId ? parseInt(expenseAccountId, 10) : undefined,
        reorder_point: reorderPoint ? parseInt(reorderPoint, 10) : undefined,
        reorder_quantity: reorderQty ? parseInt(reorderQty, 10) : undefined,
      });
      router.push('/products');
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const selectClass = 'flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033]';

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#5C4033]">New Product</h1>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}

      <Card className="border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Product Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-sm font-medium text-[#5C4033]">Product Type *</label>
            <div className="mt-1 flex gap-2">
              {['inventory', 'non_inventory', 'service'].map((t) => (
                <button key={t} onClick={() => setProductType(t)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${productType === t ? 'bg-[#2D6A4F] text-white' : 'bg-white text-[#5C4033] border border-[#D4C4A8] hover:bg-[#E8DCC8]'}`}>
                  {t.replace('_', '-')}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="text-sm font-medium text-[#5C4033]">SKU *</label><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. PROD-001" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Name *</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Category</label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Raw Materials" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Unit of Measure</label><Input value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Sale Price *</label><Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} step={0.01} min={0} placeholder="0.00" /></div>
            <div><label className="text-sm font-medium text-[#5C4033]">Purchase Price</label><Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} step={0.01} min={0} placeholder="0.00" /></div>
          </div>
          {/* Inventory-specific fields */}
          {productType === 'inventory' && (
            <div className="rounded-md border border-[#E8DCC8] bg-[#E8DCC8]/20 p-4 space-y-4">
              <p className="text-sm font-semibold text-[#5C4033]">Inventory Settings</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#5C4033]">Costing Method</label>
                  <select value={costingMethod} onChange={(e) => setCostingMethod(e.target.value)} className={selectClass}>
                    <option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="average_cost">Average Cost</option>
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#5C4033]"><input type="checkbox" checked={trackLots} onChange={(e) => setTrackLots(e.target.checked)} className="rounded" />Track Lots</label>
                  <label className="flex items-center gap-2 text-sm text-[#5C4033]"><input type="checkbox" checked={trackSerials} onChange={(e) => setTrackSerials(e.target.checked)} className="rounded" />Track Serials</label>
                </div>
                <div><label className="text-sm font-medium text-[#5C4033]">Reorder Point</label><Input type="number" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} min={0} placeholder="0" /></div>
                <div><label className="text-sm font-medium text-[#5C4033]">Reorder Quantity</label><Input type="number" value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} min={0} placeholder="0" /></div>
              </div>
            </div>
          )}
          {/* Account mappings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="text-sm font-medium text-[#5C4033]">Revenue Account</label>
              <select value={revenueAccountId} onChange={(e) => setRevenueAccountId(e.target.value)} className={selectClass}><option value="">Select</option>{revenueAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}</select></div>
            <div><label className="text-sm font-medium text-[#5C4033]">COGS Account</label>
              <select value={cogsAccountId} onChange={(e) => setCogsAccountId(e.target.value)} className={selectClass}><option value="">Select</option>{expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}</select></div>
            {productType === 'inventory' && <div><label className="text-sm font-medium text-[#5C4033]">Inventory Account</label>
              <select value={inventoryAccountId} onChange={(e) => setInventoryAccountId(e.target.value)} className={selectClass}><option value="">Select</option>{assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}</select></div>}
            <div><label className="text-sm font-medium text-[#5C4033]">Expense Account</label>
              <select value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)} className={selectClass}><option value="">Select</option>{expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.name}</option>)}</select></div>
          </div>
          <div><label className="text-sm font-medium text-[#5C4033]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description"
              className="flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#5C4033] placeholder:text-[#8B7355]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]" rows={3} /></div>
          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Product'}</Button>
        </CardContent>
      </Card>
    </Shell>
  );
}
