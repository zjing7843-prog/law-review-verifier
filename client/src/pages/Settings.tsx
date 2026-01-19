import { useState } from "react";
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

type LlmProvider = "manus" | "openai" | "anthropic";

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
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
    if (provider !== "manus" && !apiKey && !settings?.apiKey) {
      toast.error("API key is required for custom LLM providers");
      return;
    }

    saveMutation.mutate({
      provider,
      apiKey: apiKey || undefined, // Only send if changed
      modelName: modelName || undefined
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <p className="text-center text-slate-600">Please log in to access settings</p>
          <Button className="w-full mt-4" onClick={() => setLocation("/")}>
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

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
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-medium text-blue-900 mb-1">About LLM Configuration</p>
                <p>The citation categorization feature uses AI to automatically classify citations as cases, articles, or other types. You can choose to use the built-in Manus LLM (free for testing) or provide your own API key for OpenAI or Anthropic.</p>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">LLM Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as LlmProvider)}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manus">Manus LLM (Built-in, for testing)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT-4, GPT-3.5)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                </SelectContent>
              </Select>
              {provider === "manus" && (
                <p className="text-xs text-slate-500">
                  Uses the built-in Manus LLM. No API key required. Suitable for testing and demo purposes.
                </p>
              )}
            </div>

            {/* API Key (only for custom providers) */}
            {provider !== "manus" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder={settings?.apiKey ? "••••••••••••••••" : "Enter your API key"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    {provider === "openai" && "Get your API key from platform.openai.com"}
                    {provider === "anthropic" && "Get your API key from console.anthropic.com"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelName">Model Name (Optional)</Label>
                  <Input
                    id="modelName"
                    placeholder={provider === "openai" ? "e.g., gpt-4, gpt-3.5-turbo" : "e.g., claude-3-sonnet-20240229"}
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Leave empty to use the default model for the selected provider
                  </p>
                </div>
              </>
            )}

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
