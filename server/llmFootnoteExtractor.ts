import { invokeLLM } from "./_core/llm";
import { ExtractedFootnote } from "./documentProcessor";

/**
 * Extract footnotes from document text using LLM
 * LLM is instructed to identify footnotes by:
 * - Text below horizontal lines (footnote separators)
 * - Smaller font sizes (typical footnote formatting)
 * - Numbered sequences starting from 1
 * - Complete extraction without losing any words
 */
export async function extractFootnotesWithLLM(text: string): Promise<ExtractedFootnote[]> {
  try {
    console.log(`[extractFootnotesWithLLM] Processing text of length: ${text.length}`);
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting footnotes from legal and academic documents. Your task is to identify and extract ALL footnotes from the provided document text with perfect accuracy.

FOOTNOTE IDENTIFICATION RULES:
1. Footnotes are typically found below a horizontal line (footnote separator) at the bottom of pages
2. Footnotes usually appear in smaller font size compared to the main text
3. Footnotes are numbered sequentially starting from 1
4. Each footnote starts with its number (e.g., "1", "2", "3") followed by the citation text
5. Footnotes may span multiple lines - extract the COMPLETE text without losing any words
6. Footnotes may contain legal citations, article references, book citations, or explanatory text

EXTRACTION REQUIREMENTS:
- Extract EVERY footnote in the document
- Preserve the COMPLETE text of each footnote - do not truncate or summarize
- Maintain the original numbering
- Handle multi-line footnotes correctly
- Do not skip any footnotes, even if they seem repetitive or short

OUTPUT FORMAT:
Return a JSON array where each footnote is an object with:
- number: the footnote number (integer)
- text: the complete footnote text (string, preserving all words and punctuation)`
        },
        {
          role: "user",
          content: `Extract all footnotes from the following document text. Remember to look for text below horizontal lines, smaller font indicators, and numbered sequences starting from 1. Extract the complete text of each footnote without losing any words.

Document text:
${text}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "footnote_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              footnotes: {
                type: "array",
                description: "Array of extracted footnotes",
                items: {
                  type: "object",
                  properties: {
                    number: {
                      type: "integer",
                      description: "The footnote number"
                    },
                    text: {
                      type: "string",
                      description: "The complete footnote text"
                    }
                  },
                  required: ["number", "text"],
                  additionalProperties: false
                }
              }
            },
            required: ["footnotes"],
            additionalProperties: false
          }
        }
      }
    });

    const message = response.choices[0].message;
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    if (!content) {
      throw new Error("Empty response from LLM");
    }

    const result = JSON.parse(content);
    console.log(`[extractFootnotesWithLLM] Extracted ${result.footnotes.length} footnotes`);
    
    return result.footnotes;
  } catch (error) {
    console.error('[extractFootnotesWithLLM] Error:', error);
    throw new Error(`Failed to extract footnotes with LLM: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
