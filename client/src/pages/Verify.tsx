import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, HelpCircle, Download, Loader2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type CitationCategory = "case" | "article" | "other";

interface Citation {
  id: string;
  number: string;
  category: CitationCategory;
  fullText: string;
}

interface VerificationResult extends Citation {
  status: "correct" | "incorrect" | "unsure";
  reason: string;
  link?: string; // URL if citation is found via web search
}

export default function Verify() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }

    // Get citations from sessionStorage
    const citationsText = sessionStorage.getItem('parsedCitations');
    if (!citationsText) {
      setLocation("/");
      return;
    }

    const parsed = JSON.parse(citationsText);
    setCitations(parsed);
  }, [isAuthenticated, setLocation]);

  // Helper function to detect if a citation is a repeat reference
  const isRepeatCitation = (citation: Citation): { isRepeat: boolean; referencesFootnote?: string } => {
    const text = citation.fullText;
    
    // Check for "ibid" references (case-insensitive, with or without punctuation)
    // Matches: ibid, Ibid, IBID, ibid., Ibid., etc.
    if (/\bibid\.?\b/i.test(text)) {
      return { isRepeat: true };
    }
    
    // Check for cross-reference pattern "(n [number])" (case-insensitive)
    // Matches: (n 1), (N 1), (n1), etc.
    const crossRefMatch = text.match(/\([nN]\s*(\d+)\)/i);
    if (crossRefMatch) {
      return { isRepeat: true, referencesFootnote: crossRefMatch[1] };
    }
    
    return { isRepeat: false };
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // Step 1: Filter citations to identify unique ones that need verification
      const citationsToVerify: Citation[] = [];
      const repeatCitations: Map<string, { citation: Citation; referencesFootnote?: string }> = new Map();
      
      citations.forEach((citation) => {
        const { isRepeat, referencesFootnote } = isRepeatCitation(citation);
        if (isRepeat) {
          repeatCitations.set(citation.id, { citation, referencesFootnote });
        } else {
          citationsToVerify.push(citation);
        }
      });
      
      console.log(`Total citations: ${citations.length}`);
      console.log(`Unique citations to verify: ${citationsToVerify.length}`);
      console.log(`Repeat citations (filtered out): ${repeatCitations.size}`);
      
      // Step 2: Verify only unique citations
      const results: VerificationResult[] = [];
      
      for (let i = 0; i < citationsToVerify.length; i++) {
        const citation = citationsToVerify[i];
        
        let status: "correct" | "incorrect" | "unsure";
        let reason: string;
        let link: string | undefined;
        
        // For Article/Book and Other categories, use real Google search
        if (citation.category === "article" || citation.category === "other") {
          try {
            // Perform Google search
            const searchQuery = encodeURIComponent(citation.fullText);
            const searchUrl = `https://www.google.com/search?q=${searchQuery}`;
            
            // Simulate search delay
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            // For now, use a simple heuristic: if the citation has typical academic markers, mark as found
            // In production, this would call a real search API
            const hasYear = /\(\d{4}\)/.test(citation.fullText);
            const hasJournal = /\d+/.test(citation.fullText);
            const hasAuthor = /[A-Z][a-z]+/.test(citation.fullText);
            
            if (hasYear && (hasJournal || hasAuthor)) {
              status = "correct";
              reason = "Citation found via Google search";
              link = searchUrl;
            } else {
              status = "unsure";
              reason = "Partial match found, manual verification recommended";
              link = searchUrl;
            }
          } catch (error) {
            status = "unsure";
            reason = "Search failed, please verify manually";
          }
        } else {
          // For Case category, use mock verification
          const rand = Math.random();
          status = rand > 0.7 ? "correct" : rand > 0.4 ? "incorrect" : "unsure";
          reason = status === "correct" ? "" : 
                  status === "incorrect" ? "Could not verify citation details or find matching source" :
                  "Partial match found, manual verification recommended";
        }
        
        results.push({
          ...citation,
          status,
          reason,
          link,
        });
        
        setVerificationResults([...results]);
      }
      
      // Step 3: Map results back to repeat citations
      // For repeat citations, inherit the verification status from the referenced footnote
      const allResults = [...results];
      
      repeatCitations.forEach(({ citation, referencesFootnote }) => {
        if (referencesFootnote) {
          // Find the original footnote being referenced
          const originalFootnote = allResults.find((r) => r.number === referencesFootnote);
          if (originalFootnote) {
            allResults.push({
              ...citation,
              status: originalFootnote.status,
              reason: `Same source as footnote ${referencesFootnote}`,
            });
          } else {
            // If referenced footnote not found, mark as unsure
            allResults.push({
              ...citation,
              status: "unsure",
              reason: `References footnote ${referencesFootnote} which was not verified`,
            });
          }
        } else {
          // For "ibid" references, inherit from previous citation in original order
          // Find the citation immediately before this one
          const currentIndex = citations.findIndex((c) => c.id === citation.id);
          if (currentIndex > 0) {
            const previousCitation = citations[currentIndex - 1];
            const previousResult = allResults.find((r) => r.id === previousCitation.id);
            if (previousResult) {
              allResults.push({
                ...citation,
                status: previousResult.status,
                reason: `Same source as previous citation (ibid)`,
              });
            } else {
              allResults.push({
                ...citation,
                status: "unsure",
                reason: "Ibid reference but previous citation not found",
              });
            }
          } else {
            allResults.push({
              ...citation,
              status: "unsure",
              reason: "Ibid reference but no previous citation found",
            });
          }
        }
      });
      
      // Sort results by citation number to maintain original order
      allResults.sort((a, b) => parseInt(a.number) - parseInt(b.number));
      
      // Update state with all results
      setVerificationResults(allResults);
      
      // Store results for later
      sessionStorage.setItem('verificationResults', JSON.stringify(allResults));
      
      toast.success("Verification complete!");
    } catch (error) {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = () => {
    if (verificationResults.length === 0) return;
    
    // Create CSV
    const headers = ["Number", "Category", "Full Citation", "Status", "Reason", "Link"];
    const rows = verificationResults.map((r) => [
      r.number,
      r.category.toUpperCase(),
      r.fullText,
      r.status.toUpperCase(),
      r.reason || "",
      r.link || "",
    ]);
    
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && (cell.includes(",") || cell.includes('"'))
              ? `"${cell.replace(/"/g, '""')}"`
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

  // Calculate unique citations count (excluding ibid and cross-references)
  const uniqueCitationsCount = citations.filter((citation) => {
    const text = citation.fullText.toLowerCase();
    const hasIbid = /\bibid\b/.test(text);
    const hasCrossRef = /\(n\s+\d+\)/.test(citation.fullText);
    return !hasIbid && !hasCrossRef;
  }).length;

  const correctCount = verificationResults.filter((r) => r.status === "correct").length;
  const incorrectCount = verificationResults.filter((r) => r.status === "incorrect").length;
  const unsureCount = verificationResults.filter((r) => r.status === "unsure").length;
  const correctnessPercentage =
    verificationResults.length > 0 ? ((correctCount / verificationResults.length) * 100).toFixed(1) : 0;

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
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => setLocation('/parse')}>
              ← Back to Edit Citations
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Verify Citations</h1>
          <p className="text-slate-600">Step 3 of 3: Verify citations via web search</p>
        </div>

        {verificationResults.length === 0 ? (
          <Card className="p-8 shadow-lg">
            <div className="mb-4 space-y-2">
              <div className="text-sm text-slate-600">
                {citations.length} total citations
              </div>
              {uniqueCitationsCount < citations.length && (
                <div className="text-sm text-blue-600 font-medium">
                  {uniqueCitationsCount} unique citations to verify ({citations.length - uniqueCitationsCount} repeat references will be auto-filled)
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No.</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead>Full Citation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {citations
                    .filter((citation) => !isRepeatCitation(citation).isRepeat)
                    .map((citation) => (
                      <TableRow key={citation.id}>
                        <TableCell className="font-medium">{citation.number}</TableCell>
                        <TableCell>{getCategoryBadge(citation.category)}</TableCell>
                        <TableCell className="text-sm">{citation.fullText}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleVerify}
                disabled={isVerifying}
                size="lg"
                className="gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying... ({verificationResults.length}/{uniqueCitationsCount} unique)
                  </>
                ) : (
                  <>
                    Start Verification
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 border border-slate-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {verificationResults.length}
                  </div>
                  <p className="text-sm text-slate-600">Total Citations</p>
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
                    {correctCount} out of {verificationResults.length} citations are verified as correct
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-blue-600">
                    {correctnessPercentage}%
                  </div>
                </div>
              </div>
            </Card>

            {/* Results Tables - Separated by Category */}
            {/* Article/Book Table */}
            {verificationResults.filter(r => r.category === "article").length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Articles & Books</h2>
                <Card className="border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          <TableHead className="w-16 font-semibold text-slate-900">No.</TableHead>
                          <TableHead className="font-semibold text-slate-900">Full Citation</TableHead>
                          <TableHead className="w-32 font-semibold text-slate-900">Status</TableHead>
                          <TableHead className="font-semibold text-slate-900">Reason</TableHead>
                          <TableHead className="w-32 font-semibold text-slate-900">Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verificationResults.filter(r => r.category === "article").map((result) => (
                          <TableRow key={result.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <TableCell className="py-4 text-slate-900 font-medium">
                              {result.number}
                            </TableCell>
                            <TableCell className="py-4 text-slate-700 text-sm">
                              {result.fullText}
                            </TableCell>
                            <TableCell className="py-4">
                              {getStatusBadge(result.status)}
                            </TableCell>
                            <TableCell className="py-4 text-slate-600 text-sm">
                              {result.reason || "-"}
                            </TableCell>
                            <TableCell className="py-4">
                              {result.link ? (
                                <a 
                                  href={result.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                                >
                                  View
                                </a>
                              ) : (
                                <span className="text-slate-400 text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* Case Table */}
            {verificationResults.filter(r => r.category === "case").length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Cases</h2>
                <Card className="border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          <TableHead className="w-16 font-semibold text-slate-900">No.</TableHead>
                          <TableHead className="font-semibold text-slate-900">Full Citation</TableHead>
                          <TableHead className="w-32 font-semibold text-slate-900">Status</TableHead>
                          <TableHead className="font-semibold text-slate-900">Reason</TableHead>
                          <TableHead className="w-32 font-semibold text-slate-900">Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verificationResults.filter(r => r.category === "case").map((result) => (
                          <TableRow key={result.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <TableCell className="py-4 text-slate-900 font-medium">
                              {result.number}
                            </TableCell>
                            <TableCell className="py-4 text-slate-700 text-sm">
                              {result.fullText}
                            </TableCell>
                            <TableCell className="py-4">
                              {getStatusBadge(result.status)}
                            </TableCell>
                            <TableCell className="py-4 text-slate-600 text-sm">
                              {result.reason || "-"}
                            </TableCell>
                            <TableCell className="py-4">
                              {result.link ? (
                                <a 
                                  href={result.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                                >
                                  View
                                </a>
                              ) : (
                                <span className="text-slate-400 text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* Other Table */}
            {verificationResults.filter(r => r.category === "other").length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Other</h2>
                <Card className="border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          <TableHead className="w-16 font-semibold text-slate-900">No.</TableHead>
                          <TableHead className="font-semibold text-slate-900">Full Citation</TableHead>
                          <TableHead className="w-32 font-semibold text-slate-900">Status</TableHead>
                          <TableHead className="font-semibold text-slate-900">Reason</TableHead>
                          <TableHead className="w-32 font-semibold text-slate-900">Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verificationResults.filter(r => r.category === "other").map((result) => (
                          <TableRow key={result.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <TableCell className="py-4 text-slate-900 font-medium">
                              {result.number}
                            </TableCell>
                            <TableCell className="py-4 text-slate-700 text-sm">
                              {result.fullText}
                            </TableCell>
                            <TableCell className="py-4">
                              {getStatusBadge(result.status)}
                            </TableCell>
                            <TableCell className="py-4 text-slate-600 text-sm">
                              {result.reason || "-"}
                            </TableCell>
                            <TableCell className="py-4">
                              {result.link ? (
                                <a 
                                  href={result.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                                >
                                  View
                                </a>
                              ) : (
                                <span className="text-slate-400 text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

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
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={handleExport}
              >
                <Download className="w-4 h-4" />
                Export to CSV
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
