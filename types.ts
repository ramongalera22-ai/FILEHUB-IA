
export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: string;
  vendor: string;
  description: string;
  isOptimized?: boolean;
  suggestedDate?: string;
  priority: 'low' | 'medium' | 'high';
  isRecurring?: boolean;
  frequency?: 'weekly' | 'monthly' | 'yearly';
}

export interface SharedExpense extends Expense {
  paidBy: string; // ID del usuario que pagó
  splitBetween: string[]; // IDs de los usuarios que comparten el gasto
}

export interface SharedDebt {
  id: string;
  from: string; // Quién debe
  to: string; // A quién debe
  amount: number;
  description: string;
  date: string;
  status: 'pending' | 'settled';
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  category: string;
  interestRate?: number;
  creditor?: string; // Person or entity owed
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
}

export interface Investment {
  id: string;
  name: string;
  amount: number; // Purchase Amount
  date: string; // Purchase Date
  status: 'active' | 'sold' | 'watched';
  category: 'stock' | 'crypto' | 'real_estate' | 'bond' | 'other';
  expectedReturn?: number;
  currentValue?: number;
  purchasePrice?: number; // per unit if applicable
  quantity?: number; // units held
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  budget: number;
  spent: number;
  deadline: string;
  tasks: Task[];
  notebookUrl?: string;
  status?: 'active' | 'completed' | 'on-hold';
  documents?: WorkDocument[];
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'brainstorming' | 'approved';
  createdAt: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  isActive: boolean;
  apiKey?: string;
}

export interface OpenNotebookConfig {
  baseUrl: string;
  collectionName: string;
  isActive: boolean;
  apiKey?: string;
}

export interface AnythingLLMConfig {
  baseUrl: string;
  apiKey: string;
  workspaceSlug?: string;
}

export interface OpenWebUIConfig {
  baseUrl: string;
  isActive: boolean;
}

export interface LocalLlmConfig {
  baseUrl: string;
  model: string;
  isActive: boolean;
  apiKey?: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  engine?: string;
}

export interface WorkDocument {
  id: string;
  name: string;
  type: 'word' | 'pptx' | 'pdf' | 'text';
  uploadDate: string;
  url?: string;
  content?: string; // For text documents
  chatHistory?: ChatMessage[];
}

export interface Slide {
  title: string;
  content: string[];
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  duration?: number;
  category: 'work' | 'personal' | 'finance' | 'fitness' | 'other';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  dependsOn?: string;
  isRecurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  partnership_id?: string;
}

export interface Course {
  id: string;
  title: string;
  platform: string;
  progress: number; // 0-100
  totalLessons: number;
  completedLessons: number;
  nextLessonDate?: string;
  category: string;
}

export interface Goal {
  id: string;
  title: string;
  targetDate: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  category: 'financial' | 'personal' | 'career' | 'health';
  status: 'active' | 'achieved' | 'paused';
  milestones?: { date: string; value: number; note: string }[];
  aiVisualizationUrl?: string; // URL to a generated chart/roadmap image or PDF
}

export interface Presentation {
  id: string;
  title: string;
  client: string;
  status: 'pending' | 'finished';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  slides?: Slide[];
  url?: string; // Link to visualize or download
}

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  expenses: Expense[];
  notebookUrl?: string;
  aiItinerary?: string; // Markdown generated itinerary
  whiteboardData?: string;
  bookings?: { type: 'flight' | 'hotel' | 'train'; ref: string; fileUrl?: string }[];
  notes?: string;
  partnership_id?: string;
}

export interface SharedDocument {
  id: string;
  partnership_id: string;
  user_id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
}

export interface Workout {
  id: string;
  type: string;
  duration: number;
  calories: number;
  date: string;
}

export interface TrainingSession {
  id: string;
  title: string;
  date: string;
  type: 'cardio' | 'strength' | 'flexibility' | 'sport';
  duration: number; // minutes
  intensity: 'low' | 'medium' | 'high';
  notes?: string;
  status: 'planned' | 'completed';
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  durationWeeks: number;
  sessions: TrainingSession[];
  source?: 'ai' | 'manual' | 'file';
}

export interface ShoppingItem {
  id: string;
  name: string;
  estimatedPrice: number;
  category: string;
  purchased: boolean;
  store?: string;
  isRecurring?: boolean;
}

export interface ShoppingOrder {
  id: string;
  store: string;
  date: string;
  total: number;
  status: 'pending' | 'shipped' | 'completed' | 'specialized';
  items: string[];
  trackingNumber?: string;
}

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  ingredients: string[];
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'expense' | 'project' | 'trip' | 'personal' | 'fitness' | 'work';
  source?: 'manual' | 'google' | 'outlook' | 'ai';
}

export interface CalendarSource {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'ical' | 'local';
  url?: string;
  color: string;
  active: boolean;
}

export interface AIAnalysisResult {
  summary: string;
  keyPoints: string[];
  suggestedActions: string[];
  category?: string;
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  date: string;
  category: 'document' | 'image' | 'video' | 'audio' | 'spreadsheet' | 'presentation' | 'other';
  tags: string[];
  url?: string;
  aiSummary?: string; // Legacy simple summary
  aiAnalysis?: AIAnalysisResult; // New structured analysis
}

export interface AppSettings {
  email: string;
  autoSummaries: boolean;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  note?: string;
}

export interface NutritionPlan {
  id: string;
  name: string;
  uploadDate: string;
  type: 'pdf' | 'image' | 'ai-generated'; // Added ai-generated
  url?: string;
  description?: string;
  meals?: Meal[];
  inventoryContext?: string; // User provided inventory for generation
}

export interface Partnership {
  id: string;
  user1_id: string;
  user2_id: string;
  partner_email?: string;
}

export interface SharedHubActivity {
  id: string;
  partnership_id: string;
  user_id: string;
  type: 'task' | 'note' | 'calendar' | 'expense';
  action: 'created' | 'updated' | 'deleted';
  content: any;
  created_at: string;
}

export interface HubSection {
  id: string;
  partnership_id: string;
  name: 'PISO BARCELONA' | 'ACTIVIDADES' | 'COMPRAS' | 'WORKHUB';
  notebookUrl?: string;
  openNotebookUrl?: string;
  boardContent?: string; // Synchronized writing board content
  whiteboardData?: string;
  documents?: SharedDocument[];
  created_at?: string;
  updated_at?: string;
}

export type ViewType = 'dashboard' | 'expenses' | 'calendar' | 'projects' | 'trips' | 'ai-coach' | 'fitness' | 'nutrition' | 'work' | 'tasks' | 'courses' | 'courses-sessions' | 'goals' | 'economy' | 'shopping' | 'qr' | 'ideas' | 'ai-hub' | 'settings' | 'shared-finances' | 'files' | 'shared-hub' | 'piso' | 'pisos-dashboard' | 'pisos-buscador' | 'jobs' | 'activities' | 'whiteboard' | 'notebook' | 'openwebui' | 'car-mode' | 'news' | 'supermarkets' | 'whatsapp-bot' | 'whatsapp-pisos' | 'vip-tasks' | 'shifts' | 'work-planner' | 'habits' | 'budget-alerts' | 'cron-jobs' | 'time-block' | 'whatsapp-inbox' | 'travel-planner' | 'travel-notebook' | 'patient-notes' | 'hangouts';

export interface BudgetAlert {
  id: string;
  category: string;
  limit: number;
  period: 'weekly' | 'monthly';
  notify: boolean;
}

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  color: string;
  goal: number;
  created_at: string;
  completions: string[];
  user_id?: string;
}

export interface VipTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'diario' | 'semanal' | 'mensual' | 'anual' | 'objetivo';
  due_date?: string;
  is_recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id?: string;
  pinned?: boolean;
  tags?: string[];
}
