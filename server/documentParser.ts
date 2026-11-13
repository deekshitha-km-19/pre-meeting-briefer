import path from 'node:path';
import mammoth from 'mammoth';
import { extractText } from 'unpdf';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_MEETING = 5;

export type SupportedFileType = 'pdf' | 'docx' | 'txt';

export interface ParsedDocumentResult {
  fileName: string;
  fileType: SupportedFileType;
  fileSize: number;
  extractedText: string;
  wordCount: number;
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/octet-stream', // Some browsers send generic octet-stream for .docx/.md
]);

function sanitizeText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function hasZipSignature(buffer: Buffer): boolean {
  // DOCX files are ZIP archives starting with PK\x03\x04
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  );
}

export async function parseUploadedDocument(file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}): Promise<ParsedDocumentResult> {
  if (!file || !file.buffer) {
    throw new Error('No file payload received.');
  }

  if (file.size <= 0) {
    throw new Error(`File "${file.originalname}" is empty.`);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File "${file.originalname}" exceeds the 10 MB size limit.`);
  }

  const safeBaseName = path.basename(file.originalname).replace(/[^\w.\- ()]/g, '_');
  const ext = path.extname(safeBaseName).toLowerCase();

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype) && !file.mimetype.startsWith('text/')) {
    throw new Error(`Unsupported MIME type (${file.mimetype}). Only PDF, DOCX, and TXT files are allowed.`);
  }

  let fileType: SupportedFileType;
  let extracted = '';

  if (ext === '.pdf') {
    if (!hasPdfSignature(file.buffer)) {
      throw new Error(`File "${safeBaseName}" does not appear to be a valid PDF document.`);
    }
    fileType = 'pdf';
    try {
      const pdfResult = await extractText(new Uint8Array(file.buffer), { mergePages: true });
      extracted = Array.isArray(pdfResult.text) ? pdfResult.text.join('\n\n') : String(pdfResult.text ?? '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to extract PDF text.';
      throw new Error(`Failed to parse PDF "${safeBaseName}": ${msg}`);
    }
  } else if (ext === '.docx') {
    if (!hasZipSignature(file.buffer)) {
      throw new Error(`File "${safeBaseName}" does not appear to be a valid DOCX archive.`);
    }
    fileType = 'docx';
    try {
      const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
      extracted = docxResult.value ?? '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to extract DOCX text.';
      throw new Error(`Failed to parse DOCX "${safeBaseName}": ${msg}`);
    }
  } else if (ext === '.txt' || ext === '.md') {
    fileType = 'txt';
    extracted = file.buffer.toString('utf8');
  } else {
    throw new Error(`Unsupported file extension "${ext}". Please upload PDF, DOCX, or TXT files.`);
  }

  const cleanedText = sanitizeText(extracted);
  if (!cleanedText) {
    throw new Error(
      `No readable text was found in "${safeBaseName}". If this is a scanned image PDF, please upload a text-based PDF, DOCX, or TXT file.`
    );
  }

  // Cap stored extracted text at 80,000 characters to protect memory & token budgets
  const boundedText =
    cleanedText.length > 80_000
      ? `${cleanedText.slice(0, 80_000)}\n\n[Truncated at 80,000 characters for briefing analysis]`
      : cleanedText;

  return {
    fileName: safeBaseName,
    fileType,
    fileSize: file.size,
    extractedText: boundedText,
    wordCount: countWords(boundedText),
  };
}
