export type DocumentType = 'incoming' | 'outgoing';

export interface DocumentRecord {
  id: string;
  document_type: DocumentType;
  letter_number: string;
  letter_date: string;
  sender: string;
  receiver: string;
  subject: string;
  classification: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
}

export interface ExtractedMetadata {
  letter_number: { value: string; confidence: number };
  letter_date: { value: string; confidence: number };
  sender: { value: string; confidence: number };
  receiver: { value: string; confidence: number };
  subject: { value: string; confidence: number };
  classification: { value: string; confidence: number };
}
