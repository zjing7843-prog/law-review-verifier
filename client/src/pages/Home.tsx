import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUp, CheckCircle2, Search, BarChart3 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState } from "react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthenticated) {
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
            <a href={getLoginUrl()}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Sign In
              </Button>
            </a>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="container max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Verify Law Review Footnotes with Precision
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Automatically extract, validate, and verify citations in your academic documents. 
              Ensure accuracy and save hours of manual review.
            </p>
            <a href={getLoginUrl()}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8">
                Get Started Free
              </Button>
            </a>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8 mt-20">
            <Card className="p-8 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Smart Upload</h3>
              <p className="text-slate-600">
                Upload Word or PDF documents. Our tool automatically detects and extracts all footnotes with intelligent parsing.
              </p>
            </Card>

            <Card className="p-8 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Manual Review</h3>
              <p className="text-slate-600">
                Edit and correct extracted citations in an intuitive table interface before verification begins.
              </p>
            </Card>

            <Card className="p-8 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Web Verification</h3>
              <p className="text-slate-600">
                Conduct real-time web searches to verify each citation's existence and metadata correspondence.
              </p>
            </Card>

            <Card className="p-8 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Detailed Reports</h3>
              <p className="text-slate-600">
                Get comprehensive Excel reports with verification results, accuracy percentages, and interactive visualizations.
              </p>
            </Card>
          </div>

          {/* How It Works */}
          <div className="mt-24 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">How It Works</h2>
            <div className="space-y-6">
              {[
                {
                  step: "1",
                  title: "Upload Document",
                  description: "Upload your Word or PDF document containing footnotes"
                },
                {
                  step: "2",
                  title: "Extract & Review",
                  description: "Review extracted footnotes and make corrections if needed"
                },
                {
                  step: "3",
                  title: "Verify Citations",
                  description: "Our system searches the web to verify each citation"
                },
                {
                  step: "4",
                  title: "Get Results",
                  description: "Download detailed reports with accuracy metrics and visualizations"
                }
              ].map((item) => (
                <div key={item.step} className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-slate-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white mt-24">
          <div className="container max-w-6xl mx-auto px-4 py-8 text-center text-slate-600">
            <p>&copy; 2024 Law Review Verifier. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">Welcome, {user?.name}</span>
            <Link href="/dashboard">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Start Verifying Footnotes
            </h1>
            <p className="text-lg text-slate-600">
              Upload your document to begin the verification process
            </p>
          </div>

          {/* Upload Card */}
          <Card className="p-12 border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors bg-white">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileUp className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                Upload Your Document
              </h2>
              <p className="text-slate-600 mb-6">
                Drag and drop your Word (.docx) or PDF file here
              </p>
              <Link href="/upload">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Choose File
                </Button>
              </Link>
            </div>
          </Card>

          {/* Recent Documents */}
          <div className="mt-16">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Documents</h3>
            <Card className="p-8 border border-slate-200 text-center">
              <p className="text-slate-600">No documents yet. Upload your first document to get started.</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
