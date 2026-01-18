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
 * Handles legal citation format with multiple citations per footnote
 */
export function extractFootnotes(text: string): ExtractedFootnote[] {
  const footnotes: ExtractedFootnote[] = [];
  
  // Pattern to match footnote numbers at the start of a line or after whitespace
  // Matches: "1 ", "1. ", "1) ", or superscript numbers
  const footnotePattern = /(?:^|\n)\s*(\d+)\s*[\.\)]?\s+([^\n]+(?:\n(?!\s*\d+\s*[\.\)]?\s+)[^\n]+)*)/g;
  
  let match;
  while ((match = footnotePattern.exec(text)) !== null) {
    const number = parseInt(match[1], 10);
    const footnoteText = match[2].trim();
    
    // Split by semicolon to handle multiple citations in one footnote
    const citations = footnoteText.split(';').map(c => c.trim()).filter(c => c.length > 0);
    
    // For now, treat the entire footnote as one entry
    // In the future, we could split into separate entries
    const parsed = parseFootnoteText(footnoteText);
    
    footnotes.push({
      number,
      text: footnoteText,
      ...parsed,
    });
  }
  
  // If no footnotes found with the above pattern, try a more aggressive approach
  if (footnotes.length === 0) {
    // Try to find footnotes in a continuous block
    const lines = text.split('\n');
    let currentFootnote: { number: number; text: string } | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Check if line starts with a number
      const startMatch = trimmed.match(/^(\d+)\s*[\.\)]?\s+(.+)$/);
      if (startMatch) {
        // Save previous footnote if exists
        if (currentFootnote) {
          const parsed = parseFootnoteText(currentFootnote.text);
          footnotes.push({
            number: currentFootnote.number,
            text: currentFootnote.text,
            ...parsed,
          });
        }
        
        // Start new footnote
        currentFootnote = {
          number: parseInt(startMatch[1], 10),
          text: startMatch[2].trim(),
        };
      } else if (currentFootnote) {
        // Continue current footnote
        currentFootnote.text += ' ' + trimmed;
      }
    }
    
    // Don't forget the last footnote
    if (currentFootnote) {
      const parsed = parseFootnoteText(currentFootnote.text);
      footnotes.push({
        number: currentFootnote.number,
        text: currentFootnote.text,
        ...parsed,
      });
    }
  }
  
  return footnotes;
}

/**
 * Parse footnote text to extract article, authors, and year
 * Handles legal citation format: Author, 'Title' (Year) Journal Page
 */
function parseFootnoteText(text: string): Partial<ExtractedFootnote> {
  const result: Partial<ExtractedFootnote> = {};
  
  // Extract year - look for (YYYY) pattern
  const yearMatch = text.match(/\((\d{4})\)/);
  if (yearMatch) {
    result.year = yearMatch[1];
  }
  
  // Extract article/book title - look for text in single quotes
  const titleMatch = text.match(/['']([^'']+)['']/);
  if (titleMatch) {
    result.article = titleMatch[1].trim();
  } else {
    // If no quotes found, try to extract title between author and year
    // Or between commas
    const parts = text.split(',');
    if (parts.length > 1) {
      // Take the second part as potential title
      result.article = parts[1].trim().replace(/['']([^'']+)['']/, '$1');
    }
  }
  
  // Extract authors - usually at the beginning before comma or quote
  // Pattern: Name Name, or Name Name Name
  const authorMatch = text.match(/^([^,'']+?)(?:,|[''])/); 
  if (authorMatch) {
    result.authors = authorMatch[1].trim();
  } else {
    // Fallback: take first part before comma
    const firstComma = text.indexOf(',');
    if (firstComma > 0) {
      result.authors = text.substring(0, firstComma).trim();
    }
  }
  
  // If no article title found yet, try to extract everything between quotes and year
  if (!result.article && result.year) {
    const beforeYear = text.substring(0, text.indexOf(`(${result.year})`));
    // Remove author part
    if (result.authors) {
      const afterAuthor = beforeYear.substring(beforeYear.indexOf(result.authors) + result.authors.length);
      result.article = afterAuthor.replace(/^[,\s]+/, '').replace(/['']([^'']+)['']/, '$1').trim();
    } else {
      result.article = beforeYear.trim();
    }
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
