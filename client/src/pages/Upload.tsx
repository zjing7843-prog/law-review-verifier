import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileUp, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Upload() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [footnoteCount, setFootnoteCount] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.documents.upload.useMutation();

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Invalid file type. Please upload a PDF or Word document.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 50MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // In a real implementation, you would upload to S3 first
      // For now, we'll create a mock file URL
      const fileUrl = URL.createObjectURL(file);
      
      const result = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileType: file.name.endsWith(".pdf") ? "pdf" : "docx",
        fileUrl: fileUrl,
      });

      toast.success("Document uploaded successfully!");
      setShowConfirmDialog(true);
    } catch (error) {
      toast.error("Failed to upload document. Please try again.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmFootnotes = () => {
    if (footnoteCount === null || footnoteCount < 1) {
      toast.error("Please enter a valid footnote count.");
      return;
    }
    
    setShowConfirmDialog(false);
    // Navigate to extraction page
    setLocation("/extract");
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
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Upload Document</h1>
          <p className="text-slate-600">Step 1 of 4: Upload your Word or PDF document</p>
        </div>

        {/* Upload Area */}
        <Card
          className={`p-12 border-2 border-dashed transition-all cursor-pointer ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : file
              ? "border-green-500 bg-green-50"
              : "border-slate-300 hover:border-blue-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="text-center">
            {file ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  {file.name}
                </h2>
                <p className="text-slate-600 mb-4">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  Choose Different File
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileUp className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  Drop your file here
                </h2>
                <p className="text-slate-600 mb-4">
                  or click to select a PDF or Word document
                </p>
                <p className="text-sm text-slate-500">
                  Maximum file size: 50MB
                </p>
              </>
            )}
          </div>
        </Card>

        {/* File Requirements */}
        <Card className="mt-8 p-6 border border-slate-200 bg-blue-50">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Supported Formats</h3>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• PDF (.pdf)</li>
                <li>• Microsoft Word (.docx)</li>
                <li>• Footnotes should be numbered sequentially from 1</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={() => setLocation("/")}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            disabled={!file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload & Continue"
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Footnote Count</DialogTitle>
            <DialogDescription>
              Please enter the total number of footnotes in your document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Total Number of Footnotes
              </label>
              <Input
                type="number"
                min="1"
                value={footnoteCount || ""}
                onChange={(e) => setFootnoteCount(parseInt(e.target.value) || null)}
                placeholder="e.g., 45"
                className="border-slate-300"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleConfirmFootnotes}
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
