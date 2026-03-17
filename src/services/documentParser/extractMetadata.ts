import type { ExtractedMetadata } from '@/types/document';
import {
  LETTER_NUMBER_PATTERNS,
  LETTER_DATE_PATTERNS,
  SENDER_PATTERNS,
  RECEIVER_PATTERNS,
  SUBJECT_PATTERNS,
  CLASSIFICATION_PATTERNS,
  KOP_PATTERNS,
  FOOTER_SIGNER_PATTERNS,
  parseIndonesianDate,
} from '@/utils/regexPatterns';
import { normalizeText, normalizeKeys } from './normalizeText';
import { splitIntoSections, type DocumentSections } from './sectionSplitter';
import {
  type Candidate,
  type Section,
  type ScoredResult,
  selectBestCandidate,
  validateLetterNumber,
  validateDate,
  validateSubject,
  validateName,
  validateClassification,
} from './scoringEngine';

// --- Section-aware pattern matching ---

function extractCandidatesFromSection(
  text: string,
  section: Section,
  patterns: RegExp[],
  formatValidator: (v: string) => number,
): Candidate[] {
  const candidates: Candidate[] = [];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      const value = (match[1] || match[0]).trim();
      if (value.length > 0) {
        candidates.push({
          value,
          section,
          patternIndex: i,
          hasKeyword: i < patterns.length - 1, // last pattern is usually fallback
          formatScore: formatValidator(value),
        });
      }
    }
  }

  return candidates;
}

function extractFieldWithScoring(
  sections: DocumentSections,
  patterns: RegExp[],
  formatValidator: (v: string) => number,
  prioritySections: Section[] = ['header', 'body', 'footer'],
): ScoredResult {
  const allCandidates: Candidate[] = [];

  for (const section of prioritySections) {
    const text = sections[section];
    if (!text) continue;
    const candidates = extractCandidatesFromSection(text, section, patterns, formatValidator);
    allCandidates.push(...candidates);
  }

  return selectBestCandidate(allCandidates);
}

// --- KOP SURAT (institution header) extraction ---

function extractKopSurat(header: string): string | null {
  for (const pattern of KOP_PATTERNS) {
    const match = header.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

// --- Footer signer extraction ---

function extractFooterSigner(footer: string): { name: string; nip: string } | null {
  if (!footer) return null;

  let name = '';
  let nip = '';

  // Find NIP
  for (const pattern of FOOTER_SIGNER_PATTERNS) {
    const match = footer.match(pattern);
    if (match && match[1]) {
      const val = match[1].trim();
      if (/^\d/.test(val)) {
        nip = val;
      } else if (val.length >= 3 && /^[A-Z]/.test(val)) {
        // Filter out common non-name patterns
        if (!/^(?:KEMENTERIAN|DIREKTORAT|BALAI|REPUBLIK|BADAN|NOTA|SURAT|DOKUMEN|BSrE)/i.test(val)) {
          name = val;
        }
      }
    }
  }

  if (name || nip) return { name, nip };
  return null;
}

// --- NLP-like extraction ---

function extractWithNlp(text: string): Partial<Record<keyof ExtractedMetadata, ScoredResult>> {
  const result: Partial<Record<keyof ExtractedMetadata, ScoredResult>> = {};

  try {
    // Date detection from full text
    const dateMatch = text.match(/(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i);
    if (dateMatch) {
      const parsed = parseIndonesianDate(dateMatch[1]);
      if (parsed) {
        result.letter_date = { value: parsed, confidence: 0.65 };
      }
    }

    // Organization detection (KOP / institution patterns)
    const orgPatterns = /(?:Kementerian|Dinas|Badan|Kantor|Balai|Lembaga|Direktorat)\s+[A-Z][a-zA-Z\s]+/g;
    const orgs = text.match(orgPatterns);
    if (orgs && orgs.length > 0) {
      result.sender = { value: orgs[0].trim(), confidence: 0.55 };
    }
  } catch {
    // NLP extraction failed silently
  }

  return result;
}

// --- Main extraction function ---

export function extractMetadata(rawText: string): ExtractedMetadata {
  const text = normalizeKeys(normalizeText(rawText));
  const sections = splitIntoSections(text);

  // Extract fields with section-aware scoring
  const letterNumber = extractFieldWithScoring(sections, LETTER_NUMBER_PATTERNS, validateLetterNumber, ['header']);
  let letterDate = extractFieldWithScoring(sections, LETTER_DATE_PATTERNS, validateDate, ['header', 'body']);
  const sender = extractFieldWithScoring(sections, SENDER_PATTERNS, validateName, ['header', 'footer']);
  const receiver = extractFieldWithScoring(sections, RECEIVER_PATTERNS, validateName, ['header', 'body']);
  const subject = extractFieldWithScoring(sections, SUBJECT_PATTERNS, validateSubject, ['header', 'body']);
  const classification = extractFieldWithScoring(sections, CLASSIFICATION_PATTERNS, validateClassification, ['header']);

  // Parse Indonesian date to ISO format
  if (letterDate.value) {
    const parsed = parseIndonesianDate(letterDate.value);
    if (parsed) {
      letterDate = { ...letterDate, value: parsed };
    }
  }

  // --- KOP Surat as sender fallback ---
  if (!sender.value || sender.confidence < 0.4) {
    const kop = extractKopSurat(sections.header);
    if (kop) {
      const kopResult: ScoredResult = { value: kop, confidence: 0.6 };
      if (kopResult.confidence > sender.confidence) {
        sender.value = kopResult.value;
        sender.confidence = kopResult.confidence;
      }
    }
  }

  // --- Footer signer validation ---
  const signer = extractFooterSigner(sections.footer);
  if (signer && signer.name && (!sender.value || sender.confidence < 0.5)) {
    // Use footer signer as sender if no better candidate
    sender.value = signer.name;
    sender.confidence = 0.45;
  }

  // --- NLP fallback ---
  const nlpResult = extractWithNlp(text);

  const result: ExtractedMetadata = {
    letter_number: letterNumber,
    letter_date: letterDate,
    sender,
    receiver,
    subject,
    classification,
  };

  // Merge NLP results if they're better
  for (const key of Object.keys(nlpResult) as Array<keyof ExtractedMetadata>) {
    const nlpField = nlpResult[key];
    if (nlpField && nlpField.confidence > result[key].confidence) {
      result[key] = nlpField;
    }
  }

  return result;
}
