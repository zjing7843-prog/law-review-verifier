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
    console.log('🔥 Parse page loaded - VERSION 2.0');
    alert('Parse page VERSION 2.0 loaded');
    
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
    console.log('🔥 detectCategory VERSION 3.0');
    const trimmed = text.trim();
    const lowerText = trimmed.toLowerCase();
    
    // Handle "ibid" - inherit category from previous citation
    if (lowerText === 'ibid' || lowerText.startsWith('ibid.') || lowerText.startsWith('ibid,')) {
      return previousCategory || "other";
    }
    
    // Article/Book detection patterns (CHECK FIRST before case detection):
    // Author, 'Title' (Year) Journal pattern
    // Must have: quoted title + year in parentheses + journal/publication info
    const quoteRegex = /[\u0027\u2018\u2019\u201C\u201D][^\u0027\u2018\u2019\u201C\u201D]+[\u0027\u2018\u2019\u201C\u201D]/.toString();
    const hasQuotedTitle = /[\u0027\u2018\u2019\u201C\u201D][^\u0027\u2018\u2019\u201C\u201D]+[\u0027\u2018\u2019\u201C\u201D]/.test(text);
    const hasYearInParens = /\(\d{4}\)/.test(text);
    const hasJournalInfo = /\d+\s*\(\d+\)|Vol\s*\d+|\d+\s+[A-Z][a-z]+\s+[A-Z]/i.test(text);
    
    console.log('[Detection]', text.substring(0, 50));
    console.log('  Regex:', quoteRegex);
    console.log('  Results:', { hasQuotedTitle, hasYearInParens, hasJournalInfo });
    
    if (hasQuotedTitle && hasYearInParens && (hasJournalInfo || /,\s*\d+\.?$/.test(text))) {
      console.log('→ ARTICLE');
      return "article";
    }
    
    // Case detection patterns:
    // 1. Court citations: [2017] EWCA Crim 1168, [1994] 3 ALL E R 79, [1995] 1 AC 171
    // 2. Party names with "v": R v Adomako, Smith v Jones
    // 3. Paragraph references: "at [56]"
    // 4. Case names ending with year in brackets or parentheses
    if (
      /\[\d{4}\]/.test(text) || // Any [YYYY] format is likely a case citation
      /\b[A-Z][a-z]*\s+v\.?\s+[A-Z]/i.test(text) || // "R v Adomako" or "Smith v. Jones"
      /\bat\s+\[\d+\]/i.test(text) || // "at [56]"
      /\(\d{4}\)\s+\d+\s+[A-Z]{2,}/i.test(text) // "(2019) 22 HKCFAR"
    ) {
      return "case";
    }
    
    // Other detection patterns:
    // 1. URLs (https:// or http://)
    // 2. Department/Organization names
    // 3. Government publications
    if (
      /https?:\/\//i.test(text) ||
      /^Department\s+of/i.test(text) ||
      /Government/i.test(text) ||
      /Available\s+at/i.test(text)
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

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No.</TableHead>
                  <TableHead className="w-40">Category</TableHead>
                  <TableHead>Full Citation</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
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
                        <TableCell className="font-medium">{citation.number}</TableCell>
                        <TableCell>{getCategoryBadge(citation.category)}</TableCell>
                        <TableCell className="text-sm">{citation.fullText}</TableCell>
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
