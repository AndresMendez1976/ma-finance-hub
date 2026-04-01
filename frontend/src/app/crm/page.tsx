'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/format';

interface Opportunity {
  id: number; title: string; contact_name: string; value: number;
  expected_close_date: string; stage_id: number;
}
interface Stage { id: number; name: string; color: string; position: number }
interface Pipeline { id: number; name: string; stages: Stage[] }
interface PipelineData { pipeline: Pipeline; opportunities: Opportunity[] }

export default function CrmPage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<number | null>(null);

  useEffect(() => {
    api.get<PipelineData>('/crm/pipeline').then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Backend route: POST /crm/opportunities/:id/move
  const moveToStage = async (oppId: number, stageId: number) => {
    try {
      await api.post(`/crm/opportunities/${oppId}/move`, { stage_id: stageId });
      const fresh = await api.get<PipelineData>('/crm/pipeline');
      setData(fresh);
    } catch { /* */ }
    setMoving(null);
  };

  if (loading) return <Shell><p className="text-[#8B7355]">Loading pipeline...</p></Shell>;
  if (!data) return <Shell><p className="text-[#8B7355]">No pipeline data</p></Shell>;

  const stages = [...data.pipeline.stages].sort((a, b) => a.position - b.position);

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">CRM Pipeline</h1>
        <div className="flex gap-2">
          <Link href="/crm/dashboard"><Button variant="outline">Dashboard</Button></Link>
          <Link href="/crm/opportunities/new"><Button><Plus className="mr-2 h-4 w-4" />New Opportunity</Button></Link>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageOpps = data.opportunities.filter((o) => o.stage_id === stage.id);
          const total = stageOpps.reduce((s, o) => s + Number(o.value), 0);
          return (
            <div key={stage.id} className="min-w-[280px] flex-shrink-0">
              <div className="mb-2 rounded-t-lg px-3 py-2" style={{ backgroundColor: stage.color || '#E8DCC8' }}>
                <h3 className="text-sm font-semibold text-white">{stage.name}</h3>
                <p className="text-xs text-white/80">{formatCurrency(total)}</p>
              </div>
              <div className="space-y-2">
                {stageOpps.map((opp) => (
                  <Card key={opp.id} className="cursor-pointer hover:shadow-md">
                    <CardContent className="p-3">
                      <Link href={`/crm/opportunities/${opp.id}`} className="text-sm font-semibold text-[#5C4033] hover:underline">{opp.title}</Link>
                      <p className="text-xs text-[#8B7355]">{opp.contact_name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-mono text-[#2D6A4F]">{formatCurrency(opp.value)}</span>
                        <span className="text-xs text-[#8B7355]">{formatDate(opp.expected_close_date)}</span>
                      </div>
                      {moving === opp.id ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {stages.filter((s) => s.id !== stage.id).map((s) => (
                            <button key={s.id} onClick={() => moveToStage(opp.id, s.id)}
                              className="rounded px-2 py-0.5 text-xs text-white" style={{ backgroundColor: s.color || '#8B7355' }}>
                              {s.name}
                            </button>
                          ))}
                          <button onClick={() => setMoving(null)} className="rounded px-2 py-0.5 text-xs text-[#8B7355] border border-[#D4C4A8]">Cancel</button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="mt-1 h-6 text-xs" onClick={() => setMoving(opp.id)}>Move</Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {!stageOpps.length && <p className="px-3 py-4 text-center text-xs text-[#8B7355]">No opportunities</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
