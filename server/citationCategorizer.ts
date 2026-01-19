import { invokeLLM } from "./_core/llm";
import { z } from "zod";
import * as db from "./db";

export const CitationCategorySchema = z.enum([
  "case",
  "article",
  "book",
  "policy_paper",
  "website",
  "statute",
  "explanatory_text",
  "other"
]);
export type CitationCategory = z.infer<typeof CitationCategorySchema>;

export interface CategorizationResult {
  category: CitationCategory;
  confidence: "high" | "medium" | "low";
  skipVerification?: boolean; // True for explanatory text
}

/**
 * Categorize a single citation using LLM
 * @param citation The citation text to categorize
 * @param userId Optional user ID to load custom LLM settings
 */
export async function categorizeCitation(citation: string, userId?: number): Promise<CategorizationResult> {
  // Load user LLM settings if userId provided
  let llmSettings = null;
  if (userId) {
    llmSettings = await db.getLlmSettingByUserId(userId);
  }
  
  // For now, always use Manus LLM (custom providers will be implemented later)
  // TODO: Implement OpenAI and Anthropic API calls when llmSettings.provider !== 'manus'
  if (llmSettings && llmSettings.provider !== 'manus') {
    console.log(`[LLM] User ${userId} has custom provider ${llmSettings.provider}, but using Manus LLM for now`);
  }
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a legal citation expert. Categorize the given text into one of these categories:

1. "case" - Legal case citations (court decisions, judgments)
   Examples:
   - Case C-22/98 Becu and others EU:C:1999:419, para 26
   - R v Adomako [1994] 3 All ER 79
   - Smith v Jones (2019) 22 HKCFAR 123

2. "article" - Academic journal articles
   Examples:
   - Okeoghene Odudu, 'The Meaning of Undertaking Within 81 EC' (2004–05) 7 CYELS, 214
   - Julian Nowag and Alexandra Teorell, 'Beyond Balancing: Sustainability and Competition Law' (2020) Concurrences N° 4-2020

3. "book" - Books, monographs, book chapters
   Examples:
   - Julian Nowag, Environmental Integration in Competition and Free-Movement Laws (OUP 2017) 1-12
   - Richard Whish and David Bailey, Competition Law (9th edn, OUP 2018)

4. "policy_paper" - Government white papers, policy documents, reports
   Examples:
   - Department of Justice Report (2020)
   - European Commission, 'Green Paper on Competition Policy' COM(2020) 123

5. "website" - Online resources, web pages, blog posts
   Examples:
   - Available at <https://example.com>
   - https://www.example.com/article

6. "statute" - Legislation, treaties, regulations
   Examples:
   - Article 101 TFEU
   - Competition Act 1998, s 2
   - Treaty on the Functioning of the European Union

7. "explanatory_text" - NOT a citation, just explanatory or descriptive text
   Examples:
   - "Another option is a change of the competition law provisions in the Treaty, however as such a change is considered unlikely in the near future it is not covered in this paper."
   - "This approach has been criticized by many scholars."
   - "See further discussion in Chapter 3."

8. "other" - Anything else that doesn't fit above categories

IMPORTANT: If the text is purely explanatory/descriptive and NOT citing a source, categorize as "explanatory_text".

Respond ONLY with a JSON object in this exact format:
{
  "category": "case" | "article" | "book" | "policy_paper" | "website" | "statute" | "explanatory_text" | "other",
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
              enum: ["case", "article", "book", "policy_paper", "website", "statute", "explanatory_text", "other"],
              description: "The category of the citation or text"
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
  
  const category = CitationCategorySchema.parse(result.category);
  return {
    category,
    confidence: result.confidence || "medium",
    skipVerification: category === "explanatory_text"
  };
}

/**
 * Categorize multiple citations in batch
 * @param citations Array of citation texts
 * @param userId Optional user ID to load custom LLM settings
 */
export async function categorizeCitationsBatch(citations: string[], userId?: number): Promise<CategorizationResult[]> {
  // Process in parallel with a reasonable concurrency limit
  const BATCH_SIZE = 10;
  const results: CategorizationResult[] = [];
  
  for (let i = 0; i < citations.length; i += BATCH_SIZE) {
    const batch = citations.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(citation => categorizeCitation(citation, userId))
    );
    results.push(...batchResults);
  }
  
  return results;
}
