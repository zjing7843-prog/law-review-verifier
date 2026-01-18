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

      expect(footnotes).toHaveLength(3);
      expect(footnotes[0].number).toBe(1);
      expect(footnotes[1].number).toBe(2);
      expect(footnotes[2].number).toBe(3);
    });

    it("should extract footnotes with parentheses notation", () => {
      const text = `
        1) First citation
        2) Second citation
        3) Third citation
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes).toHaveLength(3);
      expect(footnotes[0].number).toBe(1);
      expect(footnotes[1].number).toBe(2);
      expect(footnotes[2].number).toBe(3);
    });

    it("should extract year from footnote text", () => {
      const text = `
        1. Smith, J. "The Role of AI in Law" (2023)
        2. Johnson, M. "Digital Rights", 2022
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes[0].year).toBe("2023");
      expect(footnotes[1].year).toBe("2022");
    });

    it("should extract authors from footnote text", () => {
      const text = `
        1. Smith, J. "The Role of AI in Law" (2023)
        2. Johnson and Williams "Digital Rights" (2022)
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes[0].authors).toBe("Smith, J.");
      expect(footnotes[1].authors).toContain("Johnson");
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

    it("should handle non-sequential numbering", () => {
      const text = `
        1. First citation
        3. Third citation (skipped 2)
        2. Second citation
      `;

      const footnotes = extractFootnotes(text);

      expect(footnotes).toHaveLength(3);
      expect(footnotes[0].number).toBe(1);
      expect(footnotes[1].number).toBe(3);
      expect(footnotes[2].number).toBe(2);
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

    it("should reject non-sequential footnotes", () => {
      const footnotes = [
        { number: 1, text: "First", article: "A", authors: "B", year: "2023" },
        { number: 3, text: "Third", article: "C", authors: "D", year: "2022" },
      ];

      const isValid = validateFootnoteCount(footnotes, 2);

      expect(isValid).toBe(false);
    });

    it("should reject mismatched count", () => {
      const footnotes = [
        { number: 1, text: "First", article: "A", authors: "B", year: "2023" },
        { number: 2, text: "Second", article: "C", authors: "D", year: "2022" },
      ];

      const isValid = validateFootnoteCount(footnotes, 3);

      expect(isValid).toBe(false);
    });

    it("should reject empty footnotes array", () => {
      const footnotes: any[] = [];

      const isValid = validateFootnoteCount(footnotes, 0);

      expect(isValid).toBe(false);
    });

    it("should handle large footnote counts", () => {
      const footnotes = Array.from({ length: 100 }, (_, i) => ({
        number: i + 1,
        text: `Footnote ${i + 1}`,
        article: "A",
        authors: "B",
        year: "2023",
      }));

      const isValid = validateFootnoteCount(footnotes, 100);

      expect(isValid).toBe(true);
    });
  });
});
