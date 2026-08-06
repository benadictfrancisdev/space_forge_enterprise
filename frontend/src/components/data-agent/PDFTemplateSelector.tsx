import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, FileDown, Palette, Building2, Briefcase, GraduationCap, Heart, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
    text: [number, number, number];
    textLight: [number, number, number];
    background: [number, number, number];
    headerBg: [number, number, number];
  };
  style: "modern" | "classic" | "minimal" | "bold" | "elegant";
  fontStyle: "professional" | "casual" | "academic" | "creative";
}

export const PDF_TEMPLATES: PDFTemplate[] = [
  {
    id: "corporate-blue",
    name: "Corporate Blue",
    description: "Professional & trustworthy for business reports",
    icon: Building2,
    colors: {
      primary: [37, 99, 235],      // Blue-600
      secondary: [59, 130, 246],   // Blue-500
      accent: [147, 197, 253],     // Blue-300
      text: [30, 41, 59],          // Slate-800
      textLight: [100, 116, 139],  // Slate-500
      background: [248, 250, 252], // Slate-50
      headerBg: [37, 99, 235],     // Blue-600
    },
    style: "modern",
    fontStyle: "professional",
  },
  {
    id: "executive-dark",
    name: "Executive Dark",
    description: "Bold & authoritative for executive summaries",
    icon: Briefcase,
    colors: {
      primary: [15, 23, 42],       // Slate-900
      secondary: [51, 65, 85],     // Slate-700
      accent: [251, 191, 36],      // Amber-400
      text: [30, 41, 59],          // Slate-800
      textLight: [71, 85, 105],    // Slate-600
      background: [255, 255, 255], // White
      headerBg: [15, 23, 42],      // Slate-900
    },
    style: "bold",
    fontStyle: "professional",
  },
  {
    id: "modern-teal",
    name: "Modern Teal",
    description: "Fresh & innovative for tech/data reports",
    icon: Rocket,
    colors: {
      primary: [20, 184, 166],     // Teal-500
      secondary: [45, 212, 191],   // Teal-400
      accent: [94, 234, 212],      // Teal-300
      text: [17, 24, 39],          // Gray-900
      textLight: [107, 114, 128],  // Gray-500
      background: [240, 253, 250], // Teal-50
      headerBg: [20, 184, 166],    // Teal-500
    },
    style: "modern",
    fontStyle: "creative",
  },
  {
    id: "elegant-purple",
    name: "Elegant Purple",
    description: "Sophisticated & creative for presentations",
    icon: Palette,
    colors: {
      primary: [139, 92, 246],     // Violet-500
      secondary: [167, 139, 250],  // Violet-400
      accent: [221, 214, 254],     // Violet-200
      text: [30, 27, 75],          // Indigo-950
      textLight: [107, 114, 128],  // Gray-500
      background: [250, 245, 255], // Violet-50
      headerBg: [139, 92, 246],    // Violet-500
    },
    style: "elegant",
    fontStyle: "creative",
  },
  {
    id: "academic-green",
    name: "Academic Green",
    description: "Scholarly & detailed for research reports",
    icon: GraduationCap,
    colors: {
      primary: [22, 163, 74],      // Green-600
      secondary: [34, 197, 94],    // Green-500
      accent: [134, 239, 172],     // Green-300
      text: [20, 83, 45],          // Green-900
      textLight: [75, 85, 99],     // Gray-600
      background: [240, 253, 244], // Green-50
      headerBg: [22, 163, 74],     // Green-600
    },
    style: "classic",
    fontStyle: "academic",
  },
  {
    id: "warm-coral",
    name: "Warm Coral",
    description: "Friendly & approachable for team reports",
    icon: Heart,
    colors: {
      primary: [251, 113, 133],    // Rose-400
      secondary: [244, 63, 94],    // Rose-500
      accent: [254, 205, 211],     // Rose-200
      text: [55, 65, 81],          // Gray-700
      textLight: [107, 114, 128],  // Gray-500
      background: [255, 241, 242], // Rose-50
      headerBg: [244, 63, 94],     // Rose-500
    },
    style: "modern",
    fontStyle: "casual",
  },
  {
    id: "minimal-mono",
    name: "Minimal Mono",
    description: "Clean & distraction-free for detailed analysis",
    icon: FileDown,
    colors: {
      primary: [38, 38, 38],
      secondary: [64, 64, 64],
      accent: [163, 163, 163],
      text: [23, 23, 23],
      textLight: [115, 115, 115],
      background: [255, 255, 255],
      headerBg: [38, 38, 38],
    },
    style: "minimal",
    fontStyle: "professional",
  },
  {
    id: "sunset-gradient",
    name: "Sunset Gradient",
    description: "Vibrant & energetic for impactful presentations",
    icon: Rocket,
    colors: {
      primary: [249, 115, 22],
      secondary: [251, 146, 60],
      accent: [254, 215, 170],
      text: [67, 20, 7],
      textLight: [120, 53, 15],
      background: [255, 247, 237],
      headerBg: [234, 88, 12],
    },
    style: "bold",
    fontStyle: "creative",
  },
  {
    id: "financial-navy",
    name: "Financial Navy",
    description: "Authoritative navy & gold for financial reports",
    icon: Building2,
    colors: {
      primary: [15, 23, 42],
      secondary: [30, 58, 138],
      accent: [202, 138, 4],
      text: [15, 23, 42],
      textLight: [71, 85, 105],
      background: [248, 250, 252],
      headerBg: [15, 23, 42],
    },
    style: "classic",
    fontStyle: "professional",
  },
  {
    id: "healthcare-blue",
    name: "Healthcare Blue",
    description: "Soft blue & white for medical & health data",
    icon: Heart,
    colors: {
      primary: [14, 116, 144],
      secondary: [34, 211, 238],
      accent: [165, 243, 252],
      text: [21, 94, 117],
      textLight: [107, 114, 128],
      background: [236, 254, 255],
      headerBg: [14, 116, 144],
    },
    style: "modern",
    fontStyle: "professional",
  },
  {
    id: "startup-pitch",
    name: "Startup Pitch",
    description: "Bold gradient for pitch decks & investor reports",
    icon: Rocket,
    colors: {
      primary: [219, 39, 119],
      secondary: [236, 72, 153],
      accent: [251, 207, 232],
      text: [31, 41, 55],
      textLight: [107, 114, 128],
      background: [253, 242, 248],
      headerBg: [190, 24, 93],
    },
    style: "bold",
    fontStyle: "creative",
  },
  {
    id: "data-science",
    name: "Data Science",
    description: "Dark theme with neon accents for technical reports",
    icon: GraduationCap,
    colors: {
      primary: [34, 211, 238],
      secondary: [56, 189, 248],
      accent: [14, 165, 233],
      text: [30, 41, 59],
      textLight: [100, 116, 139],
      background: [240, 249, 255],
      headerBg: [15, 23, 42],
    },
    style: "modern",
    fontStyle: "academic",
  },
];

interface PDFTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: PDFTemplate) => void;
  selectedTemplateId?: string;
}

const PDFTemplateSelector = ({
  open,
  onOpenChange,
  onSelectTemplate,
  selectedTemplateId,
}: PDFTemplateSelectorProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [localSelectedId, setLocalSelectedId] = useState<string | undefined>(selectedTemplateId);

  const handleTemplateClick = (template: PDFTemplate) => {
    setLocalSelectedId(template.id);
  };

  const handleConfirmAndDownload = () => {
    const template = PDF_TEMPLATES.find((t) => t.id === localSelectedId);
    if (template) {
      onSelectTemplate(template);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Palette className="h-5 w-5 text-primary" />
            Choose PDF Template
          </DialogTitle>
          <DialogDescription>
            Select a color theme and style for your exported PDF report
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {PDF_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isSelected = localSelectedId === template.id;
            const isHovered = hoveredId === template.id;

            return (
              <Card
                key={template.id}
                className={cn(
                  "relative cursor-pointer transition-all duration-200 overflow-hidden group",
                  isSelected && "ring-2 ring-primary ring-offset-2",
                  isHovered && !isSelected && "ring-1 ring-primary/50"
                )}
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleTemplateClick(template)}
              >
                {/* Color Preview Header */}
                <div
                  className="h-16 flex items-center justify-center"
                  style={{
                    backgroundColor: `rgb(${template.colors.headerBg.join(",")})`,
                  }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Color Palette Preview */}
                <div className="flex h-2">
                  <div
                    className="flex-1"
                    style={{
                      backgroundColor: `rgb(${template.colors.primary.join(",")})`,
                    }}
                  />
                  <div
                    className="flex-1"
                    style={{
                      backgroundColor: `rgb(${template.colors.secondary.join(",")})`,
                    }}
                  />
                  <div
                    className="flex-1"
                    style={{
                      backgroundColor: `rgb(${template.colors.accent.join(",")})`,
                    }}
                  />
                </div>

                {/* Content */}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm">{template.name}</h3>
                    {isSelected && (
                      <div className="p-1 rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {template.style}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {template.fontStyle}
                    </Badge>
                  </div>
                </div>

                {/* Hover overlay */}
                {isHovered && !isSelected && (
                  <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                )}
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAndDownload}
            disabled={!localSelectedId}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export with Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFTemplateSelector;
