import mammoth from 'mammoth';
import axios from 'axios';

// pdf-parse import - using require to avoid module resolution issues
const pdfParse = require('pdf-parse');

export interface ExtractedFootnote {
  number: number;
  text: string;
  article?: string;
  authors?: string;
  year?: string;
}

/**
 * Extract text from PDF buffer
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX buffer
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Download file from URL and return buffer
 */
export async function downloadFile(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
}

/**
 * Extract footnotes from document text
 * Looks for numbered footnotes typically found at the bottom of pages
 */
export function extractFootnotes(text: string): ExtractedFootnote[] {
  const footnotes: ExtractedFootnote[] = [];
  
  // Split text into lines
  const lines = text.split('\n');
  
  // Find lines that start with a number followed by a period or parenthesis
  // Pattern: "1. " or "1) " or "1 " at the start of a line
  const footnotePattern = /^(\d+)\s*[\.\)]\s+(.+)$/;
  
  for (const line of lines) {
    const match = line.trim().match(footnotePattern);
    if (match) {
      const number = parseInt(match[1], 10);
      const text = match[2].trim();
      
      // Try to parse the footnote text
      const parsed = parseFootnoteText(text);
      
      footnotes.push({
        number,
        text,
        ...parsed,
      });
    }
  }
  
  return footnotes;
}

/**
 * Parse footnote text to extract article, authors, and year
 * Handles various citation formats
 */
function parseFootnoteText(text: string): Partial<ExtractedFootnote> {
  const result: Partial<ExtractedFootnote> = {};
  
  // Pattern for year (4 digits in parentheses or after comma)
  const yearMatch = text.match(/\((\d{4})\)|,\s*(\d{4})/);
  if (yearMatch) {
    result.year = yearMatch[1] || yearMatch[2];
  }
  
  // Pattern for authors (usually before article title or after first comma)
  // Look for names like "Smith, J." or "Smith and Jones"
  const authorPattern = /^([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)*(?:,\s*[A-Z]\.)?)/;
  const authorMatch = text.match(authorPattern);
  if (authorMatch) {
    result.authors = authorMatch[1].trim();
  }
  
  // Try to extract article/book title (usually in quotes or italics)
  // For now, we'll take the text before the year or the whole text if no year
  if (result.year) {
    const beforeYear = text.substring(0, text.indexOf(result.year));
    result.article = beforeYear.trim();
  } else {
    result.article = text;
  }
  
  return result;
}

/**
 * Validate footnote count
 */
export function validateFootnoteCount(footnotes: ExtractedFootnote[], expectedCount: number): boolean {
  if (footnotes.length === 0) return false;
  
  // Check if footnotes are numbered sequentially from 1
  for (let i = 0; i < footnotes.length; i++) {
    if (footnotes[i].number !== i + 1) {
      return false;
    }
  }
  
  return footnotes.length === expectedCount;
}
