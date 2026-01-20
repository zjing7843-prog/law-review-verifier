import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, HelpCircle, Download, Loader2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type CitationCategory = "case" | "article" | "book" | "policy_paper" | "website" | "statute" | "explanatory_text" | "other";

interface Citation {
  id: string;
  number: string;
  category: CitationCategory;
  fullText: string;
  skipVerification?: boolean;
}

interface VerificationResult extends Citation {
  status: "verified" | "hallucinated" | "unsure";
  reason: string;
  link?: string; // URL if citation is found via web search
  authority?: "official" | "authoritative" | "general"; // Source authority level
  confidence: number; // Confidence percentage (0-100)
}

export default function Verify() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const verifyMutation = trpc.citations.verify.useMutation();

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
    
    // Check for "Id" or "Id." references (case-sensitive, common in legal citations)
    // Matches: Id, Id., Id. at 123, etc.
    // Note: Must be at the start or after punctuation to avoid matching words containing "id"
    if (/(^|\s|\()Id\.?(\s|$|,|at)/i.test(text)) {
      return { isRepeat: true };
    }
    
    // Check for "supra" references (case-insensitive)
    // Matches: supra, supra note 5, See supra Part II, Smith, supra, etc.
    if (/\bsupra\b/i.test(text)) {
      // Try to extract footnote number if present (e.g., "supra note 5")
      const supraMatch = text.match(/supra\s+note\s+(\d+)/i);
      if (supraMatch) {
        return { isRepeat: true, referencesFootnote: supraMatch[1] };
      }
      return { isRepeat: true };
    }
    
    // Check for cross-reference pattern "(n [number])" (case-insensitive)
    // Matches: (n 1), (N 1), (n1), etc.
    const crossRefMatch = text.match(/\([nN]\s*(\d+)\)/i);
    if (crossRefMatch) {
      return { isRepeat: true, referencesFootnote: crossRefMatch[1] };
    }
    
    // Check for "see also" followed by footnote reference (case-insensitive)
    // Matches: "See also n 5", "see also (n 3)", "See also note 10"
    // Does NOT match: "See also Smith v Jones" (substantive citation with signal)
    const seeAlsoMatch = text.match(/\bsee\s+also\s+(?:note\s+)?(\d+|\([nN]\s*\d+\)|[nN]\s*\d+)/i);
    if (seeAlsoMatch) {
      // Extract footnote number from various formats
      const footnoteNum = seeAlsoMatch[1].match(/\d+/);
      if (footnoteNum) {
        return { isRepeat: true, referencesFootnote: footnoteNum[0] };
      }
      return { isRepeat: true };
    }
    
    // Check for "cf." followed by footnote reference (case-insensitive)
    // Matches: "Cf. n 5", "cf. (n 3)", "Cf. note 10"
    // Does NOT match: "Cf. Smith v Jones" (substantive citation with signal)
    const cfMatch = text.match(/\bcf\.?\s+(?:note\s+)?(\d+|\([nN]\s*\d+\)|[nN]\s*\d+)/i);
    if (cfMatch) {
      // Extract footnote number from various formats
      const footnoteNum = cfMatch[1].match(/\d+/);
      if (footnoteNum) {
        return { isRepeat: true, referencesFootnote: footnoteNum[0] };
      }
      return { isRepeat: true };
    }
    
    return { isRepeat: false };
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // Step 1: Filter citations to identify unique ones that need verification
      const citationsToVerify: Citation[] = [];
      const repeatCitations: Map<string, { citation: Citation; referencesFootnote?: string }> = new Map();
      const explanatoryCitations: Map<string, Citation> = new Map();
      
      citations.forEach((citation) => {
        // Skip explanatory text entirely
        if (citation.category === "explanatory_text" || citation.skipVerification) {
          explanatoryCitations.set(citation.id, citation);
          return;
        }
        
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
      console.log(`Explanatory text (skipped): ${explanatoryCitations.size}`);
      
      // Step 2: Verify only unique citations using backend API with real web search
      const results: VerificationResult[] = [];
      
      for (let i = 0; i < citationsToVerify.length; i++) {
        const citation = citationsToVerify[i];
        
        try {
          // Call backend verification API with real web search
          const verificationResult = await verifyMutation.mutateAsync({
            citationText: citation.fullText,
            category: citation.category,
          });
          
          results.push({
            ...citation,
            status: verificationResult.status,
            reason: verificationResult.reason,
            link: verificationResult.link,
            authority: verificationResult.authority,
            confidence: verificationResult.confidence,
          });
        } catch (error) {
          console.error(`Error verifying citation ${citation.id}:`, error);
          // Fallback to unsure if API fails
          results.push({
            ...citation,
            status: "unsure",
            reason: "Verification service unavailable",
            link: `https://www.google.com/search?q=${encodeURIComponent(citation.fullText)}`,
            authority: "general",
            confidence: 0,
          });
        }
        
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
              reason: `Same as footnote ${referencesFootnote}`,
              link: originalFootnote.link,
              authority: originalFootnote.authority,
              confidence: originalFootnote.confidence,
            });
          } else {
            // Referenced footnote not found, mark as unsure
            allResults.push({
              ...citation,
              status: "unsure",
              reason: `References footnote ${referencesFootnote} (not found)`,
              link: undefined,
              authority: "general",
              confidence: 50,
            });
          }
        } else {
          // Generic repeat (ibid, supra without number) - inherit from previous citation
          const previousCitation = allResults[allResults.length - 1];
          if (previousCitation) {
            allResults.push({
              ...citation,
              status: previousCitation.status,
              reason: "Same as previous",
              link: previousCitation.link,
              authority: previousCitation.authority,
              confidence: previousCitation.confidence,
            });
          } else {
            allResults.push({
              ...citation,
              status: "unsure",
              reason: "Repeat reference (no original found)",
              link: undefined,
              authority: "general",
              confidence: 50,
            });
          }
        }
      });
      
      // Step 4: Add explanatory text citations with skipped status
      explanatoryCitations.forEach((citation) => {
        allResults.push({
          ...citation,
          status: "unsure",
          reason: "Explanatory text (skipped)",
          link: undefined,
          authority: "general",
          confidence: 0,
        });
      });
      
      // Sort all results by citation number
      allResults.sort((a, b) => parseInt(a.number) - parseInt(b.number));
      
      setVerificationResults(allResults);
      toast.success("Verification complete!");
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ["No.", "Category", "Full Citation", "Status", "Reason", "Link", "Authority"];
    const rows = verificationResults.map((result) => [
      result.number,
      result.category,
      result.fullText.replace(/"/g, '""'), // Escape quotes
      result.status,
      result.reason.replace(/"/g, '""'),
      result.link || "",
      result.authority || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citation-verification-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("CSV exported successfully!");
  };

  // Filter out repeat and explanatory citations from display
  const uniqueCitations = citations.filter((citation) => {
    if (citation.category === "explanatory_text" || citation.skipVerification) {
      return false;
    }
    const { isRepeat } = isRepeatCitation(citation);
    return !isRepeat;
  });

  const getCategoryBadge = (category: CitationCategory) => {
    const classes = {
      case: "category-badge-case",
      article: "category-badge-article",
      book: "category-badge-book",
      policy_paper: "category-badge-policy",
      website: "category-badge-website",
      statute: "category-badge-statute",
      explanatory_text: "category-badge-explanatory",
      other: "category-badge-other",
    };

    const labels = {
      case: "Case",
      article: "Article",
      book: "Book",
      policy_paper: "Policy Paper",
      website: "Website",
      statute: "Statute",
      explanatory_text: "Explanatory Text",
      other: "Other",
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[category]}`}>
        {labels[category]}
      </span>
    );
  };

  const getAuthorityBadge = (authority?: "official" | "authoritative" | "general") => {
    if (!authority) return null;

    const colors = {
      official: "bg-blue-100 text-blue-700 border-blue-300",
      authoritative: "bg-emerald-100 text-emerald-700 border-emerald-300",
      general: "bg-gray-100 text-gray-600 border-gray-300",
    };

    const labels = {
      official: "Official",
      authoritative: "Authoritative",
      general: "General",
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[authority]}`}>
        {labels[authority]}
      </span>
    );
  };

  const repeatCount = citations.filter((c) => {
    if (c.category === "explanatory_text" || c.skipVerification) return false;
    return isRepeatCitation(c).isRepeat;
  }).length;

  const explanatoryCount = citations.filter((c) => c.category === "explanatory_text" || c.skipVerification).length;

  // Group results by category for display (excluding explanatory text)
  const resultsByCategory = {
    case: verificationResults.filter((r) => r.category === "case"),
    article: verificationResults.filter((r) => r.category === "article"),
    book: verificationResults.filter((r) => r.category === "book"),
    policy_paper: verificationResults.filter((r) => r.category === "policy_paper"),
    website: verificationResults.filter((r) => r.category === "website"),
    statute: verificationResults.filter((r) => r.category === "statute"),
    other: verificationResults.filter((r) => r.category === "other"),
  };

  const verifiedCount = verificationResults.filter((r) => r.status === "verified").length;
  const hallucinatedCount = verificationResults.filter((r) => r.status === "hallucinated").length;
  const unsureCount = verificationResults.filter((r) => r.status === "unsure").length;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-800">Law Review Verifier</span>
          </div>
        </div>
      </nav>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/parse")}
          className="mb-4"
        >
          ← Back to Edit Citations
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Verify Citations</h1>
          <p className="text-slate-600">Step 3 of 3: Verify citations via web search</p>
        </div>

        {!isVerifying && verificationResults.length === 0 && (
          <Card className="p-8">
            <div className="space-y-4 mb-6">
              <div className="text-sm text-slate-700">
                <strong>{citations.length}</strong> total citations
              </div>
              <div className="text-sm text-slate-700">
                <strong>{uniqueCitations.length}</strong> unique citations to verify ({repeatCount} repeat references will be auto-filled)
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[5%]">No.</TableHead>
                    <TableHead className="w-[15%]">Category</TableHead>
                    <TableHead className="w-[80%]">Full Citation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueCitations.map((citation) => (
                    <TableRow key={citation.id}>
                      <TableCell className="font-medium">{citation.number}</TableCell>
                      <TableCell>{getCategoryBadge(citation.category)}</TableCell>
                      <TableCell className="break-words whitespace-normal">{citation.fullText}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleVerify} size="lg" className="gap-2">
                Start Verification
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {isVerifying && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-slate-600 animate-spin mb-4" />
              <p className="text-lg text-slate-700 mb-2">Verifying citations via web search...</p>
              <p className="text-sm text-slate-500">
                Verified {verificationResults.length} of {uniqueCitations.length} unique citations
              </p>
            </div>
          </Card>
        )}

        {!isVerifying && verificationResults.length > 0 && (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold text-slate-900">{citations.length}</div>
                <div className="text-sm text-slate-600">Total Citations</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-emerald-600">{verifiedCount}</div>
                <div className="text-sm text-slate-600">Verified</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-red-600">{hallucinatedCount}</div>
                <div className="text-sm text-slate-600">Hallucinated</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-amber-600">{unsureCount}</div>
                <div className="text-sm text-slate-600">Unsure</div>
              </Card>
            </div>

            {/* Overall Correctness */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Overall Correctness</h3>
                  <p className="text-sm text-slate-600">
                    {verifiedCount} out of {citations.length} citations verified
                  </p>
                </div>
                <div className="text-4xl font-bold text-slate-900">
                  {citations.length > 0 ? Math.round((verifiedCount / citations.length) * 100) : 0}%
                </div>
              </div>
            </Card>

            {/* Cases */}
            {resultsByCategory.case.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Cases</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">No.</TableHead>
                        <TableHead className="w-[45%]">Citation</TableHead>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="w-[20%]">Reason</TableHead>
                        <TableHead className="w-[15%]">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsByCategory.case.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.number}</TableCell>
                          <TableCell className="break-words whitespace-normal">{result.fullText}</TableCell>
                          <TableCell>
                            {result.status === "verified" && (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                Verified
                              </span>
                            )}
                            {result.status === "hallucinated" && (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                Hallucinated
                              </span>
                            )}
                            {result.status === "unsure" && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <HelpCircle className="w-4 h-4" />
                                Unsure
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="break-words whitespace-normal">
                            <div className="space-y-1">
                              <div className="text-sm">{result.reason}</div>
                              <div className="flex gap-2 items-center flex-wrap">
                                {result.authority && getAuthorityBadge(result.authority)}
                                {result.confidence > 0 && (
                                  <span className="text-xs text-slate-500">({result.confidence}% confidence)</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {result.link && (
                              <a
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Articles */}
            {resultsByCategory.article.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Articles</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">No.</TableHead>
                        <TableHead className="w-[45%]">Citation</TableHead>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="w-[20%]">Reason</TableHead>
                        <TableHead className="w-[15%]">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsByCategory.article.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.number}</TableCell>
                          <TableCell className="break-words whitespace-normal">{result.fullText}</TableCell>
                          <TableCell>
                            {result.status === "verified" && (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                Verified
                              </span>
                            )}
                            {result.status === "hallucinated" && (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                Hallucinated
                              </span>
                            )}
                            {result.status === "unsure" && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <HelpCircle className="w-4 h-4" />
                                Unsure
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="break-words whitespace-normal">
                            <div className="space-y-1">
                              <div className="text-sm">{result.reason}</div>
                              <div className="flex gap-2 items-center flex-wrap">
                                {result.authority && getAuthorityBadge(result.authority)}
                                {result.confidence > 0 && (
                                  <span className="text-xs text-slate-500">({result.confidence}% confidence)</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {result.link && (
                              <a
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Books */}
            {resultsByCategory.book.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Books</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">No.</TableHead>
                        <TableHead className="w-[45%]">Citation</TableHead>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="w-[20%]">Reason</TableHead>
                        <TableHead className="w-[15%]">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsByCategory.book.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.number}</TableCell>
                          <TableCell className="break-words whitespace-normal">{result.fullText}</TableCell>
                          <TableCell>
                            {result.status === "verified" && (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                Verified
                              </span>
                            )}
                            {result.status === "hallucinated" && (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                Hallucinated
                              </span>
                            )}
                            {result.status === "unsure" && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <HelpCircle className="w-4 h-4" />
                                Unsure
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="break-words whitespace-normal">
                            <div className="space-y-1">
                              <div className="text-sm">{result.reason}</div>
                              <div className="flex gap-2 items-center flex-wrap">
                                {result.authority && getAuthorityBadge(result.authority)}
                                {result.confidence > 0 && (
                                  <span className="text-xs text-slate-500">({result.confidence}% confidence)</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {result.link && (
                              <a
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Policy Papers */}
            {resultsByCategory.policy_paper.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Policy Papers</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">No.</TableHead>
                        <TableHead className="w-[45%]">Citation</TableHead>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="w-[20%]">Reason</TableHead>
                        <TableHead className="w-[15%]">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsByCategory.policy_paper.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.number}</TableCell>
                          <TableCell className="break-words whitespace-normal">{result.fullText}</TableCell>
                          <TableCell>
                            {result.status === "verified" && (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                Verified
                              </span>
                            )}
                            {result.status === "hallucinated" && (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                Hallucinated
                              </span>
                            )}
                            {result.status === "unsure" && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <HelpCircle className="w-4 h-4" />
                                Unsure
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="break-words whitespace-normal">
                            <div className="space-y-1">
                              <div className="text-sm">{result.reason}</div>
                              <div className="flex gap-2 items-center flex-wrap">
                                {result.authority && getAuthorityBadge(result.authority)}
                                {result.confidence > 0 && (
                                  <span className="text-xs text-slate-500">({result.confidence}% confidence)</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {result.link && (
                              <a
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Websites */}
            {resultsByCategory.website.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Websites</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">No.</TableHead>
                        <TableHead className="w-[45%]">Citation</TableHead>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="w-[20%]">Reason</TableHead>
                        <TableHead className="w-[15%]">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsByCategory.website.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.number}</TableCell>
                          <TableCell className="break-words whitespace-normal">{result.fullText}</TableCell>
                          <TableCell>
                            {result.status === "verified" && (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                Verified
                              </span>
                            )}
                            {result.status === "hallucinated" && (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                Hallucinated
                              </span>
                            )}
                            {result.status === "unsure" && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <HelpCircle className="w-4 h-4" />
                                Unsure
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="break-words whitespace-normal">
                            <div className="space-y-1">
                              <div className="text-sm">{result.reason}</div>
                              <div className="flex gap-2 items-center flex-wrap">
                                {result.authority && getAuthorityBadge(result.authority)}
                                {result.confidence > 0 && (
                                  <span className="text-xs text-slate-500">({result.confidence}% confidence)</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {result.link && (
                              <a
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Statutes */}
            {resultsByCategory.statute.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Statutes</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">No.</TableHead>
                        <TableHead className="w-[45%]">Citation</TableHead>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="w-[20%]">Reason</TableHead>
                        <TableHead className="w-[15%]">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsByCategory.statute.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.number}</TableCell>
                          <TableCell className="break-words whitespace-normal">{result.fullText}</TableCell>
                          <TableCell>
                            {result.status === "verified" && (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                Verified
                              </span>
                            )}
                            {result.status === "hallucinated" && (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                Hallucinated
                              </span>
                            )}
                            {result.status === "unsure" && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <HelpCircle className="w-4 h-4" />
                                Unsure
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="break-words whitespace-normal">
                            <div className="space-y-1">
                              <div className="text-sm">{result.reason}</div>
                              <div className="flex gap-2 items-center flex-wrap">
                                {result.authority && getAuthorityBadge(result.authority)}
                                {result.confidence > 0 && (
                                  <span className="text-xs text-slate-500">({result.confidence}% confidence)</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {result.link && (
                              <a
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Other */}
            {resultsByCategory.other.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Other</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[5%]">No.</TableHead>
                        <TableHead className="w-[45%]">Citation</TableHead>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="w-[20%]">Reason</TableHead>
                        <TableHead className="w-[15%]">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsByCategory.other.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.number}</TableCell>
                          <TableCell className="break-words whitespace-normal">{result.fullText}</TableCell>
                          <TableCell>
                            {result.status === "verified" && (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                Verified
                              </span>
                            )}
                            {result.status === "hallucinated" && (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                Hallucinated
                              </span>
                            )}
                            {result.status === "unsure" && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <HelpCircle className="w-4 h-4" />
                                Unsure
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="break-words whitespace-normal">
                            <div className="space-y-1">
                              <div className="text-sm">{result.reason}</div>
                              <div className="flex gap-2 items-center flex-wrap">
                                {result.authority && getAuthorityBadge(result.authority)}
                                {result.confidence > 0 && (
                                  <span className="text-xs text-slate-500">({result.confidence}% confidence)</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {result.link && (
                              <a
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setLocation("/")}>
                Done
              </Button>
              <Button onClick={handleExportCSV} className="gap-2">
                <Download className="w-4 h-4" />
                Export to CSV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
