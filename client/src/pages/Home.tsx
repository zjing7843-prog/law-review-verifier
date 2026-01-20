import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ArrowRight, Settings, Upload, FileText, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [citations, setCitations] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const uploadFileMutation = trpc.documents.uploadFile.useMutation();
  const uploadMutation = trpc.documents.upload.useMutation();
  const extractMutation = trpc.documents.extractFootnotes.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    // Validate file type
    const fileType = file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.pdf') ? 'pdf' : null;
    
    if (!fileType) {
      setUploadError('Please upload a .docx or .pdf file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      if (!isAuthenticated) {
        setUploadError('Please sign in to upload documents. You can still paste citations manually.');
        return;
      }

      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 for transmission
      let binary = '';
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Data = btoa(binary);
      
      // Determine content type
      const contentType = fileType === 'docx' 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';
      
      // Upload file to S3
      const uploadFileResult = await uploadFileMutation.mutateAsync({
        fileName: file.name,
        fileData: base64Data,
        contentType,
      });
      
      // Create document record with S3 URL
      const uploadResult = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileType,
        fileUrl: uploadFileResult.url,
      });

      // Extract footnotes from the uploaded document
      const extractResult = await extractMutation.mutateAsync({
        documentId: uploadResult.id,
      });

      // Populate textarea with extracted footnotes
      if (extractResult.footnotes && extractResult.footnotes.length > 0) {
        const footnoteTexts = extractResult.footnotes.map((f: any) => f.text).join('\n');
        setCitations(footnoteTexts);
      } else {
        setUploadError('No footnotes found in the document. Please check the file format or paste citations manually.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadError('Failed to process document. Please try again or paste citations manually.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleParse = () => {
    if (!citations.trim()) {
      return;
    }
    // Store citations in sessionStorage and navigate to parse page
    sessionStorage.setItem('citations', citations);
    setLocation("/parse");
  };

  // Removed authentication requirement

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
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">Citation Verification Tool</span>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Verify Your Footnotes
          </h1>
          <p className="text-lg text-slate-600">
            Paste all footnotes below for a preliminary verification
          </p>
        </div>

        {/* Paste Area */}
        <Card className="p-8 shadow-lg">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-slate-700">
                Paste Your Citations
              </label>
              <span className="text-xs text-slate-500">or upload a document below</span>
            </div>
            <Textarea
              value={citations}
              onChange={(e) => setCitations(e.target.value)}
              placeholder="Thomas K. Cheng and Julian Nowag, Algorithmic Predation and Exclusion, 25 University of Pennsylvania Journal of Business Law 41 (2023).&#10;Sherman Antitrust Act 1890, 15 U.S.C. § 2 https://www.law.cornell.edu/uscode/text/15/2 accessed [20 Jan 2025]."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* File Upload Area */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Or Upload Document
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
              } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm text-slate-600">Processing document...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    Drag and drop your document here
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Supports .docx and .pdf files
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    accept=".docx,.pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </>
              )}
            </div>
            {uploadError && (
              <div className="mt-2 text-sm text-red-600">
                {uploadError}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-slate-500">
              {citations.trim() ? `${citations.split('\n').filter(l => l.trim()).length} lines pasted` : 'No citations pasted yet'}
            </div>
            <Button
              onClick={handleParse}
              disabled={!citations.trim()}
              size="lg"
              className="gap-2"
            >
              Parse Citations
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Instructions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="font-semibold mb-2">Paste Citations</h3>
            <p className="text-sm text-slate-600">
              Copy all your footnotes and paste them into the text box above
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="font-semibold mb-2">Review & Edit</h3>
            <p className="text-sm text-slate-600">
              We'll parse them into a table where you can review and make corrections
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-blue-600">3</span>
            </div>
            <h3 className="font-semibold mb-2">Verify</h3>
            <p className="text-sm text-slate-600">
              We'll check each citation online and show you which ones are correct
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
