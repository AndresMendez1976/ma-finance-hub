// Formatting helpers for dates, currencies, and numbers
// Use these throughout the frontend for consistent display

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'USD'): string {
  const num = Number(amount);
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatNumber(num: number | string | null | undefined, decimals = 2): string {
  const n = Number(num);
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}
