
import React, { useState, useEffect, useRef } from 'react';
import { ViewType, Expense, Project, Trip, CalendarEvent, Goal, Task, ShoppingItem, ShoppingOrder, Idea, OllamaConfig, OpenNotebookConfig, AnythingLLMConfig, Debt, Investment, Presentation, SharedExpense, SharedDebt, StoredFile, WeightEntry, NutritionPlan, TrainingSession, TrainingPlan, Partnership } from './types';
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
import OmniAssistant from './components/OmniAssistant';
import EconomyView from './components/EconomyView';
import TripsView from './components/TripsView';
import ShoppingView from './components/ShoppingView';
import QRView from './components/QRView';
import SettingsView from './components/SettingsView';
import SharedFinancesView from './components/SharedFinancesView';
import AuthView from './components/AuthView';
import FilesView from './components/FilesView';
import FilePreviewModal from './components/FilePreviewModal';
import { processUniversalDocument } from './services/geminiService';
import { nashService } from './services/nashService';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [isDBReady, setIsDBReady] = useState(false);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
    baseUrl: 'http://localhost:11434',
    model: 'llama3',
    isActive: true,
    apiKey: '1dcf3f607906462e9c4f8378cacc9621.iv_zvJYfxZKXtaf534JTHtj1'
  });

  const [openNotebookConfig, setOpenNotebookConfig] = useState<OpenNotebookConfig>({
    baseUrl: 'http://localhost:8000',
    collectionName: 'my-docs',
    isActive: true,
    apiKey: '1dcf3f607906462e9c4f8378cacc9621.iv_zvJYfxZKXtaf534JTHtj1'
  });

  const [anythingLLMConfig, setAnythingLLMConfig] = useState<AnythingLLMConfig>({
    baseUrl: 'http://100.69.142.77:3001',
    apiKey: '02NC02W-P4Z45JV-MMNPM95-2N5GD35',
    workspaceSlug: 'filehub-ia'
  });

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Check Supabase Session
  // Check Local Session
  useEffect(() => {
    nashService.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user.email);
        // syncProfile(session.user); // No separate profile sync needed for local
        loadCloudData(session.user.id);
      }
    });
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
      }
      setIsDBReady(true);
    };
    initOffline();
  }, []);

  // Auto-save to IndexedDB for safety
  useEffect(() => {
    const saveState = async () => {
      if (!isDBReady) return;
      try {
        await dbService.saveFullState({
          expenses, debts, investments, projects, presentations, tasks, goals,
          shoppingItems, shoppingOrders, calendarEvents, ideas, sharedExpenses,
          sharedDebts, weightEntries, nutritionPlans, files, trips
        });
      } catch (err) {
        console.error("Error auto-saving to IndexedDB", err);
      }
    };
    saveState();
  }, [expenses, debts, investments, projects, presentations, tasks, goals, shoppingItems, shoppingOrders, calendarEvents, ideas, sharedExpenses, sharedDebts, weightEntries, nutritionPlans, files, trips, isDBReady]);

  // Load Data from Local Server DO NOT USE SUPA
  const loadCloudData = async (userId: string) => {
    console.log("Cargando datos del Servidor Nash...");
    setIsSyncing(true);

    try {
      // 1. Fetch all data concurrently from Local API
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
        { data: planData }
      ] = await Promise.all([
        nashService.db.getAll('expenses'),
        nashService.db.getAll('calendar_events'),
        nashService.db.getAll('tasks'),
        nashService.db.getAll('projects'),
        nashService.db.getAll('goals'),
        nashService.db.getAll('ideas'),
        nashService.db.getAll('shopping_items'),
        nashService.db.getAll('debts'),
        nashService.db.getAll('investments'),
        nashService.db.getAll('trips'),
        nashService.db.getAll('shopping_orders'),
        nashService.db.getAll('shared_expenses'),
        nashService.db.getAll('shared_debts'),
        nashService.db.getAll('weight_entries'),
        nashService.db.getAll('nutrition_plans'),
        nashService.db.getAll('files'),
        nashService.db.getAll('presentations'),
        nashService.db.getAll('training_sessions'),
        nashService.db.getAll('training_plans')
      ]);

      // 2. Map cloud data to local formats
      // Note: Nash API returns raw JSON stored, so we might not need heavy mapping if we store exact objects.
      // However, to keep compatibility with existing objects that might have been saved, we apply simple mapping.
      // If the backend stores exact JSON, we can assume direct usage but let's keep robust mapping.

      const mapRaw = (list: any[]) => list || [];

      setTasks(mapRaw(taskData));
      setExpenses(mapRaw(expData));
      setCalendarEvents(mapRaw(evtData));
      setProjects(mapRaw(projData));
      setGoals(mapRaw(goalData));
      setIdeas(mapRaw(ideaData));
      setShoppingItems(mapRaw(shopData));
      setDebts(mapRaw(debtsData));
      setInvestments(mapRaw(investData));
      setTrips(mapRaw(tripData));
      setShoppingOrders(mapRaw(ordData));
      setSharedExpenses(mapRaw(sharedExpData));
      setSharedDebts(mapRaw(sharedDebtData));
      setWeightEntries(mapRaw(weightData));
      setNutritionPlans(mapRaw(nutPlanData));
      setFiles(mapRaw(fileData));
      setPresentations(mapRaw(presData));
      setTrainingSessions(mapRaw(trainingData));
      setTrainingPlans(mapRaw(planData));

      setIsDBReady(true);
    } catch (e) {
      console.error("Error loading Nash data", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (user: any) => {
    // Session is handled by nashService result
    setIsAuthenticated(true);
    setCurrentUser(user.email);
    //syncProfile(user);
    loadCloudData(user.id);
  };

  const handleLogout = async () => {
    await nashService.auth.signOut();
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
    await nashService.db.upsert('profiles', {
      id: user.id,
      email: user.email
    });
  };

  // Partner features disabled in NASH V1
  const handleInvitePartner = async (email: string) => {
    alert("Partner features are not yet available in FILEBASE 2.0 NASH.");
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
          for (const exp of newExps) {
            await nashService.db.upsert('expenses', exp);
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
    await nashService.db.upsert('expenses', e);
  };
  const handleDeleteExpense = async (id: string) => {
    if (confirm("¿Eliminar este gasto?")) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      await nashService.db.delete('expenses', id);
    }
  };
  const handleUpdateExpense = async (e: Expense) => {
    setExpenses(prev => prev.map(ex => ex.id === e.id ? e : ex));
    await nashService.db.upsert('expenses', e);
  };

  // DEBTS
  const handleAddDebt = async (d: Debt) => {
    setDebts([...debts, d]);
    await nashService.db.upsert('debts', d);
  };

  // INVESTMENTS
  const handleAddInvestment = async (i: Investment) => {
    setInvestments([...investments, i]);
    await nashService.db.upsert('investments', i);
  };

  const handleDeleteInvestment = async (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    await nashService.db.delete('investments', id);
  };

  // EVENTS
  const handleAddEvent = async (e: CalendarEvent) => {
    setCalendarEvents([...calendarEvents, e]);
    await nashService.db.upsert('calendar_events', e);
  };
  const handleDeleteEvent = async (id: string) => {
    if (confirm("¿Eliminar este evento?")) {
      setCalendarEvents(prev => prev.filter(e => e.id !== id));
      await nashService.db.delete('calendar_events', id);
    }
  };

  // TASKS
  const handleAddTask = async (t: Task) => {
    setTasks([t, ...tasks]);
    await nashService.db.upsert('tasks', t);
  };
  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    const updatedTask = { ...task, completed: newCompleted };
    setTasks(tasks.map(t => t.id === id ? updatedTask : t));
    await nashService.db.upsert('tasks', updatedTask);
  };
  const handleDeleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    await nashService.db.delete('tasks', id);
  };

  // PROJECTS
  const handleAddProject = async (p: Project) => {
    setProjects([p, ...projects]);
    await nashService.db.upsert('projects', p);
  };
  const handleUpdateProject = async (p: Project) => {
    setProjects(prev => prev.map(proj => proj.id === p.id ? p : proj));
    await nashService.db.upsert('projects', p);
  };

  const handleDeleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await nashService.db.delete('projects', id);
  };

  // GOALS
  const handleAddGoal = async (g: Goal) => {
    setGoals([...goals, g]);
    await nashService.db.upsert('goals', g);
  };
  const handleUpdateGoal = async (g: Goal) => {
    setGoals(prev => prev.map(go => go.id === g.id ? g : go));
    await nashService.db.upsert('goals', g);
  };
  const handleDeleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await nashService.db.delete('goals', id);
  };

  // IDEAS
  const handleAddIdea = async (i: Idea) => {
    setIdeas([i, ...ideas]);
    await nashService.db.upsert('ideas', i);
  };
  const handleDeleteIdea = async (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    await nashService.db.delete('ideas', id);
  };
  const handleUpdateIdea = async (i: Idea) => {
    setIdeas(prev => prev.map(ide => ide.id === i.id ? i : ide));
    await nashService.db.upsert('ideas', i);
  };

  // SHOPPING
  const handleAddItem = async (i: ShoppingItem) => {
    setShoppingItems([...shoppingItems, i]);
    await nashService.db.upsert('shopping_items', i);
  };
  const handleToggleItem = async (id: string) => {
    const item = shoppingItems.find(i => i.id === id);
    if (!item) return;
    const newPurchased = !item.purchased;
    const updatedItem = { ...item, purchased: newPurchased };
    setShoppingItems(prev => prev.map(i => i.id === id ? updatedItem : i));
    await nashService.db.upsert('shopping_items', updatedItem);
  };
  const handleDeleteItem = async (id: string) => {
    setShoppingItems(prev => prev.filter(i => i.id !== id));
    await nashService.db.delete('shopping_items', id);
  };
  const handleAddOrder = async (o: ShoppingOrder) => {
    setShoppingOrders([o, ...shoppingOrders]);
    await nashService.db.upsert('shopping_orders', o);
  };

  const handleDeleteOrder = async (id: string) => {
    setShoppingOrders(prev => prev.filter(o => o.id !== id));
    await nashService.db.delete('shopping_orders', id);
  };

  // SHARED FINANCES
  const handleAddSharedExpense = async (e: SharedExpense) => {
    setSharedExpenses([e, ...sharedExpenses]);
    await nashService.db.upsert('shared_expenses', e);
  };
  const handleAddSharedDebt = async (d: SharedDebt) => {
    setSharedDebts([d, ...sharedDebts]);
    await nashService.db.upsert('shared_debts', d);
  };
  const handleSettleSharedDebt = async (id: string) => {
    const debt = sharedDebts.find(d => d.id === id);
    if (!debt) return;
    const updatedDebt = { ...debt, status: 'settled' as const }; // Explicit cast if needed, though ...debt handles it
    setSharedDebts(prev => prev.map(d => d.id === id ? updatedDebt : d));
    await nashService.db.upsert('shared_debts', updatedDebt);
  };
  const handleDeleteSharedExpense = async (id: string) => {
    setSharedExpenses(prev => prev.filter(e => e.id !== id));
    await nashService.db.delete('shared_expenses', id);
  };
  const handleDeleteSharedDebt = async (id: string) => {
    setSharedDebts(prev => prev.filter(d => d.id !== id));
    await nashService.db.delete('shared_debts', id);
  };

  // FILES
  const handleAddFile = async (f: StoredFile) => {
    setFiles([...files, f]);
    await nashService.db.upsert('files', f);
  };
  const handleUpdateFile = async (f: StoredFile) => {
    setFiles(prev => prev.map(fi => fi.id === f.id ? f : fi));
    await nashService.db.upsert('files', f);
  };
  const handleDeleteFile = async (id: string) => {
    const fileToDelete = files.find(f => f.id === id);
    setFiles(prev => prev.filter(f => f.id !== id));
    await nashService.db.delete('files', id);
    // File storage cleanup handled loosely by backend for now or we can impl robustly later
  };

  // NUTRITION & WEIGHT
  const handleAddWeight = async (w: WeightEntry) => {
    setWeightEntries([...weightEntries, w]);
    await nashService.db.upsert('weight_entries', w);
  };
  const handleDeleteWeight = async (id: string) => {
    setWeightEntries(prev => prev.filter(w => w.id !== id));
    await nashService.db.delete('weight_entries', id);
  };
  const handleAddNutritionPlan = async (p: NutritionPlan) => {
    setNutritionPlans([...nutritionPlans, p]);
    await nashService.db.upsert('nutrition_plans', p);
  };
  const handleDeletePlan = async (id: string) => {
    setNutritionPlans(prev => prev.filter(p => p.id !== id));
    await nashService.db.delete('nutrition_plans', id);
  };

  // PRESENTATIONS
  const handleAddPresentation = async (p: Presentation) => {
    setPresentations([p, ...presentations]);
    await nashService.db.upsert('presentations', p);
  };

  const handleDeletePresentation = async (id: string) => {
    if (confirm("¿Eliminar esta presentación?")) {
      setPresentations(prev => prev.filter(p => p.id !== id));
      await nashService.db.delete('presentations', id);
    }
  };

  // TRIPS
  const handleAddTrip = async (t: Trip) => {
    setTrips([...trips, t]);
    await nashService.db.upsert('trips', t);
  };
  const handleDeleteTrip = async (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));
    await nashService.db.delete('trips', id);
  };

  // TRAINING
  const handleAddTrainingSession = async (s: TrainingSession) => {
    setTrainingSessions([...trainingSessions, s]);
    await nashService.db.upsert('training_sessions', s);
  };
  const handleDeleteTrainingSession = async (id: string) => {
    setTrainingSessions(prev => prev.filter(s => s.id !== id));
    await nashService.db.delete('training_sessions', id);
  };
  const handleAddTrainingPlan = async (p: TrainingPlan) => {
    setTrainingPlans([...trainingPlans, p]);
    await nashService.db.upsert('training_plans', p);
  };
  const handleDeleteTrainingPlan = async (id: string) => {
    setTrainingPlans(prev => prev.filter(p => p.id !== id));
    await nashService.db.delete('training_plans', id);
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
          onDeleteExpense={handleDeleteSharedExpense}
          onDeleteDebt={handleDeleteSharedDebt}
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
          anythingLLMConfig={anythingLLMConfig}
          onUpdateConfig={setOllamaConfig}
          onUpdateNotebookConfig={setOpenNotebookConfig}
          onUpdateAnythingConfig={setAnythingLLMConfig}
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
          onNavigate={setCurrentView}
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
      case 'shared-hub': return (
        <PartnerHubView
          partnership={partnership}
          sharedExpenses={sharedExpenses}
          currentUser={session?.user?.id || null}
          onInvitePartner={handleInvitePartner}
          onAddSharedTask={(title) => {
            // Internal task handling in component for now
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
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
          onAddGoal={handleAddGoal}
          onAddIdea={handleAddIdea}
          onAddEvent={handleAddEvent}
          globalContext={{ files }}
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
          currentView={currentView}
          onViewChange={(v) => {
            setCurrentView(v);
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
            {renderContent()}
          </div>
        </div>

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
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" size={32} />
          </div>
          <h2 className="text-xl font-black mt-8 tracking-[0.2em] uppercase">Auditoría IA</h2>
          <p className="text-indigo-300/60 mt-2 font-bold text-[10px] uppercase tracking-widest">Extrayendo flujo de datos...</p>
        </div>
      )}
    </div>
  );
};

export default App;
