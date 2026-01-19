import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, ArrowRight, Edit2, Save, X, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type CitationCategory = "case" | "article" | "other";

interface ParsedCitation {
  id: string;
  number: string;
  category: CitationCategory;
  fullText: string;
}

export default function Parse() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [citations, setCitations] = useState<ParsedCitation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<ParsedCitation | null>(null);

  useEffect(() => {
    // Get citations from sessionStorage
    const citationsText = sessionStorage.getItem('citations');
    if (!citationsText) {
      setLocation("/");
      return;
    }

    // Parse citations
    const parsed = parseCitations(citationsText);
    console.log('Parsed citations:', parsed);
    setCitations(parsed);
  }, [setLocation]);

  const detectCategory = (text: string, previousCategory?: CitationCategory): CitationCategory => {
    console.log('🔥 detectCategory VERSION 4.0 - Improved Article/Case Detection');
    const trimmed = text.trim();
    const lowerText = trimmed.toLowerCase();
    
    // Handle "ibid" - inherit category from previous citation
    if (lowerText === 'ibid' || lowerText.startsWith('ibid.') || lowerText.startsWith('ibid,')) {
      return previousCategory || "other";
    }
    
    // Strip common prefixes that don't affect categorization
    let cleanedText = text;
    const prefixPatterns = [
      /^See\s+/i,
      /^For\s+a\s+detailed\s+examination\s+see\s+also\s+/i,
      /^For\s+example,?\s+/i,
      /^Compare\s+/i,
      /^Cf\.?\s+/i,
      /^E\.g\.?,?\s+/i
    ];
    
    for (const pattern of prefixPatterns) {
      cleanedText = cleanedText.replace(pattern, '');
    }
    
    // PRIORITY 1: EU Case detection (most specific)
    // Pattern: "Case C-22/98" or "EU:C:1999:419"
    if (
      /\bCase\s+[A-Z]-?\s*\d+\/\d+/i.test(cleanedText) || // "Case C-22/98" or "Case C- 22/98"
      /\bEU:[A-Z]:\d{4}:\d+/i.test(cleanedText) // "EU:C:1999:419"
    ) {
      console.log('→ CASE (EU format)');
      return "case";
    }
    
    // PRIORITY 2: Article/Book detection (before general case detection)
    // Pattern: Author name(s) + Title (quoted or book format) + Year + optional journal/page info
    // Examples:
    // - "Julian Nowag, Environmental Integration in Competition and Free-Movement Laws (OUP 2017) 1-12"
    // - "Julian Nowag and Alexandra Teorell, 'Beyond Balancing: Sustainability and Competition Law' (2020) Concurrences..."
    // - "Okeoghene Odudu, 'The Meaning of Undertaking Within 81 EC' (2004–05) 7 CYELS, 214"
    
    const hasQuotedTitle = /[\u0027\u2018\u2019\u201C\u201D][^\u0027\u2018\u2019\u201C\u201D]+[\u0027\u2018\u2019\u201C\u201D]/.test(cleanedText);
    const hasYearInParens = /\((?:[A-Z]{2,}\s+)?\d{4}(?:[-–]\d{2,4})?\)/.test(cleanedText); // Supports (2004), (2004-05), or (OUP 2017)
    const hasBookFormat = /\([A-Z]{2,}\s+\d{4}\)/.test(cleanedText); // (OUP 2017)
    const hasBookTitle = /,\s+[A-Z][^,]+\([A-Z]{2,}\s+\d{4}\)/.test(cleanedText); // Author, Book Title (OUP 2017)
    
    // Author pattern: starts with capitalized name(s), possibly with "and"
    const hasAuthorPattern = /^[A-Z][a-z]+(?:\s+[A-Z]{1,2}\.?)?(?:\s+[A-Z][a-z]+)?(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z]{1,2}\.?)?(?:\s+[A-Z][a-z]+)?)?\s*,/i.test(cleanedText);
    
    // Journal/page info patterns
    const hasJournalInfo = /\d+\s*\(\d+\)|Vol\.?\s*\d+|\d+\s+[A-Z][A-Z]+|,\s*\d+[-–]?\d*\.?$/.test(cleanedText);
    
    console.log('[Detection]', cleanedText.substring(0, 80));
    console.log('  Article indicators:', { hasQuotedTitle, hasYearInParens, hasBookFormat, hasBookTitle, hasAuthorPattern, hasJournalInfo });
    
    // Article/Book: Must have author pattern + (quoted title OR book format OR book title) + year
    if (hasAuthorPattern && (hasQuotedTitle || hasBookFormat || hasBookTitle) && hasYearInParens) {
      console.log('→ ARTICLE/BOOK');
      return "article";
    }
    
    // Also detect books without author pattern but with clear book format
    // Example: "Environmental Integration in Competition and Free-Movement Laws (OUP 2017)"
    if (hasBookFormat && hasYearInParens && !(/\bCase\s+[A-Z]-?\s*\d+/.test(cleanedText))) {
      console.log('→ ARTICLE/BOOK (book format detected)');
      return "article";
    }
    
    // PRIORITY 3: General case detection patterns
    // 1. Court citations: [2017] EWCA Crim 1168, [1994] 3 ALL E R 79, [1995] 1 AC 171
    // 2. Party names with "v": R v Adomako, Smith v Jones
    // 3. Paragraph references: "at [56]"
    // 4. Case numbers with hyphens/slashes: 22/98, C-123/45
    if (
      /\[\d{4}\]/.test(cleanedText) || // Any [YYYY] format
      /\b[A-Z][a-z]*\s+v\.?\s+[A-Z]/i.test(cleanedText) || // "R v Adomako" or "Smith v. Jones"
      /\bat\s+\[\d+\]/i.test(cleanedText) || // "at [56]"
      /\bpara\.?\s+\d+/i.test(cleanedText) || // "para 26"
      /\(\d{4}\)\s+\d+\s+[A-Z]{2,}/i.test(cleanedText) // "(2019) 22 HKCFAR"
    ) {
      // BUT: Don't classify as case if it has strong article indicators
      if (hasAuthorPattern && hasQuotedTitle) {
        console.log('→ ARTICLE (has case-like pattern but stronger article indicators)');
        return "article";
      }
      console.log('→ CASE (general format)');
      return "case";
    }
    
    // PRIORITY 4: Other detection patterns
    // 1. URLs (https:// or http://)
    // 2. Department/Organization names
    // 3. Government publications
    if (
      /https?:\/\//i.test(cleanedText) ||
      /^Department\s+of/i.test(cleanedText) ||
      /Government/i.test(cleanedText) ||
      /Available\s+at/i.test(cleanedText)
    ) {
      return "other";
    }
    
    // Default: if has quoted title but doesn't match article pattern, likely other
    // Otherwise check for case-like features
    if (hasQuotedTitle) {
      return "other";
    }
    
    return "other";
  };

  const parseCitations = (text: string): ParsedCitation[] => {
    const lines = text.split('\n').filter(l => l.trim());
    const results: ParsedCitation[] = [];
    let currentNumber = 1;
    let previousCategory: CitationCategory | undefined = undefined;

    lines.forEach((line, lineIndex) => {
      // Split by semicolon for multiple citations within one line
      const subCitations = line.split(';').map(s => s.trim()).filter(s => s);

      subCitations.forEach((citation, subIndex) => {
        const category = detectCategory(citation, previousCategory);
        
        results.push({
          id: `${lineIndex}-${subIndex}`,
          number: String(currentNumber),
          category,
          fullText: citation,
        });
        
        previousCategory = category;
        currentNumber++;
      });
    });

    return results;
  };

  const handleEdit = (citation: ParsedCitation) => {
    setEditingId(citation.id);
    setEditValues({ ...citation });
  };

  const handleSave = () => {
    if (!editValues) return;
    setCitations(citations.map(c => c.id === editValues.id ? editValues : c));
    setEditingId(null);
    setEditValues(null);
    toast.success("Citation updated");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const handleDelete = (id: string) => {
    setCitations(citations.filter(c => c.id !== id));
    toast.success("Citation deleted");
  };

  const handleAdd = () => {
    const newCitation: ParsedCitation = {
      id: `new-${Date.now()}`,
      number: String(citations.length + 1),
      category: "other",
      fullText: '',
    };
    setCitations([...citations, newCitation]);
    handleEdit(newCitation);
  };

  const handleVerify = () => {
    if (citations.length === 0) {
      toast.error("No citations to verify");
      return;
    }
    // Store citations for verification
    sessionStorage.setItem('parsedCitations', JSON.stringify(citations));
    setLocation("/verify");
  };

  const getCategoryLabel = (category: CitationCategory) => {
    switch (category) {
      case "case": return "Case";
      case "article": return "Article/Book Chapter";
      case "other": return "Other";
    }
  };

  const getCategoryBadge = (category: CitationCategory) => {
    switch (category) {
      case "case":
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Case</span>;
      case "article":
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Article/Book</span>;
      case "other":
        return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">Other</span>;
    }
  };

  const caseCount = citations.filter(c => c.category === "case").length;
  const articleCount = citations.filter(c => c.category === "article").length;
  const otherCount = citations.filter(c => c.category === "other").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Law Review Verifier</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => setLocation('/')}>
              ← Back to Home
            </Button>
          </div>
          <h1 className="text-4xl font-bold mb-2">Review Parsed Citations</h1>
          <p className="text-muted-foreground">Step 2 of 3: Review categories and edit citations before verification</p>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 border border-slate-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 mb-1">{citations.length}</div>
              <p className="text-xs text-slate-600">Total Citations</p>
            </div>
          </Card>
          <Card className="p-4 border border-blue-200 bg-blue-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{caseCount}</div>
              <p className="text-xs text-slate-600">Cases</p>
            </div>
          </Card>
          <Card className="p-4 border border-green-200 bg-green-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{articleCount}</div>
              <p className="text-xs text-slate-600">Articles/Books</p>
            </div>
          </Card>
          <Card className="p-4 border border-slate-200 bg-slate-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600 mb-1">{otherCount}</div>
              <p className="text-xs text-slate-600">Others</p>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-end">
            <Button onClick={handleAdd} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Citation
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%]">No.</TableHead>
                  <TableHead className="w-[15%]">Category</TableHead>
                  <TableHead className="w-[60%]">Full Citation</TableHead>
                  <TableHead className="w-[20%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {citations.map((citation) => (
                  <TableRow key={citation.id}>
                    {editingId === citation.id && editValues ? (
                      <>
                        <TableCell>
                          <Input
                            value={editValues.number}
                            onChange={(e) => setEditValues({ ...editValues, number: e.target.value })}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editValues.category}
                            onValueChange={(value: CitationCategory) => setEditValues({ ...editValues, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="case">Case</SelectItem>
                              <SelectItem value="article">Article/Book Chapter</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editValues.fullText}
                            onChange={(e) => setEditValues({ ...editValues, fullText: e.target.value })}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button onClick={handleSave} size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Save className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button onClick={handleCancel} size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium break-words whitespace-normal">{citation.number}</TableCell>
                        <TableCell className="break-words whitespace-normal">{getCategoryBadge(citation.category)}</TableCell>
                        <TableCell className="text-sm break-words whitespace-normal">{citation.fullText}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button onClick={() => handleEdit(citation)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => handleDelete(citation.id)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleVerify} size="lg" className="gap-2">
              Verify Citations
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
