// Employee detail page
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft, Edit, UserX } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#2D6A4F] text-white', inactive: 'bg-[#8B7355] text-white', terminated: 'bg-[#E07A5F] text-white',
};

interface PayrollItem { id: number; payroll_run_id: number; pay_date: string; gross_pay: string; net_pay: string; }
interface Employee {
  id: number; employee_number: string; first_name: string; last_name: string; email: string;
  phone: string; department: string; position: string; pay_type: string; pay_rate: string;
  pay_frequency: string; hire_date: string; status: string; payroll_items?: PayrollItem[];
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setEmployee(await api.get<Employee>(`/employees/${id}`)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const terminate = async () => {
    if (!confirm('Are you sure you want to terminate this employee?')) return;
    setActionLoading(true);
    try {
      await api.post(`/employees/${id}/terminate`);
      await load();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <Shell><p className="text-[#8B7355]">Loading...</p></Shell>;
  if (!employee) return <Shell><p className="text-[#E07A5F]">{error || 'Employee not found'}</p></Shell>;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/employees"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-2xl font-bold text-[#5C4033]">{employee.first_name} {employee.last_name}</h1>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[employee.status] || ''}`}>
            {employee.status}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/employees/${id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</Button>
          {employee.status === 'active' && (
            <Button variant="destructive" onClick={terminate} disabled={actionLoading}>
              <UserX className="mr-2 h-4 w-4" />Terminate
            </Button>
          )}
        </div>
      </div>
      {error && <div className="mb-4 rounded-md bg-[#E07A5F]/10 p-3 text-sm text-[#E07A5F]">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#E8DCC8] lg:col-span-2">
          <CardHeader className="bg-[#E8DCC8]/30"><CardTitle className="text-[#5C4033]">Employee Information</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div><p className="text-xs text-[#8B7355]">Employee #</p><p className="font-mono font-medium">{employee.employee_number}</p></div>
                <div><p className="text-xs text-[#8B7355]">Email</p><p className="font-medium">{employee.email}</p></div>
                <div><p className="text-xs text-[#8B7355]">Phone</p><p className="font-medium">{employee.phone || '-'}</p></div>
              </div>
              <div className="space-y-2">
                <div><p className="text-xs text-[#8B7355]">Department</p><p className="font-medium">{employee.department}</p></div>
                <div><p className="text-xs text-[#8B7355]">Position</p><p className="font-medium">{employee.position}</p></div>
                <div><p className="text-xs text-[#8B7355]">Hire Date</p><p className="font-medium">{employee.hire_date}</p></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardHeader><CardTitle className="text-[#5C4033]">Compensation</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><p className="text-xs text-[#8B7355]">Pay Type</p><p className="font-medium capitalize">{employee.pay_type}</p></div>
            <div><p className="text-xs text-[#8B7355]">Pay Rate</p><p className="text-2xl font-bold font-mono text-[#5C4033]">${Number(employee.pay_rate).toFixed(2)}</p></div>
            <div><p className="text-xs text-[#8B7355]">Frequency</p><p className="font-medium capitalize">{employee.pay_frequency}</p></div>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4 border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">Payroll History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Run#</TH><TH>Pay Date</TH><TH className="text-right">Gross Pay</TH><TH className="text-right">Net Pay</TH></TR></THead>
            <TBody>
              {employee.payroll_items?.map((item) => (
                <TR key={item.id}>
                  <TD className="font-mono text-sm"><Link href={`/payroll/${item.payroll_run_id}`} className="text-[#2D6A4F] underline">#{item.payroll_run_id}</Link></TD>
                  <TD>{item.pay_date}</TD>
                  <TD className="text-right font-mono">${Number(item.gross_pay).toFixed(2)}</TD>
                  <TD className="text-right font-mono">${Number(item.net_pay).toFixed(2)}</TD>
                </TR>
              ))}
              {(!employee.payroll_items || employee.payroll_items.length === 0) && (
                <TR><TD colSpan={4} className="text-center text-[#8B7355]">No payroll history</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </Shell>
  );
}
