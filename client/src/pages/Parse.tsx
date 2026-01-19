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

  const [isLoading, setIsLoading] = useState(false);
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
    try {
      // Split into lines and filter
      const lines = citationsText.split('\n').filter(l => l.trim());
      const allCitations: string[] = [];
      
      // Split by semicolon for multiple citations within one line
      lines.forEach(line => {
        const subCitations = line.split(';').map(s => s.trim()).filter(s => s);
        allCitations.push(...subCitations);
      });

      // Call LLM to categorize all citations
      const result = await categorizeMutation.mutateAsync({
        citations: allCitations
      });

      // Build parsed citations with LLM results
      const parsed: ParsedCitation[] = result.map((item, index) => ({
        id: `citation-${index}`,
        number: String(index + 1),
        category: item.category as CitationCategory,
        fullText: item.citation
      }));

      console.log('LLM categorized citations:', parsed);
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
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-lg font-medium text-slate-900 mb-2">Categorizing citations with AI...</p>
            <p className="text-sm text-slate-600">This may take a few moments</p>
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
        </>
        )}
      </div>
    </div>
  );
}
