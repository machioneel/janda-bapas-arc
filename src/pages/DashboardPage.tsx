import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { employee } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { count: total } = await supabase.from('documents').select('*', { count: 'exact', head: true });
      const { count: incoming } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('document_type', 'incoming');
      const { count: outgoing } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('document_type', 'outgoing');

      // This month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: thisMonth } = await supabase.from('documents').select('*', { count: 'exact', head: true }).gte('created_at', firstDay);

      return {
        total: total ?? 0,
        incoming: incoming ?? 0,
        outgoing: outgoing ?? 0,
        thisMonth: thisMonth ?? 0,
      };
    },
  });

  const { data: recentDocs } = useQuery({
    queryKey: ['recent-documents'],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const statCards = [
    { title: 'Total Dokumen', value: stats?.total ?? 0, icon: FileText, color: 'text-primary' },
    { title: 'Surat Masuk', value: stats?.incoming ?? 0, icon: ArrowDownLeft, color: 'text-accent' },
    { title: 'Surat Keluar', value: stats?.outgoing ?? 0, icon: ArrowUpRight, color: 'text-warning' },
    { title: 'Bulan Ini', value: stats?.thisMonth ?? 0, icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {employee?.name || 'Pengguna'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Dokumen Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDocs && recentDocs.length > 0 ? (
            <div className="space-y-3">
              {recentDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.subject || 'Tanpa subjek'}</p>
                    <p className="text-xs text-muted-foreground">{doc.letter_number} · {doc.sender}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-sm font-medium ${
                    doc.document_type === 'incoming'
                      ? 'bg-accent/10 text-accent'
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {doc.document_type === 'incoming' ? 'Masuk' : 'Keluar'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Belum ada dokumen.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
