import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Settings as SettingsIcon, Save, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PasswordModal } from "@/components/PasswordModal";

type LlmProvider = "manus" | "openai" | "anthropic";

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isCodeAuthenticated, setIsCodeAuthenticated] = useState(false);
  
  // Check access code authentication on mount
  useEffect(() => {
    const authenticated = sessionStorage.getItem("app_authenticated") === "true";
    if (authenticated) {
      setIsCodeAuthenticated(true);
    } else {
      setShowPasswordModal(true);
    }
  }, []);
  
  // Fetch current settings
  const { data: settings, isLoading, refetch } = trpc.llm.getSettings.useQuery(undefined, {
    enabled: isAuthenticated
  });
  
  const [provider, setProvider] = useState<LlmProvider>("manus");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  
  const saveMutation = trpc.llm.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("LLM settings saved successfully");
      refetch();
      setApiKey(""); // Clear API key input for security
    },
    onError: (error: any) => {
      toast.error(`Failed to save settings: ${error.message}`);
    }
  });

  // Update local state when settings load
  useState(() => {
    if (settings) {
      setProvider(settings.provider as LlmProvider);
      setModelName(settings.modelName || "");
    }
  });

  const handleSave = () => {
    // Provider is auto-detected from API key format
    const detectedProvider = apiKey.startsWith('sk-ant-') ? 'anthropic' : 
                            apiKey.startsWith('sk-') ? 'openai' : 'manus';

    saveMutation.mutate({
      provider: detectedProvider,
      apiKey: apiKey || undefined, // Only send if changed
      modelName: modelName || undefined
    });
  };

  // Show access code modal if not authenticated
  if (!isCodeAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
          <Card className="p-8 max-w-md text-center">
            <p className="text-slate-600 mb-4">Access code required to view settings</p>
            <Button className="w-full" onClick={() => setShowPasswordModal(true)}>
              Enter Access Code
            </Button>
            <Button variant="outline" className="w-full mt-2" onClick={() => setLocation("/")}>
              Go to Home
            </Button>
          </Card>
        </div>
        <PasswordModal
          open={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setLocation("/");
          }}
          onSuccess={() => {
            setShowPasswordModal(false);
            setIsCodeAuthenticated(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Law Review Verifier</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => setLocation("/")}>
              ← Back to Home
            </Button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold">Settings</h1>
          </div>
          <p className="text-muted-foreground">Configure your LLM provider for citation categorization</p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">Enter your API key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={settings?.apiKey ? "••••••••••••••••" : "Paste your OpenAI or Anthropic API key here"}
                value={apiKey}
                onChange={(e) => {
                  const key = e.target.value;
                  setApiKey(key);
                  // Auto-detect provider from key format
                  if (key.startsWith('sk-ant-')) {
                    setProvider('anthropic');
                  } else if (key.startsWith('sk-')) {
                    setProvider('openai');
                  } else if (!key) {
                    setProvider('manus');
                  }
                }}
              />
              <p className="text-xs text-slate-500">
                System will auto-detect provider (OpenAI or Anthropic) from your key format. Leave empty to use built-in Manus LLM for testing.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name (Optional)</Label>
              <Input
                id="modelName"
                placeholder="e.g., gpt-4, claude-3-sonnet-20240229"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Leave empty to use the default model for the detected provider
              </p>
            </div>

            {/* Current Settings Display */}
            {settings && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-slate-700">Current Settings</p>
                <div className="text-sm text-slate-600 space-y-1">
                  <p><span className="font-medium">Provider:</span> {settings.provider}</p>
                  {settings.apiKey && <p><span className="font-medium">API Key:</span> Configured ✓</p>}
                  {settings.modelName && <p><span className="font-medium">Model:</span> {settings.modelName}</p>}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saveMutation.isPending}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
