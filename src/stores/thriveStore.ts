import { create } from 'zustand';
import { 
  Client, 
  Campaign, 
  Task, 
  UnpaidAlert, 
  UserRole,
  CLIENT_TYPE_CHECKLISTS,
  SERVICE_TEMPLATES,
  CampaignTemplate,
  ClientType,
  ServiceType,
  PipelineStage,
  TaskStatus,
  TaskPriority
} from '@/types/thrive';

interface ThriveState {
  currentRole: UserRole;
  clients: Client[];
  campaigns: Campaign[];
  unpaidAlerts: UnpaidAlert[];
  
  // Actions
  setCurrentRole: (role: UserRole) => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'defaultChecklist'> & { type: ClientType }) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  createCampaign: (clientId: string, template: CampaignTemplate, name: string) => Campaign;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  updateCampaignStage: (campaignId: string, stage: PipelineStage) => void;
  
  addTask: (task: Omit<Task, 'id'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  
  checkUnpaidWork: (clientId: string, servicePerformed: ServiceType) => void;
  dismissAlert: (alertId: string) => void;
  
  // Getters
  getClientById: (id: string) => Client | undefined;
  getCampaignById: (id: string) => Campaign | undefined;
  getTasksForRole: (role: UserRole) => Task[];
  getTodaysTasks: () => Task[];
  getTasksToReview: () => Task[];
  getPendingApprovals: () => Task[];
  getContentToPost: () => Task[];
}

// Sample data
const sampleClients: Client[] = [
  {
    id: 'client-1',
    name: 'Apex Fitness Studio',
    type: 'business',
    email: 'contact@apexfitness.com',
    enabledServices: ['film', 'edit', 'post'],
    defaultChecklist: CLIENT_TYPE_CHECKLISTS.business,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'client-2',
    name: 'Sarah Chen',
    type: 'influencer',
    email: 'sarah@influence.co',
    enabledServices: ['film', 'edit'],
    defaultChecklist: CLIENT_TYPE_CHECKLISTS.influencer,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'client-3',
    name: 'Marcus Thompson',
    type: 'creator',
    email: 'marcus@creators.io',
    enabledServices: ['edit'],
    defaultChecklist: CLIENT_TYPE_CHECKLISTS.creator,
    createdAt: new Date('2024-02-20'),
  },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const sampleCampaigns: Campaign[] = [
  {
    id: 'campaign-1',
    name: 'Q1 Promo Series',
    clientId: 'client-1',
    template: 'film-edit-post',
    currentStage: 'filming',
    stages: SERVICE_TEMPLATES['film-edit-post'].stages,
    tasks: [],
    deliverables: [],
    startDate: new Date('2024-01-20'),
    dueDate: new Date('2024-03-15'),
  },
  {
    id: 'campaign-2',
    name: 'Product Launch',
    clientId: 'client-2',
    template: 'film-edit',
    currentStage: 'editing',
    stages: SERVICE_TEMPLATES['film-edit'].stages,
    tasks: [],
    deliverables: [],
    startDate: new Date('2024-02-10'),
    dueDate: new Date('2024-03-01'),
  },
];

const sampleTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Film gym walkthrough',
    description: 'Capture B-roll of new equipment and member testimonials',
    status: 'pending',
    priority: 'high',
    dueDate: today,
    assignee: 'videographer',
    clientId: 'client-1',
    campaignId: 'campaign-1',
    stage: 'filming',
    serviceType: 'film',
    checklist: [
      { id: 't1-1', label: 'Scout location', checked: true },
      { id: 't1-2', label: 'Gear packed', checked: false },
      { id: 't1-3', label: 'Shot list ready', checked: true },
    ],
  },
  {
    id: 'task-2',
    title: 'Edit product reveal video',
    description: 'First cut with music and captions',
    status: 'in-progress',
    priority: 'high',
    dueDate: today,
    assignee: 'editor',
    clientId: 'client-2',
    campaignId: 'campaign-2',
    stage: 'editing',
    serviceType: 'edit',
    checklist: [
      { id: 't2-1', label: 'Import footage', checked: true },
      { id: 't2-2', label: 'Rough cut', checked: true },
      { id: 't2-3', label: 'Add music', checked: false },
      { id: 't2-4', label: 'Color grade', checked: false },
    ],
  },
  {
    id: 'task-3',
    title: 'Review testimonial edit',
    description: 'Client requested changes to intro',
    status: 'review',
    priority: 'medium',
    dueDate: tomorrow,
    assignee: 'owner',
    clientId: 'client-1',
    campaignId: 'campaign-1',
    stage: 'review',
    serviceType: 'edit',
  },
  {
    id: 'task-4',
    title: 'Post week 3 content',
    description: 'Schedule across Instagram and TikTok',
    status: 'pending',
    priority: 'medium',
    dueDate: tomorrow,
    assignee: 'owner',
    clientId: 'client-1',
    campaignId: 'campaign-1',
    stage: 'posting',
    serviceType: 'post',
  },
  {
    id: 'task-5',
    title: 'Batch edit creator shorts',
    description: '5 videos for weekly content',
    status: 'pending',
    priority: 'high',
    dueDate: today,
    assignee: 'editor',
    clientId: 'client-3',
    campaignId: 'campaign-1',
    stage: 'editing',
    serviceType: 'edit',
  },
];

const sampleAlerts: UnpaidAlert[] = [
  {
    id: 'alert-1',
    clientId: 'client-3',
    clientName: 'Marcus Thompson',
    servicePerformed: 'post',
    message: 'You posted content for Marcus, but Posting is not in their service package.',
    createdAt: new Date(),
    dismissed: false,
  },
];

export const useThriveStore = create<ThriveState>((set, get) => ({
  currentRole: 'owner',
  clients: sampleClients,
  campaigns: sampleCampaigns.map(c => ({
    ...c,
    tasks: sampleTasks.filter(t => t.campaignId === c.id),
  })),
  unpaidAlerts: sampleAlerts,

  setCurrentRole: (role) => set({ currentRole: role }),

  addClient: (clientData) => {
    const newClient: Client = {
      ...clientData,
      id: `client-${Date.now()}`,
      defaultChecklist: CLIENT_TYPE_CHECKLISTS[clientData.type],
      createdAt: new Date(),
    };
    set((state) => ({ clients: [...state.clients, newClient] }));
    return newClient;
  },

  updateClient: (id, updates) => {
    set((state) => ({
      clients: state.clients.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  deleteClient: (id) => {
    set((state) => ({
      clients: state.clients.filter((c) => c.id !== id),
    }));
  },

  createCampaign: (clientId, template, name) => {
    const templateConfig = SERVICE_TEMPLATES[template];
    const newCampaign: Campaign = {
      id: `campaign-${Date.now()}`,
      name,
      clientId,
      template,
      currentStage: templateConfig.stages[0],
      stages: templateConfig.stages,
      tasks: [],
      deliverables: [],
      startDate: new Date(),
    };
    set((state) => ({ campaigns: [...state.campaigns, newCampaign] }));
    return newCampaign;
  },

  updateCampaign: (id, updates) => {
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  updateCampaignStage: (campaignId, stage) => {
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === campaignId ? { ...c, currentStage: stage } : c
      ),
    }));
  },

  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
    };
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === taskData.campaignId
          ? { ...c, tasks: [...c.tasks, newTask] }
          : c
      ),
    }));
    return newTask;
  },

  updateTask: (id, updates) => {
    set((state) => ({
      campaigns: state.campaigns.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })),
    }));
  },

  toggleChecklistItem: (taskId, itemId) => {
    set((state) => ({
      campaigns: state.campaigns.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                checklist: t.checklist?.map((item) =>
                  item.id === itemId ? { ...item, checked: !item.checked } : item
                ),
              }
            : t
        ),
      })),
    }));
  },

  checkUnpaidWork: (clientId, servicePerformed) => {
    const client = get().clients.find((c) => c.id === clientId);
    if (!client) return;

    if (!client.enabledServices.includes(servicePerformed)) {
      const serviceLabels: Record<ServiceType, string> = {
        film: 'Filming',
        edit: 'Editing',
        post: 'Posting',
        report: 'Reporting',
      };

      const newAlert: UnpaidAlert = {
        id: `alert-${Date.now()}`,
        clientId,
        clientName: client.name,
        servicePerformed,
        message: `You performed ${serviceLabels[servicePerformed]} for ${client.name}, but it's not in their service package.`,
        createdAt: new Date(),
        dismissed: false,
      };

      set((state) => ({
        unpaidAlerts: [...state.unpaidAlerts, newAlert],
      }));
    }
  },

  dismissAlert: (alertId) => {
    set((state) => ({
      unpaidAlerts: state.unpaidAlerts.map((a) =>
        a.id === alertId ? { ...a, dismissed: true } : a
      ),
    }));
  },

  getClientById: (id) => get().clients.find((c) => c.id === id),

  getCampaignById: (id) => get().campaigns.find((c) => c.id === id),

  getTasksForRole: (role) => {
    const allTasks = get().campaigns.flatMap((c) => c.tasks);
    if (role === 'owner') return allTasks;
    return allTasks.filter((t) => t.assignee === role);
  },

  getTodaysTasks: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return get()
      .campaigns.flatMap((c) => c.tasks)
      .filter((t) => {
        if (!t.dueDate) return false;
        const taskDate = new Date(t.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= today && taskDate < tomorrow;
      });
  },

  getTasksToReview: () => {
    return get()
      .campaigns.flatMap((c) => c.tasks)
      .filter((t) => t.status === 'review');
  },

  getPendingApprovals: () => {
    return get()
      .campaigns.flatMap((c) => c.tasks)
      .filter((t) => t.stage === 'review' && t.status !== 'complete');
  },

  getContentToPost: () => {
    return get()
      .campaigns.flatMap((c) => c.tasks)
      .filter((t) => t.stage === 'posting' && t.status !== 'complete');
  },
}));
