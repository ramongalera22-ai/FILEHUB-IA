
import React, { useState, useEffect, useRef } from 'react';
import { ViewType, Expense, Project, Trip, CalendarEvent, Goal, Task, ShoppingItem, ShoppingOrder, Idea, OllamaConfig, OpenNotebookConfig, Debt, Investment, Presentation, SharedExpense, SharedDebt, StoredFile, WeightEntry, NutritionPlan, TrainingSession, TrainingPlan } from './types';
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
import CalendarView from './components/CalendarView';
import OmniAssistant from './components/OmniAssistant';
import EconomyView from './components/EconomyView';
import TripsView from './components/TripsView';
import ShoppingView from './components/ShoppingView';
import QRView from './components/QRView';
import IdeasView from './components/IdeasView';
import AIHubView from './components/AIHubView';
import SettingsView from './components/SettingsView';
import SharedFinancesView from './components/SharedFinancesView';
import AuthView from './components/AuthView';
import FilesView from './components/FilesView';
import FilePreviewModal from './components/FilePreviewModal';
import { processUniversalDocument } from './services/geminiService';
import { supabase } from './services/supabaseClient';
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
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
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
  
  // New Synced States for Fitness
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);

  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [isDBReady, setIsDBReady] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
    baseUrl: 'http://localhost:11434',
    model: 'llama3',
    isActive: false,
    apiKey: '9910c6ebb8f744bb9f2db216e39c0b60.G9r3mMB-WnPbeVrUVAj14NKG'
  });

  const [openNotebookConfig, setOpenNotebookConfig] = useState<OpenNotebookConfig>({
    baseUrl: 'http://localhost:8000',
    collectionName: 'my-docs',
    isActive: false
  });
  
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Check Supabase Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user.email);
        loadCloudData(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user.email);
        loadCloudData(session.user.id);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  // Load Data from Supabase
  const loadCloudData = async (userId: string) => {
    setIsDBReady(false);
    
    try {
      const { data: expData } = await supabase.from('expenses').select('*').eq('user_id', userId);
      if (expData) setExpenses(expData);

      const { data: evtData } = await supabase.from('calendar_events').select('*').eq('user_id', userId);
      if (evtData) {
        setCalendarEvents(evtData.map((e: any) => ({
          id: e.id, title: e.title, start: e.start_date, end: e.end_date, type: e.type
        })));
      }

      const { data: taskData } = await supabase.from('tasks').select('*').eq('user_id', userId);
      if (taskData) {
        setTasks(taskData.map((t: any) => ({
          id: t.id, title: t.title, completed: t.completed, category: t.category, priority: t.priority,
          dueDate: t.due_date, isRecurring: t.is_recurring, frequency: t.frequency
        })));
      }

      const { data: projData } = await supabase.from('projects').select('*').eq('user_id', userId);
      if (projData) setProjects(projData);

      const { data: goalData } = await supabase.from('goals').select('*').eq('user_id', userId);
      if (goalData) {
        setGoals(goalData.map((g: any) => ({
          ...g, targetDate: g.target_date, currentValue: g.current_value, targetValue: g.target_value
        })));
      }

      const { data: ideaData } = await supabase.from('ideas').select('*').eq('user_id', userId);
      if (ideaData) {
        setIdeas(ideaData.map((i: any) => ({
          ...i, createdAt: i.created_at
        })));
      }

      const { data: shopData } = await supabase.from('shopping_items').select('*').eq('user_id', userId);
      if (shopData) {
        setShoppingItems(shopData.map((s: any) => ({
          ...s, estimatedPrice: s.estimated_price
        })));
      }

      const { data: debtsData } = await supabase.from('debts').select('*').eq('user_id', userId);
      if (debtsData) setDebts(debtsData.map((d: any) => ({
        ...d, totalAmount: d.total_amount, paidAmount: d.paid_amount, dueDate: d.due_date, interestRate: d.interest_rate
      })));

      const { data: investData } = await supabase.from('investments').select('*').eq('user_id', userId);
      if (investData) setInvestments(investData.map((i: any) => ({
        ...i, expectedReturn: i.expected_return
      })));

      const { data: tripData } = await supabase.from('trips').select('*').eq('user_id', userId);
      if (tripData) setTrips(tripData.map((t: any) => ({
        ...t, startDate: t.start_date, endDate: t.end_date, notebookUrl: t.notebook_url
      })));

      const { data: ordData } = await supabase.from('shopping_orders').select('*').eq('user_id', userId);
      if (ordData) setShoppingOrders(ordData.map((o: any) => ({
        ...o, trackingNumber: o.tracking_number
      })));

      const { data: sharedExpData } = await supabase.from('shared_expenses').select('*').eq('user_id', userId);
      if (sharedExpData) setSharedExpenses(sharedExpData.map((e: any) => ({
        ...e, splitBetween: e.split_between, paidBy: e.paid_by
      })));

      const { data: sharedDebtData } = await supabase.from('shared_debts').select('*').eq('user_id', userId);
      if (sharedDebtData) setSharedDebts(sharedDebtData);

      const { data: weightData } = await supabase.from('weight_entries').select('*').eq('user_id', userId);
      if (weightData) setWeightEntries(weightData);

      const { data: nutPlanData } = await supabase.from('nutrition_plans').select('*').eq('user_id', userId);
      if (nutPlanData) setNutritionPlans(nutPlanData.map((p: any) => ({
        ...p, uploadDate: p.upload_date
      })));

      const { data: fileData } = await supabase.from('files').select('*').eq('user_id', userId);
      if (fileData) setFiles(fileData.map((f: any) => ({
        ...f, aiSummary: f.ai_summary
      })));

      const { data: presData } = await supabase.from('presentations').select('*').eq('user_id', userId);
      if (presData) setPresentations(presData.map((p: any) => ({
        ...p, dueDate: p.due_date
      })));

      const { data: trainingData } = await supabase.from('training_sessions').select('*').eq('user_id', userId);
      if (trainingData) setTrainingSessions(trainingData);

      const { data: planData } = await supabase.from('training_plans').select('*').eq('user_id', userId);
      if (planData) setTrainingPlans(planData.map((p: any) => ({
        ...p, durationWeeks: p.duration_weeks
      })));

      setIsDBReady(true);
    } catch (e) {
      console.error("Error loading cloud data", e);
    }
  };

  const handleLogin = (user: any) => {
    // Handled by onAuthStateChange in useEffect
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
        id: e.id, user_id: session.user.id, amount: e.amount, vendor: e.vendor, date: e.date,
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
      id: d.id, user_id: session.user.id, name: d.name, total_amount: d.totalAmount, paid_amount: d.paidAmount,
      due_date: d.dueDate, category: d.category, interest_rate: d.interestRate
    });
  };

  // INVESTMENTS
  const handleAddInvestment = async (i: Investment) => {
    setInvestments([...investments, i]);
    if (session) await supabase.from('investments').insert({
      id: i.id, user_id: session.user.id, name: i.name, amount: i.amount, date: i.date,
      status: i.status, category: i.category, expected_return: i.expectedReturn
    });
  };

  // EVENTS
  const handleAddEvent = async (e: CalendarEvent) => {
    setCalendarEvents([...calendarEvents, e]);
    if (session) await supabase.from('calendar_events').insert({
        id: e.id, user_id: session.user.id, title: e.title, start_date: e.start, end_date: e.end, type: e.type
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
      id: t.id, user_id: session.user.id, title: t.title, completed: t.completed, category: t.category,
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
      id: p.id, user_id: session.user.id, name: p.name, budget: p.budget, spent: p.spent, 
      deadline: p.deadline, status: p.status, notebook_url: p.notebookUrl
    });
  };
  const handleUpdateProject = async (p: Project) => {
    setProjects(prev => prev.map(proj => proj.id === p.id ? p : proj));
    if (session) await supabase.from('projects').update({
      name: p.name, budget: p.budget, deadline: p.deadline, notebook_url: p.notebookUrl, spent: p.spent
    }).eq('id', p.id);
  };

  // GOALS
  const handleAddGoal = async (g: Goal) => {
    setGoals([...goals, g]);
    if (session) await supabase.from('goals').insert({
      id: g.id, user_id: session.user.id, title: g.title, target_date: g.targetDate,
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
      id: i.id, user_id: session.user.id, title: i.title, description: i.description, 
      category: i.category, priority: i.priority, status: i.status, created_at: i.createdAt
    });
  };
  const handleDeleteIdea = async (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    if (session) await supabase.from('ideas').delete().eq('id', id);
  };
  const handleUpdateIdea = async (i: Idea) => {
    setIdeas(prev => prev.map(id => id.id === i.id ? i : id));
    // Implementation for update if needed in future
  };

  // SHOPPING
  const handleAddItem = async (i: ShoppingItem) => {
    setShoppingItems([...shoppingItems, i]);
    if (session) await supabase.from('shopping_items').insert({
      id: i.id, user_id: session.user.id, name: i.name, estimated_price: i.estimatedPrice,
      category: i.category, purchased: i.purchased, store: i.store
    });
  };
  const handleToggleItem = async (id: string) => {
    const item = shoppingItems.find(i => i.id === id);
    if (!item) return;
    const newPurchased = !item.purchased;
    setShoppingItems(prev => prev.map(i => i.id === id ? {...i, purchased: newPurchased} : i));
    if (session) await supabase.from('shopping_items').update({ purchased: newPurchased }).eq('id', id);
  };
  const handleDeleteItem = async (id: string) => {
    setShoppingItems(prev => prev.filter(i => i.id !== id));
    if (session) await supabase.from('shopping_items').delete().eq('id', id);
  };
  const handleAddOrder = async (o: ShoppingOrder) => {
    setShoppingOrders([o, ...shoppingOrders]);
    if (session) await supabase.from('shopping_orders').insert({
      id: o.id, user_id: session.user.id, store: o.store, date: o.date, total: o.total, status: o.status
    });
  };

  // SHARED FINANCES
  const handleAddSharedExpense = async (e: SharedExpense) => {
    setSharedExpenses([e, ...sharedExpenses]);
    if (session) await supabase.from('shared_expenses').insert({
      id: e.id, user_id: session.user.id, amount: e.amount, vendor: e.vendor, date: e.date,
      category: e.category, description: e.description, priority: e.priority, paid_by: e.paidBy, split_between: e.splitBetween
    });
  };
  const handleAddSharedDebt = async (d: SharedDebt) => {
    setSharedDebts([d, ...sharedDebts]);
    if (session) await supabase.from('shared_debts').insert({
      id: d.id, user_id: session.user.id, from: d.from, to: d.to, amount: d.amount, description: d.description, date: d.date, status: d.status
    });
  };
  const handleSettleSharedDebt = async (id: string) => {
    setSharedDebts(prev => prev.map(d => d.id === id ? { ...d, status: 'settled' } : d));
    if (session) await supabase.from('shared_debts').update({ status: 'settled' }).eq('id', id);
  };

  // FILES
  const handleAddFile = async (f: StoredFile) => {
    setFiles([...files, f]);
    if (session) await supabase.from('files').insert({
      id: f.id, user_id: session.user.id, name: f.name, type: f.type, size: f.size, 
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
    setFiles(prev => prev.filter(f => f.id !== id));
    if (session) await supabase.from('files').delete().eq('id', id);
  };

  // NUTRITION & WEIGHT
  const handleAddWeight = async (w: WeightEntry) => {
    setWeightEntries([...weightEntries, w]);
    if (session) await supabase.from('weight_entries').insert({
      id: w.id, user_id: session.user.id, date: w.date, weight: w.weight, note: w.note
    });
  };
  const handleAddNutritionPlan = async (p: NutritionPlan) => {
    setNutritionPlans([...nutritionPlans, p]);
    if (session) await supabase.from('nutrition_plans').insert({
      id: p.id, user_id: session.user.id, name: p.name, upload_date: p.uploadDate, type: p.type, url: p.url
    });
  };
  const handleDeletePlan = async (id: string) => {
    setNutritionPlans(prev => prev.filter(p => p.id !== id));
    if (session) await supabase.from('nutrition_plans').delete().eq('id', id);
  };

  // PRESENTATIONS
  const handleAddPresentation = async (p: Presentation) => {
    setPresentations([p, ...presentations]);
    if (session) await supabase.from('presentations').insert({
      id: p.id, user_id: session.user.id, title: p.title, client: p.client, status: p.status, due_date: p.dueDate, priority: p.priority
    });
  };

  // TRIPS
  const handleAddTrip = async (t: Trip) => {
    setTrips([...trips, t]);
    if (session) await supabase.from('trips').insert({
      id: t.id, user_id: session.user.id, destination: t.destination, start_date: t.startDate, end_date: t.endDate, budget: t.budget, notebook_url: t.notebookUrl
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
      id: s.id, user_id: session.user.id, title: s.title, date: s.date, type: s.type, duration: s.duration, intensity: s.intensity, status: s.status, notes: s.notes
    });
  };
  const handleDeleteTrainingSession = async (id: string) => {
    setTrainingSessions(prev => prev.filter(s => s.id !== id));
    if (session) await supabase.from('training_sessions').delete().eq('id', id);
  };
  const handleAddTrainingPlan = async (p: TrainingPlan) => {
    setTrainingPlans([...trainingPlans, p]);
    if (session) await supabase.from('training_plans').insert({
      id: p.id, user_id: session.user.id, name: p.name, description: p.description, duration_weeks: p.durationWeeks, source: p.source
    });
  };
  const handleDeleteTrainingPlan = async (id: string) => {
    setTrainingPlans(prev => prev.filter(p => p.id !== id));
    if (session) await supabase.from('training_plans').delete().eq('id', id);
  };

  if (!isAuthenticated) {
    return <AuthView onLogin={handleLogin} />;
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
        />
      );
      case 'economy': return (
        <EconomyView 
          expenses={expenses} 
          onClearAll={() => setExpenses([])} 
          onAddExpenses={(exps) => exps.forEach(e => handleAddExpense(e))}
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
          onUpdateConfig={setOllamaConfig} 
          onUpdateNotebookConfig={setOpenNotebookConfig}
          globalContext={globalContext} 
        />
      );
      case 'qr': return <QRView />;
      case 'settings': return (
        <SettingsView 
          currentUser={currentUser || 'Invitado'}
          ollamaConfig={ollamaConfig}
          isDarkMode={darkMode}
          toggleDarkMode={() => setDarkMode(!darkMode)}
        />
      );
      case 'fitness': return (
        <FitnessView 
          sessions={trainingSessions}
          plans={trainingPlans}
          onAddSession={handleAddTrainingSession}
          onDeleteSession={handleDeleteTrainingSession}
          onAddPlan={handleAddTrainingPlan}
          onDeletePlan={handleDeleteTrainingPlan}
          onSyncPlan={(events) => {
             events.forEach(ev => handleAddEvent(ev));
          }} 
        />
      );
      case 'courses': return <LearningView />;
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
    <div className={`min-h-screen flex flex-col md:flex-row bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden ${darkMode ? 'dark' : ''}`}>
      <div className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
      <div className={`fixed left-0 top-0 h-full z-50 transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:flex`}>
        <Sidebar currentView={currentView} onViewChange={(v) => { setCurrentView(v); setIsSidebarOpen(false); }} onScanClick={handleScanClick} onLogout={handleLogout} />
      </div>

      <input type="file" accept="image/*,application/pdf" className="hidden" ref={scanInputRef} onChange={handleFileSelection} />
      
      <main className="flex-1 w-full p-4 md:p-12 relative min-h-screen flex flex-col">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-16 gap-6">
          <div className="flex items-center w-full md:w-auto gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
               <Menu size={24} className="text-slate-700 dark:text-slate-200" />
            </button>
            <div className="relative flex-1 md:w-[400px] group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Buscar en FILEHUB..." className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-16 pr-8 shadow-sm focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400" />
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-end">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden lg:flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 shadow-sm">
               <Database size={16} className={isDBReady ? 'text-emerald-500' : 'text-amber-500 animate-pulse'} />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isDBReady ? 'CLOUD SYNC' : 'CONNECTING...'}</span>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 pr-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => setCurrentView('settings')}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black"><User size={20} /></div>
              <div className="hidden sm:block">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[150px]">{currentUser || 'Usuario'}</p>
                <div className="flex items-center gap-1">
                   <Wifi size={8} className="text-emerald-500" />
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Conectado</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-[1500px] mx-auto w-full flex-1 overflow-hidden">{renderContent()}</div>
        
        <OmniAssistant 
          globalContext={globalContext} 
          onAddExpenses={(newExpenses) => {
             newExpenses.forEach(e => handleAddExpense(e));
          }}
        />
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
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[600] flex flex-col items-center justify-center text-white animate-in fade-in">
          <div className="relative">
            <div className="w-32 h-32 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" size={40} />
          </div>
          <h2 className="text-2xl font-black mt-8 tracking-widest uppercase">Analizando con IA</h2>
          <p className="text-indigo-300 mt-2 font-bold text-xs">Extrayendo transacciones y flujos...</p>
        </div>
      )}
    </div>
  );
};

export default App;
