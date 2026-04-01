// Employees list page
'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Plus, Users, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#2D6A4F] text-white',
  inactive: 'bg-[#8B7355] text-white',
  terminated: 'bg-[#E07A5F] text-white',
};

interface Employee {
  id: number; employee_number: string; first_name: string; last_name: string;
  email: string; department: string; position: string; pay_type: string; status: string;
}
interface EmployeeResponse {
  data: Employee[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export default function EmployeesPage() {
  const [data, setData] = useState<EmployeeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (department) params.set('department', department);
      params.set('page', String(p));
      params.set('limit', '25');
      const res = await api.get<EmployeeResponse>(`/employees?${params}`);
      setData(res);
      setPage(p);
      setInitialLoad(false);
    } catch { /* handled by api */ }
    finally { setLoading(false); }
  }, [search, department]);

  if (initialLoad && !loading) { void load(); }

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C1810]">Employees</h1>
        <Link href="/employees/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Employee</Button>
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#5C4033]">Search</label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email..." className="w-56" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#5C4033]">Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}
            className="h-10 rounded-md border border-[#D4C4A8] bg-white px-3 text-sm text-[#2C1810]">
            <option value="">All</option>
            <option value="engineering">Engineering</option>
            <option value="sales">Sales</option>
            <option value="operations">Operations</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button variant="outline" onClick={() => load(1)}>Filter</Button>
      </div>
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR><TH>Employee#</TH><TH>Name</TH><TH>Email</TH><TH>Department</TH><TH>Position</TH><TH>Pay Type</TH><TH>Status</TH><TH>Actions</TH></TR>
            </THead>
            <TBody>
              {loading && <TR><TD colSpan={8} className="text-center text-[#5C4033]">Loading...</TD></TR>}
              {!loading && data?.data.map((emp) => (
                <TR key={emp.id}>
                  <TD className="font-mono text-sm">{emp.employee_number}</TD>
                  <TD>{emp.first_name} {emp.last_name}</TD>
                  <TD className="text-sm text-[#5C4033]">{emp.email}</TD>
                  <TD>{emp.department}</TD>
                  <TD>{emp.position}</TD>
                  <TD className="capitalize">{emp.pay_type}</TD>
                  <TD>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[emp.status] || ''}`}>
                      {emp.status}
                    </span>
                  </TD>
                  <TD>
                    <Link href={`/employees/${emp.id}`}>
                      <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                    </Link>
                  </TD>
                </TR>
              ))}
              {!loading && !data?.data.length && (
                <TR><TD colSpan={8} className="text-center text-[#5C4033]">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />No employees found
                </TD></TR>
              )}
            </TBody>
          </Table>
          {data && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#5C4033]">
              <span>Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= data.pagination.pages} onClick={() => load(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
