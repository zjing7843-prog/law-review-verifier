import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, Share2, CheckCircle2, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface VerificationData {
  correct: number;
  incorrect: number;
  unsure: number;
  total: number;
  correctnessPercentage: number;
}

export default function Results() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const data: VerificationData = {
    correct: 42,
    incorrect: 5,
    unsure: 3,
    total: 50,
    correctnessPercentage: 84,
  };

  const chartData = [
    { name: "Correct", value: data.correct, fill: "#10b981" },
    { name: "Incorrect", value: data.incorrect, fill: "#ef4444" },
    { name: "Unsure", value: data.unsure, fill: "#f59e0b" },
  ];

  const trendData = [
    { month: "Jan", accuracy: 78 },
    { month: "Feb", accuracy: 81 },
    { month: "Mar", accuracy: 79 },
    { month: "Apr", accuracy: 84 },
    { month: "May", accuracy: 86 },
    { month: "Jun", accuracy: 84 },
  ];

  const categoryData = [
    { category: "Books", correct: 18, incorrect: 2, unsure: 1 },
    { category: "Journal Articles", correct: 15, incorrect: 2, unsure: 1 },
    { category: "Conference Papers", correct: 6, incorrect: 1, unsure: 1 },
    { category: "Reports", correct: 3, incorrect: 0, unsure: 0 },
  ];

  const handleExport = () => {
    toast.success("Results exported successfully");
  };

  const handleShare = () => {
    toast.success("Share link copied to clipboard");
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
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Verification Results</h1>
          <p className="text-slate-600">Interactive analysis of your footnote verification</p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border border-slate-200">
            <div className="text-sm text-slate-600 mb-1">Total Footnotes</div>
            <div className="text-3xl font-bold text-slate-900">{data.total}</div>
          </Card>
          <Card className="p-6 border border-green-200 bg-green-50">
            <div className="text-sm text-slate-600 mb-1">Correct</div>
            <div className="text-3xl font-bold text-green-600">{data.correct}</div>
          </Card>
          <Card className="p-6 border border-red-200 bg-red-50">
            <div className="text-sm text-slate-600 mb-1">Incorrect</div>
            <div className="text-3xl font-bold text-red-600">{data.incorrect}</div>
          </Card>
          <Card className="p-6 border border-blue-200 bg-blue-50">
            <div className="text-sm text-slate-600 mb-1">Correctness Rate</div>
            <div className="text-3xl font-bold text-blue-600">{data.correctnessPercentage}%</div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="distribution" className="data-[state=active]:bg-white">
              Distribution
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-white">
              Trends
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-white">
              By Category
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="p-8 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Verification Summary</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-4">Status Breakdown</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-600"></div>
                        <span className="text-slate-700">Correct Citations</span>
                      </div>
                      <span className="font-semibold text-slate-900">{data.correct}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-600"></div>
                        <span className="text-slate-700">Incorrect Citations</span>
                      </div>
                      <span className="font-semibold text-slate-900">{data.incorrect}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-600"></div>
                        <span className="text-slate-700">Unsure Citations</span>
                      </div>
                      <span className="font-semibold text-slate-900">{data.unsure}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-blue-600 mb-2">
                      {data.correctnessPercentage}%
                    </div>
                    <p className="text-slate-600">Overall Accuracy Rate</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <Card className="p-8 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Citation Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card className="p-8 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Accuracy Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ fill: "#2563eb", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card className="p-8 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Verification by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="correct" fill="#10b981" />
                  <Bar dataKey="incorrect" fill="#ef4444" />
                  <Bar dataKey="unsure" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Key Insights */}
        <Card className="mt-8 p-8 border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex gap-4">
            <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Key Insights</h3>
              <ul className="space-y-2 text-slate-700">
                <li>• Your verification accuracy of {data.correctnessPercentage}% is above the average</li>
                <li>• Journal articles have the highest verification success rate</li>
                <li>• Most errors are related to author name mismatches</li>
                <li>• Consider double-checking citations from 2024 onwards</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={() => setLocation("/")}
          >
            Back to Home
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setLocation("/upload")}
          >
            Verify Another Document
          </Button>
        </div>
      </div>
    </div>
  );
}
