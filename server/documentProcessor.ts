import mammoth from 'mammoth';
import axios from 'axios';
import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';
import * as pdfParse from 'pdf-parse';

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
    // @ts-ignore - pdf-parse has module resolution issues
    const data = await (pdfParse as any)(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX buffer
 * Prioritizes extracting actual Word footnotes from footnotes.xml
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    // First, try to extract footnotes from the DOCX XML structure
    const footnoteText = await extractDocxFootnotes(buffer);
    
    if (footnoteText) {
      console.log('[extractDocxText] Successfully extracted footnotes from Word structure');
      return footnoteText;
    }
    
    // Fallback to full text extraction
    console.log('[extractDocxText] No footnotes found in Word structure, using full text extraction');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Extract footnotes specifically from Word's footnotes.xml
 */
async function extractDocxFootnotes(buffer: Buffer): Promise<string | null> {
  try {
    console.log('[extractDocxFootnotes] Starting DOCX footnote extraction...');
    const zip = await JSZip.loadAsync(buffer);
    
    // List all files in the ZIP to see what's available
    const fileList = Object.keys(zip.files);
    console.log('[extractDocxFootnotes] Files in DOCX:', fileList.filter(f => f.includes('footnote')));
    
    const footnotesXml = zip.file('word/footnotes.xml');
    
    if (!footnotesXml) {
      console.log('[extractDocxFootnotes] No footnotes.xml found in document');
      console.log('[extractDocxFootnotes] Available word/ files:', fileList.filter(f => f.startsWith('word/')));
      return null;
    }
    
    console.log('[extractDocxFootnotes] Found footnotes.xml, parsing...');
    
    const xmlContent = await footnotesXml.async('text');
    console.log('[extractDocxFootnotes] XML content length:', xmlContent.length);
    console.log('[extractDocxFootnotes] First 500 chars:', xmlContent.substring(0, 500));
    
    const parsed = await parseStringPromise(xmlContent);
    console.log('[extractDocxFootnotes] Parsed XML keys:', Object.keys(parsed));
    
    // Extract text from footnote elements
    const footnotes = parsed['w:footnotes']?.['w:footnote'] || [];
    console.log('[extractDocxFootnotes] Found', footnotes.length, 'footnote elements in XML');
    const footnoteTexts: string[] = [];
    
    for (const footnote of footnotes) {
      const footnoteId = footnote.$?.['w:id'];
      const type = footnote.$?.['w:type'];
      
      console.log(`[extractDocxFootnotes] Processing footnote ${footnoteId}, type: ${type}`);
      
      // Skip special footnotes (separator, continuation separator)
      if (type === 'separator' || type === 'continuationSeparator') {
        console.log(`[extractDocxFootnotes] Skipping separator footnote ${footnoteId}`);
        continue;
      }
      
      // Extract text from paragraphs within the footnote
      const paragraphs = footnote['w:p'] || [];
      const texts: string[] = [];
      
      for (const para of paragraphs) {
        const runs = para['w:r'] || [];
        for (const run of runs) {
          const textElements = run['w:t'] || [];
          for (const textEl of textElements) {
            if (typeof textEl === 'string') {
              texts.push(textEl);
            } else if (textEl._) {
              texts.push(textEl._);
            }
          }
        }
      }
      
      const footnoteText = texts.join(' ').trim();
      if (footnoteText) {
        // Add the footnote with its number
        footnoteTexts.push(`${footnoteId} ${footnoteText}`);
      }
    }
    
    if (footnoteTexts.length > 0) {
      console.log(`[extractDocxFootnotes] Extracted ${footnoteTexts.length} footnotes from Word structure`);
      return footnoteTexts.join('\n');
    }
    
    return null;
  } catch (error) {
    console.error('[extractDocxFootnotes] Error parsing footnotes.xml:', error);
    return null;
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
 * Handles Word footnotes (smaller font at page bottom) and legal citation format
 */
export function extractFootnotes(text: string): ExtractedFootnote[] {
  const footnotes: ExtractedFootnote[] = [];
  
  // Debug: log text length to help diagnose issues
  console.log(`[extractFootnotes] Processing text of length: ${text.length}`);
  
  // More aggressive pattern that finds ANY number followed by citation-like text
  // This pattern looks for: number + optional punctuation + space + text with year pattern
  // Pattern matches: "1 Author, 'Title' (2023)" or "1. Citation text" or "1) Text"
  const footnotePattern = /(^|\n|\s)(\d+)\s*[\.\)]?\s+([^\n]+?)(?=(?:\n\s*\d+\s*[\.\)]?\s+|$))/g;
  
  let match;
  const rawMatches: Array<{ number: number; text: string }> = [];
  
  while ((match = footnotePattern.exec(text)) !== null) {
    const number = parseInt(match[2], 10);
    const footnoteText = match[3].trim();
    
    // Only include if it looks like a citation (has year or quotes or author-like pattern)
    // Reduced length requirement to catch shorter citations
    if (footnoteText.length > 10 && (footnoteText.includes('(') || footnoteText.includes("'") || footnoteText.includes(',') || /\d{4}/.test(footnoteText))) {
      rawMatches.push({ number, text: footnoteText });
    }
  }
  
  // If we found matches, process them
  console.log(`[extractFootnotes] Regex found ${rawMatches.length} potential footnotes`);
  
  if (rawMatches.length > 0) {
    for (const match of rawMatches) {
      const citations = match.text.split(';').map(c => c.trim()).filter(c => c.length > 0);
      
      if (citations.length > 1) {
        for (const citation of citations) {
          const parsed = parseFootnoteText(citation);
          footnotes.push({
            number: match.number,
            text: citation,
            ...parsed,
          });
        }
      } else {
        const parsed = parseFootnoteText(match.text);
        footnotes.push({
          number: match.number,
          text: match.text,
          ...parsed,
        });
      }
    }
  }
  
  // Fallback: line-by-line scanning for numbered citations
  // Use this if we found very few matches with the regex
  console.log(`[extractFootnotes] After regex: ${footnotes.length} footnotes. Using fallback if < 5`);
  
  if (footnotes.length < 5) {
    footnotes.length = 0; // Clear and start fresh with fallback method
    console.log('[extractFootnotes] Using fallback line-by-line method');
    
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Match line starting with number
      const match = line.match(/^(\d+)\s*[\.\)]?\s+(.+)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        let footnoteText = match[2].trim();
        
        // Look ahead to see if next lines continue this footnote (no new number)
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          if (!nextLine) {
            j++;
            continue;
          }
          // If next line starts with a number, stop
          if (/^\d+\s*[\.\)]?\s+/.test(nextLine)) {
            break;
          }
          // Otherwise, append to current footnote
          footnoteText += ' ' + nextLine;
          j++;
        }
        
        // Skip lines we've consumed
        i = j - 1;
        
        // Process the footnote
        const citations = footnoteText.split(';').map(c => c.trim()).filter(c => c.length > 0);
        
        if (citations.length > 1) {
          for (const citation of citations) {
            const parsed = parseFootnoteText(citation);
            footnotes.push({
              number,
              text: citation,
              ...parsed,
            });
          }
        } else {
          const parsed = parseFootnoteText(footnoteText);
          footnotes.push({
            number,
            text: footnoteText,
            ...parsed,
          });
        }
      }
    }
  }
  
  console.log(`[extractFootnotes] Final result: ${footnotes.length} footnotes extracted`);
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
 * Note: When citations are split by semicolons, multiple entries can have the same footnote number
 */
export function validateFootnoteCount(footnotes: ExtractedFootnote[], expectedCount: number): boolean {
  if (footnotes.length === 0) return false;
  
  // Get unique footnote numbers
  const uniqueNumbers = new Set(footnotes.map(f => f.number));
  const sortedNumbers = Array.from(uniqueNumbers).sort((a, b) => a - b);
  
  // Check if footnotes are numbered sequentially from 1
  for (let i = 0; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] !== i + 1) {
      return false;
    }
  }
  
  // Expected count should match unique footnote numbers, not total entries
  return sortedNumbers.length === expectedCount;
}
