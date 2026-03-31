'use client';
import { useState, useEffect } from 'react';
import { Shell } from '@/components/shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { CheckCheck } from 'lucide-react';

interface Notification {
  id: number; created_at: string; type: string; category: string;
  title: string; message: string; is_read: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-[#B4D4E7] text-[#5C4033]', warning: 'bg-[#D4A854] text-[#5C4033]',
  error: 'bg-[#E07A5F] text-white', success: 'bg-[#2D6A4F] text-white',
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // Backend returns paginated { data: [...], pagination: {...} }
      const res = await api.get<{ data: Notification[]; pagination: Record<string, number> }>('/notifications?limit=100');
      setItems(res.data ?? []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  // Backend route: POST /notifications/:id/read
  const markRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* */ }
  };

  // Backend route: POST /notifications/read-all
  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* */ }
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">
          Notifications {unreadCount > 0 && <span className="ml-2 text-sm font-normal text-[#8B7355]">({unreadCount} unread)</span>}
        </h1>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />Mark All Read
          </Button>
        )}
      </div>
      <Card className="border-[#E8DCC8]">
        <CardHeader><CardTitle className="text-[#5C4033]">All Notifications</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-[#8B7355]">Loading...</p> : (
            <Table>
              <THead>
                <TR><TH>Date</TH><TH>Type</TH><TH>Category</TH><TH>Title</TH><TH>Message</TH><TH>Status</TH></TR>
              </THead>
              <TBody>
                {items.map((n) => (
                  <TR
                    key={n.id}
                    className={`cursor-pointer hover:bg-[#E8DCC8]/20 ${!n.is_read ? 'bg-[#E8DCC8]/10 font-medium' : ''}`}
                    onClick={() => !n.is_read && markRead(n.id)}
                  >
                    <TD className="text-sm text-[#8B7355] whitespace-nowrap">{new Date(n.created_at).toLocaleDateString()}</TD>
                    <TD><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[n.type] || 'bg-[#E8DCC8] text-[#5C4033]'}`}>{n.type}</span></TD>
                    <TD className="text-sm text-[#8B7355]">{n.category}</TD>
                    <TD className="text-[#5C4033]">{n.title}</TD>
                    <TD className="text-sm text-[#8B7355] max-w-xs truncate">{n.message}</TD>
                    <TD>{n.is_read ? <span className="text-xs text-[#8B7355]">Read</span> : <span className="text-xs font-semibold text-[#2D6A4F]">Unread</span>}</TD>
                  </TR>
                ))}
                {items.length === 0 && <TR><TD colSpan={6} className="text-center text-[#8B7355]">No notifications</TD></TR>}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
