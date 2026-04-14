
import React, { useState, useEffect, useRef } from 'react';
import { ViewType, Expense, Project, Trip, CalendarEvent, Goal, Task, ShoppingItem, ShoppingOrder, Idea, OllamaConfig, OpenNotebookConfig, AnythingLLMConfig, OpenWebUIConfig, LocalLlmConfig, Debt, Investment, Presentation, SharedExpense, SharedDebt, StoredFile, WeightEntry, NutritionPlan, TrainingSession, TrainingPlan, Partnership, WorkDocument } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ExpenseTracker from './components/ExpenseTracker';
import AICoach from './components/AICoach';
import ProjectManager from './components/ProjectManager';
import FitnessView from './components/FitnessView';
import NutritionView from './components/NutritionView';
import WorkView from './components/WorkView';
import TasksView from './components/TasksView';
import LearningView from './components/LearningView';
import GoalsView from './components/GoalsView';
import IdeasView from './components/IdeasView';
import PartnerHubView from './components/PartnerHubView';
import AIHubView from './components/AIHubView';
import CalendarView from './components/CalendarView';
import EconomyView from './components/EconomyView';
import TripsView from './components/TripsView';
import ShoppingView from './components/ShoppingView';
import QRView from './components/QRView';
import SettingsView from './components/SettingsView';
import SharedFinancesView from './components/SharedFinancesView';
import AuthView from './components/AuthView';
import FilesView from './components/FilesView';
import NotebookView from './components/NotebookView';
import FilePreviewModal from './components/FilePreviewModal';
import WhatsAppBotView from './components/WhatsAppBotView';
import VipTasksView from './components/VipTasksView';
import ShiftsCalendarView from './components/ShiftsCalendarView';
import FloatingCalendar from './components/FloatingCalendar';
import FloatingAgenda from './components/FloatingAgenda';
import { SHIFTER_EVENTS } from './data/shifterEvents';
import { PENDING_TASKS } from './data/pendingTasks';
import FloatingTaskAssistant from './components/FloatingTaskAssistant';
import WorkPlannerView from './components/WorkPlannerView';
import HabitsView from './components/HabitsView';
import BudgetAlertsView from './components/BudgetAlertsView';
import TravelPlannerView from './components/TravelPlannerView';
import TravelNotebookView from './components/TravelNotebookView';
import JobsView from './components/JobsView';
import RealEstateView from './components/RealEstateView';
import PisosDashboardView from './components/PisosDashboardView';
import PisosBuscadorView from './components/PisosBuscadorView';
import CoursesSessionsView from './components/CoursesSessionsView';
import VoiceNotesView from './components/VoiceNotesView';
import WhatsAppPisosView from './components/WhatsAppPisosView';
import CarPlayView from './components/CarPlayView';
import NewsView from './components/NewsView';
import SupermarketsView from './components/SupermarketsView';
import OpenWebUIView from './components/OpenWebUIView';
import MonthlyAnalysisView from './components/MonthlyAnalysisView';
import NotebookAIView from './components/NotebookAIView';
import PatientNotesView from './components/PatientNotesView';
import HangoutsView from './components/HangoutsView';
import ActivitiesView from './components/ActivitiesView';
import CronJobsView from './components/CronJobsView';
import TimeBlockView from './components/TimeBlockView';
import WhatsAppInboxView from './components/WhatsAppInboxView';
import { processUniversalDocument } from './services/openrouterService';
import { supabase } from './services/supabaseClient';
import { initCloudSync, enableAutoSync, forceSyncAll } from './services/cloudSync';
import { dbService } from './services/databaseService';
import {
  Search,
  Bell,
  X,
  FileText,
  Sparkles,
  Menu,
  Receipt,
  Database,
  User,
  Moon,
  Sun,
  RefreshCw,
  Wifi
} from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // App Data State
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  // Cloud Synced State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    { id: 'march-2-2026', title: 'Guardia', start: '2026-03-02', end: '2026-03-02', type: 'work', source: 'manual' },
    { id: 'march-5-2026', title: 'Inferior', start: '2026-03-05', end: '2026-03-05', type: 'work', source: 'manual' },
    { id: 'march-11-2026', title: 'Inferior', start: '2026-03-11', end: '2026-03-11', type: 'work', source: 'manual' },
    { id: 'march-26-2026', title: 'Inferior', start: '2026-03-26', end: '2026-03-26', type: 'work', source: 'manual' },
    { id: 'march-29-2026', title: 'Guardia', start: '2026-03-29', end: '2026-03-29', type: 'work', source: 'manual' },
  ]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);

  // Fully Synced now
  const [debts, setDebts] = useState<Debt[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [shoppingOrders, setShoppingOrders] = useState<ShoppingOrder[]>([]);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [sharedDebts, setSharedDebts] = useState<SharedDebt[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);

  // Private Notebook State
  const [privateNotes, setPrivateNotes] = useState<string>(`***

### **HOJA DE RUTA: BARCELONA 2025 (Sanidad + Transporte + Vivienda)**

#### **1. El Veredicto: Las 2 Mejores Opciones**
* **La Opción Racional (Equilibrio Calidad/Precio): TERRASSA**
    * **Transporte:** Excelente. Red **FGC S1** (funciona como un metro).
    * **Vivienda:** Amplia y asequible (**200.000€ - 260.000€** por ~100m²).
    * **Sanidad:** Hospital Mútua Terrassa (Digestivo con carga media-baja) y CAP Sant Llàtzer.`);
  const [privateDocuments, setPrivateDocuments] = useState<WorkDocument[]>([]);

  // New Synced States for Fitness
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);

  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [isDBReady, setIsDBReady] = useState(false);
  const [cloudSyncKey, setCloudSyncKey] = useState(0);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [hubTab, setHubTab] = useState<string>('dashboard');

  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(() => {
    const savedConfig = localStorage.getItem('filehub_ollama_config_v2');
    return savedConfig ? JSON.parse(savedConfig) : {
      baseUrl: import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434',
      model: import.meta.env.VITE_OLLAMA_MODEL || 'llama3',
      isActive: true,
      apiKey: import.meta.env.VITE_OLLAMA_API_KEY || ''
    };
  });

  const [openNotebookConfig, setOpenNotebookConfig] = useState<OpenNotebookConfig>({
    baseUrl: 'http://localhost:8000',
    collectionName: 'my-docs',
    isActive: true,
    apiKey: import.meta.env.VITE_OPEN_NOTEBOOK_API_KEY || ''
  });

  const [anythingLLMConfig, setAnythingLLMConfig] = useState<AnythingLLMConfig>(() => {
    const savedConfig = localStorage.getItem('filehub_anything_config');
    return savedConfig ? JSON.parse(savedConfig) : {
      baseUrl: import.meta.env.VITE_ANYTHING_LLM_URL || 'https://nucbox-g10.tail3a7cac.ts.net:10000/api/v1',
      apiKey: import.meta.env.VITE_ANYTHING_LLM_API_KEY || '',
      workspaceSlug: 'filehub-ia'
    };
  });

  const [openWebUIConfig, setOpenWebUIConfig] = useState<OpenWebUIConfig>(() => {
    const savedConfig = localStorage.getItem('filehub_openwebui_config');
    let config = savedConfig ? JSON.parse(savedConfig) : {
      baseUrl: import.meta.env.VITE_OPEN_WEBUI_URL || 'http://localhost:3000',
      isActive: true
    };

    // AUTO-FIX AGRESIVO: Si tenemos URL de Cloudflare (HTTPS), USARLA SIEMPRE. Ignorar localStorage si es necesario.
    const envUrl = import.meta.env.VITE_OPEN_WEBUI_URL;
    if (envUrl && envUrl.includes('trycloudflare')) {
      console.log("🔒 Enforcing Cloudflare Secure Tunnel URL");
      config.baseUrl = envUrl;
    }
    // Fallback: Si estamos en HTTPS y la config guardada es HTTP antigua
    else if (typeof window !== 'undefined' && window.location.protocol === 'https:' && config.baseUrl.startsWith('http:') && envUrl?.startsWith('https:')) {
      config.baseUrl = envUrl;
    }

    return config;
  });

  const [localLlmConfig, setLocalLlmConfig] = useState<LocalLlmConfig>(() => {
    const savedConfig = localStorage.getItem('filehub_local_llm_config');
    return savedConfig ? JSON.parse(savedConfig) : {
      baseUrl: import.meta.env.VITE_LOCAL_LLM_URL || 'http://localhost:1234/v1',
      model: import.meta.env.VITE_LOCAL_LLM_MODEL || 'local-model',
      isActive: true,
      apiKey: ''
    };
  });


  const scanInputRef = useRef<HTMLInputElement>(null);

  // Check Supabase Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      try {
        setSession(session);
        if (session?.user) {
          setIsAuthenticated(true);
          setCurrentUser(session?.user?.email || null);
          syncProfile(session?.user);
          loadCloudData(session?.user?.id);
          initCloudSync(session.user.id);
          enableAutoSync();
        }
      } catch (e) { console.warn('getSession error:', e); }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        setSession(session);
        if (session?.user) {
          setIsAuthenticated(true);
          setCurrentUser(session?.user?.email || null);
          syncProfile(session?.user);
          loadCloudData(session?.user?.id);
          initCloudSync(session.user.id);
          enableAutoSync();
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (e) {
        console.warn('Auth state change error:', e);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Force re-mount all components when cloud sync loads data
  useEffect(() => {
    const handler = () => {
      console.log('☁️ Cloud data ready — refreshing components');
      setCloudSyncKey(k => k + 1);
    };
    window.addEventListener('filehub_cloud_ready', handler);
    return () => window.removeEventListener('filehub_cloud_ready', handler);
  }, []);

  // Persist Configs
  useEffect(() => {
    localStorage.setItem('filehub_ollama_config_v2', JSON.stringify(ollamaConfig));
  }, [ollamaConfig]);

  useEffect(() => {
    localStorage.setItem('filehub_anything_config', JSON.stringify(anythingLLMConfig));
  }, [anythingLLMConfig]);

  useEffect(() => {
    localStorage.setItem('filehub_openwebui_config', JSON.stringify(openWebUIConfig));
  }, [openWebUIConfig]);

  useEffect(() => {
    localStorage.setItem('filehub_local_llm_config', JSON.stringify(localLlmConfig));
  }, [localLlmConfig]);

  useEffect(() => {
    localStorage.setItem('filehub_local_llm_config', JSON.stringify(localLlmConfig));
  }, [localLlmConfig]);


  // Theme Handling
  useEffect(() => {
    const savedTheme = localStorage.getItem('filehub_theme');
    if (savedTheme === 'dark') setDarkMode(true);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('filehub_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('filehub_theme', 'light');
    }
  }, [darkMode]);

  // Load Offline Data (IndexedDB) on startup
  useEffect(() => {
    const initOffline = async () => {
      console.log("Cargando datos locales (IndexedDB)...");
      const savedState = await dbService.loadState();
      if (savedState) {
        if (savedState.expenses) setExpenses(savedState.expenses);
        if (savedState.calendarEvents) setCalendarEvents(savedState.calendarEvents);
        if (savedState.tasks) setTasks(savedState.tasks);
        if (savedState.projects) setProjects(savedState.projects);
        if (savedState.goals) setGoals(savedState.goals);
        if (savedState.ideas) setIdeas(savedState.ideas);
        if (savedState.shoppingItems) setShoppingItems(savedState.shoppingItems);
        if (savedState.debts) setDebts(savedState.debts);
        if (savedState.investments) setInvestments(savedState.investments);
        if (savedState.presentations) setPresentations(savedState.presentations);
        if (savedState.trips) setTrips(savedState.trips);
        if (savedState.sharedExpenses) setSharedExpenses(savedState.sharedExpenses);
        if (savedState.sharedDebts) setSharedDebts(savedState.sharedDebts);
        if (savedState.weightEntries) setWeightEntries(savedState.weightEntries);
        if (savedState.nutritionPlans) setNutritionPlans(savedState.nutritionPlans);
        if (savedState.files) setFiles(savedState.files);
        if (savedState.shoppingOrders) setShoppingOrders(savedState.shoppingOrders);
        if (savedState.privateNotes) setPrivateNotes(savedState.privateNotes);
        if (savedState.privateDocuments) setPrivateDocuments(savedState.privateDocuments);
      }
      setIsDBReady(true);
    };
    initOffline();
  }, []);

  // Merge pre-loaded pending tasks (only adds missing ones)
  useEffect(() => {
    if (!isDBReady) return;
    setTasks(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const newTasks = PENDING_TASKS.filter(t => !existingIds.has(t.id));
      return newTasks.length > 0 ? [...prev, ...newTasks] : prev;
    });
    setCalendarEvents(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      const newEvts = SHIFTER_EVENTS.filter(e => !existingIds.has(e.id));
      return newEvts.length > 0 ? [...prev, ...newEvts] : prev;
    });
  }, [isDBReady]);

  // Auto-save to IndexedDB for safety
  useEffect(() => {
    const saveState = async () => {
      if (!isDBReady) return;
      try {
        await dbService.saveFullState({
          expenses, debts, investments, projects, presentations, tasks, goals,
          shoppingItems, shoppingOrders, calendarEvents, ideas, sharedExpenses,
          sharedDebts, weightEntries, nutritionPlans, files, trips,
          privateNotes, privateDocuments
        });
      } catch (err) {
        console.error("Error auto-saving to IndexedDB", err);
      }
    };
    saveState();
  }, [expenses, debts, investments, projects, presentations, tasks, goals, shoppingItems, shoppingOrders, calendarEvents, ideas, sharedExpenses, sharedDebts, weightEntries, nutritionPlans, files, trips, privateNotes, privateDocuments, isDBReady]);

  // ═══════ AUTO-PUSH TO SUPABASE (real-time cloud sync) ═══════
  const cloudSyncTimer = useRef<any>(null);
  useEffect(() => {
    if (!session?.user?.id || !isDBReady) return;
    // Debounce: wait 3s after last change before pushing
    if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
    cloudSyncTimer.current = setTimeout(async () => {
      const uid = session.user.id;
      console.log('☁️ Auto-pushing to Supabase...');
      try {
        // Tasks
        if (tasks.length > 0) {
          await supabase.from('tasks').upsert(
            tasks.map(t => ({
              id: t.id, user_id: uid, title: t.title, completed: t.completed,
              category: t.category, priority: t.priority, due_date: t.dueDate,
              is_recurring: t.isRecurring, frequency: t.frequency,
            })),
            { onConflict: 'id' }
          );
        }
        // Calendar Events
        if (calendarEvents.length > 0) {
          await supabase.from('calendar_events').upsert(
            calendarEvents.map(e => ({
              id: e.id, user_id: uid, title: e.title, start_date: e.start,
              end_date: e.end, type: e.type, source: e.source || 'manual',
            })),
            { onConflict: 'id' }
          );
        }
        // Expenses
        if (expenses.length > 0) {
          await supabase.from('expenses').upsert(
            expenses.map(e => ({
              id: e.id, user_id: uid, amount: e.amount, vendor: e.vendor,
              date: e.date, category: e.category, description: e.description,
              priority: e.priority, is_recurring: e.isRecurring, frequency: e.frequency,
            })),
            { onConflict: 'id' }
          );
        }
        // Goals
        if (goals.length > 0) {
          await supabase.from('goals').upsert(
            goals.map(g => ({
              id: g.id, user_id: uid, title: g.title, target_date: g.targetDate,
              current_value: g.currentValue, target_value: g.targetValue, category: g.category,
            })),
            { onConflict: 'id' }
          );
        }
        // Ideas
        if (ideas.length > 0) {
          await supabase.from('ideas').upsert(
            ideas.map(i => ({
              id: i.id, user_id: uid, title: i.title, description: i.description,
              category: i.category, priority: i.priority,
            })),
            { onConflict: 'id' }
          );
        }
        // Projects
        if (projects.length > 0) {
          await supabase.from('projects').upsert(
            projects.map(p => ({
              id: p.id, user_id: uid, name: p.name, description: p.description,
              status: p.status, progress: p.progress, deadline: p.deadline,
            })),
            { onConflict: 'id' }
          );
        }
        // Trips
        if (trips.length > 0) {
          await supabase.from('trips').upsert(
            trips.map(t => ({
              id: t.id, user_id: uid, destination: t.destination, start_date: t.startDate,
              end_date: t.endDate, budget: t.budget, status: t.status,
            })),
            { onConflict: 'id' }
          );
        }
        // Shopping Items
        if (shoppingItems.length > 0) {
          await supabase.from('shopping_items').upsert(
            shoppingItems.map(s => ({
              id: s.id, user_id: uid, name: s.name, purchased: s.purchased,
              price: s.price, priority: s.priority, category: s.category,
            })),
            { onConflict: 'id' }
          );
        }
        // Debts
        if (debts.length > 0) {
          await supabase.from('debts').upsert(
            debts.map(d => ({
              id: d.id, user_id: uid, name: d.name, amount: d.amount,
              remaining: d.remaining, type: d.type, monthly_payment: d.monthlyPayment,
            })),
            { onConflict: 'id' }
          );
        }
        // Weight entries
        if (weightEntries.length > 0) {
          await supabase.from('weight_entries').upsert(
            weightEntries.map(w => ({ ...w, user_id: uid })),
            { onConflict: 'id' }
          );
        }
        // Files
        if (files.length > 0) {
          await supabase.from('files').upsert(
            files.map(f => ({
              id: f.id, user_id: uid, name: f.name, type: f.type,
              size: f.size, date: f.date, category: f.category,
            })),
            { onConflict: 'id' }
          );
        }
        console.log('☁️ Auto-push complete');
      } catch (err) {
        console.warn('☁️ Auto-push error (will retry next change):', err);
      }
    }, 3000);

    return () => { if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current); };
  }, [tasks, calendarEvents, expenses, goals, ideas, projects, trips, shoppingItems, debts, weightEntries, files, session, isDBReady]);

  // ═══ INITIAL FORCE PUSH — run once when session + data are both ready ═══
  const didInitialPush = useRef(false);
  useEffect(() => {
    if (!session?.user?.id || !isDBReady || didInitialPush.current) return;
    if (tasks.length === 0 && calendarEvents.length === 0) return; // data not loaded yet
    didInitialPush.current = true;
    const uid = session.user.id;
    console.log('☁️ Initial force push to Supabase...');
    (async () => {
      try {
        // Push tasks
        if (tasks.length > 0) {
          await supabase.from('tasks').upsert(
            tasks.map(t => ({
              id: t.id, user_id: uid, title: t.title, completed: t.completed,
              category: t.category, priority: t.priority, due_date: t.dueDate,
              is_recurring: t.isRecurring, frequency: t.frequency,
            })), { onConflict: 'id' }
          );
        }
        // Push calendar events
        if (calendarEvents.length > 0) {
          await supabase.from('calendar_events').upsert(
            calendarEvents.map(e => ({
              id: e.id, user_id: uid, title: e.title, start_date: e.start,
              end_date: e.end, type: e.type, source: e.source || 'manual',
            })), { onConflict: 'id' }
          );
        }
        // Force sync all localStorage filehub_ keys
        forceSyncAll();
        console.log(`☁️ Initial push done: ${tasks.length} tasks, ${calendarEvents.length} events`);
      } catch (e) { console.warn('☁️ Initial push error:', e); }
    })();
  }, [session, isDBReady, tasks, calendarEvents]);

  // Load Data from Supabase
  const loadCloudData = async (userId: string) => {
    console.log("Sincronizando con Supabase...");
    setIsSyncing(true);

    try {
      // 1. Fetch all data concurrently
      const [
        { data: expData },
        { data: evtData },
        { data: taskData },
        { data: projData },
        { data: goalData },
        { data: ideaData },
        { data: shopData },
        { data: debtsData },
        { data: investData },
        { data: tripData },
        { data: ordData },
        { data: sharedExpData },
        { data: sharedDebtData },
        { data: weightData },
        { data: nutPlanData },
        { data: fileData },
        { data: presData },
        { data: trainingData },
        { data: planData },
        { data: pShipData }
      ] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', userId),
        supabase.from('calendar_events').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('projects').select('*').eq('user_id', userId),
        supabase.from('goals').select('*').eq('user_id', userId),
        supabase.from('ideas').select('*').eq('user_id', userId),
        supabase.from('shopping_items').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('investments').select('*').eq('user_id', userId),
        supabase.from('trips').select('*').eq('user_id', userId),
        supabase.from('shopping_orders').select('*').eq('user_id', userId),
        supabase.from('shared_expenses').select('*').eq('user_id', userId),
        supabase.from('shared_debts').select('*').eq('user_id', userId),
        supabase.from('weight_entries').select('*').eq('user_id', userId),
        supabase.from('nutrition_plans').select('*').eq('user_id', userId),
        supabase.from('files').select('*').eq('user_id', userId),
        supabase.from('presentations').select('*').eq('user_id', userId),
        supabase.from('training_sessions').select('*').eq('user_id', userId),
        supabase.from('training_plans').select('*').eq('user_id', userId),
        supabase.from('partnerships').select('*').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle()
      ]);

      if (pShipData) setPartnership(pShipData);

      // 2. Map cloud data to local formats
      const mappedTasks = (taskData || []).map((t: any) => ({
        id: t.id, title: t.title, completed: t.completed, category: t.category, priority: t.priority,
        dueDate: t.due_date, isRecurring: t.is_recurring, frequency: t.frequency
      }));

      const mappedEvents = (evtData || []).map((e: any) => ({
        id: e.id, title: e.title, start: e.start_date, end: e.end_date, type: e.type
      }));

      const mappedGoals = (goalData || []).map((g: any) => ({
        ...g, targetDate: g.target_date, currentValue: g.current_value, targetValue: g.target_value
      }));

      const mappedIdeas = (ideaData || []).map((i: any) => ({
        ...i, createdAt: i.created_at
      }));

      const mappedShop = (shopData || []).map((s: any) => ({
        ...s, estimatedPrice: s.estimated_price
      }));

      const mappedDebts = (debtsData || []).map((d: any) => ({
        ...d, totalAmount: d.total_amount, paidAmount: d.paid_amount, dueDate: d.due_date, interestRate: d.interest_rate
      }));

      const mappedInvestments = (investData || []).map((i: any) => ({
        ...i, expectedReturn: i.expected_return
      }));

      const mappedTrips = (tripData || []).map((t: any) => ({
        ...t, startDate: t.start_date, endDate: t.end_date, notebookUrl: t.notebook_url
      }));

      const mappedOrders = (ordData || []).map((o: any) => ({
        ...o, trackingNumber: o.tracking_number
      }));

      const mappedSharedExp = (sharedExpData || []).map((e: any) => ({
        ...e, splitBetween: e.split_between, paidBy: e.paid_by
      }));

      const mappedNutPlans = (nutPlanData || []).map((p: any) => ({
        ...p, uploadDate: p.upload_date
      }));

      const mappedFiles = (fileData || []).map((f: any) => ({
        ...f, aiSummary: f.ai_summary
      }));

      const mappedPres = (presData || []).map((p: any) => ({
        ...p, dueDate: p.due_date
      }));

      const mappedPlans = (planData || []).map((p: any) => ({ ...p, durationWeeks: p.duration_weeks }));

      // 3. Merging Logic (Keep local items not in cloud)
      const mergeAndSync = async (tableName: string, localItems: any[], cloudMappedItems: any[], reverseMapper: (i: any) => any) => {
        const localToPush = localItems.filter(l => !cloudMappedItems.find(c => c.id === l.id));
        if (localToPush.length > 0) {
          console.log(`Pushing ${localToPush.length} local items to ${tableName}`);
          await supabase.from(tableName).insert(localToPush.map(reverseMapper));
        }
        const merged = [...cloudMappedItems];
        localItems.forEach(l => {
          if (!cloudMappedItems.find(c => c.id === l.id)) merged.push(l);
        });
        return merged;
      };

      // Since the logic above is more complex, just direct merge for now to be safe
      const mergeLocal = (local: any[], cloud: any[]) => {
        const cloudIds = new Set(cloud.map(c => c.id));
        return [...cloud, ...local.filter(l => !cloudIds.has(l.id))];
      };

      setTasks(mergeLocal(tasks, mappedTasks));
      setExpenses(mergeLocal(expenses, expData || []));
      setCalendarEvents(mergeLocal(calendarEvents, mappedEvents));
      setProjects(mergeLocal(projects, projData || []));
      setGoals(mergeLocal(goals, mappedGoals));
      setIdeas(mergeLocal(ideas, mappedIdeas));
      setShoppingItems(mergeLocal(shoppingItems, mappedShop));
      setDebts(mergeLocal(debts, mappedDebts));
      setInvestments(mergeLocal(investments, mappedInvestments));
      setTrips(mergeLocal(trips, mappedTrips));
      setShoppingOrders(mergeLocal(shoppingOrders, mappedOrders));
      setSharedExpenses(mergeLocal(sharedExpenses, mappedSharedExp));
      setSharedDebts(mergeLocal(sharedDebts, sharedDebtData || []));
      setWeightEntries(mergeLocal(weightEntries, weightData || []));
      setNutritionPlans(mergeLocal(nutritionPlans, mappedNutPlans));
      setFiles(mergeLocal(files, mappedFiles));
      setPresentations(mergeLocal(presentations, mappedPres));
      setTrainingSessions(mergeLocal(trainingSessions, trainingData || []));
      setTrainingPlans(mergeLocal(trainingPlans, mappedPlans));

      // 4. Background sync local-only items to Supabase (Crucial for "No Task Loss")
      const pushMissingToCloud = async () => {
        // Sync Tasks
        const localTasksToPush = tasks.filter(lt => !mappedTasks.find(ct => ct.id === lt.id));
        if (localTasksToPush.length > 0) {
          console.log(`Sincronizando ${localTasksToPush.length} tareas locales al cloud...`);
          await supabase.from('tasks').insert(localTasksToPush.map(t => ({
            id: t.id, user_id: userId, title: t.title, completed: t.completed, category: t.category,
            priority: t.priority, due_date: t.dueDate, is_recurring: t.isRecurring, frequency: t.frequency
          })));
        }

        // Sync Expenses
        const cloudExpIds = new Set((expData || []).map((e: any) => e.id));
        const localExpsToPush = expenses.filter(le => !cloudExpIds.has(le.id));
        if (localExpsToPush.length > 0) {
          console.log(`Sincronizando ${localExpsToPush.length} gastos locales al cloud...`);
          await supabase.from('expenses').insert(localExpsToPush.map(e => ({
            id: e.id, user_id: userId, amount: e.amount, vendor: e.vendor, date: e.date,
            category: e.category, description: e.description, priority: e.priority, is_recurring: e.isRecurring, frequency: e.frequency
          })));
        }

        // Sync Projects
        const cloudProjIds = new Set((projData || []).map((p: any) => p.id));
        const localProjsToPush = projects.filter(lp => !cloudProjIds.has(lp.id));
        if (localProjsToPush.length > 0) {
          console.log(`Sincronizando ${localProjsToPush.length} proyectos locales al cloud...`);
          await supabase.from('projects').insert(localProjsToPush.map(p => ({
            id: p.id, user_id: userId, name: p.name, description: p.description, status: p.status,
            progress: p.progress, deadline: p.deadline
          })));
        }

        // Sync Goals
        const cloudGoalIds = new Set((goalData || []).map((g: any) => g.id));
        const localGoalsToPush = goals.filter(lg => !cloudGoalIds.has(lg.id));
        if (localGoalsToPush.length > 0) {
          console.log(`Sincronizando ${localGoalsToPush.length} metas locales al cloud...`);
          await supabase.from('goals').insert(localGoalsToPush.map(g => ({
            id: g.id, user_id: userId, title: g.title, target_date: g.targetDate,
            current_value: g.currentValue, target_value: g.targetValue, category: g.category
          })));
        }

        // Sync Events
        const cloudEvtIds = new Set((evtData || []).map((ev: any) => ev.id));
        const localEvtsToPush = calendarEvents.filter(le => !cloudEvtIds.has(le.id));
        if (localEvtsToPush.length > 0) {
          console.log(`Sincronizando ${localEvtsToPush.length} eventos locales al cloud...`);
          await supabase.from('calendar_events').insert(localEvtsToPush.map(e => ({
            id: e.id, user_id: userId, title: e.title, start_date: e.start, end_date: e.end, type: e.type
          })));
        }
      };

      pushMissingToCloud();
      setIsDBReady(true);
    } catch (e) {
      console.error("Error loading cloud data", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (user: any) => {
    if (user) {
      setIsAuthenticated(true);
      setCurrentUser(user.email || null);
      // Force full sync after login
      initCloudSync(user.id);
      enableAutoSync();
      loadCloudData(user.id);
      // Delayed force push of all localStorage data
      setTimeout(() => forceSyncAll(), 5000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setExpenses([]);
    setCalendarEvents([]);
    setTasks([]);
    setProjects([]);
    setGoals([]);
    setIdeas([]);
    setShoppingItems([]);
    setDebts([]);
    setInvestments([]);
    setFiles([]);
    setTrips([]);
    setPresentations([]);
    setSharedExpenses([]);
    setSharedDebts([]);
    setWeightEntries([]);
    setNutritionPlans([]);
    setShoppingOrders([]);
    setTrainingSessions([]);
    setTrainingPlans([]);
    setPartnership(null);
  };

  const syncProfile = async (user: any) => {
    if (!user) return;
    const settings = {
      ollama_config: ollamaConfig,
      anything_llm_config: anythingLLMConfig,
      open_notebook_config: openNotebookConfig,
      open_webui_config: openWebUIConfig,
      local_llm_config: localLlmConfig,
      theme: darkMode ? 'dark' : 'light'
    };


    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
    });

    // Attempt to update settings column if it exists, unrelated to core upsert
    // This is a simplified approach assuming a 'settings' jsonb column exists or ignoring if not
    await supabase.from('profiles').update({ settings: settings }).eq('id', user.id);

    if (error) console.error("Error syncing profile:", error);
  };

  // Persist Settings to Cloud on Change
  useEffect(() => {
    if (session?.user) {
      const timeoutId = setTimeout(() => {
        syncProfile(session?.user);
      }, 2000); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [ollamaConfig, anythingLLMConfig, openNotebookConfig, openWebUIConfig, localLlmConfig, darkMode, session]);


  const handleInvitePartner = async (email: string) => {
    if (!session?.user) return;
    setIsSyncing(true);
    try {
      // 1. Find profile by email
      const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!targetProfile) {
        alert(`No se encontró ningún usuario con el email ${email}. Asegúrate de que tu pareja se haya registrado primero en FileHub.`);
        return;
      }

      if (targetProfile.id === session?.user?.id) {
        alert("No puedes invitarte a ti mismo.");
        return;
      }

      // 2. Create partnership
      const { data: newPartnership, error: partnershipError } = await supabase
        .from('partnerships')
        .insert({
          user1_id: session?.user?.id,
          user2_id: targetProfile.id
        })
        .select()
        .single();

      if (partnershipError) {
        if (partnershipError.code === '23505') {
          alert("Ya existe una solicitud o vínculo con esta persona.");
        } else {
          throw partnershipError;
        }
      } else {
        setPartnership(newPartnership);
        alert("¡Vínculo de pareja creado con éxito!");
      }
    } catch (e: any) {
      console.error(e);
      alert("Error al vincular: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const globalContext = { expenses, debts, investments, projects, goals, tasks, calendarEvents, trips, shoppingItems, shoppingOrders, ideas, presentations, sharedExpenses, sharedDebts, files, weightEntries, trainingSessions };

  const handleScanClick = () => scanInputRef.current?.click();

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewFile(file);
    }
    event.target.value = '';
  };

  const processFileWithAI = async () => {
    if (!previewFile) return;
    const fileToProcess = previewFile;
    setPreviewFile(null);
    setIsScanning(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const mimeType = fileToProcess.type || "application/octet-stream";
      try {
        const results = await processUniversalDocument(base64, mimeType);
        if (results.expenses && results.expenses.length > 0) {
          const newExps = results.expenses.map((e: any) => ({
            ...e,
            id: `ai-exp-${Date.now()}-${Math.random()}`,
            user_id: session?.user.id
          }));
          setExpenses(prev => [...newExps, ...prev]);
          if (session) {
            const { error } = await supabase.from('expenses').insert(newExps);
            if (error) console.error("Error saving AI expenses", error);
          }
        }
        setScanResults(results);
      } catch (error) {
        console.error(error);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(fileToProcess);
  };

  // --- CRUD Handlers (Supabase Integrated) ---

  // EXPENSES
  const handleAddExpense = async (e: Expense) => {
    setExpenses([e, ...expenses]);
    if (session) {
      await supabase.from('expenses').insert({
        id: e.id, user_id: session?.user?.id, amount: e.amount, vendor: e.vendor, date: e.date,
        category: e.category, description: e.description, priority: e.priority, is_recurring: e.isRecurring, frequency: e.frequency
      });
    }
  };
  const handleDeleteExpense = async (id: string) => {
    if (confirm("¿Eliminar este gasto?")) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      if (session) await supabase.from('expenses').delete().eq('id', id);
    }
  };
  const handleUpdateExpense = async (e: Expense) => {
    setExpenses(prev => prev.map(ex => ex.id === e.id ? e : ex));
    if (session) await supabase.from('expenses').update({
      amount: e.amount, vendor: e.vendor, date: e.date, category: e.category, description: e.description
    }).eq('id', e.id);
  };

  // DEBTS
  const handleAddDebt = async (d: Debt) => {
    setDebts([...debts, d]);
    if (session) await supabase.from('debts').insert({
      id: d.id, user_id: session?.user?.id, name: d.name, total_amount: d.totalAmount, paid_amount: d.paidAmount,
      due_date: d.dueDate, category: d.category, interest_rate: d.interestRate, creditor: d.creditor, status: d.status, notes: d.notes
    });
  };

  const handleDeleteDebt = async (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    if (session) await supabase.from('debts').delete().eq('id', id);
  };

  const handleUpdateDebt = async (updated: Debt) => {
    setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
    if (session) await supabase.from('debts').update({
      name: updated.name, total_amount: updated.totalAmount, paid_amount: updated.paidAmount,
      due_date: updated.dueDate, category: updated.category, interest_rate: updated.interestRate,
      creditor: updated.creditor, status: updated.status, notes: updated.notes
    }).eq('id', updated.id);
  };

  // INVESTMENTS
  const handleAddInvestment = async (i: Investment) => {
    setInvestments([...investments, i]);
    if (session) await supabase.from('investments').insert({
      id: i.id, user_id: session?.user?.id, name: i.name, amount: i.amount, date: i.date,
      status: i.status, category: i.category, expected_return: i.expectedReturn,
      current_value: i.currentValue, purchase_price: i.purchasePrice, quantity: i.quantity, notes: i.notes
    });
  };

  const handleDeleteInvestment = async (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    if (session) await supabase.from('investments').delete().eq('id', id);
  };

  const handleUpdateInvestment = async (updated: Investment) => {
    setInvestments(prev => prev.map(i => i.id === updated.id ? updated : i));
    if (session) await supabase.from('investments').update({
      name: updated.name, amount: updated.amount, date: updated.date,
      status: updated.status, category: updated.category, expected_return: updated.expectedReturn,
      current_value: updated.currentValue, purchase_price: updated.purchasePrice, quantity: updated.quantity, notes: updated.notes
    }).eq('id', updated.id);
  };


  // EVENTS
  const handleAddEvent = async (e: CalendarEvent) => {
    setCalendarEvents([...calendarEvents, e]);
    if (session) await supabase.from('calendar_events').insert({
      id: e.id, user_id: session?.user?.id, title: e.title, start_date: e.start, end_date: e.end, type: e.type
    });
  };
  const handleDeleteEvent = async (id: string) => {
    if (confirm("¿Eliminar este evento?")) {
      setCalendarEvents(prev => prev.filter(e => e.id !== id));
      if (session) await supabase.from('calendar_events').delete().eq('id', id);
    }
  };

  // TASKS
  const handleAddTask = async (t: Task) => {
    setTasks([t, ...tasks]);
    if (session) await supabase.from('tasks').insert({
      id: t.id, user_id: session?.user?.id, title: t.title, completed: t.completed, category: t.category,
      priority: t.priority, due_date: t.dueDate, is_recurring: t.isRecurring, frequency: t.frequency
    });
  };
  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
    if (session) await supabase.from('tasks').update({ completed: newCompleted }).eq('id', id);
  };
  const handleDeleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (session) await supabase.from('tasks').delete().eq('id', id);
  };

  // PROJECTS
  const handleAddProject = async (p: Project) => {
    setProjects([p, ...projects]);
    if (session) await supabase.from('projects').insert({
      id: p.id, user_id: session?.user?.id, name: p.name, budget: p.budget, spent: p.spent,
      deadline: p.deadline, status: p.status, notebook_url: p.notebookUrl
    });
  };
  const handleUpdateProject = async (p: Project) => {
    setProjects(prev => prev.map(proj => proj.id === p.id ? p : proj));
    if (session) await supabase.from('projects').update({
      name: p.name, budget: p.budget, deadline: p.deadline, notebook_url: p.notebookUrl, spent: p.spent
    }).eq('id', p.id);
  };

  const handleDeleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (session) await supabase.from('projects').delete().eq('id', id);
  };

  // GOALS
  const handleAddGoal = async (g: Goal) => {
    setGoals([...goals, g]);
    if (session) await supabase.from('goals').insert({
      id: g.id, user_id: session?.user?.id, title: g.title, target_date: g.targetDate,
      current_value: g.currentValue, target_value: g.targetValue, unit: g.unit, category: g.category, status: g.status
    });
  };
  const handleUpdateGoal = async (g: Goal) => {
    setGoals(prev => prev.map(go => go.id === g.id ? g : go));
    if (session) await supabase.from('goals').update({
      title: g.title, target_date: g.targetDate, current_value: g.currentValue, target_value: g.targetValue
    }).eq('id', g.id);
  };
  const handleDeleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    if (session) await supabase.from('goals').delete().eq('id', id);
  };

  // IDEAS
  const handleAddIdea = async (i: Idea) => {
    setIdeas([i, ...ideas]);
    if (session) await supabase.from('ideas').insert({
      id: i.id, user_id: session?.user?.id, title: i.title, description: i.description,
      category: i.category, priority: i.priority, status: i.status, created_at: i.createdAt,
      files: i.files ? JSON.stringify(i.files) : null
    });
  };
  const handleDeleteIdea = async (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    if (session) await supabase.from('ideas').delete().eq('id', id);
  };
  const handleUpdateIdea = async (i: Idea) => {
    setIdeas(prev => prev.map(ide => ide.id === i.id ? i : ide));
    if (session) await supabase.from('ideas').update({
      title: i.title, description: i.description, category: i.category, priority: i.priority,
      status: i.status, files: i.files ? JSON.stringify(i.files) : null
    }).eq('id', i.id);
  };

  // SHOPPING
  const handleAddItem = async (i: ShoppingItem) => {
    setShoppingItems([...shoppingItems, i]);
    if (session) await supabase.from('shopping_items').insert({
      id: i.id, user_id: session?.user?.id, name: i.name, estimated_price: i.estimatedPrice,
      category: i.category, purchased: i.purchased, store: i.store
    });
  };
  const handleToggleItem = async (id: string) => {
    const item = shoppingItems.find(i => i.id === id);
    if (!item) return;
    const newPurchased = !item.purchased;
    setShoppingItems(prev => prev.map(i => i.id === id ? { ...i, purchased: newPurchased } : i));
    if (session) await supabase.from('shopping_items').update({ purchased: newPurchased }).eq('id', id);
  };
  const handleDeleteItem = async (id: string) => {
    setShoppingItems(prev => prev.filter(i => i.id !== id));
    if (session) await supabase.from('shopping_items').delete().eq('id', id);
  };
  const handleAddOrder = async (o: ShoppingOrder) => {
    setShoppingOrders([o, ...shoppingOrders]);
    if (session) await supabase.from('shopping_orders').insert({
      id: o.id, user_id: session?.user?.id, store: o.store, date: o.date, total: o.total, status: o.status
    });
  };

  const handleDeleteOrder = async (id: string) => {
    setShoppingOrders(prev => prev.filter(o => o.id !== id));
    if (session) await supabase.from('shopping_orders').delete().eq('id', id);
  };

  // SHARED FINANCES
  const handleAddSharedExpense = async (e: SharedExpense) => {
    setSharedExpenses([e, ...sharedExpenses]);
    if (session) await supabase.from('shared_expenses').insert({
      id: e.id, user_id: session?.user?.id, amount: e.amount, vendor: e.vendor, date: e.date,
      category: e.category, description: e.description, priority: e.priority, paid_by: e.paidBy, split_between: e.splitBetween
    });
  };
  const handleAddSharedDebt = async (d: SharedDebt) => {
    setSharedDebts([d, ...sharedDebts]);
    if (session) await supabase.from('shared_debts').insert({
      id: d.id, user_id: session?.user?.id, from: d.from, to: d.to, amount: d.amount, description: d.description, date: d.date, status: d.status
    });
  };
  const handleSettleSharedDebt = async (id: string) => {
    setSharedDebts(prev => prev.map(d => d.id === id ? { ...d, status: 'settled' } : d));
    if (session) await supabase.from('shared_debts').update({ status: 'settled' }).eq('id', id);
  };
  const handleDeleteSharedExpense = async (id: string) => {
    setSharedExpenses(prev => prev.filter(e => e.id !== id));
    if (session) await supabase.from('shared_expenses').delete().eq('id', id);
  };
  const handleDeleteSharedDebt = async (id: string) => {
    setSharedDebts(prev => prev.filter(d => d.id !== id));
    if (session) await supabase.from('shared_debts').delete().eq('id', id);
  };

  // FILES
  const handleAddFile = async (f: StoredFile) => {
    setFiles([...files, f]);
    if (session) await supabase.from('files').insert({
      id: f.id, user_id: session?.user?.id, name: f.name, type: f.type, size: f.size,
      date: f.date, category: f.category, tags: f.tags, url: f.url, ai_summary: f.aiSummary
    });
  };
  const handleUpdateFile = async (f: StoredFile) => {
    setFiles(prev => prev.map(fi => fi.id === f.id ? f : fi));
    if (session) await supabase.from('files').update({
      ai_summary: f.aiSummary
    }).eq('id', f.id);
  };
  const handleDeleteFile = async (id: string) => {
    const fileToDelete = files.find(f => f.id === id);
    setFiles(prev => prev.filter(f => f.id !== id));

    if (session) {
      // Delete from database
      await supabase.from('files').delete().eq('id', id);

      // Delete from storage if it has a URL
      if (fileToDelete?.url) {
        try {
          // Extract filename from public URL
          // URL format: https://[project].supabase.co/storage/v1/object/public/files/[filename]
          const urlParts = fileToDelete.url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          await supabase.storage.from('files').remove([fileName]);
        } catch (error) {
          console.error('Error deleting file from storage:', error);
        }
      }
    }
  };

  // NUTRITION & WEIGHT
  const handleAddWeight = async (w: WeightEntry) => {
    setWeightEntries([...weightEntries, w]);
    if (session) await supabase.from('weight_entries').insert({
      id: w.id, user_id: session?.user?.id, date: w.date, weight: w.weight, note: w.note
    });
  };
  const handleDeleteWeight = async (id: string) => {
    setWeightEntries(prev => prev.filter(w => w.id !== id));
    if (session) await supabase.from('weight_entries').delete().eq('id', id);
  };
  const handleAddNutritionPlan = async (p: NutritionPlan) => {
    setNutritionPlans([...nutritionPlans, p]);
    if (session) await supabase.from('nutrition_plans').insert({
      id: p.id, user_id: session?.user?.id, name: p.name, upload_date: p.uploadDate, type: p.type, url: p.url
    });
  };
  const handleDeletePlan = async (id: string) => {
    const planToDelete = nutritionPlans.find(p => p.id === id);
    setNutritionPlans(prev => prev.filter(p => p.id !== id));

    if (session) {
      await supabase.from('nutrition_plans').delete().eq('id', id);

      if (planToDelete?.url) {
        try {
          const urlParts = planToDelete.url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          await supabase.storage.from('nutrition_plans').remove([fileName]);
        } catch (error) {
          console.error('Error deleting nutrition plan from storage:', error);
        }
      }
    }
  };

  const handleUpdateNutritionPlan = async (p: NutritionPlan) => {
    setNutritionPlans(prev => prev.map(plan => plan.id === p.id ? p : plan));
    if (session) await supabase.from('nutrition_plans').update({
      name: p.name, type: p.type, url: p.url, upload_date: p.uploadDate
    }).eq('id', p.id);
  };

  // PRESENTATIONS
  const handleAddPresentation = async (p: Presentation) => {
    setPresentations([p, ...presentations]);
    if (session) await supabase.from('presentations').insert({
      id: p.id, user_id: session?.user?.id, title: p.title, client: p.client, status: p.status, due_date: p.dueDate, priority: p.priority
    });
  };

  // TRIPS
  const handleDeletePresentation = async (id: string) => {
    if (confirm("¿Eliminar esta presentación?")) {
      setPresentations(prev => prev.filter(p => p.id !== id));
      if (session) await supabase.from('presentations').delete().eq('id', id);
    }
  };

  const handleAddTrip = async (t: Trip) => {
    setTrips([...trips, t]);
    if (session) await supabase.from('trips').insert({
      id: t.id, user_id: session?.user?.id, destination: t.destination, start_date: t.startDate, end_date: t.endDate, budget: t.budget, notebook_url: t.notebookUrl
    });
  };
  const handleDeleteTrip = async (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));
    if (session) await supabase.from('trips').delete().eq('id', id);
  };

  // TRAINING
  const handleAddTrainingSession = async (s: TrainingSession) => {
    setTrainingSessions([...trainingSessions, s]);
    if (session) await supabase.from('training_sessions').insert({
      id: s.id, user_id: session?.user?.id, title: s.title, date: s.date, type: s.type, duration: s.duration, intensity: s.intensity, status: s.status, notes: s.notes
    });
  };
  const handleDeleteTrainingSession = async (id: string) => {
    setTrainingSessions(prev => prev.filter(s => s.id !== id));
    if (session) await supabase.from('training_sessions').delete().eq('id', id);
  };
  const handleUpdateTrainingSession = async (s: TrainingSession) => {
    setTrainingSessions(prev => prev.map(session => session.id === s.id ? s : session));
    if (session) await supabase.from('training_sessions').update({
      title: s.title, date: s.date, type: s.type, duration: s.duration, intensity: s.intensity, status: s.status, notes: s.notes
    }).eq('id', s.id);
  };
  const handleAddTrainingPlan = async (p: TrainingPlan) => {
    setTrainingPlans([...trainingPlans, p]);
    if (session) await supabase.from('training_plans').insert({
      id: p.id, user_id: session?.user?.id, name: p.name, description: p.description, duration_weeks: p.durationWeeks, source: p.source
    });
  };
  const handleDeleteTrainingPlan = async (id: string) => {
    setTrainingPlans(prev => prev.filter(p => p.id !== id));
    if (session) await supabase.from('training_plans').delete().eq('id', id);
  };

  if (!isAuthenticated) {
    return <AuthView onLogin={handleLogin} onSkip={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return (
        <Dashboard
          expenses={expenses}
          globalContext={globalContext}
          tasks={tasks}
          events={calendarEvents}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onToggleTask={handleToggleTask}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
          currentUser={session?.user?.id || null}
          partnership={partnership}
          onAddGoal={handleAddGoal}
          onAddIdea={handleAddIdea}
          onAddEvent={handleAddEvent}
          session={session}
        />
      );
      case 'files': return (
        <FilesView
          files={files}
          ollamaConfig={ollamaConfig}
          onAddFile={handleAddFile}
          onDeleteFile={handleDeleteFile}
          onUpdateFile={handleUpdateFile}
        />
      );
      case 'expenses': return (
        <ExpenseTracker
          expenses={expenses}
          debts={debts}
          investments={investments}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          onDeleteExpense={handleDeleteExpense}
          onAddDebt={handleAddDebt}
          onAddInvestment={handleAddInvestment}
        />
      );
      case 'shared-finances': return (
        <SharedFinancesView
          sharedExpenses={sharedExpenses}
          sharedDebts={sharedDebts}
          onAddExpense={handleAddSharedExpense}
          onSettleDebt={handleSettleSharedDebt}
          onAddDebt={handleAddSharedDebt}
          onDeleteExpense={handleDeleteSharedExpense}
          onDeleteDebt={handleDeleteSharedDebt}
        />
      );
      case 'economy': return (
        <EconomyView
          expenses={expenses}
          debts={debts}
          investments={investments}
          onClearAll={() => setExpenses([])}
          onAddExpenses={(exps) => exps.forEach(e => handleAddExpense(e))}
          onAddDebt={handleAddDebt}
          onDeleteDebt={handleDeleteDebt}
          onUpdateDebt={handleUpdateDebt}
          onAddInvestment={handleAddInvestment}
          onDeleteInvestment={handleDeleteInvestment}
          onUpdateInvestment={handleUpdateInvestment}
        />
      );
      case 'work': return (
        <WorkView
          initialProjects={projects}
          initialPresentations={presentations}
          initialTasks={tasks}
          ollamaConfig={ollamaConfig}
          onAddProject={handleAddProject}
          onAddTask={handleAddTask}
          onAddPresentation={handleAddPresentation}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onDeletePresentation={handleDeletePresentation}
        />
      );
      case 'tasks': return (
        <TasksView
          tasks={tasks}
          calendarEvents={calendarEvents}
          expenses={expenses}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
        />
      );
      case 'notebook': return (
        <NotebookView
          notes={privateNotes}
          documents={privateDocuments}
          onNotesChange={(notes) => setPrivateNotes(notes)}
          onSaveDocument={(doc) => setPrivateDocuments([...privateDocuments, doc])}
          onLoadDocument={(content) => setPrivateNotes(content)}
        />
      );
      case 'goals': return (
        <GoalsView
          goals={goals}
          onAddGoal={handleAddGoal}
          onUpdateGoal={handleUpdateGoal}
          onDeleteGoal={handleDeleteGoal}
        />
      );
      case 'calendar': return (
        <CalendarView
          expenses={expenses}
          projects={projects}
          calendarEvents={calendarEvents}
          tasks={tasks}
          goals={goals}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
          onUpdateAllEvents={async (events) => {
            // Replace all google-sourced events with freshly synced ones
            setCalendarEvents(events);
            if (session) {
              // Upsert only google events to Supabase
              const googleEvs = events.filter(e => e.source === 'google');
              for (const ev of googleEvs) {
                await supabase.from('calendar_events').upsert({
                  id: ev.id, user_id: session?.user?.id, title: ev.title,
                  start: ev.start, end: ev.end, type: ev.type, source: ev.source
                });
              }
            }
          }}
        />
      );
      case 'trips': return (
        <TripsView
          trips={trips}
          onAddTrip={handleAddTrip}
          onDeleteTrip={handleDeleteTrip}
        />
      );
      case 'shopping': return (
        <ShoppingView
          items={shoppingItems}
          orders={shoppingOrders}
          onAddItem={handleAddItem}
          onToggleItem={handleToggleItem}
          onDeleteItem={handleDeleteItem}
          onAddOrder={handleAddOrder}
        />
      );
      case 'nutrition': return (
        <NutritionView
          weightEntries={weightEntries}
          nutritionPlans={nutritionPlans}
          onAddWeightEntry={handleAddWeight}
          onAddPlan={handleAddNutritionPlan}
          onDeletePlan={handleDeletePlan}
          onUpdatePlan={handleUpdateNutritionPlan}
        />
      );
      case 'ideas': return (
        <IdeasView
          ideas={ideas}
          onAddIdea={handleAddIdea}
          onDeleteIdea={handleDeleteIdea}
          onUpdateIdea={handleUpdateIdea}
        />
      );
      case 'ai-hub': return (
        <AIHubView
          ollamaConfig={ollamaConfig}
          openNotebookConfig={openNotebookConfig}
          anythingLLMConfig={anythingLLMConfig}
          onUpdateConfig={setOllamaConfig}
          onUpdateNotebookConfig={setOpenNotebookConfig}
          onUpdateAnythingConfig={setAnythingLLMConfig}
          globalContext={globalContext}
          openWebUIConfig={openWebUIConfig}
          onUpdateOpenWebUIConfig={setOpenWebUIConfig}
          localLlmConfig={localLlmConfig}
          onUpdateLocalLlmConfig={setLocalLlmConfig}
        />

      );
      case 'qr': return <QRView />;
      case 'settings':
        return (
          <SettingsView
            currentUser={currentUser || 'Usuario'}
            ollamaConfig={ollamaConfig}
            setOllamaConfig={setOllamaConfig}
            isDarkMode={darkMode}
            toggleDarkMode={() => setDarkMode(!darkMode)}
            onNavigate={setCurrentView}
          />
        );
      case 'fitness': return (
        <FitnessView
          sessions={trainingSessions}
          plans={trainingPlans}
          onAddSession={handleAddTrainingSession}
          onDeleteSession={handleDeleteTrainingSession}
          onUpdateSession={handleUpdateTrainingSession}
          onAddPlan={handleAddTrainingPlan}
          onDeletePlan={handleDeleteTrainingPlan}
          onSyncPlan={(events) => {
            events.forEach(ev => handleAddEvent(ev));
          }}
        />
      );
      case 'shared-hub': return (
        <PartnerHubView
          partnership={partnership}
          sharedExpenses={sharedExpenses}
          currentUser={session?.user?.id || null}
          onInvitePartner={handleInvitePartner}
          activeTab={hubTab}
          onTabChange={setHubTab}
          onAddSharedTask={(title) => {
            // Internal task handling in component for now
          }}
        />
      );
      case 'courses': return <LearningView />;
      case 'courses-sessions': return <CoursesSessionsView />;
      case 'voice-notes': return <VoiceNotesView session={session} />;
      case 'piso': return <RealEstateView />;
      case 'pisos-dashboard': return <PisosDashboardView />;
      case 'pisos-buscador': return <PisosBuscadorView />;
      case 'whatsapp-pisos': return <WhatsAppPisosView />;
      case 'jobs': return <JobsView />;
      case 'whatsapp-bot': return <WhatsAppBotView />;
      case 'car-mode': return <CarPlayView session={session} onClose={() => setCurrentView('dashboard')} />;
      case 'news': return <NewsView />;
      case 'supermarkets': return <SupermarketsView />;
      case 'cron-jobs': return <CronJobsView />;
      case 'time-block': return <TimeBlockView calendarEvents={calendarEvents} tasks={tasks} session={session} />;
      case 'whatsapp-inbox': return <WhatsAppInboxView />;
      case 'openwebui': return <OpenWebUIView url={openWebUIConfig.baseUrl} />;
      case 'notebook-ai': return <NotebookAIView />;
      case 'patient-notes': return <PatientNotesView session={session} />;
      case 'hangouts': return <HangoutsView />;
      case 'activities': return <ActivitiesView />;
      case 'vip-tasks': return <VipTasksView session={session} />;
      case 'shifts': return (
        <ShiftsCalendarView
          events={calendarEvents}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
          session={session}
        />
      );
      case 'work-planner': return (
        <WorkPlannerView
          tasks={tasks}
          events={calendarEvents}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          session={session}
        />
      );
      case 'habits': return <HabitsView session={session} />;
      case 'budget-alerts': return <BudgetAlertsView expenses={expenses} session={session} />;
      case 'travel-planner': return <TravelPlannerView />;
      case 'travel-notebook': return <TravelNotebookView />;
      default: return (
        <Dashboard
          expenses={expenses}
          tasks={tasks}
          events={calendarEvents}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onToggleTask={handleToggleTask}
        />
      );
    }
  };

  return (
    <div className={`min-h-screen flex bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Responsive Drawer on Mobile, Static on Desktop */}
      <div className={`fixed inset-y-0 left-0 z-[70] transition-transform duration-300 transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          currentView={currentView === 'shared-hub' ? hubTab : currentView}
          onViewChange={(v) => {
            if (['piso', 'shopping', 'shared-hub', 'whiteboard'].includes(v)) {
              if (v !== 'shared-hub') setHubTab(v as any);
              setCurrentView('shared-hub');
            } else if (v === 'trips') {
              // Direct to shared-hub EXPEDICIONES (calendar tab)
              setHubTab('calendar');
              setCurrentView('shared-hub');
            } else {
              setCurrentView(v);
            }
            setIsSidebarOpen(false);
          }}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          currentUser={currentUser}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </div>

      <input type="file" accept="image/*,application/pdf" className="hidden" ref={scanInputRef} onChange={handleFileSelection} />

      <main className="flex-1 w-full relative min-h-screen flex flex-col">
        {/* Universal Header (Sticky on Mobile) */}
        <header className="sticky top-0 z-50 bg-[#f8fafc]/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 lg:border-none lg:bg-transparent lg:static p-4 lg:px-12 lg:pt-12 lg:pb-0">
          <div className="flex items-center justify-between gap-4 max-w-[1500px] mx-auto w-full">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <Menu size={20} />
              </button>

              <div className="relative flex-1 max-w-[400px] lg:flex hidden group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-14 pr-6 shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all font-medium text-sm text-slate-700 dark:text-slate-200"
                />
              </div>

              {/* Mobile Title */}
              <div className="lg:hidden font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                {currentView.charAt(0).toUpperCase() + currentView.slice(1).replace('-', ' ')}
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-6">
              {/* Sync Status - desktop and mobile */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 lg:px-4 py-2 shadow-sm transition-all">
                {isSyncing ? (
                  <>
                    <Wifi size={14} className="text-indigo-500 animate-pulse" />
                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-indigo-500">SYNCING</span>
                  </>
                ) : (
                  <>
                    <Database size={14} className={isDBReady ? 'text-emerald-500' : 'text-amber-500 animate-pulse'} />
                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {isDBReady ? 'CLOUD READY' : 'CONNECTING'}
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="hidden sm:flex p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Cambiar Tema"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                onClick={() => {
                  if (typeof (window as any).filehubClearCache === 'function') {
                    (window as any).filehubClearCache();
                  } else {
                    window.location.reload();
                  }
                }}
                className="hidden sm:flex p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-amber-500 transition-colors"
                title="Limpiar caché y actualizar app"
              >
                <RefreshCw size={18} />
              </button>

              <div
                className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 lg:pr-4 lg:pl-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                onClick={() => setCurrentView('settings')}
              >
                <div className="w-8 h-8 lg:w-9 lg:h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200 dark:shadow-none">
                  <User size={16} />
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-bold text-slate-700 dark:text-white truncate max-w-[120px]">{currentUser || 'Usuario'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-[1500px] mx-auto w-full flex-1 p-4 lg:p-12 lg:pt-8 overflow-x-hidden">
          <div className="mb-8 lg:mb-12 lg:block hidden">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1).replace('-', ' ')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Controla y gestiona tu auditoría inteligente
            </p>
          </div>

          <div className="animate-in slide-in-from-bottom-2 duration-500 fill-mode-both">
            <div key={cloudSyncKey}>{renderContent()}</div>
          </div>
        </div>


      </main>

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onProcess={processFileWithAI}
          isProcessing={false}
        />
      )}

      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" size={32} />
          </div>
          <h2 className="text-xl font-black mt-8 tracking-[0.2em] uppercase">Auditoría IA</h2>
          <p className="text-indigo-300/60 mt-2 font-bold text-[10px] uppercase tracking-widest">Extrayendo flujo de datos...</p>
        </div>
      )}
      {/* Floating Calendar Button */}
      <FloatingCalendar
        calendarEvents={calendarEvents}
        tasks={tasks}
        onSyncEvents={(evts) => setCalendarEvents(evts)}
      />
      {/* Floating Daily Agenda */}
      <FloatingAgenda
        calendarEvents={calendarEvents}
        tasks={tasks}
        onToggleTask={(id, done) => {
          setTasks(tasks.map(t => t.id === id ? { ...t, completed: done } : t));
        }}
      />
      {/* AI Task Assistant */}
      <FloatingTaskAssistant
        calendarEvents={calendarEvents}
        tasks={tasks}
        onReorderTasks={(reordered) => setTasks(reordered)}
        onAddTask={(task) => setTasks(prev => [...prev, task])}
        onAddEvent={(event) => setCalendarEvents(prev => [...prev, event])}
      />
    </div>
  );
};

export default App;
