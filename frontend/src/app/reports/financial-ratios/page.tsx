// Financial Ratios Dashboard — Liquidity, Profitability, Efficiency, Leverage
'use client';
import { useState, useCallback } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown, Info, Printer } from 'lucide-react';
import { ReportHeader } from '@/components/report-header';

interface Ratio { name: string; value: number; prior_value: number | null; format: 'decimal' | 'percent' | 'currency' | 'days'; tooltip: string }
interface RatioSection { title: string; ratios: Ratio[] }
interface RatioReport { as_of: string; sections: RatioSection[] }

function formatRatioValue(value: number, format: string): string {
  switch (format) {
    case 'percent': return `${(value * 100).toFixed(1)}%`;
    case 'currency': return formatCurrency(value);
    case 'days': return `${value.toFixed(0)} days`;
    default: return value.toFixed(2);
  }
}

const SECTION_COLORS: Record<string, string> = {
  Liquidity: '#2D6A4F', Profitability: '#D4A854', Efficiency: '#5C4033', Leverage: '#8B7355',
};

export default function FinancialRatiosPage() {
  const [data, setData] = useState<RatioReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [hoveredTip, setHoveredTip] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get<RatioReport>(`/reports/financial-ratios?as_of=${asOf}`)); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [asOf]);

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold text-[#2C1810]">Financial Ratios</h1>
      <div className="mb-6 flex gap-3 items-end">
        <div><label className="text-xs font-medium text-[#2C1810]">As of Date</label><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-40" /></div>
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Calculate Ratios'}</Button>
        {data && <Button className="no-print" variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>}
      </div>
      <ReportHeader title="Financial Ratios" asOf={asOf} />
      {data && (
        <>
          <p className="mb-4 text-sm text-[#5C4033]">As of {formatDate(data.as_of)}</p>
          <div className="space-y-6">
            {data.sections.map((section) => (
              <div key={section.title}>
                <h2 className="mb-3 text-lg font-bold" style={{ color: SECTION_COLORS[section.title] || '#5C4033' }}>{section.title}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.ratios.map((ratio) => {
                    const trend = ratio.prior_value !== null ? ratio.value - ratio.prior_value : 0;
                    const trendUp = trend >= 0;
                    return (
                      <Card key={ratio.name} className="border-[#E8DCC8] relative">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-xs font-medium text-[#5C4033] leading-tight pr-2">{ratio.name}</p>
                            <button
                              className="text-[#D4C4A8] hover:text-[#5C4033] flex-shrink-0"
                              onMouseEnter={() => setHoveredTip(ratio.name)}
                              onMouseLeave={() => setHoveredTip(null)}
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {hoveredTip === ratio.name && (
                            <div className="absolute right-2 top-14 z-10 w-48 rounded-md bg-[#5C4033] p-2 text-xs text-white shadow-lg">
                              {ratio.tooltip}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-[#2C1810]">{formatRatioValue(ratio.value, ratio.format)}</p>
                            {ratio.prior_value !== null && (
                              trendUp
                                ? <TrendingUp className="h-5 w-5 text-[#2D6A4F]" />
                                : <TrendingDown className="h-5 w-5 text-[#E07A5F]" />
                            )}
                          </div>
                          {ratio.prior_value !== null && (
                            <p className="text-xs text-[#5C4033] mt-1">
                              Prior: {formatRatioValue(ratio.prior_value, ratio.format)}
                              <span className={`ml-1 ${trendUp ? 'text-[#2D6A4F]' : 'text-[#E07A5F]'}`}>
                                ({trendUp ? '+' : ''}{formatRatioValue(trend, ratio.format)})
                              </span>
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-[#5C4033]">Amounts in {formatCurrency(0).charAt(0)} | Generated {formatDate(new Date().toISOString())}</p>
        </>
      )}
    </Shell>
  );
}
