import { cn } from "@/lib/utils";
import { ChecklistItem } from "@/types/thrive";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Scissors, Book, Wrench } from "lucide-react";
import { motion } from "framer-motion";

interface SOPPanelProps {
  role: 'editor' | 'videographer';
  className?: string;
}

const editorSOPs = [
  {
    id: 'e-sop-1',
    title: 'Receiving New Footage',
    steps: [
      'Check email/drive for new raw files',
      'Download to organized project folder',
      'Review footage for quality issues',
      'Log any missing shots to flag for reshoot',
      'Update task status to "In Progress"',
    ],
  },
  {
    id: 'e-sop-2',
    title: 'Edit Workflow',
    steps: [
      'Import footage into editing software',
      'Create rough cut matching shot list',
      'Add music and sync audio',
      'Color grade to brand guidelines',
      'Add captions and graphics',
      'Export in required formats',
    ],
  },
  {
    id: 'e-sop-3',
    title: 'Submitting for Review',
    steps: [
      'Export preview version',
      'Upload to review platform',
      'Add timestamp notes for client',
      'Move task to "Review" status',
      'Notify Brian for final check',
    ],
  },
];

const videographerSOPs = [
  {
    id: 'v-sop-1',
    title: 'Pre-Shoot Prep',
    steps: [
      'Review shot list and storyboard',
      'Charge all batteries',
      'Format memory cards',
      'Check lens kit and stabilizer',
      'Pack backup gear',
      'Confirm location and time with client',
    ],
  },
  {
    id: 'v-sop-2',
    title: 'On-Set Workflow',
    steps: [
      'Arrive 30 min early for setup',
      'Scout lighting conditions',
      'Set up main camera and audio',
      'Capture all shots on list',
      'Get B-roll variations',
      'Review critical shots on-site',
    ],
  },
  {
    id: 'v-sop-3',
    title: 'Post-Shoot',
    steps: [
      'Backup footage immediately',
      'Upload to shared drive',
      'Create shot log with timestamps',
      'Flag best takes',
      'Move task to "Complete"',
    ],
  },
];

const editorGearChecklist: ChecklistItem[] = [
  { id: 'eg-1', label: 'Editing software up to date', checked: false },
  { id: 'eg-2', label: 'Project template loaded', checked: false },
  { id: 'eg-3', label: 'Assets organized', checked: false },
  { id: 'eg-4', label: 'Client brand kit accessible', checked: false },
  { id: 'eg-5', label: 'Music library synced', checked: false },
];

const videographerGearChecklist: ChecklistItem[] = [
  { id: 'vg-1', label: 'Camera body', checked: false },
  { id: 'vg-2', label: 'Lenses (24-70, 50mm)', checked: false },
  { id: 'vg-3', label: 'Gimbal / stabilizer', checked: false },
  { id: 'vg-4', label: 'Microphone + recorder', checked: false },
  { id: 'vg-5', label: 'Batteries (x3)', checked: false },
  { id: 'vg-6', label: 'Memory cards (x4)', checked: false },
  { id: 'vg-7', label: 'Tripod', checked: false },
  { id: 'vg-8', label: 'Light kit', checked: false },
];

export function SOPPanel({ role, className }: SOPPanelProps) {
  const sops = role === 'editor' ? editorSOPs : videographerSOPs;
  const gearChecklist = role === 'editor' ? editorGearChecklist : videographerGearChecklist;

  return (
    <Card className={cn('luxury-card p-5', className)}>
      <Tabs defaultValue="sops">
        <TabsList className="mb-4">
          <TabsTrigger value="sops" className="gap-2">
            <Book className="h-4 w-4" />
            SOPs
          </TabsTrigger>
          <TabsTrigger value="gear" className="gap-2">
            <Wrench className="h-4 w-4" />
            {role === 'editor' ? 'Setup' : 'Gear'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sops" className="space-y-4">
          {sops.map((sop, index) => (
            <motion.div
              key={sop.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-border rounded-lg p-4"
            >
              <h4 className="font-display font-semibold mb-3">{sop.title}</h4>
              <ol className="space-y-2">
                {sop.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="gear">
          <div className="space-y-2">
            {gearChecklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-2 -mx-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
