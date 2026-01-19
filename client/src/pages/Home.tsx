import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [citations, setCitations] = useState("");

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
          <div className="text-sm text-slate-600">
            Citation Verification Tool
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Paste Your Citations
            </label>
            <Textarea
              value={citations}
              onChange={(e) => setCitations(e.target.value)}
              placeholder="Gilberto KK Leung, 'Medical manslaughter in Hong Kong: what now?' (2023) Hong Kong Med J 4, 4; Oliver Quick, 'Medical manslaughter – time for a rethink?' (2017) 85 (4) Medico-Legal J 173, 174.&#10;Smith, J. and Johnson, M., 'The Role of Artificial Intelligence in Modern Law' (2023) Tech Law Review 45, 67.&#10;Williams, A., 'Digital Rights and Privacy Protection' (2022) Cyber Law Journal 12, 34.&#10;..."
              className="min-h-[400px] font-mono text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
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
