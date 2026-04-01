// Report header component with company branding — print-friendly
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface ReportHeaderProps {
  title: string;
  dateRange?: string;
  asOf?: string;
}

interface CompanySettings {
  company_name: string | null;
  company_address_line1: string | null;
  company_city: string | null;
  company_state: string | null;
  company_zip: string | null;
}

export function ReportHeader({ title, dateRange, asOf }: ReportHeaderProps) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    api.get<CompanySettings>('/settings').then(setSettings).catch(() => {});
  }, []);

  return (
    <div className="print-only mb-6 hidden border-b border-[#E8DCC8] pb-4">
      {settings?.company_name && (
        <h1 className="text-xl font-bold text-[#2C1810]">{settings.company_name}</h1>
      )}
      {settings?.company_address_line1 && (
        <p className="text-sm text-[#5C4033]">
          {settings.company_address_line1}
          {settings.company_city && `, ${settings.company_city}`}
          {settings.company_state && `, ${settings.company_state}`}
          {settings.company_zip && ` ${settings.company_zip}`}
        </p>
      )}
      <h2 className="mt-2 text-lg font-semibold text-[#2C1810]">{title}</h2>
      {dateRange && <p className="text-sm text-[#5C4033]">Period: {dateRange}</p>}
      {asOf && <p className="text-sm text-[#5C4033]">As of: {asOf}</p>}
      <p className="mt-1 text-xs text-[#8B7355]">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  );
}
