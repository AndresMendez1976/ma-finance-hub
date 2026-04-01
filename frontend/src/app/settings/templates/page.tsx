'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, extractArray } from '@/lib/api';
import { Plus, Trash2, Eye, Check } from 'lucide-react';

interface Template {
  id: number;
  document_type: string;
  name: string;
  layout: string;
  primary_color: string;
  secondary_color: string;
  font: string;
  show_logo: boolean;
  show_company_address: boolean;
  show_company_phone: boolean;
  show_company_email: boolean;
  show_tax_id: boolean;
  header_text: string | null;
  footer_text: string | null;
  terms_text: string | null;
  notes_text: string | null;
  show_payment_link: boolean;
  show_due_date: boolean;
  show_po_number: boolean;
  paper_size: string;
  is_default: boolean;
}

const DOC_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'credit_note', label: 'Credit Note' },
];

const LAYOUTS = [
  { value: 'classic', label: 'Classic', desc: 'Traditional professional layout' },
  { value: 'modern', label: 'Modern', desc: 'Clean minimal design with accent colors' },
  { value: 'minimal', label: 'Minimal', desc: 'Simple and compact format' },
];

const FONTS = [
  { value: 'helvetica', label: 'Helvetica' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'courier', label: 'Courier' },
  { value: 'georgia', label: 'Georgia' },
];

const PAPER_SIZES = [
  { value: 'letter', label: 'Letter (8.5 x 11)' },
  { value: 'a4', label: 'A4 (210 x 297mm)' },
];

const selectCls = 'flex h-10 w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]';
const textareaCls = 'flex w-full rounded-md border border-[#E8DCC8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#5C4033]/60 focus-visible:ring-2 focus-visible:ring-[#2D6A4F]';

const emptyTemplate = (docType: string): Omit<Template, 'id'> => ({
  document_type: docType,
  name: '',
  layout: 'classic',
  primary_color: '#2D6A4F',
  secondary_color: '#E8DCC8',
  font: 'helvetica',
  show_logo: true,
  show_company_address: true,
  show_company_phone: true,
  show_company_email: true,
  show_tax_id: false,
  header_text: null,
  footer_text: null,
  terms_text: null,
  notes_text: null,
  show_payment_link: true,
  show_due_date: true,
  show_po_number: true,
  paper_size: 'letter',
  is_default: false,
});

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTab, setActiveTab] = useState('invoice');
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchTemplates = () => {
    setLoading(true);
    api.get<Template[]>('/document-templates')
      .then((r: unknown) => setTemplates(extractArray(r)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const filteredTemplates = templates.filter((t) => t.document_type === activeTab);

  const startNew = () => {
    setEditing(emptyTemplate(activeTab));
    setIsNew(true);
    setMsg('');
  };

  const startEdit = (t: Template) => {
    setEditing({ ...t });
    setIsNew(false);
    setMsg('');
  };

  const updateField = (field: string, value: string | boolean) => {
    if (editing) setEditing({ ...editing, [field]: value });
  };

  const saveTemplate = async () => {
    if (!editing) return;
    if (!editing.name) { setMsg('Template name is required'); return; }
    setSaving(true); setMsg('');
    try {
      if (isNew) {
        await api.post('/document-templates', editing);
      } else {
        await api.put(`/document-templates/${editing.id}`, editing);
      }
      setMsg('Template saved successfully');
      setEditing(null);
      fetchTemplates();
    } catch (e: unknown) { setMsg((e as Error).message); }
    finally { setSaving(false); }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.delete(`/document-templates/${id}`);
      setMsg('Template deleted');
      if (editing && editing.id === id) setEditing(null);
      fetchTemplates();
    } catch (e: unknown) { setMsg((e as Error).message); }
  };

  const setDefault = async (id: number) => {
    try {
      await api.put(`/document-templates/${id}`, { is_default: true });
      setMsg('Default template updated');
      fetchTemplates();
    } catch (e: unknown) { setMsg((e as Error).message); }
  };

  const previewTemplate = async (id: number) => {
    try {
      const data = await api.get<{ template: Template; sample: Record<string, unknown> }>(`/document-templates/${id}/preview`);
      // Open a simple preview in a new window
      const w = window.open('', '_blank', 'width=800,height=600');
      if (w) {
        const t = data.template;
        w.document.write(`
          <html><head><title>Template Preview - ${t.name}</title>
          <style>body{font-family:${t.font},sans-serif;max-width:700px;margin:40px auto;color:#333}
          .header{background:${t.primary_color};color:white;padding:24px;border-radius:8px 8px 0 0}
          .body{border:1px solid ${t.secondary_color};padding:24px;border-radius:0 0 8px 8px}
          table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px;text-align:left;border-bottom:1px solid ${t.secondary_color}}
          .total{font-size:1.2em;font-weight:bold}</style></head>
          <body>
          <div class="header"><h1>INVOICE</h1><p>#INV-0001</p></div>
          <div class="body">
          ${t.show_company_address ? '<p><strong>From:</strong> Your Company</p>' : ''}
          <p><strong>Bill To:</strong> Sample Customer</p>
          ${t.show_due_date ? '<p><strong>Due:</strong> 2026-04-30</p>' : ''}
          ${t.show_po_number ? '<p><strong>PO:</strong> PO-12345</p>' : ''}
          <table><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
          <tbody><tr><td>Web Development</td><td>10</td><td>$100.00</td><td>$1,000.00</td></tr>
          <tr><td>Design</td><td>5</td><td>$100.00</td><td>$500.00</td></tr></tbody></table>
          <p class="total">Total: $1,623.75</p>
          ${t.footer_text ? `<hr><p style="font-size:0.85em;color:#666">${t.footer_text}</p>` : ''}
          ${t.terms_text ? `<p style="font-size:0.85em;color:#666"><strong>Terms:</strong> ${t.terms_text}</p>` : ''}
          </div></body></html>
        `);
        w.document.close();
      }
    } catch (e: unknown) { setMsg((e as Error).message); }
  };

  if (loading) return <Shell><p className="text-[#5C4033]">Loading templates...</p></Shell>;

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold text-[#2C1810]">Document Templates</h1>
      {msg && <div className={`mb-4 rounded-md p-3 text-sm ${msg.includes('success') || msg.includes('updated') || msg.includes('deleted') ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]' : 'bg-[#E07A5F]/10 text-[#E07A5F]'}`}>{msg}</div>}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[#E8DCC8] bg-[#FAF6F0] p-1">
        {DOC_TYPES.map((dt) => (
          <button
            key={dt.value}
            onClick={() => { setActiveTab(dt.value); setEditing(null); }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === dt.value
                ? 'bg-white text-[#2C1810] shadow-sm'
                : 'text-[#5C4033] hover:text-[#2C1810]'
            }`}
          >
            {dt.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Template list */}
        <div className="lg:col-span-1">
          <Card className="border-[#E8DCC8]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#2C1810] text-base">Templates</CardTitle>
              <Button size="sm" variant="outline" onClick={startNew} className="border-[#E8DCC8]">
                <Plus className="mr-1 h-3 w-3" /> New
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredTemplates.length === 0 && (
                <p className="text-sm text-[#5C4033]">No templates yet. Create one to get started.</p>
              )}
              {filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between rounded-md border p-3 cursor-pointer transition-colors ${
                    editing?.id === t.id ? 'border-[#2D6A4F] bg-[#2D6A4F]/5' : 'border-[#E8DCC8] hover:border-[#5C4033]'
                  }`}
                  onClick={() => startEdit(t)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#2C1810]">{t.name}</span>
                      {t.is_default && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#2D6A4F', color: 'white' }}>Default</span>
                      )}
                    </div>
                    <span className="text-xs text-[#5C4033]">{t.layout} / {t.font}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); previewTemplate(t.id); }} title="Preview">
                      <Eye className="h-3.5 w-3.5 text-[#5C4033]" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }} title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-[#E07A5F]" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Template form */}
        <div className="lg:col-span-2">
          {editing ? (
            <Card className="border-[#E8DCC8]">
              <CardHeader>
                <CardTitle className="text-[#2C1810]">{isNew ? 'New Template' : `Edit: ${editing.name}`}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium text-[#2C1810]">Template Name *</label>
                  <Input value={editing.name || ''} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g., Standard Invoice" />
                </div>

                {/* Layout selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2C1810]">Layout</label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {LAYOUTS.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => updateField('layout', l.value)}
                        className={`rounded-lg border-2 p-4 text-left transition-colors ${
                          editing.layout === l.value
                            ? 'border-[#2D6A4F] bg-[#2D6A4F]/5'
                            : 'border-[#E8DCC8] hover:border-[#5C4033]'
                        }`}
                      >
                        <div className="font-medium text-[#2C1810]">{l.label}</div>
                        <div className="mt-1 text-xs text-[#5C4033]">{l.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Primary Color</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={editing.primary_color || '#2D6A4F'}
                        onChange={(e) => updateField('primary_color', e.target.value)}
                        className="h-10 w-10 cursor-pointer rounded border border-[#E8DCC8]"
                      />
                      <Input
                        value={editing.primary_color || '#2D6A4F'}
                        onChange={(e) => updateField('primary_color', e.target.value)}
                        className="w-28"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Secondary Color</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={editing.secondary_color || '#E8DCC8'}
                        onChange={(e) => updateField('secondary_color', e.target.value)}
                        className="h-10 w-10 cursor-pointer rounded border border-[#E8DCC8]"
                      />
                      <Input
                        value={editing.secondary_color || '#E8DCC8'}
                        onChange={(e) => updateField('secondary_color', e.target.value)}
                        className="w-28"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>

                {/* Font & Paper */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Font</label>
                    <select value={editing.font || 'helvetica'} onChange={(e) => updateField('font', e.target.value)} className={selectCls}>
                      {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Paper Size</label>
                    <select value={editing.paper_size || 'letter'} onChange={(e) => updateField('paper_size', e.target.value)} className={selectCls}>
                      {PAPER_SIZES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2C1810]">Display Options</label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {[
                      { key: 'show_logo', label: 'Show Logo' },
                      { key: 'show_company_address', label: 'Show Company Address' },
                      { key: 'show_company_phone', label: 'Show Company Phone' },
                      { key: 'show_company_email', label: 'Show Company Email' },
                      { key: 'show_tax_id', label: 'Show Tax ID' },
                      { key: 'show_payment_link', label: 'Show Payment Link' },
                      { key: 'show_due_date', label: 'Show Due Date' },
                      { key: 'show_po_number', label: 'Show PO Number' },
                    ].map((toggle) => (
                      <label key={toggle.key} className="flex items-center gap-3 text-sm text-[#2C1810]">
                        <input
                          type="checkbox"
                          checked={(editing as Record<string, unknown>)[toggle.key] as boolean ?? true}
                          onChange={(e) => updateField(toggle.key, e.target.checked)}
                          className="h-4 w-4 rounded border-[#E8DCC8] text-[#2D6A4F]"
                        />
                        {toggle.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Text fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Header Text</label>
                    <textarea
                      value={editing.header_text || ''}
                      onChange={(e) => updateField('header_text', e.target.value)}
                      rows={2}
                      placeholder="Custom header text..."
                      className={textareaCls}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Footer Text</label>
                    <textarea
                      value={editing.footer_text || ''}
                      onChange={(e) => updateField('footer_text', e.target.value)}
                      rows={2}
                      placeholder="Custom footer text..."
                      className={textareaCls}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Terms & Conditions</label>
                    <textarea
                      value={editing.terms_text || ''}
                      onChange={(e) => updateField('terms_text', e.target.value)}
                      rows={2}
                      placeholder="Payment terms, conditions..."
                      className={textareaCls}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#2C1810]">Default Notes</label>
                    <textarea
                      value={editing.notes_text || ''}
                      onChange={(e) => updateField('notes_text', e.target.value)}
                      rows={2}
                      placeholder="Default notes for this document type..."
                      className={textareaCls}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 border-t pt-4" style={{ borderColor: '#E8DCC8' }}>
                  <Button
                    onClick={saveTemplate}
                    disabled={saving}
                    style={{ backgroundColor: '#2D6A4F' }}
                    className="text-white hover:opacity-90"
                  >
                    {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
                  </Button>
                  {!isNew && editing.id && !editing.is_default && (
                    <Button
                      variant="outline"
                      onClick={() => setDefault(editing.id!)}
                      className="border-[#E8DCC8]"
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Set as Default
                    </Button>
                  )}
                  {!isNew && editing.id && (
                    <Button
                      variant="outline"
                      onClick={() => previewTemplate(editing.id!)}
                      className="border-[#E8DCC8]"
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setEditing(null)}
                    className="border-[#E8DCC8] text-[#5C4033]"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[#E8DCC8]">
              <CardContent className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <p className="text-[#5C4033]">Select a template to edit or create a new one.</p>
                  <Button size="sm" variant="outline" onClick={startNew} className="mt-3 border-[#E8DCC8]">
                    <Plus className="mr-1 h-3 w-3" /> New {DOC_TYPES.find((d) => d.value === activeTab)?.label} Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}
