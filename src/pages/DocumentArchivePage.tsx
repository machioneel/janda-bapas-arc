import { useState } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { DocumentType } from '@/types/document';

export default function DocumentArchivePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<DocumentType | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useDocuments({ search, type, page, pageSize: 15 });
  const totalPages = Math.ceil((data?.total ?? 0) / 15);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Arsip Dokumen</h1>
        <p className="text-muted-foreground">Cari dan kelola arsip surat</p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor surat, pengirim, perihal..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={type} onValueChange={(v) => { setType(v as DocumentType | ''); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Semua Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="incoming">Surat Masuk</SelectItem>
                <SelectItem value="outgoing">Surat Keluar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">No. Surat</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="font-semibold">Pengirim</TableHead>
                  <TableHead className="font-semibold">Penerima</TableHead>
                  <TableHead className="font-semibold">Perihal</TableHead>
                  <TableHead className="font-semibold">Jenis</TableHead>
                  <TableHead className="font-semibold w-[80px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : data?.documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Tidak ada dokumen ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.documents.map((doc, i) => (
                    <TableRow key={doc.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                      <TableCell className="font-medium text-sm">{doc.letter_number || '-'}</TableCell>
                      <TableCell className="text-sm">{doc.letter_date || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{doc.sender || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{doc.receiver || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{doc.subject || '-'}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-sm font-medium ${
                          doc.document_type === 'incoming'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {doc.document_type === 'incoming' ? 'Masuk' : 'Keluar'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/documents/${doc.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages} · {data?.total} dokumen
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
