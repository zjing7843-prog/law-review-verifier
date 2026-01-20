# Law Review Footnote Verifier - Simplified Workflow

## Phase 1: Remove File Upload & Create Paste Interface
- [x] Remove file upload page and functionality
- [ ] Remove document processing dependencies (pdf-parse, mammoth, jszip)
- [x] Create simple paste interface with large text area
- [x] Add "Parse Citations" button to trigger parsing
- [ ] Remove upload endpoint and multer dependency

## Phase 2: Citation Parser
- [x] Build parser to split pasted text into individual citations
- [x] Extract footnote numbers from each citation
- [x] Parse author names from citations
- [x] Extract article/book titles (text in quotes)
- [x] Extract publication years (text in parentheses)
- [x] Handle semicolon-separated multiple citations
- [x] Create structured data for table display

## Phase 3: Editable Table Interface
- [x] Display parsed citations in editable table
- [x] Columns: Number, Article/Book, Author(s), Year
- [x] Allow inline editing of all cells
- [x] Add/delete row functionality
- [x] Save changes in memory (no database needed)
- [x] Confirmation button to proceed to verification

## Phase 4: Web Search Validation
- [x] Implement simulated web search for each citation
- [x] Check if citation exists online
- [x] Verify author, title, and year match
- [x] Mark as correct (✓), incorrect (✗), or unsure (?)
- [x] Calculate correctness percentage
- [x] Show real-time progress during verification

## Phase 5: Results & Export
- [x] Display verification results in table
- [x] Show correctness percentage
- [x] Generate CSV export
- [ ] Create interactive visualization page (optional)
- [ ] Add charts showing accuracy metrics (optional)

## Phase 6: Testing & Delivery
- [x] Test complete paste-to-verify workflow
- [x] Verify citation parsing accuracy
- [x] Test web search validation
- [x] Validate CSV export functionality
- [x] Create checkpoint and deliver

## Fix: Update Parser for Unnumbered Citations
- [x] Remove footnote number extraction logic
- [x] Auto-number citations sequentially based on line order (1, 2, 3...)
- [x] Parse each line as a complete citation
- [x] Handle semicolon-separated citations within each line
- [x] Update placeholder text to show unnumbered format


## Simplify: Category-Based Parsing
- [x] Remove field extraction (author, year, article, etc.)
- [x] Implement category detection: Cases, Article/Book Chapter, Others
- [x] Update table to show: Number, Category, Full Citation
- [x] Allow users to change category via dropdown
- [x] Keep citation text as-is without parsing
- [x] Update verification to work with full citation text


## Improve Category Detection Accuracy
- [x] Update case detection: court citations [YYYY] COURT, R v Party, "at [56]" references
- [x] Update article detection: Author, 'Title' (Year) Journal pattern
- [x] Update other detection: Department names, URLs, government publications
- [x] Add "ibid" handling to inherit category from previous citation
- [x] Test with real legal citations provided by user
- [x] Fix [YYYY] # pattern detection (e.g., [1995] 1 AC 171)


## Bug: Overly Broad Case Detection
- [ ] Fix [YYYY] pattern that catches articles with year citations
- [ ] Articles must be detected BEFORE cases to avoid false positives
- [ ] Improve case detection to require more specific patterns
- [ ] Test with user's 60-citation dataset to verify 0 articles bug is fixed


## Remove Authentication
- [x] Remove auth check from Home page
- [x] Remove auth check from Parse page
- [x] Make app accessible without login

## Debug Article Detection
- [x] Check if Parse.tsx changes are actually being served to browser
- [x] Add console.log to see what category is being assigned
- [ ] Test in actual browser with real citations


## Force Cache Clear
- [ ] Add version number to page to verify which code is loading
- [ ] Add alert on page load to confirm new code is running
- [ ] Clear Vite build cache completely


## Fix Smart Quotes Detection
- [x] Update hasQuotedTitle regex to detect curly/smart quotes (' ' " ")
- [ ] Test with actual user citations that have smart quotes
- [ ] Verify articles are now detected correctly


## Fix Regex with Unicode Escapes
- [x] Replace literal quote characters with \\u0027, \\u2018, \\u2019, \\u201C, \\u201D
- [ ] Test regex pattern actually matches quoted titles
- [ ] Verify articles show correct count in UI


## Add Navigation Buttons
- [x] Add "Back" button to Parse page (returns to Home)
- [x] Add "Back" button to Verify page (returns to Parse)
- [x] Test navigation flow works correctly


## Implement Smart Verification Filtering
- [x] Detect "ibid" citations (already inherit category, should skip verification)
- [x] Detect cross-reference pattern "(n [number])" indicating repeat citation
- [x] Extract the referenced footnote number from "(n X)" pattern
- [x] Filter out repeat citations before verification (behind the scenes)
- [x] Only verify first-time/unique citations
- [x] Map verification results back to all instances of same source
- [x] Update UI to show verification progress only for unique citations
- [x] Test with examples: "Mak Wan Ling (n 7), at [34]" should reference footnote 7


## Fix Ibid and Cross-Reference Detection
- [x] Test with user's real example: "Ibid., at 8." and "Ibid., at [94], [187]."
- [x] Check if capitalization (Ibid vs ibid) is causing issues
- [x] Check if punctuation (Ibid. vs Ibid vs ibid) is causing issues
- [x] Ensure detection works with all variations
- [x] Verify repeat citations are correctly filtered out before verification


## Hide Repeat Citations from Verify Page Display
- [x] Filter out repeat citations (ibid and cross-references) from the preview table on Verify page
- [x] Only show unique citations that will actually be verified
- [x] Update the table to display only the filtered citations
- [x] Keep the summary text showing total vs unique counts


## Implement Real Google Search Verification
- [x] Integrate Google search API for Article/Book category citations
- [x] Integrate Google search API for Other category citations
- [x] Keep mock verification for Case category (not mentioned for web search)
- [x] Add "Link" column to show URL when citation is found
- [x] Extract and store the URL from search results
- [x] Separate results display into three tables: Article/Book, Case, Other
- [x] Update CSV export to include Link column
- [x] Test with real article and book citations


## UI Improvements - Status Labels and Layout
- [x] Change status from "Correct" to "Verified"
- [x] Change status from "Incorrect" to "Hallucinated"
- [x] Keep "Unsure" status as is
- [x] Update verification logic to rarely mark as "Hallucinated" (only when 90%+ sure it doesn't exist)
- [x] Fix table layout to prevent horizontal scrolling (single view)
- [x] Make reason messages more succinct and concise
- [x] Update status badges styling for new labels
- [x] Update CSV export headers


## Improve Verification Accuracy and Statistics
- [x] Check author/year/title correspondence during verification
- [x] Mark as "Hallucinated" if author/title exist but year doesn't match
- [x] Add Google search links for "Unsure" citations so users can manually verify
- [x] Fix statistics calculation to include ALL footnotes (including ibid and cross-references)
- [x] Keep results display showing only first-time citations (hide repeats)
- [x] Update verification rate calculation: (verified count / total count including repeats) * 100


## Bug: Repeat Citations Appearing in Results Display
- [x] Filter out ibid and cross-reference citations from results display tables
- [x] Only show first-time citations in Articles & Books, Cases, and Other tables
- [x] Keep repeat citations in statistics calculation (already working)
- [x] Test: Citations #4 and #6 (ibid) should NOT appear in Cases table


## UI Text Updates
- [x] Remove version update notification window
- [x] Remove text: "Paste all your footnotes here, one per line. We'll automatically number them for you."
- [x] Change "Paste your citations below" to "Paste all footnotes below for a preliminary verification"


## Table Layout Improvements and URL Verification
- [x] Adjust Parse page table to fit in one view (autofit column widths, no horizontal scrolling)
- [x] Adjust Verify page results tables (Articles & Books, Cases, Other) to fit in one view
- [x] Implement URL extraction from footnote text (detect "Available at", "https://", "http://", etc.)
- [x] Add URL verification logic: check if link exists and can be opened
- [x] Mark citations with working URLs as "Verified" instead of "Unsure"
- [x] Test with example: "The General Medical Council, 'Independent Review...' (June 2019). Available at https://www.gmc-uk.org/-/media/documents/..."


## Remove Debug Alert Window
- [x] Find and remove "Parse page VERSION 2.0 loaded" alert/window from Parse page
- [x] Check for any other debug alerts or console.log statements


## Fix Column Width Autofit for All Tables
- [x] Parse page table: Set proper column width percentages (No: 5%, Category: 15%, Citation: 60%, Actions: 20%)
- [x] Verify preview table: Set proper column widths (No: 5%, Category: 15%, Citation: 80%)
- [x] Verify results tables: Set proper column widths (No: 5%, Citation: 45%, Status: 15%, Reason: 20%, Link: 15%)
- [x] Allow citation text to wrap within cells (not force single line)
- [x] Remove any min-width constraints that force horizontal scrolling
- [x] Test all tables to ensure Edit/Delete buttons visible without scrolling


## Fix Text Overlapping and Missing Links
- [x] Add proper text wrapping to all table cells (break-words, whitespace-normal)
- [x] Fix Parse page table cells to wrap text properly
- [x] Fix Verify preview table cells to wrap text properly
- [x] Fix Verify results tables cells to wrap text properly
- [x] Ensure verified AND unsure citations in ALL categories (case, article, other) have Google search links
- [x] Test with long citations to verify no text overlapping


## Fix Other Table Text Overlapping
- [x] Check why Other table still has text overlapping while Articles & Books table works correctly
- [x] Apply same text wrapping fix to Other table cells
- [x] Test with long GMC citation to verify no overlapping

## Improve Case Verification Logic
- [x] Detect official judgment system domains in Google search results (publications.parliament.uk, vlex.co.uk, bailii.org, caselaw.nationalarchives.gov.uk, etc.)
- [x] Mark cases as "Verified" when official judgment links are found in search results
- [x] Keep "Unsure" status only when no official sources are found
- [x] Update reason to "Found on official judgment system" for verified cases
- [x] Test with example: "[2005] 1 Cr App R 328" should be marked as Verified


## Expand Official Domains to Multiple Jurisdictions
- [x] Add US official domains (supremecourt.gov, uscourts.gov, justia.com, law.cornell.edu, courtlistener.com, casetext.com)
- [x] Add Canadian domains (scc-csc.ca, canlii.org, decisions.fca-caf.gc.ca, courts.gov.bc.ca)
- [x] Add Australian domains (austlii.edu.au, hcourt.gov.au, fedcourt.gov.au, jade.io)
- [x] Add Hong Kong domains (hklii.hk, judiciary.hk, legalref.judiciary.hk)
- [x] Add Singapore domains (singaporelawwatch.sg, elitigation.sg)
- [x] Add New Zealand domains (nzlii.org, courtsofnz.govt.nz)
- [x] Add Irish domains (courts.ie, bailii.org/ie)
- [x] Add South African domains (saflii.org, constitutionalcourt.org.za)
- [x] Add Indian domains (sci.gov.in, indiankanoon.org)
- [x] Add EU domains (curia.europa.eu, eur-lex.europa.eu)
- [x] Add international court domains (icj-cij.org, icc-cpi.int, echr.coe.int)


## Improve Article/Book vs Case Categorization
- [x] Handle articles with explanatory text prefix (e.g., "See Julian Nowag...", "For a detailed examination see also...")
- [x] Detect article pattern: Author Name + Title (quoted or in book format) + Year + optional page numbers
- [x] Improve case detection for EU cases (Case C-###, EU:C:YYYY:###)
- [x] Prioritize case patterns with hyphens/slashes in numbers (C-22/98, etc.)
- [x] Test with user examples:
  * "See Julian Nowag, Environmental Integration in Competition and Free-Movement Laws (OUP 2017) 1-12..." ✅
  * "For a detailed examination see also Julian Nowag and Alexandra Teorell, 'Beyond Balancing: Sustainability and Competition Law' (2020)..." ✅
  * "Okeoghene Odudu, 'The Meaning of Undertaking Within 81 EC' (2004–05) 7 CYELS, 214" ✅
  * "Case C- 22/98 Becu and others EU:C:1999:419, para 26." ✅


## Replace Regex Categorization with LLM
- [x] Design LLM prompt for citation categorization (case, article/book, other)
- [x] Create server-side tRPC endpoint for batch LLM categorization
- [x] Update Parse.tsx to call LLM API instead of local regex logic
- [x] Add loading state during categorization
- [x] Handle LLM errors gracefully with fallback
- [x] Test with all previous examples to ensure accuracy (4/4 passed)
- [x] Remove old regex-based detectCategory function


## Add User-Configurable LLM API Settings
- [x] Design database schema for storing LLM provider settings (provider type, API key, model name)
- [x] Create settings page UI with LLM configuration form
- [x] Add tRPC endpoints for saving/retrieving LLM settings
- [x] Implement dual-mode categorization: Manus LLM (default) vs Custom API
- [ ] Support OpenAI API format for custom LLM (infrastructure ready, API calls pending)
- [ ] Support Anthropic API format for custom LLM (infrastructure ready, API calls pending)
- [ ] Add validation and error handling for custom API keys
- [x] Keep Manus LLM as default for testing/demo purposes
- [x] Test Settings page UI and database integration


## Expand LLM Categorization with Granular Categories
- [x] Update category schema to support: case, article, book, policy paper, website, statute/legislation, explanatory text
- [x] Update LLM prompt to detect explanatory text (non-citations that explain something)
- [x] Add "skip verification" flag for explanatory text category
- [x] Update Parse page UI to display new categories with appropriate colors/badges
- [x] Update Verify page to filter out explanatory text from web search
- [x] Test with examples:
  * "Another option is a change of the competition law provisions in the Treaty..." → explanatory text ✅
  * "See Julian Nowag, Environmental Integration..." → book ✅
  * "Available at https://example.com/article" → website ✅
  * Article 101 TFEU → statute/legislation ✅


## Law Review Editor Focus
- [x] Update LLM categorization prompt to emphasize law review context (primary vs secondary sources)
- [x] Clarify that cases and legislation are PRIMARY categories for law review work
- [x] Update verification logic to prioritize authoritative legal sources
- [x] Weight official court websites, government databases, and law libraries higher
- [x] Add source authority indicators (official/authoritative/general) in verification results
- [x] Display authority badges in verification results for editor review


## Expand Repeat Citation Detection
- [x] Add "supra" detection (e.g., "Smith, supra note 5", "See supra Part II")
- [x] Add "Id" and "Id." detection (e.g., "Id.", "Id. at 123")
- [x] Keep existing "ibid" and "(n X)" detection
- [x] Test with real legal citations containing all cross-reference markers (9 citations → 3 unique, 6 filtered)
- [x] Ensure these citations are filtered out from verification (no web search needed)


## Add Comparative Cross-Reference Detection
- [x] Detect "see also" followed by footnote reference (e.g., "See also n 5", "see also (n 3)")
- [x] Detect "cf." followed by footnote reference (e.g., "Cf. n 5", "cf. (n 3)")
- [x] Preserve substantive citations with signal words (e.g., "See also Smith v Jones [2020]" should NOT be filtered)
- [x] Add logic to distinguish between pure cross-references and substantive citations with signals
- [x] Test with examples:
  * "See also n 5" → cross-reference (filter out) ✅
  * "Cf. (n 3)" → cross-reference (filter out) ✅
  * "See also Smith v Jones [2020] 1 AC 100" → substantive citation (keep) ✅
  * "Cf. Julian Nowag, Environmental Integration (OUP 2017)" → substantive citation (keep) ✅


## Batch Citation Import from Word and PDF
- [x] Design file upload architecture (S3 storage + backend processing)
- [x] Add file upload endpoint to accept .docx and .pdf files (already exists)
- [x] Implement .docx footnote extraction using mammoth (already exists with Word footnotes.xml support)
- [x] Implement .pdf footnote extraction using pdf-parse (already exists)
- [x] Preserve footnote numbering and formatting during extraction
- [x] Add file upload UI to Home page with drag-and-drop support
- [x] Show upload progress and extraction status
- [x] Auto-populate textarea with extracted footnotes after processing
- [x] Handle errors gracefully (unsupported formats, extraction failures)
- [ ] Test with real Word documents containing various footnote styles (requires authentication)
- [ ] Test with PDF documents containing footnotes (requires authentication)
- [ ] Implement proper S3 upload for production use (currently using temporary URLs)
