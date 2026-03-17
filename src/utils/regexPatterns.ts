// Regex patterns for Indonesian administrative document metadata extraction

export const LETTER_NUMBER_PATTERNS = [
  /(?:Nomor|No\.?|Nomer)\s*(?:Surat\s*)?[:\s]*([A-Za-z0-9\-\/\.]+(?:\/[A-Za-z0-9\-\.]+)*)/i,
  /(?:Nomor|No)\s*:\s*(.+?)(?:\n|$)/i,
  /^([A-Z]{1,5}[\-\/][0-9]+[\-\/][A-Z0-9\-\/\.]+)/m,
];

export const LETTER_DATE_PATTERNS = [
  /(?:Tanggal|Tgl\.?|Jakarta|Bandung|Surabaya|[\w]+),?\s*(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
  /(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4})/,
  /(\d{1,2}\s+\w+\s+\d{4})/,
];

export const SENDER_PATTERNS = [
  /(?:Dari|Pengirim|From)\s*[:\s]*(.+?)(?:\n|$)/i,
  /(?:Kepala|Direktur|Ketua|Pimpinan)\s+(.+?)(?:\n|$)/i,
];

export const RECEIVER_PATTERNS = [
  /(?:Kepada|Yth\.?|Yang Terhormat)\s*[:\s]*(.+?)(?:\n|$)/i,
  /(?:Tujuan|Penerima)\s*[:\s]*(.+?)(?:\n|$)/i,
];

export const SUBJECT_PATTERNS = [
  /(?:Hal|Perihal|Subjek|Subject)\s*[:\s]*(.+?)(?:\n|$)/i,
  /(?:Tentang|Mengenai)\s*[:\s]*(.+?)(?:\n|$)/i,
];

export const CLASSIFICATION_PATTERNS = [
  /(?:Sifat|Klasifikasi|Classification)\s*[:\s]*(.+?)(?:\n|$)/i,
  /(?:Rahasia|Biasa|Penting|Segera|Sangat Segera)/i,
];

export const MONTH_MAP: Record<string, string> = {
  'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
  'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
  'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
};

export function parseIndonesianDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    const monthNum = MONTH_MAP[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const altMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (altMatch) {
    const [, day, month, year] = altMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}
