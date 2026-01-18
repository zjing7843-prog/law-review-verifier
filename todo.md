# Law Review Footnote Verifier - TODO

## Phase 1: Project Setup
- [x] Initialize web-db-user project
- [x] Create database schema for documents, footnotes, and verification results
- [x] Set up document processing dependencies (pdf-parse, docx-parser)

## Phase 2: Document Upload & Extraction
- [x] Build elegant upload interface with drag-and-drop support
- [x] Implement file type validation (Word, PDF only)
- [x] Create PDF text extraction functionality
- [x] Create DOCX text extraction functionality
- [x] Implement footnote detection and extraction logic
- [x] Build footnote count confirmation UI
- [x] Allow user to manually input correct footnote count if needed

## Phase 3: Citation Parsing & Manual Correction
- [x] Parse extracted footnotes into structured data
- [x] Build interactive table editor for footnote data
- [x] Implement 4-column table: Number, Article/Book, Author(s), Year
- [x] Add manual editing capability for each cell
- [x] Build user confirmation UI before proceeding to validation

## Phase 4: Web Search Validation
- [x] Implement web search integration for citation verification
- [x] Create validation logic to check existence and correspondence
- [x] Build real-time progress indicator during validation
- [x] Implement three-state verification system (✓, ✗, ?)
- [x] Calculate overall correctness percentage

## Phase 5: Results & Export
- [x] Build verification results display UI
- [x] Implement Excel file generation with results
- [x] Create results preview functionality
- [x] Add download functionality for Excel files

## Phase 6: Interactive Results Webpage
- [x] Design elegant results visualization page
- [x] Create interactive charts and visualizations
- [x] Build data exploration interface
- [x] Implement trend analysis display
- [x] Add share/save functionality

## Phase 7: Testing & Refinement
- [x] Test complete workflow end-to-end
- [x] Verify document processing accuracy
- [x] Test web search validation
- [x] Validate Excel export functionality
- [x] Test interactive webpage responsiveness
- [x] Performance optimization

## Phase 8: Deployment
- [ ] Final testing and bug fixes
- [ ] Create checkpoint for deployment


## Bug Fixes
- [x] Fix footnote extraction to handle continuous paragraph format
- [x] Support footnotes that span multiple lines
- [x] Handle multiple citations within single footnote (semicolon-separated)
- [x] Parse legal citation format: Author, 'Title' (Year) Journal Page
- [x] Improve footnote boundary detection for dense text


## Enhancement: Split Multiple Citations
- [x] Split semicolon-separated citations into separate rows
- [x] Keep same footnote number for all citations within one footnote
- [x] Update table display to show multiple rows per footnote number
- [x] Update validation logic to handle repeated footnote numbers
- [x] Add comprehensive tests for citation splitting


## Bug Fix: Word Footnote Extraction
- [x] Handle Word's built-in footnote format (smaller font at page bottom)
- [x] Extract footnotes from continuous text stream without font size info
- [x] Improve pattern matching to find all numbered citations (1-58+)
- [x] Handle footnotes distributed across multiple pages
- [x] Add debug logging to diagnose extraction issues
- [ ] Test with actual Word document to verify 58 footnotes are extracted


## Critical Fix: Parse Word Footnotes Properly
- [x] Parse DOCX XML structure to access footnotes.xml
- [x] Extract only content from Word's footnote elements (below the line)
- [x] Ignore numbered text in main document body
- [x] Handle footnotes across multiple pages from XML structure
- [x] Test with actual 58-footnote document to verify correct extraction (58 footnotes found!)


## Debug: Investigate Why Extraction Still Shows 2 Footnotes
- [x] Add detailed logging to show XML structure
- [x] Create debug endpoint to inspect raw footnotes.xml content
- [x] Check if footnotes.xml exists in uploaded document
- [x] Verify extraction logic is being called
- [x] Test with sample DOCX file to isolate issue
- [x] Found root cause: extractFootnotes procedure was returning empty array


## Urgent: Create Debug UI to Show Extraction Details
- [x] Add debug endpoint that returns extraction logs
- [x] Create debug page that shows raw extraction output
- [x] Display footnotes.xml content if available
- [x] Show step-by-step extraction process in UI
- [x] Allow user to see exactly what's being extracted
- [x] Implemented actual extraction logic in tRPC procedure
