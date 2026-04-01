// Tax Rates settings — list, manage, set default
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, extractArray } from '@/lib/api';
import { Plus, Star } from 'lucide-react';
import Link from 'next/link';

interface TaxRate {
  id: number;
  name: string;
  jurisdiction: string;
  rate: number;
  is_compound: boolean;
  is_default: boolean;
  active: boolean;
  components_count?: number;
}

export default function TaxRatesPage() {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<unknown>('/tax/rates');
      setRates(extractArray<TaxRate>(res));
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Tax Rates</h1>
        <Link href="/settings/tax-rates/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Tax Rate</Button>
        </Link>
      </div>

      <Card className="border-[#E8DCC8]">
        <CardHeader className="bg-[#E8DCC8]/30">
          <CardTitle className="text-[#2C1810]">Configured Tax Rates</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading && <p className="text-[#5C4033]">Loading...</p>}
          {!loading && (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Jurisdiction</TH>
                  <TH className="text-right">Rate %</TH>
                  <TH className="text-right">Components</TH>
                  <TH>Default</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rates.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.name}</TD>
                    <TD>{r.jurisdiction || '—'}</TD>
                    <TD className="text-right font-mono">{(Number(r.rate) * 100).toFixed(2)}%</TD>
                    <TD className="text-right">{r.components_count ?? 0}</TD>
                    <TD>
                      {r.is_default && (
                        <Badge variant="success" className="gap-1">
                          <Star className="h-3 w-3" />Default
                        </Badge>
                      )}
                    </TD>
                    <TD>
                      <Badge variant={r.active ? 'success' : 'secondary'}>
                        {r.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TD>
                  </TR>
                ))}
                {rates.length === 0 && (
                  <TR>
                    <TD colSpan={6} className="text-center text-[#5C4033]">
                      No tax rates configured. Click &quot;+ New Tax Rate&quot; to add one.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 rounded-md bg-[#E8DCC8]/30 p-4 text-xs text-[#5C4033]">
        <p className="font-medium text-[#2C1810]">Disclaimer</p>
        <p className="mt-1">
          Tax rates and calculations provided by MA Finance Hub are estimates based on the data you configure.
          They are not a substitute for professional tax advice. Tax laws and rates change frequently.
          Please consult a qualified tax professional or CPA to ensure compliance with applicable tax regulations
          in your jurisdiction. MA Finance Hub and MAiSHQ are not liable for any tax discrepancies or penalties.
        </p>
      </div>
    </Shell>
  );
}
