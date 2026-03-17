export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeKeys(text: string): string {
  return text
    .replace(/No\.?\s*Surat/gi, 'Nomor')
    .replace(/Nomer/gi, 'Nomor')
    .replace(/Tgl\.?/gi, 'Tanggal')
    .replace(/Yth\.?/gi, 'Kepada')
    .replace(/Perihal/gi, 'Hal');
}
