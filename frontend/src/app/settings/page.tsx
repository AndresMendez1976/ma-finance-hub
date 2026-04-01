// Settings / Company Profile page
'use client';
import { useState, useEffect, useRef } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface Settings {
  company_name: string | null; company_email: string | null; company_phone: string | null;
  company_address_line1: string | null; company_address_line2: string | null;
  company_city: string | null; company_state: string | null; company_zip: string | null;
  company_country: string; tax_id: string | null; fiscal_year_start_month: number;
  default_currency: string; invoice_prefix: string; invoice_next_number: number;
  expense_prefix: string; expense_next_number: number;
  // Logo
  logo_base64: string | null;
  // Invoice template
  invoice_template: string;
  invoice_color_primary: string;
  invoice_color_secondary: string;
  invoice_footer_text: string | null;
  invoice_payment_terms: string | null;
  invoice_notes_default: string | null;
  show_logo_on_invoice: boolean;
  show_company_address: boolean;
  show_tax_id: boolean;
  // Stripe
  stripe_publishable_key: string | null;
  stripe_secret_key_set: boolean;
  stripe_webhook_secret_set: boolean;
  payment_enabled: boolean;
  accepted_payment_methods: string[];
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TEMPLATES = [
  { value: 'classic', label: 'Classic', desc: 'Traditional professional layout' },
  { value: 'modern', label: 'Modern', desc: 'Clean minimal design with accent colors' },
  { value: 'minimal', label: 'Minimal', desc: 'Simple and compact format' },
];

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [stripeSaving, setStripeSaving] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.get<Settings>('/settings').then(setS).catch(() => {}).finally(() => setLoading(false)); }, []);

  const update = (field: keyof Settings, value: string | number | boolean) => {
    if (s) setS({ ...s, [field]: value });
  };

  const save = async () => {
    if (!s) return;
    setSaving(true); setMsg('');
    try {
      const res = await api.put<Settings>('/settings', s);
      setS(res); setMsg('Settings saved successfully');
    } catch (e: unknown) { setMsg((e as Error).message); }
    finally { setSaving(false); }
  };

  // ── Logo handlers ──

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setMsg('Logo file must be under 500KB');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      setMsg('Logo must be PNG, JPEG, or SVG');
      return;
    }

    setLogoUploading(true); setMsg('');
    try {
      const base64 = await fileToBase64(file);
      const res = await api.post<Settings>('/settings/logo', { logo_base64: base64 });
      setS(res); setMsg('Logo uploaded successfully');
    } catch (e: unknown) { setMsg((e as Error).message); }
    finally { setLogoUploading(false); }
  };

  const removeLogo = async () => {
    setLogoUploading(true); setMsg('');
    try {
      const res = await api.delete<Settings>('/settings/logo');
      setS(res); setMsg('Logo removed successfully');
    } catch (e: unknown) { setMsg((e as Error).message); }
    finally { setLogoUploading(false); }
  };

  // ── Invoice template save ──

  const saveInvoiceTemplate = async () => {
    if (!s) return;
    setInvoiceSaving(true); setMsg('');
    try {
      const res = await api.put<Settings>('/settings/invoice-template', {
        invoice_template: s.invoice_template,
        invoice_color_primary: s.invoice_color_primary,
        invoice_color_secondary: s.invoice_color_secondary,
        invoice_footer_text: s.invoice_footer_text,
        invoice_payment_terms: s.invoice_payment_terms,
        invoice_notes_default: s.invoice_notes_default,
        show_logo_on_invoice: s.show_logo_on_invoice,
        show_company_address: s.show_company_address,
        show_tax_id: s.show_tax_id,
      });
      setS(res); setMsg('Invoice settings saved successfully');
    } catch (e: unknown) { setMsg((e as Error).message); }
    finally { setInvoiceSaving(false); }
  };

  // ── Stripe save ──

  const saveStripe = async () => {
    if (!s) return;
    setStripeSaving(true); setMsg('');
    try {
      const payload: Record<string, unknown> = {
        payment_enabled: s.payment_enabled,
      };
      if (stripePublishableKey) payload.stripe_publishable_key = stripePublishableKey;
      if (stripeSecretKey) payload.stripe_secret_key = stripeSecretKey;
      if (stripeWebhookSecret) payload.stripe_webhook_secret = stripeWebhookSecret;

      const res = await api.put<Settings>('/settings/stripe', payload);
      setS(res);
      setStripeSecretKey('');
      setStripeWebhookSecret('');
      setMsg('Stripe settings saved successfully');
    } catch (e: unknown) { setMsg((e as Error).message); }
    finally { setStripeSaving(false); }
  };

  if (loading) return <Shell><p className="text-[#5C4033]">Loading settings...</p></Shell>;
  if (!s) return <Shell><p className="text-[#E07A5F]">Failed to load settings</p></Shell>;

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold text-[#2C1810]">Settings</h1>
      {msg && <div className={`mb-4 rounded-md p-3 text-sm ${msg.includes('success') ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]' : 'bg-[#E07A5F]/10 text-[#E07A5F]'}`}>{msg}</div>}

      <div className="space-y-6">

        {/* ── Company Logo ── */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Company Logo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              {s.logo_base64 ? (
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-[#D4C4A8] bg-white p-2">
                  <img src={s.logo_base64} alt="Company logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-[#D4C4A8] bg-[#FAF6F0] text-[#8B7355] text-xs text-center">
                  No logo
                </div>
              )}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="border-[#D4C4A8]"
                >
                  {logoUploading ? 'Uploading...' : 'Upload Logo'}
                </Button>
                {s.logo_base64 && (
                  <Button
                    variant="outline"
                    onClick={removeLogo}
                    disabled={logoUploading}
                    className="ml-2 border-[#E07A5F] text-[#E07A5F] hover:bg-[#E07A5F]/10"
                  >
                    Remove
                  </Button>
                )}
                <p className="text-xs text-[#8B7355]">PNG, JPEG, or SVG. Max 500KB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Company Information ── */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="text-sm font-medium text-[#2C1810]">Company Name</label><Input value={s.company_name || ''} onChange={(e) => update('company_name', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Tax ID (EIN)</label><Input value={s.tax_id || ''} onChange={(e) => update('tax_id', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Email</label><Input type="email" value={s.company_email || ''} onChange={(e) => update('company_email', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Phone</label><Input value={s.company_phone || ''} onChange={(e) => update('company_phone', e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium text-[#2C1810]">Address Line 1</label><Input value={s.company_address_line1 || ''} onChange={(e) => update('company_address_line1', e.target.value)} /></div>
            <div><label className="text-sm font-medium text-[#2C1810]">Address Line 2</label><Input value={s.company_address_line2 || ''} onChange={(e) => update('company_address_line2', e.target.value)} /></div>
            <div className="grid grid-cols-4 gap-3">
              <div><label className="text-sm font-medium text-[#2C1810]">City</label><Input value={s.company_city || ''} onChange={(e) => update('company_city', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">State</label><Input value={s.company_state || ''} onChange={(e) => update('company_state', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">ZIP</label><Input value={s.company_zip || ''} onChange={(e) => update('company_zip', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Country</label><Input value={s.company_country} onChange={(e) => update('company_country', e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* ── Fiscal Configuration ── */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Fiscal Configuration</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#2C1810]">Fiscal Year Start Month</label>
              <select value={s.fiscal_year_start_month} onChange={(e) => update('fiscal_year_start_month', parseInt(e.target.value, 10))}
                className="flex h-10 w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810]">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium text-[#2C1810]">Default Currency</label><Input value={s.default_currency} onChange={(e) => update('default_currency', e.target.value)} /></div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-[#E8DCC8]">
            <CardHeader><CardTitle className="text-[#2C1810]">Invoice Numbering</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#2C1810]">Prefix</label><Input value={s.invoice_prefix} onChange={(e) => update('invoice_prefix', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Next Number</label><Input type="number" value={s.invoice_next_number} onChange={(e) => update('invoice_next_number', parseInt(e.target.value, 10) || 1)} min={1} /></div>
            </CardContent>
          </Card>

          <Card className="border-[#E8DCC8]">
            <CardHeader><CardTitle className="text-[#2C1810]">Expense Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#2C1810]">Prefix</label><Input value={s.expense_prefix} onChange={(e) => update('expense_prefix', e.target.value)} /></div>
              <div><label className="text-sm font-medium text-[#2C1810]">Next Number</label><Input type="number" value={s.expense_next_number} onChange={(e) => update('expense_next_number', parseInt(e.target.value, 10) || 1)} min={1} /></div>
            </CardContent>
          </Card>
        </div>

        <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>

        {/* ── Invoice Template Settings ── */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Invoice Template</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Template selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#2C1810]">Template Style</label>
              <div className="grid gap-3 md:grid-cols-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update('invoice_template', t.value)}
                    className={`rounded-lg border-2 p-4 text-left transition-colors ${
                      s.invoice_template === t.value
                        ? 'border-[#2D6A4F] bg-[#2D6A4F]/5'
                        : 'border-[#D4C4A8] hover:border-[#8B7355]'
                    }`}
                  >
                    <div className="font-medium text-[#2C1810]">{t.label}</div>
                    <div className="mt-1 text-xs text-[#8B7355]">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color pickers */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Primary Color</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={s.invoice_color_primary}
                    onChange={(e) => update('invoice_color_primary', e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border border-[#D4C4A8]"
                  />
                  <Input
                    value={s.invoice_color_primary}
                    onChange={(e) => update('invoice_color_primary', e.target.value)}
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
                    value={s.invoice_color_secondary}
                    onChange={(e) => update('invoice_color_secondary', e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border border-[#D4C4A8]"
                  />
                  <Input
                    value={s.invoice_color_secondary}
                    onChange={(e) => update('invoice_color_secondary', e.target.value)}
                    className="w-28"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-[#2C1810]">
                <input type="checkbox" checked={s.show_logo_on_invoice} onChange={(e) => update('show_logo_on_invoice', e.target.checked)}
                  className="h-4 w-4 rounded border-[#D4C4A8] text-[#2D6A4F]" />
                Show logo on invoices
              </label>
              <label className="flex items-center gap-3 text-sm text-[#2C1810]">
                <input type="checkbox" checked={s.show_company_address} onChange={(e) => update('show_company_address', e.target.checked)}
                  className="h-4 w-4 rounded border-[#D4C4A8] text-[#2D6A4F]" />
                Show company address on invoices
              </label>
              <label className="flex items-center gap-3 text-sm text-[#2C1810]">
                <input type="checkbox" checked={s.show_tax_id} onChange={(e) => update('show_tax_id', e.target.checked)}
                  className="h-4 w-4 rounded border-[#D4C4A8] text-[#2D6A4F]" />
                Show Tax ID on invoices
              </label>
            </div>

            {/* Text fields */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Payment Terms</label>
                <textarea
                  value={s.invoice_payment_terms || ''}
                  onChange={(e) => update('invoice_payment_terms', e.target.value)}
                  rows={2}
                  placeholder="e.g., Net 30 days from invoice date"
                  className="mt-1 flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#B5A48B]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Default Notes</label>
                <textarea
                  value={s.invoice_notes_default || ''}
                  onChange={(e) => update('invoice_notes_default', e.target.value)}
                  rows={2}
                  placeholder="Default notes to appear on new invoices"
                  className="mt-1 flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#B5A48B]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Footer Text</label>
                <textarea
                  value={s.invoice_footer_text || ''}
                  onChange={(e) => update('invoice_footer_text', e.target.value)}
                  rows={2}
                  placeholder="Custom footer text for invoices"
                  className="mt-1 flex w-full rounded-md border border-[#D4C4A8] bg-white px-3 py-2 text-sm text-[#2C1810] placeholder:text-[#B5A48B]"
                />
              </div>
            </div>

            <Button onClick={saveInvoiceTemplate} disabled={invoiceSaving}>
              {invoiceSaving ? 'Saving...' : 'Save Invoice Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* ── Payment Processing (Stripe) ── */}
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#2C1810]">Payment Processing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#8B7355]">
              Connect your Stripe account to accept online payments on invoices.
              Get your API keys from the{' '}
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-[#2D6A4F] underline hover:text-[#245A42]">
                Stripe Dashboard
              </a>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Publishable Key</label>
                <Input
                  value={stripePublishableKey || s.stripe_publishable_key || ''}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                  placeholder="pk_live_..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Secret Key</label>
                <Input
                  type="password"
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  placeholder={s.stripe_secret_key_set ? '(configured - enter new value to change)' : 'sk_live_...'}
                />
                {s.stripe_secret_key_set && !stripeSecretKey && (
                  <p className="mt-1 text-xs text-[#2D6A4F]">Secret key is configured and encrypted.</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-[#2C1810]">Webhook Secret</label>
                <Input
                  type="password"
                  value={stripeWebhookSecret}
                  onChange={(e) => setStripeWebhookSecret(e.target.value)}
                  placeholder={s.stripe_webhook_secret_set ? '(configured - enter new value to change)' : 'whsec_...'}
                />
                {s.stripe_webhook_secret_set && !stripeWebhookSecret && (
                  <p className="mt-1 text-xs text-[#2D6A4F]">Webhook secret is configured and encrypted.</p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-[#2C1810]">
              <input
                type="checkbox"
                checked={s.payment_enabled}
                onChange={(e) => update('payment_enabled', e.target.checked)}
                className="h-4 w-4 rounded border-[#D4C4A8] text-[#2D6A4F]"
              />
              Enable online payments on invoices
            </label>

            <div className="rounded-md bg-[#FAF6F0] p-3 text-xs text-[#8B7355]">
              <p className="font-medium text-[#2C1810]">Webhook URL</p>
              <p className="mt-1 font-mono">
                {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/webhooks/stripe
              </p>
              <p className="mt-2">Add this URL in your Stripe Dashboard under Developers &rarr; Webhooks. Select the <code className="rounded bg-white px-1">checkout.session.completed</code> event.</p>
            </div>

            <Button onClick={saveStripe} disabled={stripeSaving}>
              {stripeSaving ? 'Saving...' : 'Save Stripe Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

// Helper: convert File to base64 data URI
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
