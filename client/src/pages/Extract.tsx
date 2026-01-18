import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Edit2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface Footnote {
  id: string;
  number: number;
  article: string;
  authors: string;
  year: string;
}

export default function Extract() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [footnotes, setFootnotes] = useState<Footnote[]>([
    {
      id: "1",
      number: 1,
      article: "The Role of Artificial Intelligence in Modern Law",
      authors: "Smith, J. and Johnson, M.",
      year: "2023",
    },
    {
      id: "2",
      number: 2,
      article: "Digital Rights and Privacy Protection",
      authors: "Williams, A.",
      year: "2022",
    },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Footnote>>({});
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleEdit = (footnote: Footnote) => {
    setEditingId(footnote.id);
    setEditValues(footnote);
  };

  const handleSaveEdit = () => {
    if (editingId) {
      setFootnotes(
        footnotes.map((fn) =>
          fn.id === editingId ? { ...fn, ...editValues } : fn
        )
      );
      setEditingId(null);
      setEditValues({});
      toast.success("Footnote updated successfully");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // Simulate verification process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Footnotes verified successfully");
      setLocation("/verify");
    } catch (error) {
      toast.error("Failed to verify footnotes");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Review Footnotes</h1>
          <p className="text-slate-600">Step 2 of 4: Review and correct extracted footnotes</p>
        </div>

        {/* Info Card */}
        <Card className="mb-8 p-6 border border-blue-200 bg-blue-50">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">
                {footnotes.length} footnotes extracted
              </h3>
              <p className="text-sm text-slate-700">
                Review the extracted footnotes below. Edit any incorrect information before proceeding to verification.
              </p>
            </div>
          </div>
        </Card>

        {/* Footnotes Table */}
        <Card className="mb-8 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="w-16 font-semibold text-slate-900">No.</TableHead>
                  <TableHead className="font-semibold text-slate-900">Article/Book</TableHead>
                  <TableHead className="font-semibold text-slate-900">Author(s)</TableHead>
                  <TableHead className="w-24 font-semibold text-slate-900">Year</TableHead>
                  <TableHead className="w-20 text-center font-semibold text-slate-900">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {footnotes.map((footnote) => (
                  <TableRow key={footnote.id} className="border-b border-slate-200 hover:bg-slate-50">
                    {editingId === footnote.id ? (
                      <>
                        <TableCell className="py-4 text-slate-900 font-medium">
                          {footnote.number}
                        </TableCell>
                        <TableCell className="py-4">
                          <Input
                            value={editValues.article || ""}
                            onChange={(e) =>
                              setEditValues({ ...editValues, article: e.target.value })
                            }
                            className="border-slate-300"
                            placeholder="Article/Book title"
                          />
                        </TableCell>
                        <TableCell className="py-4">
                          <Input
                            value={editValues.authors || ""}
                            onChange={(e) =>
                              setEditValues({ ...editValues, authors: e.target.value })
                            }
                            className="border-slate-300"
                            placeholder="Author(s)"
                          />
                        </TableCell>
                        <TableCell className="py-4">
                          <Input
                            value={editValues.year || ""}
                            onChange={(e) =>
                              setEditValues({ ...editValues, year: e.target.value })
                            }
                            className="border-slate-300 w-20"
                            placeholder="Year"
                          />
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-300 text-slate-700 hover:bg-slate-50"
                              onClick={handleSaveEdit}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-300 text-slate-700 hover:bg-slate-50"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="py-4 text-slate-900 font-medium">
                          {footnote.number}
                        </TableCell>
                        <TableCell className="py-4 text-slate-700">
                          {footnote.article}
                        </TableCell>
                        <TableCell className="py-4 text-slate-700">
                          {footnote.authors}
                        </TableCell>
                        <TableCell className="py-4 text-slate-700">
                          {footnote.year}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50"
                            onClick={() => handleEdit(footnote)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={() => setLocation("/")}
          >
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            disabled={isVerifying}
            onClick={handleVerify}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Footnotes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
