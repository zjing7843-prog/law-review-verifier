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
