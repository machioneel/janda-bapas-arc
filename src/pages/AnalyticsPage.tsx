import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = [
  'hsl(200, 98%, 39%)',
  'hsl(160, 84%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(215, 25%, 27%)',
  'hsl(0, 84%, 60%)',
];

export default function AnalyticsPage() {
  const { data: monthlyData } = useQuery({
    queryKey: ['analytics-monthly'],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('created_at, document_type');

      if (!data) return [];

      const months: Record<string, { incoming: number; outgoing: number }> = {};
      data.forEach((doc) => {
        const month = doc.created_at.slice(0, 7); // YYYY-MM
        if (!months[month]) months[month] = { incoming: 0, outgoing: 0 };
        if (doc.document_type === 'incoming') months[month].incoming++;
        else months[month].outgoing++;
      });

      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, counts]) => ({
          month: new Date(month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
          'Surat Masuk': counts.incoming,
          'Surat Keluar': counts.outgoing,
        }));
    },
  });

  const { data: typeData } = useQuery({
    queryKey: ['analytics-type'],
    queryFn: async () => {
      const { count: incoming } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('document_type', 'incoming');
      const { count: outgoing } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('document_type', 'outgoing');
      return [
        { name: 'Surat Masuk', value: incoming ?? 0 },
        { name: 'Surat Keluar', value: outgoing ?? 0 },
      ];
    },
  });

  const { data: topSenders } = useQuery({
    queryKey: ['analytics-senders'],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('sender');
      if (!data) return [];

      const counts: Record<string, number> = {};
      data.forEach((doc) => {
        if (doc.sender) {
          counts[doc.sender] = (counts[doc.sender] || 0) + 1;
        }
      });

      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([sender, count]) => ({ sender, count }));
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analitik</h1>
        <p className="text-muted-foreground">Statistik dan tren dokumen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Tren Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="Surat Masuk" fill={COLORS[0]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Surat Keluar" fill={COLORS[1]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Distribusi Jenis Surat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {(typeData || []).map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Senders */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Pengirim Terbanyak</CardTitle>
          </CardHeader>
          <CardContent>
            {topSenders && topSenders.length > 0 ? (
              <div className="space-y-2">
                {topSenders.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-sm text-foreground truncate mr-4">{item.sender}</span>
                    <span className="text-sm font-semibold text-primary">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Belum ada data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
