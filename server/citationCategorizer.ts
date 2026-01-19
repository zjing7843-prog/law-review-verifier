import { invokeLLM } from "./_core/llm";
import { z } from "zod";

export const CitationCategorySchema = z.enum(["case", "article", "other"]);
export type CitationCategory = z.infer<typeof CitationCategorySchema>;

export interface CategorizationResult {
  category: CitationCategory;
  confidence: "high" | "medium" | "low";
}

/**
 * Categorize a single citation using LLM
 */
export async function categorizeCitation(citation: string): Promise<CategorizationResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a legal citation expert. Categorize the given citation into one of three categories:

1. "case" - Legal case citations (court decisions, judgments)
   Examples:
   - Case C-22/98 Becu and others EU:C:1999:419, para 26
   - R v Adomako [1994] 3 All ER 79
   - Smith v Jones (2019) 22 HKCFAR 123

2. "article" - Academic articles, journal articles, book chapters, or books
   Examples:
   - Julian Nowag, Environmental Integration in Competition and Free-Movement Laws (OUP 2017) 1-12
   - Okeoghene Odudu, 'The Meaning of Undertaking Within 81 EC' (2004–05) 7 CYELS, 214
   - Julian Nowag and Alexandra Teorell, 'Beyond Balancing: Sustainability and Competition Law' (2020) Concurrences N° 4-2020

3. "other" - Everything else (websites, government publications, reports, etc.)
   Examples:
   - https://www.example.com/article
   - Department of Justice Report (2020)
   - Available at <https://example.com>

Respond ONLY with a JSON object in this exact format:
{
  "category": "case" | "article" | "other",
  "confidence": "high" | "medium" | "low"
}

Do not include any explanation or additional text.`
      },
      {
        role: "user",
        content: citation
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "citation_category",
        strict: true,
        schema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["case", "article", "other"],
              description: "The category of the citation"
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Confidence level of the categorization"
            }
          },
          required: ["category", "confidence"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  const contentText = typeof content === 'string' ? content : '';
  const result = JSON.parse(contentText || "{}");
  
  return {
    category: CitationCategorySchema.parse(result.category),
    confidence: result.confidence || "medium"
  };
}

/**
 * Categorize multiple citations in batch
 */
export async function categorizeCitationsBatch(citations: string[]): Promise<CategorizationResult[]> {
  // Process in parallel with a reasonable concurrency limit
  const BATCH_SIZE = 10;
  const results: CategorizationResult[] = [];
  
  for (let i = 0; i < citations.length; i += BATCH_SIZE) {
    const batch = citations.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(citation => categorizeCitation(citation))
    );
    results.push(...batchResults);
  }
  
  return results;
}
