import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, ArrowRight, Edit2, Save, X, Plus, Trash2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type CitationCategory = "case" | "article" | "book" | "policy_paper" | "website" | "statute" | "explanatory_text" | "other";

interface ParsedCitation {
  id: string;
  number: string;
  category: CitationCategory;
  fullText: string;
  skipVerification?: boolean;
}

export default function Parse() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [citations, setCitations] = useState<ParsedCitation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<ParsedCitation | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const categorizeMutation = trpc.citations.categorize.useMutation();

  useEffect(() => {
    // Get citations from sessionStorage
    const citationsText = sessionStorage.getItem('citations');
    if (!citationsText) {
      setLocation("/");
      return;
    }

    // Parse citations and categorize with LLM
    categorizeCitationsWithLLM(citationsText);
  }, [setLocation]);

  const categorizeCitationsWithLLM = async (citationsText: string) => {
    setIsLoading(true);
    setProgress(0);
    try {
      // Split into lines and filter
      const lines = citationsText.split('\n').filter(l => l.trim());
      const allCitations: string[] = [];
      setProgress(10); // Initial parsing
      
      // Split by semicolon for multiple citations within one line
      lines.forEach(line => {
        const subCitations = line.split(';').map(s => s.trim()).filter(s => s);
        allCitations.push(...subCitations);
      });

      // Call LLM to categorize all citations
      setProgress(30); // Starting LLM categorization
      const result = await categorizeMutation.mutateAsync({
        citations: allCitations
      });
      setProgress(80); // LLM categorization complete

      // Build parsed citations with LLM results
      const parsed: ParsedCitation[] = result.map((item, index) => ({
        id: `citation-${index}`,
        number: String(index + 1),
        category: item.category as CitationCategory,
        fullText: item.citation
      }));

      console.log('LLM categorized citations:', parsed);
      setProgress(100); // Finalizing
      setCitations(parsed);
    } catch (error) {
      console.error('Failed to categorize citations:', error);
      toast.error('Failed to categorize citations. Please try again.');
      setLocation("/");
    } finally {
      setIsLoading(false);
    }
  };

  // Old regex-based categorization removed - now using LLM via API

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
      case "article": return "Article";
      case "book": return "Book";
      case "policy_paper": return "Policy Paper";
      case "website": return "Website";
      case "statute": return "Statute/Legislation";
      case "explanatory_text": return "Explanatory Text";
      case "other": return "Other";
    }
  };

  const getCategoryBadge = (category: CitationCategory) => {
    switch (category) {
      case "case":
        return <span className="px-2 py-1 rounded-full bg-indigo-600 text-white text-xs font-medium">Case</span>;
      case "article":
        return <span className="px-2 py-1 rounded-full bg-emerald-600 text-white text-xs font-medium">Article</span>;
      case "book":
        return <span className="px-2 py-1 rounded-full bg-teal-600 text-white text-xs font-medium">Book</span>;
      case "policy_paper":
        return <span className="px-2 py-1 rounded-full bg-violet-600 text-white text-xs font-medium">Policy Paper</span>;
      case "website":
        return <span className="px-2 py-1 rounded-full bg-cyan-600 text-white text-xs font-medium">Website</span>;
      case "statute":
        return <span className="px-2 py-1 rounded-full bg-amber-700 text-white text-xs font-medium">Statute</span>;
      case "explanatory_text":
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium italic">Explanatory Text</span>;
      case "other":
        return <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">Other</span>;
    }
  };

  const caseCount = citations.filter(c => c.category === "case").length;
  const articleCount = citations.filter(c => c.category === "article").length;
  const bookCount = citations.filter(c => c.category === "book").length;
  const policyCount = citations.filter(c => c.category === "policy_paper").length;
  const websiteCount = citations.filter(c => c.category === "website").length;
  const statuteCount = citations.filter(c => c.category === "statute").length;
  const explanatoryCount = citations.filter(c => c.category === "explanatory_text").length;
  const otherCount = citations.filter(c => c.category === "other").length;
  const citationCount = citations.filter(c => c.category !== "explanatory_text").length;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Law Review Verifier</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-slate-600 animate-spin mb-4" />
            <p className="text-lg font-medium text-slate-900 mb-4">Classifying footnotes to allow targeted verification</p>
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Progress</span>
                <span className="text-sm font-medium text-slate-900">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div 
                  className="bg-slate-900 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
        {!isLoading && (
        <>
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
        <div className="grid md:grid-cols-5 gap-3 mb-6">
          <Card className="p-4 border border-slate-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 mb-1">{citations.length}</div>
              <p className="text-xs text-slate-600">Total Items</p>
            </div>
          </Card>
          <Card className="p-4 border border-gray-300 bg-gray-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 mb-1">{caseCount}</div>
              <p className="text-xs text-slate-600">Cases</p>
            </div>
          </Card>
          <Card className="p-4 border border-gray-300 bg-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 mb-1">{articleCount + bookCount}</div>
              <p className="text-xs text-slate-600">Articles & Books</p>
            </div>
          </Card>
          <Card className="p-4 border border-gray-300 bg-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 mb-1">{policyCount + websiteCount + statuteCount}</div>
              <p className="text-xs text-slate-600">Policy/Web/Statute</p>
            </div>
          </Card>
          <Card className="p-4 border border-gray-300 bg-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500 mb-1">{explanatoryCount}</div>
              <p className="text-xs text-slate-600 italic">Explanatory (skipped)</p>
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
                              <SelectItem value="article">Article</SelectItem>
                              <SelectItem value="book">Book</SelectItem>
                              <SelectItem value="policy_paper">Policy Paper</SelectItem>
                              <SelectItem value="website">Website</SelectItem>
                              <SelectItem value="statute">Statute/Legislation</SelectItem>
                              <SelectItem value="explanatory_text">Explanatory Text</SelectItem>
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
        </>
        )}
      </div>
    </div>
  );
}
