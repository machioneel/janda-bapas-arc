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
import FileUploadZone, { type UploadFileItem } from '@/components/upload/FileUploadZone';
import MetadataForm, { type MetadataFormValues } from '@/components/upload/MetadataForm';

const emptyForm: MetadataFormValues = {
  letter_number: '', letter_date: '', sender: '', receiver: '', subject: '', classification: '',
};

export default function UploadPage() {
  const { user } = useAuth();
  const createDocument = useCreateDocument();

  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [docType, setDocType] = useState<'incoming' | 'outgoing'>('incoming');
  const [metadataMap, setMetadataMap] = useState<Record<string, { extracted: ExtractedMetadata | null; form: MetadataFormValues }>>({});
  const [saving, setSaving] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId);
  const activeData = activeFileId ? metadataMap[activeFileId] : null;

  const extractFile = useCallback(async (item: UploadFileItem) => {
    try {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'extracting' as const } : f));
      let text = '';
      const ext = item.file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') text = await parsePdf(item.file);
      else if (ext === 'docx') text = await parseDocx(item.file);
      else throw new Error('Format tidak didukung');

      const extracted = extractMetadata(text);
      setMetadataMap(prev => ({
        ...prev,
        [item.id]: {
          extracted,
          form: {
            letter_number: extracted.letter_number.value,
            letter_date: extracted.letter_date.value,
            sender: extracted.sender.value,
            receiver: extracted.receiver.value,
            subject: extracted.subject.value,
            classification: extracted.classification.value,
          },
        },
      }));
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'ready' as const } : f));
    } catch (err) {
      console.error('Extraction error:', err);
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' as const, error: 'Gagal ekstrak' } : f));
    }
  }, []);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const items: UploadFileItem[] = newFiles.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...items]);
    if (!activeFileId && items.length > 0) setActiveFileId(items[0].id);
    // Extract all
    items.forEach(item => extractFile(item));
  }, [activeFileId, extractFile]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setMetadataMap(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (activeFileId === id) {
      setActiveFileId(prev => {
        const remaining = files.filter(f => f.id !== id);
        return remaining.length > 0 ? remaining[0].id : null;
      });
    }
  }, [activeFileId, files]);

  const updateForm = useCallback((form: MetadataFormValues) => {
    if (!activeFileId) return;
    setMetadataMap(prev => ({
      ...prev,
      [activeFileId]: { ...prev[activeFileId], form },
    }));
  }, [activeFileId]);

  const handleSubmitAll = async () => {
    if (!user) return;
    const readyFiles = files.filter(f => f.status === 'ready');
    if (readyFiles.length === 0) {
      toast.error('Tidak ada file yang siap diunggah');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of readyFiles) {
      try {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' as const } : f));
        const fileName = `${Date.now()}_${item.file.name}`;
        const { error: uploadError } = await supabase.storage.from('bapas-documents').upload(fileName, item.file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('bapas-documents').getPublicUrl(fileName);
        const form = metadataMap[item.id]?.form ?? emptyForm;

        await createDocument.mutateAsync({
          document_type: docType,
          letter_number: form.letter_number,
          letter_date: form.letter_date || null,
          sender: form.sender,
          receiver: form.receiver,
          subject: form.subject,
          classification: form.classification,
          file_url: urlData.publicUrl,
          file_name: item.file.name,
          uploaded_by: user.id,
        });

        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done' as const } : f));
        successCount++;
      } catch (err: any) {
        console.error(err);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' as const, error: err.message } : f));
        errorCount++;
      }
    }

    setSaving(false);
    if (successCount > 0) toast.success(`${successCount} dokumen berhasil disimpan`);
    if (errorCount > 0) toast.error(`${errorCount} dokumen gagal diunggah`);
  };

  const readyCount = files.filter(f => f.status === 'ready').length;
  const doneCount = files.filter(f => f.status === 'done').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload Dokumen</h1>
        <p className="text-muted-foreground">Unggah dan arsipkan dokumen surat · Multi upload didukung</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">File Dokumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadZone files={files} onFilesAdded={handleFilesAdded} onRemoveFile={handleRemoveFile} />

            {files.length > 0 && (
              <div className="space-y-3">
                <Label>Pilih file untuk edit metadata:</Label>
                <div className="flex flex-wrap gap-2">
                  {files.map(f => (
                    <Button
                      key={f.id}
                      variant={activeFileId === f.id ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs max-w-[200px] truncate"
                      onClick={() => setActiveFileId(f.id)}
                    >
                      {f.file.name.length > 25 ? f.file.name.slice(0, 22) + '...' : f.file.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Jenis Surat (semua file)</Label>
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

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              Metadata {activeFile ? `— ${activeFile.file.name.length > 30 ? activeFile.file.name.slice(0, 27) + '...' : activeFile.file.name}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeData ? (
              <MetadataForm
                form={activeData.form}
                metadata={activeData.extracted}
                onChange={updateForm}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {files.length === 0 ? 'Pilih file untuk mulai' : 'Pilih file di sebelah kiri untuk edit metadata'}
              </p>
            )}

            <div className="mt-6 space-y-2">
              <Button
                className="w-full"
                disabled={readyCount === 0 || saving}
                onClick={handleSubmitAll}
              >
                {saving ? 'Mengunggah...' : `Simpan ${readyCount} Dokumen`}
              </Button>
              {doneCount > 0 && (
                <p className="text-xs text-accent text-center">{doneCount} dokumen telah disimpan</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
