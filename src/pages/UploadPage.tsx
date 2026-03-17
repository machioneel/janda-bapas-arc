import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateDocument } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { extractMetadata } from '@/services/documentParser/extractMetadata';
import { parseDocx } from '@/services/documentParser/parseDocx';
import { parsePdf } from '@/services/documentParser/parsePdf';
import type { ExtractedMetadata } from '@/types/document';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function UploadPage() {
  const { user } = useAuth();
  const createDocument = useCreateDocument();
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null);
  const [docType, setDocType] = useState<'incoming' | 'outgoing'>('incoming');
  const [form, setForm] = useState({
    letter_number: '',
    letter_date: '',
    sender: '',
    receiver: '',
    subject: '',
    classification: '',
  });
  const [saving, setSaving] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setExtracting(true);

    try {
      let text = '';
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();

      if (ext === 'pdf') {
        text = await parsePdf(selectedFile);
      } else if (ext === 'docx') {
        text = await parseDocx(selectedFile);
      } else {
        toast.error('Format file tidak didukung. Gunakan PDF atau DOCX.');
        setExtracting(false);
        return;
      }

      const extracted = extractMetadata(text);
      setMetadata(extracted);
      setForm({
        letter_number: extracted.letter_number.value,
        letter_date: extracted.letter_date.value,
        sender: extracted.sender.value,
        receiver: extracted.receiver.value,
        subject: extracted.subject.value,
        classification: extracted.classification.value,
      });
      toast.success('Metadata berhasil diekstraksi');
    } catch (err) {
      console.error('Extraction error:', err);
      toast.error('Gagal mengekstrak metadata');
    } finally {
      setExtracting(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setSaving(true);
    try {
      // Upload file to storage
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('bapas-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('bapas-documents')
        .getPublicUrl(fileName);

      await createDocument.mutateAsync({
        document_type: docType,
        letter_number: form.letter_number,
        letter_date: form.letter_date || null,
        sender: form.sender,
        receiver: form.receiver,
        subject: form.subject,
        classification: form.classification,
        file_url: urlData.publicUrl,
        file_name: file.name,
        uploaded_by: user.id,
      });

      toast.success('Dokumen berhasil disimpan');
      // Reset form
      setFile(null);
      setMetadata(null);
      setForm({ letter_number: '', letter_date: '', sender: '', receiver: '', subject: '', classification: '' });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan dokumen');
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 0.7) return <CheckCircle className="w-4 h-4 text-accent" />;
    if (confidence > 0) return <AlertTriangle className="w-4 h-4 text-warning" />;
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload Dokumen</h1>
        <p className="text-muted-foreground">Unggah dan arsipkan dokumen surat</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">File Dokumen</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              {file ? (
                <div className="text-center">
                  <FileText className="mx-auto h-10 w-10 text-primary mb-2" />
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Klik untuk memilih file</p>
                  <p className="text-xs text-muted-foreground">PDF atau DOCX</p>
                </div>
              )}
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {extracting && (
              <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                Mengekstrak metadata...
              </div>
            )}

            <div className="mt-4">
              <Label>Jenis Surat</Label>
              <Select value={docType} onValueChange={(v: 'incoming' | 'outgoing') => setDocType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Surat Masuk</SelectItem>
                  <SelectItem value="outgoing">Surat Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Metadata Form */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Metadata Dokumen</CardTitle>
            {metadata && (
              <p className="text-xs text-muted-foreground">
                Field dengan ikon kuning memerlukan verifikasi
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {([
                { key: 'letter_number', label: 'Nomor Surat' },
                { key: 'letter_date', label: 'Tanggal Surat', type: 'date' },
                { key: 'sender', label: 'Pengirim' },
                { key: 'receiver', label: 'Penerima' },
                { key: 'subject', label: 'Perihal' },
                { key: 'classification', label: 'Sifat / Klasifikasi' },
              ] as const).map(({ key, label, type }) => (
                <div key={key} className={`space-y-1 ${metadata && metadata[key].confidence > 0 && metadata[key].confidence < 0.7 ? 'confidence-low' : metadata && metadata[key].confidence >= 0.7 ? 'confidence-high' : ''} pl-2`}>
                  <div className="flex items-center gap-2">
                    <Label>{label}</Label>
                    {metadata && getConfidenceIndicator(metadata[key].confidence)}
                  </div>
                  <Input
                    type={type || 'text'}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <Button type="submit" className="w-full" disabled={!file || saving}>
                {saving ? 'Menyimpan...' : 'Simpan Dokumen'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
