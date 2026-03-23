import { useState } from "react";
import { useCreateClientOnboarding, useUpdateClientOnboarding } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  fields: {
    key: string;
    label: string;
    type: "text" | "textarea" | "checkbox" | "checkboxgroup";
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
  }[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "project-overview",
    title: "Project Overview",
    description: "Tell us about your project goals and vision",
    fields: [
      {
        key: "project_name",
        label: "Project Name",
        type: "text",
        placeholder: "e.g., Summer Campaign 2024",
        required: true,
      },
      {
        key: "project_description",
        label: "Project Description",
        type: "textarea",
        placeholder: "Describe your project, goals, and key messages...",
        required: true,
      },
      {
        key: "target_audience",
        label: "Target Audience",
        type: "text",
        placeholder: "e.g., 18-35 year old professionals",
      },
    ],
  },
  {
    id: "deliverables",
    title: "Deliverables",
    description: "What content do you need created?",
    fields: [
      {
        key: "deliverables",
        label: "Content Types",
        type: "checkboxgroup",
        options: [
          { label: "Promotional Video", value: "promo_video" },
          { label: "Social Media Reels", value: "reels" },
          { label: "Product Photos", value: "photos" },
          { label: "Testimonial Videos", value: "testimonials" },
          { label: "Blog Graphics", value: "graphics" },
          { label: "Email Campaign", value: "email" },
          { label: "Website Assets", value: "website" },
          { label: "Performance Report", value: "report" },
        ],
      },
    ],
  },
  {
    id: "timeline",
    title: "Timeline & Budget",
    description: "When do you need this completed?",
    fields: [
      {
        key: "start_date",
        label: "Project Start Date",
        type: "text",
        placeholder: "YYYY-MM-DD",
      },
      {
        key: "due_date",
        label: "Project Due Date",
        type: "text",
        placeholder: "YYYY-MM-DD",
        required: true,
      },
      {
        key: "budget_range",
        label: "Budget Range",
        type: "text",
        placeholder: "e.g., $5,000 - $10,000",
      },
    ],
  },
  {
    id: "brand-guidelines",
    title: "Brand Guidelines",
    description: "Help us maintain brand consistency",
    fields: [
      {
        key: "brand_colors",
        label: "Brand Colors",
        type: "text",
        placeholder: "e.g., Primary: #FF6B35, Secondary: #004E89",
      },
      {
        key: "brand_voice",
        label: "Brand Voice & Tone",
        type: "textarea",
        placeholder: "Describe your brand personality and communication style...",
      },
      {
        key: "brand_assets",
        label: "Brand Assets Provided",
        type: "checkboxgroup",
        options: [
          { label: "Logo Files", value: "logo" },
          { label: "Brand Guidelines Document", value: "guidelines" },
          { label: "Product Samples", value: "samples" },
          { label: "Previous Campaign Examples", value: "examples" },
        ],
      },
    ],
  },
  {
    id: "approval-process",
    title: "Approval Process",
    description: "How should we handle reviews and revisions?",
    fields: [
      {
        key: "approval_contact",
        label: "Primary Approval Contact",
        type: "text",
        placeholder: "Name and email",
      },
      {
        key: "revision_rounds",
        label: "Included Revision Rounds",
        type: "text",
        placeholder: "e.g., 2 rounds of revisions",
      },
      {
        key: "approval_preferences",
        label: "Approval Preferences",
        type: "checkboxgroup",
        options: [
          { label: "Email Updates", value: "email" },
          { label: "Weekly Check-ins", value: "weekly" },
          { label: "Slack Integration", value: "slack" },
          { label: "Client Portal Access", value: "portal" },
        ],
      },
    ],
  },
];

interface ClientOnboardingWizardProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function ClientOnboardingWizard({
  client,
  isOpen,
  onClose,
  onComplete,
}: ClientOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const createOnboarding = useCreateClientOnboarding();
  const updateOnboarding = useUpdateClientOnboarding();

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckboxGroupChange = (key: string, value: string, checked: boolean) => {
    setFormData((prev) => {
      const current = prev[key] || [];
      return {
        ...prev,
        [key]: checked ? [...current, value] : current.filter((v: string) => v !== value),
      };
    });
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await createOnboarding.mutateAsync({
        client_id: client.id,
        requirements: formData,
      });
      toast.success("Client onboarding completed!");
      onComplete?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 shrink-0 border-b border-border">
          <DialogTitle className="font-display text-2xl">
            Onboarding: {client.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </p>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <h3 className="font-display text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>

            <div className="space-y-4">
              {step.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {field.type === "text" && (
                    <Input
                      id={field.key}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ""}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    />
                  )}

                  {field.type === "textarea" && (
                    <Textarea
                      id={field.key}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ""}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      rows={4}
                    />
                  )}

                  {field.type === "checkboxgroup" && (
                    <div className="space-y-2">
                      {field.options?.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${field.key}-${option.value}`}
                            checked={(formData[field.key] || []).includes(option.value)}
                            onCheckedChange={(checked) =>
                              handleCheckboxGroupChange(field.key, option.value, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`${field.key}-${option.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-card/50 p-6 flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleComplete}
              disabled={createOnboarding.isPending}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {createOnboarding.isPending ? "Completing..." : "Complete Onboarding"}
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
