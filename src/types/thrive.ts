// Core Types for Thrive Campaign OS

export type ServiceType = 'film' | 'edit' | 'post' | 'report';

export type CampaignTemplate = 
  | 'film-only'
  | 'film-edit'
  | 'film-edit-post'
  | 'edit-only'
  | 'full-service';

export type ClientType = 'business' | 'influencer' | 'creator';

export type TaskStatus = 'pending' | 'in-progress' | 'review' | 'complete';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type PipelineStage = 
  | 'discovery'
  | 'pre-production'
  | 'filming'
  | 'editing'
  | 'review'
  | 'revisions'
  | 'posting'
  | 'reporting'
  | 'complete';

export type UserRole = 'owner' | 'editor' | 'videographer';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  category?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  assignee?: UserRole;
  clientId: string;
  campaignId: string;
  stage: PipelineStage;
  checklist?: ChecklistItem[];
  serviceType?: ServiceType;
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  avatar?: string;
  email?: string;
  enabledServices: ServiceType[];
  defaultChecklist: ChecklistItem[];
  createdAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  clientId: string;
  template: CampaignTemplate;
  currentStage: PipelineStage;
  stages: PipelineStage[];
  tasks: Task[];
  deliverables: Deliverable[];
  startDate: Date;
  dueDate?: Date;
}

export interface Deliverable {
  id: string;
  name: string;
  type: 'video' | 'image' | 'document' | 'report';
  status: 'pending' | 'in-progress' | 'ready' | 'delivered';
  campaignId: string;
}

export interface UnpaidAlert {
  id: string;
  clientId: string;
  clientName: string;
  servicePerformed: ServiceType;
  message: string;
  createdAt: Date;
  dismissed: boolean;
}

export interface DashboardStats {
  filmingToday: Task[];
  editsToReview: Task[];
  approvalsPending: Task[];
  contentToPost: Task[];
  clientsWaiting: Client[];
  unpaidAlerts: UnpaidAlert[];
}

// Template Configurations
export const SERVICE_TEMPLATES: Record<CampaignTemplate, {
  label: string;
  services: ServiceType[];
  stages: PipelineStage[];
}> = {
  'film-only': {
    label: 'Film Only',
    services: ['film'],
    stages: ['discovery', 'pre-production', 'filming', 'complete'],
  },
  'film-edit': {
    label: 'Film + Edit',
    services: ['film', 'edit'],
    stages: ['discovery', 'pre-production', 'filming', 'editing', 'review', 'revisions', 'complete'],
  },
  'film-edit-post': {
    label: 'Film + Edit + Post',
    services: ['film', 'edit', 'post'],
    stages: ['discovery', 'pre-production', 'filming', 'editing', 'review', 'revisions', 'posting', 'complete'],
  },
  'edit-only': {
    label: 'Edit Only',
    services: ['edit'],
    stages: ['discovery', 'editing', 'review', 'revisions', 'complete'],
  },
  'full-service': {
    label: 'Full Service',
    services: ['film', 'edit', 'post', 'report'],
    stages: ['discovery', 'pre-production', 'filming', 'editing', 'review', 'revisions', 'posting', 'reporting', 'complete'],
  },
};

export const CLIENT_TYPE_CHECKLISTS: Record<ClientType, ChecklistItem[]> = {
  business: [
    { id: 'b1', label: 'Lead CTA defined', checked: false, category: 'Strategy' },
    { id: 'b2', label: 'Brand guidelines reviewed', checked: false, category: 'Brand' },
    { id: 'b3', label: 'Brand colors confirmed', checked: false, category: 'Brand' },
    { id: 'b4', label: 'Logo assets received', checked: false, category: 'Brand' },
    { id: 'b5', label: 'Reporting metrics agreed', checked: false, category: 'Reporting' },
    { id: 'b6', label: 'Monthly report template set', checked: false, category: 'Reporting' },
  ],
  influencer: [
    { id: 'i1', label: 'Hook variations tested', checked: false, category: 'Content' },
    { id: 'i2', label: 'Trend alignment checked', checked: false, category: 'Content' },
    { id: 'i3', label: 'Posting cadence confirmed', checked: false, category: 'Schedule' },
    { id: 'i4', label: 'Platform priorities set', checked: false, category: 'Strategy' },
    { id: 'i5', label: 'Engagement goals defined', checked: false, category: 'Strategy' },
  ],
  creator: [
    { id: 'c1', label: 'Volume targets set', checked: false, category: 'Production' },
    { id: 'c2', label: 'Turnaround speed agreed', checked: false, category: 'Production' },
    { id: 'c3', label: 'Iteration process defined', checked: false, category: 'Workflow' },
    { id: 'c4', label: 'Batch filming scheduled', checked: false, category: 'Schedule' },
    { id: 'c5', label: 'Asset library organized', checked: false, category: 'Assets' },
  ],
};
