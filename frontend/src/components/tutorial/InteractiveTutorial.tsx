import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  HelpCircle, 
  Upload, 
  BarChart3, 
  MessageSquare, 
  FileText, 
  Zap,
  ChevronRight,
  Play,
  CheckCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOnboarding } from "@/hooks/useOnboarding";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action?: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  steps: TutorialStep[];
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'data-upload',
    title: 'Upload & Import Data',
    description: 'Learn how to upload CSV, Excel, or JSON files',
    icon: <Upload className="w-5 h-5" />,
    duration: '2 min',
    steps: [
      { id: '1', title: 'Navigate to Upload', description: 'Click on "Upload" in the sidebar' },
      { id: '2', title: 'Choose Your File', description: 'Drag & drop or click to select a CSV, Excel, or JSON file' },
      { id: '3', title: 'Preview Data', description: 'Your data will be parsed and shown in the preview' },
      { id: '4', title: 'Clean with AI', description: 'Click "AI Clean" to automatically fix data issues' },
    ]
  },
  {
    id: 'nlp-queries',
    title: 'Natural Language Queries',
    description: 'Ask questions about your data in plain English',
    icon: <Zap className="w-5 h-5" />,
    duration: '3 min',
    steps: [
      { id: '1', title: 'Open NLP Engine', description: 'Click on "NLP Engine" in the Analysis section' },
      { id: '2', title: 'Type Your Question', description: 'Ask something like "Show sales by region" or "What\'s the average revenue?"' },
      { id: '3', title: 'View Results', description: 'The AI will generate charts and insights automatically' },
      { id: '4', title: 'Refine Queries', description: 'Ask follow-up questions to drill deeper into your data' },
    ]
  },
  {
    id: 'visualizations',
    title: 'Create Visualizations',
    description: 'Build charts and dashboards from your data',
    icon: <BarChart3 className="w-5 h-5" />,
    duration: '4 min',
    steps: [
      { id: '1', title: 'Go to Dashboard', description: 'Click on "Dashboard" in the Visualize section' },
      { id: '2', title: 'Add Tiles', description: 'Click "Add Tile" to create new charts' },
      { id: '3', title: 'Configure Chart', description: 'Select chart type, data columns, and styling' },
      { id: '4', title: 'Arrange Layout', description: 'Drag tiles to rearrange your dashboard' },
      { id: '5', title: 'Export', description: 'Download as PDF or share with your team' },
    ]
  },
  {
    id: 'reports',
    title: 'Generate Reports',
    description: 'Create professional PDF reports with AI',
    icon: <FileText className="w-5 h-5" />,
    duration: '2 min',
    steps: [
      { id: '1', title: 'Open Report Generator', description: 'Click on "Report" in the Export section' },
      { id: '2', title: 'Choose Template', description: 'Select from 8 professional templates' },
      { id: '3', title: 'Customize Content', description: 'Add your charts, insights, and branding' },
      { id: '4', title: 'Download PDF', description: 'Generate and download your professional report' },
    ]
  },
  {
    id: 'chat',
    title: 'Chat with Your Data',
    description: 'Have a conversation with AI about your dataset',
    icon: <MessageSquare className="w-5 h-5" />,
    duration: '3 min',
    steps: [
      { id: '1', title: 'Open Chat', description: 'Click on "Chat" in the Export section' },
      { id: '2', title: 'Start Conversation', description: 'Type a question or request about your data' },
      { id: '3', title: 'Get Insights', description: 'AI will analyze and respond with insights' },
      { id: '4', title: 'Follow Up', description: 'Continue the conversation for deeper analysis' },
    ]
  },
];

interface TutorialCardProps {
  tutorial: Tutorial;
  onStart: () => void;
  isCompleted?: boolean;
}

const TutorialCard = ({ tutorial, onStart, isCompleted }: TutorialCardProps) => (
  <Card className="group cursor-pointer hover:border-primary/50 transition-all" onClick={onStart}>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {tutorial.icon}
        </div>
        {isCompleted && (
          <CheckCircle className="w-5 h-5 text-success" />
        )}
      </div>
      <CardTitle className="text-base mt-3">{tutorial.title}</CardTitle>
      <CardDescription className="text-sm">{tutorial.description}</CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{tutorial.duration}</span>
        <Button variant="ghost" size="sm" className="gap-1 group-hover:text-primary">
          Start <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

interface TutorialDetailProps {
  tutorial: Tutorial;
  onClose: () => void;
}

const TutorialDetail = ({ tutorial, onClose }: TutorialDetailProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {tutorial.icon}
        </div>
        <div>
          <h3 className="font-semibold">{tutorial.title}</h3>
          <p className="text-sm text-muted-foreground">{tutorial.steps.length} steps • {tutorial.duration}</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {tutorial.steps.map((step, index) => (
          <div 
            key={step.id}
            className={`flex gap-3 p-3 rounded-lg transition-all ${
              index === currentStep 
                ? 'bg-primary/10 border border-primary/30' 
                : index < currentStep 
                  ? 'bg-muted/50 opacity-60' 
                  : 'bg-muted/30'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              index < currentStep 
                ? 'bg-success text-success-foreground' 
                : index === currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
            }`}>
              {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)}>
              Previous
            </Button>
          )}
          {currentStep < tutorial.steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(prev => prev + 1)}>
              Next Step
            </Button>
          ) : (
            <Button onClick={onClose} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const InteractiveTutorial = () => {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { resetOnboarding } = useOnboarding();
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {selectedTutorial ? (
          <TutorialDetail 
            tutorial={selectedTutorial} 
            onClose={() => setSelectedTutorial(null)} 
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Help & Tutorials
              </DialogTitle>
              <DialogDescription>
                Learn how to use SpaceForge AI with step-by-step guides
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Quick Start */}
              <div 
                className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 cursor-pointer hover:border-primary/40 transition-all"
                onClick={() => {
                  setIsOpen(false);
                  resetOnboarding();
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Quick Start Tour</h3>
                    <p className="text-sm text-muted-foreground">Take a 1-minute guided tour of the platform</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              
              {/* Tutorials Grid */}
              <div className="grid sm:grid-cols-2 gap-3">
                {TUTORIALS.map(tutorial => (
                  <TutorialCard
                    key={tutorial.id}
                    tutorial={tutorial}
                    onStart={() => setSelectedTutorial(tutorial)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InteractiveTutorial;
