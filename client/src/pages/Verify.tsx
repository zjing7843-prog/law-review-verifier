import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type CitationCategory = "case" | "article" | "book" | "policy_paper" | "website" | "statute" | "explanatory_text" | "other";

interface Citation {
  id: string;
  number: number;
  fullText: string;
  category: CitationCategory;
  skipVerification?: boolean;
}

interface VerificationResult extends Citation {
  status: "verified" | "unsure" | "hallucinated";
  reason: string;
  link: string;
  authority?: "official" | "authoritative" | "general";
  confidence: number;
  isRepeat?: boolean; // Flag to hide repeat citations from display
}

export default function Verify() {
  const [, setLocation] = useLocation();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentVerifyingIndex, setCurrentVerifyingIndex] = useState(0);
  
  const verifyMutation = trpc.citations.verify.useMutation();

  useEffect(() => {
    const stored = sessionStorage.getItem("parsedCitations");
    if (stored) {
      const parsed = JSON.parse(stored);
      setCitations(parsed);
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  // Helper to detect repeat citations (ibid, supra, (n X))
  const isRepeatCitation = (citation: Citation) => {
    const text = citation.fullText.toLowerCase().trim();
    
    // Check for ibid
    if (text.startsWith("ibid")) {
      return { isRepeat: true, referencesFootnote: citation.number - 1 };
    }
    
    // Check for (n X) pattern ANYWHERE in the text (not just at start)
    const nPattern = /\(n\s*(\d+)\)/i;
    const nMatch = text.match(nPattern);
    if (nMatch) {
      return { isRepeat: true, referencesFootnote: parseInt(nMatch[1]) };
    }
    
    // Check for supra note X
    const supraPattern = /supra\s+note\s+(\d+)/i;
    const supraMatch = text.match(supraPattern);
    if (supraMatch) {
      return { isRepeat: true, referencesFootnote: parseInt(supraMatch[1]) };
    }
    
    return { isRepeat: false, referencesFootnote: null };
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResults([]);
    setCurrentVerifyingIndex(0);
    
    try {
      // Step 1: Identify unique citations, repeat citations, and explanatory text
      const citationsToVerify: Citation[] = [];
      const repeatCitations = new Map<string, { citation: Citation; referencesFootnote: number | null }>();
      const explanatoryCitations = new Map<string, Citation>();
      
      citations.forEach((citation) => {
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
        setCurrentVerifyingIndex(i + 1);
        
        try {
          // Call backend verification API with real web search
          const verificationResult = await verifyMutation.mutateAsync({
            citationText: citation.fullText,
            category: citation.category,
          });
          
          const newResult: VerificationResult = {
            ...citation,
            status: verificationResult.status,
            reason: verificationResult.reason,
            link: verificationResult.link || "",
            authority: verificationResult.authority,
            confidence: verificationResult.confidence,
          };
          
          results.push(newResult);
          
          // **KEY CHANGE: Update state immediately after each verification**
          setVerificationResults([...results]);
          
        } catch (error) {
          console.error(`Error verifying citation ${citation.id}:`, error);
          // Fallback to unsure if API fails
          const fallbackResult: VerificationResult = {
            ...citation,
            status: "unsure",
            reason: "Verification service unavailable",
            link: `https://www.google.com/search?q=${encodeURIComponent(citation.fullText)}`,
            authority: "general",
            confidence: 0,
          };
          
          results.push(fallbackResult);
          
          // **Update state immediately even for errors**
          setVerificationResults([...results]);
        }
      }
      
      // Step 3: Handle repeat citations (ibid, supra, (n X))
      repeatCitations.forEach(({ citation, referencesFootnote }) => {
        if (referencesFootnote) {
          const referencedResult = results.find((r) => r.number === referencesFootnote);
          if (referencedResult) {
            results.push({
              ...citation,
              status: referencedResult.status,
              reason: `Same as footnote ${referencesFootnote}`,
              link: referencedResult.link,
              authority: referencedResult.authority,
              confidence: referencedResult.confidence,
              isRepeat: true, // Mark as repeat to hide from display
            });
          } else {
            results.push({
              ...citation,
              status: "unsure",
              reason: `References footnote ${referencesFootnote} which was not verified`,
              link: "",
              authority: "general",
              confidence: 0,
              isRepeat: true, // Mark as repeat to hide from display
            });
          }
        } else {
          const previousResult = results[results.length - 1];
          if (previousResult) {
            results.push({
              ...citation,
              status: previousResult.status,
              reason: `Same as previous footnote`,
              link: previousResult.link,
              authority: previousResult.authority,
              confidence: previousResult.confidence,
              isRepeat: true, // Mark as repeat to hide from display
            });
          }
        }
      });
      
      // Step 4: Handle explanatory text (skipped from verification)
      explanatoryCitations.forEach((citation) => {
        results.push({
          ...citation,
          status: "unsure",
          reason: "Explanatory text - not verified",
          link: "",
          authority: "general",
          confidence: 0,
        });
      });
      
      // Sort results by footnote number
      results.sort((a, b) => a.number - b.number);
      
      setVerificationResults(results);
      toast.success("Verification complete!");
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
      setCurrentVerifyingIndex(0);
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

  // Group results by category for display (excluding explanatory text and repeat citations)
  const resultsByCategory = {
    case: verificationResults.filter((r) => r.category === "case" && !r.isRepeat),
    article: verificationResults.filter((r) => r.category === "article" && !r.isRepeat),
    book: verificationResults.filter((r) => r.category === "book" && !r.isRepeat),
    policy_paper: verificationResults.filter((r) => r.category === "policy_paper" && !r.isRepeat),
    website: verificationResults.filter((r) => r.category === "website" && !r.isRepeat),
    statute: verificationResults.filter((r) => r.category === "statute" && !r.isRepeat),
    other: verificationResults.filter((r) => r.category === "other" && !r.isRepeat),
  };

  const verifiedCount = verificationResults.filter((r) => r.status === "verified" && !r.isRepeat).length;
  const hallucinatedCount = verificationResults.filter((r) => r.status === "hallucinated" && !r.isRepeat).length;
  const unsureCount = verificationResults.filter((r) => r.status === "unsure" && !r.isRepeat).length;

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

        {/* **NEW: Show results in real-time during verification** */}
        {isVerifying && (
          <div className="space-y-6">
            {/* Progress indicator */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <Loader2 className="w-8 h-8 text-slate-600 animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-lg font-medium text-slate-700 mb-1">
                    Verifying citations via web search...
                  </p>
                  <p className="text-sm text-slate-500">
                    Verified {verificationResults.length} of {uniqueCitations.length} unique citations
                  </p>
                </div>
              </div>
            </Card>

            {/* Show results as they come in */}
            {verificationResults.length > 0 && (
              <div className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-slate-900">{verificationResults.length}</div>
                    <div className="text-sm text-slate-600">Verified So Far</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-emerald-600">{verifiedCount}</div>
                    <div className="text-sm text-slate-600">Verified</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-red-600">{hallucinatedCount}</div>
                    <div className="text-sm text-slate-600">Risk of hallucination</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-amber-600">{unsureCount}</div>
                    <div className="text-sm text-slate-600">Unsure</div>
                  </Card>
                </div>

                {/* Results by category */}
                {Object.entries(resultsByCategory).map(([category, results]) => {
                  if (results.length === 0) return null;

                  const categoryLabels: Record<string, string> = {
                    case: "Cases",
                    article: "Articles & Books",
                    book: "Books",
                    policy_paper: "Policy Papers",
                    website: "Websites",
                    statute: "Statutes",
                    other: "Other",
                  };

                  return (
                    <Card key={category} className="p-6">
                      <h2 className="text-xl font-semibold text-slate-900 mb-4">
                        {categoryLabels[category]}
                      </h2>
                      <div className="overflow-x-auto">
                        <Table className="table-fixed w-full">
                          <TableHeader>
            <TableRow>
              <TableHead className="w-[5%]">No.</TableHead>
              <TableHead className="w-[45%]">Citation</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[25%]">Reason</TableHead>
              <TableHead className="w-[10%]">Link</TableHead>
            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.map((result) => (
                              <TableRow key={result.id}>
                                <TableCell className="font-medium">{result.number}</TableCell>
                                <TableCell className="break-words whitespace-normal text-sm" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>
                                  {result.fullText}
                                </TableCell>
                                <TableCell className="align-top" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>
                                  {result.status === "verified" && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 whitespace-normal">
                                      ✓ Verified
                                    </span>
                                  )}
                                  {result.status === "hallucinated" && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 whitespace-normal">
                                      ⚠ Risk of hallucination
                                    </span>
                                  )}
                                  {result.status === "unsure" && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 whitespace-normal">
                                      ? Unsure
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 align-top" style={{wordBreak: 'break-word', overflowWrap: 'break-word', paddingRight: '1rem'}}>
                                  <div className="space-y-1 pr-2">
                                    <div className="break-words">{result.reason}</div>
                                    {result.authority && (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {getAuthorityBadge(result.authority)}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="align-top" style={{minWidth: '80px', paddingLeft: '0.5rem'}}>
                                  {result.link && (
                                    <a
                                      href={result.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                    >
                                      View
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!isVerifying && verificationResults.length > 0 && (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold text-slate-900">{verifiedCount + hallucinatedCount + unsureCount}</div>
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

            {/* Results by category */}
            {Object.entries(resultsByCategory).map(([category, results]) => {
              if (results.length === 0) return null;

              const categoryLabels: Record<string, string> = {
                case: "Cases",
                article: "Articles & Books",
                book: "Books",
                policy_paper: "Policy Papers",
                website: "Websites",
                statute: "Statutes",
                other: "Other",
              };

              return (
                <Card key={category} className="p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">
                    {categoryLabels[category]}
                  </h2>
                  <div className="overflow-x-auto">
                    <Table className="table-fixed w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[5%]">No.</TableHead>
                          <TableHead className="w-[45%]">Citation</TableHead>
                          <TableHead className="w-[10%]">Status</TableHead>
                          <TableHead className="w-[30%]">Reason</TableHead>
                          <TableHead className="w-[10%]">Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((result) => (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">{result.number}</TableCell>
                            <TableCell className="break-words whitespace-normal text-sm" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>
                              {result.fullText}
                            </TableCell>
                            <TableCell className="align-top" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>
                              {result.status === "verified" && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 whitespace-normal">
                                  ✓ Verified
                                </span>
                              )}
                              {result.status === "hallucinated" && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 whitespace-normal">
                                  ⚠ Risk of hallucination
                                </span>
                              )}
                              {result.status === "unsure" && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 whitespace-normal">
                                  ? Unsure
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 align-top" style={{wordBreak: 'break-word', overflowWrap: 'break-word', paddingRight: '1rem'}}>
                              <div className="space-y-1 pr-2">
                                <div className="break-words">{result.reason}</div>
                                {result.authority && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getAuthorityBadge(result.authority)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top" style={{minWidth: '80px', paddingLeft: '0.5rem'}}>
                              {result.link && (
                                <a
                                  href={result.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                >
                                  View
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              );
            })}

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setLocation("/")}>
                Done
              </Button>
              <Button onClick={handleExportCSV} variant="outline">
                Export to CSV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
