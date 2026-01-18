import { describe, it, expect } from "vitest";
import {
  extractFootnotes,
  validateFootnoteCount,
} from "./documentProcessor";

describe("documentProcessor", () => {
  describe("extractFootnotes", () => {
    it("should extract footnotes with sequential numbering", () => {
      const text = `
        Some academic text here.
        
        1. Smith, J. "The Role of AI in Law" (2023)
        2. Johnson, M. "Digital Rights" (2022)
        3. Williams, A. "Privacy Protection" (2021)
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes.length).toBeGreaterThanOrEqual(3);
      expect(footnotes[0].number).toBe(1);
    });

    it("should extract legal citation format with quotes", () => {
      const text = `
        1 Gilberto KK Leung, 'Medical manslaughter in Hong Kong: what now?' (2023) Hong Kong Med J 4, 4
        2 Oliver Quick, 'Medical manslaughter – time for a rethink?' (2017) 85 (4) Medico-Legal J 173, 174
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes.length).toBeGreaterThanOrEqual(2);
      expect(footnotes[0].number).toBe(1);
      expect(footnotes[0].authors).toContain("Gilberto");
      expect(footnotes[0].article).toContain("Medical manslaughter");
      expect(footnotes[0].year).toBe("2023");
      
      if (footnotes.length > 1) {
        expect(footnotes[1].number).toBe(2);
        expect(footnotes[1].authors).toContain("Oliver");
        expect(footnotes[1].year).toBe("2017");
      }
    });

    it("should split multiple citations within one footnote into separate rows", () => {
      const text = `
        1 Gilberto KK Leung, 'Medical manslaughter in Hong Kong: what now?' (2023) Hong Kong Med J 4, 4; Oliver Quick, 'Medical manslaughter – time for a rethink?' (2017) 85 (4) Medico-Legal J 173, 174
      `;

      const footnotes = extractFootnotes(text);

      // Should have 2 entries, both with footnote number 1
      expect(footnotes.length).toBeGreaterThanOrEqual(2);
      expect(footnotes[0].number).toBe(1);
      expect(footnotes[1].number).toBe(1);
      
      // First citation
      expect(footnotes[0].text).toContain("Gilberto");
      expect(footnotes[0].text).not.toContain("Oliver");
      expect(footnotes[0].authors).toContain("Gilberto");
      expect(footnotes[0].year).toBe("2023");
      
      // Second citation
      expect(footnotes[1].text).toContain("Oliver");
      expect(footnotes[1].text).not.toContain("Gilberto");
      expect(footnotes[1].authors).toContain("Oliver");
      expect(footnotes[1].year).toBe("2017");
    });

    it("should handle three citations in one footnote", () => {
      const text = `
        1 Author A, 'Title A' (2023) Journal A; Author B, 'Title B' (2022) Journal B; Author C, 'Title C' (2021) Journal C
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes.length).toBe(3);
      expect(footnotes[0].number).toBe(1);
      expect(footnotes[1].number).toBe(1);
      expect(footnotes[2].number).toBe(1);
      
      expect(footnotes[0].year).toBe("2023");
      expect(footnotes[1].year).toBe("2022");
      expect(footnotes[2].year).toBe("2021");
    });

    it("should handle mix of single and multiple citations", () => {
      const text = `
        1 Single citation (2023)
        2 First citation (2022); Second citation (2021)
        3 Another single (2020)
      `;

      const footnotes = extractFootnotes(text);

      // Should have 4 total entries: 1 + 2 + 1
      expect(footnotes.length).toBe(4);
      
      // Check footnote numbers
      expect(footnotes[0].number).toBe(1);
      expect(footnotes[1].number).toBe(2);
      expect(footnotes[2].number).toBe(2);
      expect(footnotes[3].number).toBe(3);
    });

    it("should extract year from legal citations", () => {
      const text = `
        1 Smith, J. 'Article Title' (2023) Journal 4
        2 Jones, M. 'Another Article' (2022) Journal 5
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes[0]?.year).toBe("2023");
      if (footnotes.length > 1) {
        expect(footnotes[1]?.year).toBe("2022");
      }
    });

    it("should extract authors from legal citations", () => {
      const text = `
        1 Gilberto KK Leung, 'Medical manslaughter' (2023) Journal 4
        2 Oliver Quick, 'Time for a rethink' (2017) Journal 5
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes[0]?.authors).toContain("Gilberto");
      if (footnotes.length > 1) {
        expect(footnotes[1]?.authors).toContain("Oliver");
      }
    });

    it("should handle empty text", () => {
      const text = "";
      const footnotes = extractFootnotes(text);

      expect(footnotes).toHaveLength(0);
    });

    it("should handle text without footnotes", () => {
      const text = "This is just regular text without any footnotes.";
      const footnotes = extractFootnotes(text);

      expect(footnotes).toHaveLength(0);
    });

    it("should handle continuous footnote block", () => {
      const text = `
        1 First citation (2023)
        2 Second citation (2022)
        3 Third citation (2021)
        4 Fourth citation (2020)
        5 Fifth citation (2019)
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes.length).toBeGreaterThanOrEqual(5);
    });

    it("should handle footnotes with period notation", () => {
      const text = `
        1. First citation
        2. Second citation
        3. Third citation
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle footnotes with parenthesis notation", () => {
      const text = `
        1) First citation
        2) Second citation
        3) Third citation
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("validateFootnoteCount", () => {
    it("should validate correct sequential footnotes", () => {
      const footnotes = [
        { number: 1, text: "First", article: "A", authors: "B", year: "2023" },
        { number: 2, text: "Second", article: "C", authors: "D", year: "2022" },
        { number: 3, text: "Third", article: "E", authors: "F", year: "2021" },
      ];

      const isValid = validateFootnoteCount(footnotes, 3);

      expect(isValid).toBe(true);
    });

    it("should validate footnotes with repeated numbers (multiple citations)", () => {
      const footnotes = [
        { number: 1, text: "First A", article: "A", authors: "B", year: "2023" },
        { number: 1, text: "First B", article: "C", authors: "D", year: "2022" },
        { number: 2, text: "Second", article: "E", authors: "F", year: "2021" },
      ];

      // Expected count should be based on unique footnote numbers
      const uniqueNumbers = new Set(footnotes.map(f => f.number)).size;
      const isValid = validateFootnoteCount(footnotes, uniqueNumbers);

      expect(isValid).toBe(true);
    });

    it("should reject non-sequential footnotes", () => {
      const footnotes = [
        { number: 1, text: "First", article: "A", authors: "B", year: "2023" },
        { number: 3, text: "Third", article: "C", authors: "D", year: "2022" },
      ];

      const isValid = validateFootnoteCount(footnotes, 2);

      expect(isValid).toBe(false);
    });

    it("should reject empty footnotes array", () => {
      const footnotes: any[] = [];

      const isValid = validateFootnoteCount(footnotes, 0);

      expect(isValid).toBe(false);
    });

    it("should handle large footnote counts", () => {
      const footnotes = Array.from({ length: 58 }, (_, i) => ({
        number: i + 1,
        text: `Footnote ${i + 1}`,
        article: "A",
        authors: "B",
        year: "2023",
      }));

      const isValid = validateFootnoteCount(footnotes, 58);

      expect(isValid).toBe(true);
    });
  });
});
