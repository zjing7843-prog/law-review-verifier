/**
 * Citation Verification Service
 * Uses real web search to verify citations and check authoritative legal sources
 */

import { invokeLLM } from "../_core/llm";

export type CitationCategory = "case" | "article" | "book" | "policy_paper" | "website" | "statute" | "explanatory_text" | "other";
export type VerificationStatus = "verified" | "hallucinated" | "unsure";
export type AuthorityLevel = "official" | "authoritative" | "general";

export interface VerificationResult {
  status: VerificationStatus;
  reason: string;
  link?: string;
  authority: AuthorityLevel;
  confidence: number; // Confidence percentage (0-100)
}

// Official legal database domains across multiple jurisdictions
const OFFICIAL_LEGAL_DOMAINS = [
  // United Kingdom
  'bailii.org',
  'caselaw.nationalarchives.gov.uk',
  'judiciary.uk',
  'supremecourt.uk',
  'courtsni.gov.uk',
  'legislation.gov.uk',
  'publications.parliament.uk',
  'vlex.co.uk',
  
  // United States
  'supremecourt.gov',
  'uscourts.gov',
  'law.cornell.edu',
  'courtlistener.com',
  'justia.com',
  'casetext.com',
  'congress.gov',
  
  // Canada
  'scc-csc.ca',
  'canlii.org',
  'decisions.fca-caf.gc.ca',
  'courts.gov.bc.ca',
  
  // Australia
  'austlii.edu.au',
  'hcourt.gov.au',
  'fedcourt.gov.au',
  'jade.io',
  
  // Hong Kong
  'hklii.hk',
  'judiciary.hk',
  'legalref.judiciary.hk',
  
  // Singapore
  'singaporelawwatch.sg',
  'elitigation.sg',
  
  // New Zealand
  'nzlii.org',
  'courtsofnz.govt.nz',
  
  // Ireland
  'courts.ie',
  'bailii.org/ie',
  
  // South Africa
  'saflii.org',
  'constitutionalcourt.org.za',
  
  // India
  'sci.gov.in',
  'indiankanoon.org',
  
  // European Union
  'curia.europa.eu',
  'eur-lex.europa.eu',
  
  // International Courts
  'icj-cij.org',
  'icc-cpi.int',
  'echr.coe.int'
];

// Authoritative academic and legal research databases
const AUTHORITATIVE_DOMAINS = [
  'scholar.google.com',
  'jstor.org',
  'ssrn.com',
  'heinonline.org',
  'westlaw.com',
  'lexisnexis.com',
  'cambridge.org',
  'oxfordacademic.com',
  'springer.com',
  'wiley.com',
  'tandfonline.com',
  'sciencedirect.com'
];

/**
 * Extract URL from citation text if present
 */
function extractUrlFromCitation(citationText: string): string | null {
  // Match URLs but exclude trailing punctuation like >, ), ], etc.
  const urlMatch = citationText.match(/https?:\/\/[^\s)>\]]+/);
  if (!urlMatch) return null;
  
  // Clean up trailing punctuation that might have been captured
  let url = urlMatch[0];
  url = url.replace(/[>)\].,;:]+$/, ''); // Remove trailing punctuation
  
  return url;
}

/**
 * Check if a URL belongs to an official legal source
 */
function isOfficialSource(url: string): boolean {
  return OFFICIAL_LEGAL_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Check if a URL belongs to an authoritative academic source
 */
function isAuthoritativeSource(url: string): boolean {
  return AUTHORITATIVE_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Determine authority level based on URL
 */
function determineAuthority(url: string): AuthorityLevel {
  if (isOfficialSource(url)) {
    return "official";
  } else if (isAuthoritativeSource(url)) {
    return "authoritative";
  }
  return "general";
}

/**
 * Perform web search using LLM with search capabilities
 * Enhanced with hallucination detection and confidence scoring
 */
async function performWebSearch(query: string, category: CitationCategory): Promise<{ 
  found: boolean; 
  url?: string; 
  snippet?: string;
  confidence: number;
  fieldMismatches?: string[];
  isHallucinated: boolean;
}> {
  try {
    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Search timeout after 60 seconds')), 60000);
    });
    
    const searchPromise = performSearchWithLLM(query, category);
    
    return await Promise.race([searchPromise, timeoutPromise]);
  } catch (error) {
    console.error('[citationVerifier] Web search error:', error);
    return { found: false, confidence: 0, isHallucinated: false };
  }
}

/**
 * Internal function to perform the actual LLM search
 */
async function performSearchWithLLM(query: string, category: CitationCategory): Promise<{ 
  found: boolean; 
  url?: string; 
  snippet?: string;
  confidence: number;
  fieldMismatches?: string[];
  isHallucinated: boolean;
}> {
  try {
    // Use LLM to perform web search and analyze results with strict field checking
    const searchPrompt = `You are a legal citation verification assistant acting as a law review editor. Search the web for the following citation and verify ALL fields match exactly.

Citation to verify: "${query}"
Category: ${category}

CRITICAL INSTRUCTIONS:
1. Search for this citation on the web using official legal databases, government sources, and academic publishers
2. Check EVERY field: author names, year, title, journal/reporter, volume, page numbers, paragraph numbers, citation identifiers
3. Be VERY CAREFUL about marking citations as hallucinated - only do so when confidence > 90%
4. Mark as HALLUCINATED if:
   - Title/source matches BUT citation number/page is wrong (e.g., "OJ C259/1" exists but citation says "OJ C259/990")
   - Author name exists but is attached to a different work
   - Year is wrong (e.g., article exists but published in different year)
   - Specific page/paragraph numbers don't exist in the found document
   - Title doesn't exist at all in any database
5. IMPORTANT: When the core document exists but the specific citation identifier is fabricated, this is HALLUCINATION, not just "unsure"
6. Mark as UNSURE if you find similar citations but can't verify exact match due to access issues or ambiguity
7. Mark as VERIFIED only if all fields match exactly

Return JSON with this structure:
{
  "found": true/false,
  "url": "most authoritative URL found (if any)",
  "snippet": "brief evidence of what you found",
  "confidence": 0-100 (percentage confidence in your assessment),
  "fieldMismatches": ["list of fields that don't match, if any"],
  "isHallucinated": true/false (true only if confidence > 90% that citation is fabricated)
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a legal citation verification assistant with web search capabilities. Always return valid JSON." },
        { role: "user", content: searchPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "search_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              found: { type: "boolean", description: "Whether the citation was found" },
              url: { type: "string", description: "Most authoritative URL found" },
              snippet: { type: "string", description: "Brief evidence of what was found" },
              confidence: { type: "number", description: "Confidence percentage 0-100" },
              fieldMismatches: { 
                type: "array", 
                items: { type: "string" },
                description: "List of fields that don't match" 
              },
              isHallucinated: { type: "boolean", description: "True if confidence > 90% that citation is fabricated" }
            },
            required: ["found", "confidence", "isHallucinated"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      return { found: false, confidence: 0, isHallucinated: false };
    }

    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error('[citationVerifier] Web search error:', error);
    return { found: false, confidence: 0, isHallucinated: false };
  }
}

/**
 * Verify a citation using real web search with hallucination detection
 * Includes timeout and retry logic for stability
 */
export async function verifyCitation(
  citationText: string,
  category: CitationCategory,
  retries: number = 2
): Promise<VerificationResult> {
  console.log(`[citationVerifier] Verifying citation: "${citationText}" (${category})`);

  // Step 1: Check if citation contains a URL - verify by direct access (ignore access date)
  const embeddedUrl = extractUrlFromCitation(citationText);
  
  if (embeddedUrl) {
    console.log(`[citationVerifier] Found URL in citation: ${embeddedUrl}`);
    
    // Check if URL is accessible
    try {
      const response = await fetch(embeddedUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        const authority = determineAuthority(embeddedUrl);
        return {
          status: "verified",
          reason: authority === "official" 
            ? "Official source accessible"
            : authority === "authoritative"
            ? "Authoritative source accessible"
            : "Source accessible",
          link: embeddedUrl,
          authority,
          confidence: 100
        };
      } else {
        return {
          status: "unsure",
          reason: `Link returned ${response.status} status`,
          link: embeddedUrl,
          authority: "general",
          confidence: 0
        };
      }
    } catch (error) {
      console.error(`[citationVerifier] URL check failed for ${embeddedUrl}:`, error);
      return {
        status: "unsure",
        reason: "Link not accessible",
        link: embeddedUrl,
        authority: "general",
        confidence: 0
      };
    }
  }

  // Step 2: Perform web search for the citation with field-level verification
  // Add retry logic for failed searches
  let searchResult;
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      searchResult = await performWebSearch(citationText, category);
      break; // Success, exit retry loop
    } catch (error) {
      lastError = error;
      console.error(`[citationVerifier] Attempt ${attempt + 1} failed:`, error);
      
      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  // If all retries failed, return unsure status
  if (!searchResult) {
    console.error('[citationVerifier] All retry attempts failed:', lastError);
    return {
      status: "unsure",
      reason: "Service temporarily unavailable",
      link: `https://www.google.com/search?q=${encodeURIComponent(citationText)}`,
      authority: "general",
      confidence: 0
    };
  }

  // Step 3: Handle hallucinated citations (confidence > 90%)
  if (searchResult.isHallucinated) {
    const mismatchDetails = searchResult.fieldMismatches && searchResult.fieldMismatches.length > 0
      ? `: ${searchResult.fieldMismatches.join(", ")}`
      : "";
    
    return {
      status: "hallucinated",
      reason: `Citation appears fabricated${mismatchDetails}`,
      link: `https://www.google.com/search?q=${encodeURIComponent(citationText)}`,
      authority: "general",
      confidence: searchResult.confidence
    };
  }

  // Step 4: Handle citations not found or with low confidence
  if (!searchResult.found || searchResult.confidence < 70) {
    const mismatchNote = searchResult.fieldMismatches && searchResult.fieldMismatches.length > 0
      ? ` (possible mismatches: ${searchResult.fieldMismatches.join(", ")})`
      : "";
    
    return {
      status: "unsure",
      reason: `Could not verify${mismatchNote}`,
      link: `https://www.google.com/search?q=${encodeURIComponent(citationText)}`,
      authority: "general",
      confidence: searchResult.confidence
    };
  }

  // Step 5: Citation found and verified - determine authority and status
  const url = searchResult.url || `https://www.google.com/search?q=${encodeURIComponent(citationText)}`;
  const authority = searchResult.url ? determineAuthority(searchResult.url) : "general";

  let reason: string;
  if (authority === "official") {
    reason = category === "case" 
      ? "Found on official judgment system"
      : category === "statute"
      ? "Found on official legislation database"
      : "Found on official government source";
  } else if (authority === "authoritative") {
    reason = "Found on authoritative academic source";
  } else {
    reason = "Found via web search";
  }

  return {
    status: "verified",
    reason,
    link: url,
    authority,
    confidence: searchResult.confidence
  };
}
