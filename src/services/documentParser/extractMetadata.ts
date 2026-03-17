import type { ExtractedMetadata } from '@/types/document';
import {
  LETTER_NUMBER_PATTERNS,
  LETTER_DATE_PATTERNS,
  SENDER_PATTERNS,
  RECEIVER_PATTERNS,
  SUBJECT_PATTERNS,
  CLASSIFICATION_PATTERNS,
  parseIndonesianDate,
} from '@/utils/regexPatterns';
import { normalizeText, normalizeKeys } from './normalizeText';

function extractWithPatterns(text: string, patterns: RegExp[]): { value: string; confidence: number } {
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      return {
        value: match[1].trim(),
        confidence: 1 - (i * 0.15), // primary pattern = higher confidence
      };
    }
  }
  return { value: '', confidence: 0 };
}

function extractWithNlp(text: string): Partial<ExtractedMetadata> {
  const result: Partial<ExtractedMetadata> = {};

  try {
    // Dynamic import would be ideal but for simplicity we do basic NLP-like extraction
    // Date detection
    const dateMatch = text.match(/(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i);
    if (dateMatch) {
      const parsed = parseIndonesianDate(dateMatch[1]);
      if (parsed) {
        result.letter_date = { value: parsed, confidence: 0.7 };
      }
    }

    // Organization detection (common Indonesian gov org patterns)
    const orgPatterns = /(?:Kementerian|Dinas|Badan|Kantor|Balai|Lembaga|Direktorat)\s+[A-Z][a-zA-Z\s]+/g;
    const orgs = text.match(orgPatterns);
    if (orgs && orgs.length > 0) {
      if (!result.sender) {
        result.sender = { value: orgs[0].trim(), confidence: 0.6 };
      }
    }
  } catch {
    // NLP extraction failed, continue with regex only
  }

  return result;
}

export function extractMetadata(rawText: string): ExtractedMetadata {
  const text = normalizeKeys(normalizeText(rawText));

  // Regex extraction
  const regexResult: ExtractedMetadata = {
    letter_number: extractWithPatterns(text, LETTER_NUMBER_PATTERNS),
    letter_date: extractWithPatterns(text, LETTER_DATE_PATTERNS),
    sender: extractWithPatterns(text, SENDER_PATTERNS),
    receiver: extractWithPatterns(text, RECEIVER_PATTERNS),
    subject: extractWithPatterns(text, SUBJECT_PATTERNS),
    classification: extractWithPatterns(text, CLASSIFICATION_PATTERNS),
  };

  // Parse date if found
  if (regexResult.letter_date.value) {
    const parsed = parseIndonesianDate(regexResult.letter_date.value);
    if (parsed) {
      regexResult.letter_date.value = parsed;
    }
  }

  // NLP extraction
  const nlpResult = extractWithNlp(text);

  // Merge: prefer higher confidence
  const merged = { ...regexResult };
  for (const key of Object.keys(nlpResult) as Array<keyof ExtractedMetadata>) {
    const nlpField = nlpResult[key];
    if (nlpField && nlpField.confidence > merged[key].confidence) {
      merged[key] = nlpField;
    }
  }

  return merged;
}
