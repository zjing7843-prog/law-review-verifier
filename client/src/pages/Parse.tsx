import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, ArrowRight, Edit2, Save, X, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface ParsedCitation {
  id: string;
  number: string;
  article: string;
  authors: string;
  year: string;
}

export default function Parse() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [citations, setCitations] = useState<ParsedCitation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<ParsedCitation | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }

    // Get citations from sessionStorage
    const citationsText = sessionStorage.getItem('citations');
    if (!citationsText) {
      setLocation("/");
      return;
    }

    // Parse citations
    const parsed = parseCitations(citationsText);
    setCitations(parsed);
  }, [isAuthenticated, setLocation]);

  const parseCitations = (text: string): ParsedCitation[] => {
    const lines = text.split('\n').filter(l => l.trim());
    const results: ParsedCitation[] = [];

    lines.forEach((line, index) => {
      // Match footnote number at start
      const numberMatch = line.match(/^(\d+)\s+/);
      if (!numberMatch) return;

      const number = numberMatch[1];
      const content = line.substring(numberMatch[0].length);

      // Split by semicolon for multiple citations
      const subCitations = content.split(';').map(s => s.trim()).filter(s => s);

      subCitations.forEach((citation, subIndex) => {
        // Extract author (text before first comma or quote)
        const authorMatch = citation.match(/^([^,']+)/);
        const authors = authorMatch ? authorMatch[1].trim() : '';

        // Extract title (text in single quotes)
        const titleMatch = citation.match(/'([^']+)'/);
        const article = titleMatch ? titleMatch[1] : '';

        // Extract year (4 digits in parentheses)
        const yearMatch = citation.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : '';

        results.push({
          id: `${index}-${subIndex}`,
          number,
          article: article || citation.substring(0, 50),
          authors,
          year,
        });
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
      article: '',
      authors: '',
      year: '',
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
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Review Parsed Citations</h1>
          <p className="text-slate-600">Step 2 of 3: Review and edit the parsed citations before verification</p>
        </div>

        {/* Table */}
        <Card className="p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {citations.length} citations found
            </div>
            <Button onClick={handleAdd} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Citation
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Number</TableHead>
                  <TableHead>Article/Book</TableHead>
                  <TableHead>Author(s)</TableHead>
                  <TableHead className="w-24">Year</TableHead>
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
                          <Input
                            value={editValues.article}
                            onChange={(e) => setEditValues({ ...editValues, article: e.target.value })}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editValues.authors}
                            onChange={(e) => setEditValues({ ...editValues, authors: e.target.value })}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editValues.year}
                            onChange={(e) => setEditValues({ ...editValues, year: e.target.value })}
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
                        <TableCell>{citation.article}</TableCell>
                        <TableCell>{citation.authors}</TableCell>
                        <TableCell>{citation.year}</TableCell>
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
