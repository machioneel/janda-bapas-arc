import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateDocument } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { extractMetadata } from '@/services/documentParser/extractMetadata';
import { parseDocx } from '@/services/documentParser/parseDocx';
import { parsePdf } from '@/services/documentParser/parsePdf';
import type { ExtractedMetadata } from '@/types/document';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import MetadataForm, { type MetadataFormValues } from '@/components/upload/MetadataForm';
import MultiUploadPanel from '@/components/upload/MultiUploadPanel';
import { Upload, FileText, X, Loader2, CheckCircle, Files } from 'lucide-react';

const emptyForm: MetadataFormValues = {
  letter_number: '', letter_date: '', sender: '', receiver: '', subject: '', classification: '',
};

type SingleStatus = 'idle' | 'extracting' | 'ready' | 'uploading' | 'done' | 'error';

export default function UploadPage() {
  const { user } = useAuth();
  const createDocument = useCreateDocument();

  const [mode, setMode] = useState<'single' | 'multi'>('single');

  // Single upload state
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleStatus, setSingleStatus] = useState<SingleStatus>('idle');
  const [singleExtracted, setSingleExtracted] = useState<ExtractedMetadata | null>(null);
  const [singleForm, setSingleForm] = useState<MetadataFormValues>(emptyForm);
  const [docType, setDocType] = useState<'incoming' | 'outgoing'>('incoming');
  const [saving, setSaving] = useState(false);

  const handleSingleFile = useCallback(async (file: File) => {
    setSingleFile(file);
    setSingleStatus('extracting');
    setSingleExtracted(null);
    setSingleForm(emptyForm);
    try {
      let text = '';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') text = await parsePdf(file);
      else if (ext === 'docx') text = await parseDocx(file);
      else throw new Error('Format tidak didukung');

      const extracted = extractMetadata(text);
      setSingleExtracted(extracted);
      setSingleForm({
        letter_number: extracted.letter_number.value,
        letter_date: extracted.letter_date.value,
        sender: extracted.sender.value,
        receiver: extracted.receiver.value,
        subject: extracted.subject.value,
        classification: extracted.classification.value,
      });
      setSingleStatus('ready');
    } catch (err) {
      console.error('Extraction error:', err);
      setSingleStatus('error');
    }
  }, []);

  const handleSingleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf' || ext === 'docx';
    });
    if (file) handleSingleFile(file);
  }, [handleSingleFile]);

  const handleSingleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSingleFile(file);
    e.target.value = '';
  }, [handleSingleFile]);

  const handleSingleSubmit = async () => {
    if (!user || !singleFile || singleStatus !== 'ready') return;
    setSaving(true);
    setSingleStatus('uploading');
    try {
      const fileName = `${Date.now()}_${singleFile.name}`;
      const { error: uploadError } = await supabase.storage.from('bapas-documents').upload(fileName, singleFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('bapas-documents').getPublicUrl(fileName);

      await createDocument.mutateAsync({
        document_type: docType,
        letter_number: singleForm.letter_number,
        letter_date: singleForm.letter_date || null,
        sender: singleForm.sender,
        receiver: singleForm.receiver,
        subject: singleForm.subject,
        classification: singleForm.classification,
        file_url: urlData.publicUrl,
        file_name: singleFile.name,
        uploaded_by: user.id,
      });
      setSingleStatus('done');
      toast.success('Dokumen berhasil disimpan');
    } catch (err: any) {
      console.error(err);
      setSingleStatus('error');
      toast.error(err.message || 'Gagal mengunggah dokumen');
    } finally {
      setSaving(false);
    }
  };

  const resetSingle = () => {
    setSingleFile(null);
    setSingleStatus('idle');
    setSingleExtracted(null);
    setSingleForm(emptyForm);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Dokumen</h1>
          <p className="text-muted-foreground">Unggah dan arsipkan dokumen surat</p>
        </div>
        <Button
          variant={mode === 'multi' ? 'default' : 'outline'}
          onClick={() => setMode(mode === 'single' ? 'multi' : 'single')}
          className="gap-2"
        >
          <Files className="w-4 h-4" />
          {mode === 'single' ? 'Multi Upload' : 'Single Upload'}
        </Button>
      </div>

      {mode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">File Dokumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!singleFile ? (
                <label
                  className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-border hover:bg-muted/50"
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleSingleDrop}
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Klik atau seret file ke sini</p>
                  <p className="text-xs text-muted-foreground">PDF atau DOCX</p>
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleSingleInput} />
                </label>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-md bg-muted/30 border border-border">
                  <FileText className="w-6 h-6 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{singleFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(singleFile.size / 1024 / 1024).toFixed(2)} MB ·{' '}
                      {singleStatus === 'extracting' && 'Mengekstrak...'}
                      {singleStatus === 'ready' && 'Siap'}
                      {singleStatus === 'uploading' && 'Mengunggah...'}
                      {singleStatus === 'done' && 'Selesai'}
                      {singleStatus === 'error' && 'Gagal'}
                    </p>
                  </div>
                  {singleStatus === 'extracting' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                  {singleStatus === 'ready' && <CheckCircle className="w-5 h-5 text-accent" />}
                  {singleStatus === 'done' && <CheckCircle className="w-5 h-5 text-accent" />}
                  {(singleStatus === 'ready' || singleStatus === 'error' || singleStatus === 'done') && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetSingle}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              <div>
                <Label>Jenis Surat</Label>
                <Select value={docType} onValueChange={(v: 'incoming' | 'outgoing') => setDocType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Surat Masuk</SelectItem>
                    <SelectItem value="outgoing">Surat Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">
                Metadata {singleFile ? `— ${singleFile.name.length > 30 ? singleFile.name.slice(0, 27) + '...' : singleFile.name}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {singleStatus !== 'idle' && singleFile ? (
                <>
                  <MetadataForm form={singleForm} metadata={singleExtracted} onChange={setSingleForm} />
                  <div className="mt-6">
                    <Button className="w-full" disabled={singleStatus !== 'ready' || saving} onClick={handleSingleSubmit}>
                      {saving ? 'Mengunggah...' : 'Simpan Dokumen'}
                    </Button>
                    {singleStatus === 'done' && (
                      <p className="text-xs text-accent text-center mt-2">Dokumen telah disimpan ✓</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Pilih file untuk mulai</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <MultiUploadPanel docType={docType} onDocTypeChange={setDocType} />
      )}
    </div>
  );
}
