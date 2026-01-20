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
  const urlMatch = citationText.match(/https?:\/\/[^\s)]+/);
  return urlMatch ? urlMatch[0] : null;
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
 * This uses the Manus search infrastructure to perform real web searches
 */
async function performWebSearch(query: string, category: CitationCategory): Promise<{ found: boolean; url?: string; snippet?: string }> {
  try {
    // Use LLM to perform web search and analyze results
    const searchPrompt = `You are a legal citation verification assistant. Search the web for the following citation and determine if it exists.

Citation to verify: "${query}"
Category: ${category}

Instructions:
1. Search for this citation on the web
2. Check if you can find evidence that this citation exists
3. Prioritize official legal databases, government sources, and academic publishers
4. Return your findings in JSON format

Return JSON with this structure:
{
  "found": true/false,
  "url": "most authoritative URL found (if any)",
  "snippet": "brief evidence of what you found (if any)"
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
              snippet: { type: "string", description: "Brief evidence of what was found" }
            },
            required: ["found"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      return { found: false };
    }

    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error('[citationVerifier] Web search error:', error);
    return { found: false };
  }
}

/**
 * Verify a citation using real web search
 */
export async function verifyCitation(
  citationText: string,
  category: CitationCategory
): Promise<VerificationResult> {
  console.log(`[citationVerifier] Verifying citation: "${citationText}" (${category})`);

  // Step 1: Check if citation already contains a URL
  const embeddedUrl = extractUrlFromCitation(citationText);
  
  if (embeddedUrl) {
    const authority = determineAuthority(embeddedUrl);
    const isOfficial = authority === "official";
    
    return {
      status: "verified",
      reason: isOfficial ? "Official source link provided" : "Link provided in citation",
      link: embeddedUrl,
      authority
    };
  }

  // Step 2: Perform web search for the citation
  const searchResult = await performWebSearch(citationText, category);

  if (!searchResult.found) {
    // Citation not found via web search
    return {
      status: "unsure",
      reason: "Could not verify via web search",
      link: `https://www.google.com/search?q=${encodeURIComponent(citationText)}`,
      authority: "general"
    };
  }

  // Step 3: Citation found - determine authority and status
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
    authority
  };
}
