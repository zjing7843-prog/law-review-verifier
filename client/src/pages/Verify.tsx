import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, HelpCircle, Download, Loader2 } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface VerificationResult {
  id: string;
  number: number;
  article: string;
  authors: string;
  year: string;
  status: "correct" | "incorrect" | "unsure";
  explanation?: string;
}

export default function Verify() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const documentId = searchParams.get('documentId');
  
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Fetch verification results from the database
  const { data: verificationResults, isLoading: resultsLoading } = trpc.documents.getVerificationResults.useQuery(
    { documentId: Number(documentId) },
    { enabled: !!documentId }
  );

  useEffect(() => {
    if (verificationResults) {
      setResults(verificationResults.map((vr: any) => ({
        id: String(vr.id),
        number: vr.footnoteNumber,
        article: vr.article || '',
        authors: vr.authors || '',
        year: vr.year || '',
        status: vr.status,
        explanation: vr.explanation,
      })));
      setIsLoading(false);
    }
  }, [verificationResults]);

  useEffect(() => {
    // If no document ID, show empty state
    if (!documentId) {
      setIsLoading(false);
    }
  }, [documentId]);

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const correctCount = results.filter((r) => r.status === "correct").length;
  const incorrectCount = results.filter((r) => r.status === "incorrect").length;
  const unsureCount = results.filter((r) => r.status === "unsure").length;
  const correctnessPercentage =
    results.length > 0 ? ((correctCount / results.length) * 100).toFixed(1) : 0;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Create a simple CSV file
      const headers = ["Number", "Article/Book", "Author(s)", "Year", "Status", "Explanation"];
      const rows = results.map((r) => [
        r.number,
        r.article,
        r.authors,
        r.year,
        r.status.toUpperCase(),
        r.explanation || "",
      ]);
      
      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) =>
              typeof cell === "string" && cell.includes(",")
                ? `"${cell}"`
                : cell
            )
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "verification_results.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Results exported successfully");
    } catch (error) {
      toast.error("Failed to export results");
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "correct":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "incorrect":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "unsure":
        return <HelpCircle className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "correct":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Correct
          </span>
        );
      case "incorrect":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Incorrect
          </span>
        );
      case "unsure":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
            <HelpCircle className="w-4 h-4" />
            Unsure
          </span>
        );
      default:
        return null;
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Verification Results</h1>
          <p className="text-slate-600">Step 3 of 4: Review verification results</p>
        </div>

        {isLoading ? (
          <Card className="p-12 border border-slate-200 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-600">Verifying footnotes...</p>
          </Card>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 border border-slate-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {results.length}
                  </div>
                  <p className="text-sm text-slate-600">Total Footnotes</p>
                </div>
              </Card>
              <Card className="p-6 border border-green-200 bg-green-50">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {correctCount}
                  </div>
                  <p className="text-sm text-slate-600">Correct</p>
                </div>
              </Card>
              <Card className="p-6 border border-red-200 bg-red-50">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {incorrectCount}
                  </div>
                  <p className="text-sm text-slate-600">Incorrect</p>
                </div>
              </Card>
              <Card className="p-6 border border-amber-200 bg-amber-50">
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600 mb-1">
                    {unsureCount}
                  </div>
                  <p className="text-sm text-slate-600">Unsure</p>
                </div>
              </Card>
            </div>

            {/* Correctness Percentage */}
            <Card className="mb-8 p-8 border border-blue-200 bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Overall Correctness
                  </h3>
                  <p className="text-slate-600">
                    {correctCount} out of {results.length} footnotes are verified as correct
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-blue-600">
                    {correctnessPercentage}%
                  </div>
                </div>
              </div>
            </Card>

            {/* Results Table */}
            <Card className="mb-8 border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="w-16 font-semibold text-slate-900">No.</TableHead>
                      <TableHead className="font-semibold text-slate-900">Article/Book</TableHead>
                      <TableHead className="font-semibold text-slate-900">Author(s)</TableHead>
                      <TableHead className="w-24 font-semibold text-slate-900">Year</TableHead>
                      <TableHead className="w-32 font-semibold text-slate-900">Status</TableHead>
                      <TableHead className="font-semibold text-slate-900">Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <TableCell className="py-4 text-slate-900 font-medium">
                          {result.number}
                        </TableCell>
                        <TableCell className="py-4 text-slate-700">
                          {result.article}
                        </TableCell>
                        <TableCell className="py-4 text-slate-700">
                          {result.authors}
                        </TableCell>
                        <TableCell className="py-4 text-slate-700">
                          {result.year}
                        </TableCell>
                        <TableCell className="py-4">
                          {getStatusBadge(result.status)}
                        </TableCell>
                        <TableCell className="py-4 text-slate-600 text-sm">
                          {result.explanation || "-"}
                        </TableCell>
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
                Done
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                disabled={isExporting}
                onClick={handleExport}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export to Excel
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
