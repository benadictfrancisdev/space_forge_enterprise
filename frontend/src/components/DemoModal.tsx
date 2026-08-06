import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, Table, Sparkles, BarChart3, MessageSquare, FileText, Zap, Layers, Radio, Activity, LayoutDashboard, ArrowRight, CheckCircle2 } from "lucide-react";

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    icon: Upload,
    title: "1. Upload Your Data",
    description: "Start by uploading your CSV, Excel, or JSON file. Our AI instantly processes and validates your data for quality.",
    tips: ["Supports CSV, XLSX, JSON formats", "Max 10MB file size", "Auto-detects column types"],
  },
  {
    icon: Sparkles,
    title: "2. AI Data Cleaning",
    description: "Our intelligent AI agent automatically detects and fixes data quality issues like missing values, duplicates, and inconsistencies.",
    tips: ["Auto-fills missing values", "Removes duplicates", "Standardizes formats"],
  },
  {
    icon: Zap,
    title: "3. Natural Language Queries",
    description: "Ask questions about your data in plain English. Our NLP engine understands context and provides accurate insights.",
    tips: ["Ask \"What are the trends?\"", "Request specific analysis", "Get chart recommendations"],
  },
  {
    icon: Layers,
    title: "4. Power BI Dashboards",
    description: "Generate professional Power BI-style dashboards automatically with KPIs, charts, and interactive visualizations.",
    tips: ["Auto-generated KPIs", "Multiple chart types", "Real-time updates"],
  },
  {
    icon: BarChart3,
    title: "5. Advanced Analytics",
    description: "Dive deep with statistical analysis, correlation discovery, and pattern recognition powered by AI.",
    tips: ["Statistical summaries", "Trend analysis", "Anomaly detection"],
  },
  {
    icon: Activity,
    title: "6. Predictive Insights",
    description: "Leverage machine learning to forecast trends, predict outcomes, and uncover hidden patterns in your data.",
    tips: ["Trend forecasting", "Risk assessment", "Opportunity detection"],
  },
  {
    icon: MessageSquare,
    title: "7. Chat with Your Data",
    description: "Have natural conversations with your data. Ask follow-up questions and explore insights interactively.",
    tips: ["Contextual responses", "Follow-up questions", "Export conversations"],
  },
  {
    icon: FileText,
    title: "8. Generate Reports",
    description: "Export professional PDF reports with executive summaries, visualizations, and actionable recommendations.",
    tips: ["PDF export", "Custom branding", "Share with stakeholders"],
  },
];

const DemoModal = ({ open, onOpenChange }: DemoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4 border-b border-border">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-bold">
            How to Use <span className="gradient-text">SpaceForge AI</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Transform your raw data into actionable insights in minutes with our AI-powered analytics platform.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index}
                className="group relative p-5 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {step.tips.map((tip, tipIndex) => (
                        <Badge 
                          key={tipIndex} 
                          variant="secondary" 
                          className="text-xs font-normal gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-success" />
                          {tip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Close
          </Button>
          <Button 
            onClick={() => {
              onOpenChange(false);
              window.location.href = "/data-agent";
            }}
            className="flex-1 gap-2"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoModal;