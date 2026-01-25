
import React, { useState, useEffect, useMemo } from 'react';
import { Partnership, SharedHubActivity, SharedExpense, Task, CalendarEvent, Trip, SharedDocument, HubSection } from '../types';
import {
    Users,
    Heart,
    Plus,
    Send,
    Calendar,
    CheckSquare,
    Receipt,
    Plane,
    Sparkles,
    Loader2,
    Trash2,
    Link2,
    Zap,
    Clock,
    LayoutDashboard,
    FileText,
    Upload,
    Download,
    X,
    File,
    Home,
    Activity,
    ShoppingBag,
    Brain,
    Share2,
    ArrowUpRight,
    Edit3,
    UploadCloud,
    Eraser,
    Pencil,
    Circle,
    Square,
    Undo,
    Redo
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import Whiteboard from './Whiteboard';

interface PartnerHubViewProps {
    partnership: Partnership | null;
    sharedExpenses: SharedExpense[];
    currentUser: string | null;
    onInvitePartner: (email: string) => void;
    onAddSharedTask: (title: string) => void;
    activeTab?: 'dashboard' | 'tasks' | 'calendar' | 'finance' | 'piso' | 'activities' | 'shopping';
    onTabChange?: (tab: 'dashboard' | 'tasks' | 'calendar' | 'finance' | 'piso' | 'activities' | 'shopping') => void;
}

const PartnerHubView: React.FC<PartnerHubViewProps> = ({
    partnership,
    sharedExpenses,
    currentUser,
    onInvitePartner,
    onAddSharedTask,
    activeTab: propActiveTab = 'dashboard',
    onTabChange
}) => {
    const [internalActiveTab, setInternalActiveTab] = useState<'dashboard' | 'tasks' | 'calendar' | 'finance' | 'piso' | 'activities' | 'shopping' | 'whiteboard'>(propActiveTab);

    // Sync prop to state
    useEffect(() => {
        setInternalActiveTab(propActiveTab as any);
    }, [propActiveTab]);

    const setActiveTab = (tab: 'dashboard' | 'tasks' | 'calendar' | 'finance' | 'piso' | 'activities' | 'shopping' | 'whiteboard') => {
        setInternalActiveTab(tab);
        if (onTabChange) onTabChange(tab);
    };

    const activeTab = internalActiveTab;
    const [inviteEmail, setInviteEmail] = useState('');
    const [activities, setActivities] = useState<SharedHubActivity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [sharedTasks, setSharedTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [trips, setTrips] = useState<Trip[]>([]);
    const [sharedTrip, setSharedTrip] = useState<Trip | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'itinerary' | 'notebook' | 'documents' | 'whiteboard'>('itinerary');
    const [documents, setDocuments] = useState<SharedDocument[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showFeedInput, setShowFeedInput] = useState(false);
    const [newFeedMessage, setNewFeedMessage] = useState('');
    const [showTripModal, setShowTripModal] = useState(false);
    const [newTripData, setNewTripData] = useState({
        destination: '',
        startDate: '',
        endDate: '',
        budget: 0
    });
    const [monthlyBudget, setMonthlyBudget] = useState(2500);
    const [activeWorkTab, setActiveWorkTab] = useState<'feed' | 'tasks' | 'documents' | 'whiteboard' | 'notebook'>('feed');
    const [hubSections, setHubSections] = useState<HubSection[]>([]);

    const COLORS = ['#6366f1', '#e2e8f0']; // Indigo for expenses, Slate for available

    // Fetch initial data and setup subscriptions
    useEffect(() => {
        if (!partnership) return;

        const fetchData = async () => {
            setIsLoading(true);
            const [actData, taskData, tripData, docData, hubData] = await Promise.all([
                supabase.from('shared_hub_activities').select('*').eq('partnership_id', partnership.id).order('created_at', { ascending: false }).limit(20),
                supabase.from('tasks').select('*').eq('partnership_id', partnership.id),
                supabase.from('trips').select('*').eq('partnership_id', partnership.id),
                supabase.from('shared_documents').select('*').eq('partnership_id', partnership.id).order('created_at', { ascending: false }),
                supabase.from('hub_sections').select('*').eq('partnership_id', partnership.id)
            ]);

            if (actData.data) setActivities(actData.data as SharedHubActivity[]);
            if (taskData.data) setSharedTasks(taskData.data as Task[]);

            if (tripData.data) {
                // Map DB snake_case to CamelCase for all trips
                const mappedTrips: Trip[] = (tripData.data as any[]).map(dbTrip => ({
                    ...dbTrip,
                    startDate: dbTrip.start_date,
                    endDate: dbTrip.end_date,
                    notebookUrl: dbTrip.notebook_url,
                    aiItinerary: dbTrip.ai_itinerary,
                    whiteboardData: dbTrip.whiteboard_data,
                    partnership_id: dbTrip.partnership_id,
                    notes: dbTrip.notes
                }));
                // Sort trips: Special sections last, then by date?
                // Actually we just filter them by name when needed.
                setTrips(mappedTrips);
            }
            if (docData.data) setDocuments(docData.data as SharedDocument[]);

            if (hubData.data) {
                const mappedSections: HubSection[] = (hubData.data as any[]).map(dbSection => ({
                    ...dbSection,
                    notebookUrl: dbSection.notebook_url,
                    openNotebookUrl: dbSection.open_notebook_url,
                    boardContent: dbSection.board_content,
                    whiteboardData: dbSection.whiteboard_data
                }));
                setHubSections(mappedSections);
            }

            setIsLoading(false);
        };
        fetchData();

        // Realtime Subscriptions
        const sub = supabase.channel('shared-hub')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_hub_activities', filter: `partnership_id=eq.${partnership.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setActivities(prev => [payload.new as SharedHubActivity, ...prev]);
                    }
                })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `partnership_id=eq.${partnership.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newTask = payload.new as Task;
                        setSharedTasks(prev => {
                            if (prev.find(t => t.id === newTask.id)) return prev;
                            return [newTask, ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedTask = payload.new as Task;
                        setSharedTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                    } else if (payload.eventType === 'DELETE') {
                        setSharedTasks(prev => prev.filter(t => t.id !== payload.old.id));
                    }
                })
            .subscribe();

        return () => { sub.unsubscribe(); };
    }, [partnership]);

    useEffect(() => {
        if (activeTab === 'piso') getOrCreateHubSection('PISO BARCELONA');
        if (activeTab === 'activities') getOrCreateHubSection('ACTIVIDADES');
        if (activeTab === 'shopping') getOrCreateHubSection('COMPRAS');
        if (activeTab === 'tasks') getOrCreateHubSection('WORKHUB');
    }, [activeTab]);

    const handleAddTask = async () => {
        if (!newTaskTitle || !partnership) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newTask = {
            id: crypto.randomUUID(),
            title: newTaskTitle,
            completed: false,
            category: 'personal',
            priority: 'medium',
            partnership_id: partnership.id,
            user_id: user.id
        };

        const { error } = await supabase.from('tasks').insert(newTask);
        if (!error) {
            // Optimistic update
            setSharedTasks(prev => [newTask as any, ...prev]);
            setNewTaskTitle('');

            // Log activity
            await supabase.from('shared_hub_activities').insert({
                partnership_id: partnership.id,
                user_id: user.id,
                type: 'task',
                action: 'created',
                content: { title: newTaskTitle }
            });
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm('¿Eliminar esta tarea?')) return;

        // Optimistic update
        setSharedTasks(prev => prev.filter(t => t.id !== id));

        const { error } = await supabase.from('tasks').delete().eq('id', id);

        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && partnership) {
                await supabase.from('shared_hub_activities').insert({
                    partnership_id: partnership.id,
                    user_id: user.id,
                    type: 'task',
                    action: 'deleted',
                    content: { title: 'Tarea eliminada' }
                });
            }
        }
    };

    const handlePostFeed = async () => {
        if (!newFeedMessage.trim() || !partnership) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('shared_hub_activities').insert({
            partnership_id: partnership.id,
            user_id: user.id,
            type: 'note',
            action: 'created',
            content: { title: newFeedMessage }
        });

        if (!error) {
            setNewFeedMessage('');
            setShowFeedInput(false);
        }
    };

    const handleCreateTrip = () => {
        setShowTripModal(true);
    };

    const confirmCreateTrip = async () => {
        if (!partnership) return;

        const newTrip: Trip = {
            id: crypto.randomUUID(),
            destination: newTripData.destination || 'Nuevo Viaje',
            startDate: newTripData.startDate || new Date().toISOString().split('T')[0],
            endDate: newTripData.endDate || new Date().toISOString().split('T')[0],
            budget: newTripData.budget || 0,
            expenses: [],
            partnership_id: partnership.id,
            notes: '',
            notebookUrl: ''
        };

        // Map CamelCase to DB snake_case for insert
        const dbTrip = {
            id: newTrip.id,
            destination: newTrip.destination,
            start_date: newTrip.startDate,
            end_date: newTrip.endDate,
            budget: newTrip.budget,
            expenses: newTrip.expenses,
            partnership_id: newTrip.partnership_id,
            notes: newTrip.notes,
            notebook_url: newTrip.notebookUrl,
            user_id: (await supabase.auth.getUser()).data.user?.id
        };

        const { error } = await supabase.from('trips').insert(dbTrip);
        if (!error) {
            setTrips(prev => [...prev, newTrip]);
            setSharedTrip(newTrip);
            setShowTripModal(false);
            // Log activity
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('shared_hub_activities').insert({
                    partnership_id: partnership.id,
                    user_id: user.id,
                    type: 'calendar',
                    action: 'created',
                    content: { title: 'Nuevo Viaje en Pareja' }
                });
            }
        } else {
            console.error('Error creating trip:', error);
        }
    };

    // Update sharedTrip based on activeTab
    useEffect(() => {
        if (activeTab !== 'calendar') setActiveSubTab('notebook');
        else setActiveSubTab('itinerary');

        if (!trips.length && activeTab !== 'dashboard') return;

        const SECTION_MAP: Record<string, string> = {
            'piso': 'PISO BARCELONA',
            'activities': 'ACTIVIDADES',
            'shopping': 'COMPRAS'
        };

        if (['piso', 'activities', 'shopping'].includes(activeTab)) {
            const targetName = SECTION_MAP[activeTab];
            const found = trips.find(t => t.destination === targetName);
            setSharedTrip(found || null);
        } else if (activeTab === 'calendar' || activeTab === 'whiteboard' || activeTab === 'tasks') {
            // Pick the "main" trip (not a special section) or just the first available
            const SPECIAL = Object.values(SECTION_MAP);
            const mainTrip = trips.find(t => !SPECIAL.includes(t.destination)) || trips[0] || null;
            setSharedTrip(mainTrip);
        }
    }, [activeTab, trips]);

    const handleCreateSection = async (sectionKey: string) => {
        if (!partnership) return;
        const SECTION_MAP: Record<string, string> = {
            'piso': 'PISO BARCELONA',
            'activities': 'ACTIVIDADES',
            'shopping': 'COMPRAS'
        };
        const title = SECTION_MAP[sectionKey];
        if (!title) return;

        const newTrip: Trip = {
            id: crypto.randomUUID(),
            destination: title,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().getFullYear() + 10, 0, 1).toISOString().split('T')[0], // Long duration
            budget: 0,
            expenses: [],
            partnership_id: partnership.id,
            notes: '',
            notebookUrl: ''
        };

        const dbTrip = {
            id: newTrip.id,
            destination: newTrip.destination,
            start_date: newTrip.startDate,
            end_date: newTrip.endDate,
            budget: newTrip.budget,
            expenses: newTrip.expenses,
            partnership_id: newTrip.partnership_id,
            notes: newTrip.notes,
            notebook_url: newTrip.notebookUrl,
            user_id: (await supabase.auth.getUser()).data.user?.id
        };

        const { error } = await supabase.from('trips').insert(dbTrip);
        if (!error) {
            setTrips(prev => [...prev, newTrip]);
            setSharedTrip(newTrip); // Immediate update

            // Log activity
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('shared_hub_activities').insert({
                    partnership_id: partnership.id,
                    user_id: user.id,
                    type: 'calendar',
                    action: 'created',
                    content: { title: `Nueva Sección: ${title}` }
                });
            }
        } else {
            console.error('Error creating section:', error);
            alert('Error al crear la sección');
        }
    };

    const updateTrip = async (updates: Partial<Trip>) => {
        if (!sharedTrip) return;
        const updatedTrip = { ...sharedTrip, ...updates };
        setSharedTrip(updatedTrip);

        // Update trips array to keep in sync
        setTrips(prev => prev.map(t => t.id === sharedTrip.id ? updatedTrip : t));

        // Map updates to snake_case for DB
        const dbUpdates: any = { ...updates };
        if (updates.startDate) { dbUpdates.start_date = updates.startDate; delete dbUpdates.startDate; }
        if (updates.endDate) { dbUpdates.end_date = updates.endDate; delete dbUpdates.endDate; }
        if (updates.notebookUrl) { dbUpdates.notebook_url = updates.notebookUrl; delete dbUpdates.notebookUrl; }
        if (updates.aiItinerary) { dbUpdates.ai_itinerary = updates.aiItinerary; delete dbUpdates.aiItinerary; }
        if (updates.whiteboardData) { dbUpdates.whiteboard_data = updates.whiteboardData; delete dbUpdates.whiteboardData; }

        await supabase.from('trips').update(dbUpdates).eq('id', sharedTrip.id);
    };

    // Get or create a hub section
    const getOrCreateHubSection = async (sectionName: 'PISO BARCELONA' | 'ACTIVIDADES' | 'COMPRAS' | 'WORKHUB'): Promise<HubSection | null> => {
        if (!partnership) return null;

        let section = hubSections.find(s => s.name === sectionName);

        if (!section) {
            // Create new section
            const newSection: Partial<HubSection> = {
                id: crypto.randomUUID(),
                partnership_id: partnership.id,
                name: sectionName,
                boardContent: '',
                whiteboardData: '',
                documents: []
            };

            const { data, error } = await supabase.from('hub_sections').insert({
                id: newSection.id,
                partnership_id: newSection.partnership_id,
                name: newSection.name,
                board_content: newSection.boardContent,
                whiteboard_data: newSection.whiteboardData
            }).select().single();

            if (!error && data) {
                section = {
                    ...data,
                    notebookUrl: data.notebook_url,
                    openNotebookUrl: data.open_notebook_url,
                    boardContent: data.board_content,
                    whiteboardData: data.whiteboard_data
                } as HubSection;
                setHubSections(prev => [...prev, section!]);
            }
        }

        return section || null;
    };

    const updateHubSection = async (sectionName: 'PISO BARCELONA' | 'ACTIVIDADES' | 'COMPRAS' | 'WORKHUB', updates: Partial<HubSection>) => {
        const section = await getOrCreateHubSection(sectionName);
        if (!section) return;

        const updatedSection = { ...section, ...updates };
        setHubSections(prev => prev.map(s => s.id === section.id ? updatedSection : s));

        // Map updates to snake_case for DB
        const dbUpdates: any = {};
        if (updates.notebookUrl !== undefined) dbUpdates.notebook_url = updates.notebookUrl;
        if (updates.openNotebookUrl !== undefined) dbUpdates.open_notebook_url = updates.openNotebookUrl;
        if (updates.boardContent !== undefined) dbUpdates.board_content = updates.boardContent;
        if (updates.whiteboardData !== undefined) dbUpdates.whiteboard_data = updates.whiteboardData;

        await supabase.from('hub_sections').update(dbUpdates).eq('id', section.id);
    };

    const handleSectionNotesChange = (sectionName: 'PISO BARCELONA' | 'ACTIVIDADES' | 'COMPRAS' | 'WORKHUB', newContent: string) => {
        // Update UI immediately
        setHubSections(prev => prev.map(s =>
            s.name === sectionName ? { ...s, boardContent: newContent } : s
        ));

        // Debounced save
        setIsSaving(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            await updateHubSection(sectionName, { boardContent: newContent });
            setIsSaving(false);
        }, 1000);
    };


    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleNotesChange = (newNotes: string) => {
        if (!sharedTrip) return;

        // Update UI immediately (both states)
        const updatedTrip = { ...sharedTrip, notes: newNotes };
        setSharedTrip(updatedTrip);
        setTrips(prev => prev.map(t => t.id === sharedTrip.id ? updatedTrip : t));

        setIsSaving(true);

        // Debounce DB Save
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            const { error } = await supabase
                .from('trips')
                .update({ notes: newNotes })
                .eq('id', sharedTrip.id);

            if (error) console.error("Error saving notes:", error);
            setIsSaving(false);
        }, 1500);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, sectionTag?: string) => {
        if (!partnership || !event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        setIsUploading(true);
        const { data: { user } } = await supabase.auth.getUser();

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `partnerships/${partnership.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('files')
                .getPublicUrl(filePath);

            const documentName = sectionTag ? `[${sectionTag}] ${file.name}` : file.name;

            const newDoc = {
                partnership_id: partnership.id,
                user_id: user?.id,
                name: documentName,
                url: publicUrl,
                type: file.type,
                size: file.size
            };

            const { data, error: dbError } = await supabase
                .from('shared_documents')
                .insert(newDoc)
                .select()
                .single();

            if (dbError) throw dbError;
            if (data) setDocuments([data as SharedDocument, ...documents]);

            // Log activity
            if (user) {
                await supabase.from('shared_hub_activities').insert({
                    partnership_id: partnership.id,
                    user_id: user.id,
                    type: sectionTag ? 'file' : 'calendar',
                    action: 'created',
                    content: { title: `Subió documento: ${documentName}` }
                });
            }

        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error al subir el archivo');
        } finally {
            setIsUploading(false);
        }
    };

    const saveNotesAsDocument = async (sectionName: string, content: string) => {
        if (!partnership || !content.trim()) return;
        setIsUploading(true);
        const { data: { user } } = await supabase.auth.getUser();

        try {
            // Extract first phrase/line for title
            const firstLine = content.split('\n')[0].trim();
            // Sanitize: take first 50 chars, remove special file chars for filename
            const safeTitle = firstLine.slice(0, 50).replace(/[^a-zA-Z0-9\s-_áéíóúÁÉÍÓÚñÑ]/g, '').trim();
            const cleanTitle = safeTitle || `Nota_${sectionName}`;

            const fileName = `${cleanTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
            const blob = new Blob([content], { type: 'text/plain' });

            const storagePath = `partnerships/${partnership.id}/${Math.random()}_${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('files')
                .upload(storagePath, blob);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('files')
                .getPublicUrl(storagePath);

            const documentName = `[${sectionName}] ${safeTitle || 'Nota sin título'}`;

            const { data, error: dbError } = await supabase
                .from('shared_documents')
                .insert({
                    partnership_id: partnership.id,
                    user_id: user?.id,
                    name: documentName,
                    url: publicUrl,
                    type: 'text/plain',
                    size: blob.size
                })
                .select()
                .single();

            if (dbError) throw dbError;
            if (data) setDocuments([data as SharedDocument, ...documents]);

            alert('Nota guardada como documento correctamente');

            // Log activity
            if (user) {
                await supabase.from('shared_hub_activities').insert({
                    partnership_id: partnership.id,
                    user_id: user.id,
                    type: 'note',
                    action: 'created',
                    content: { title: `Guardó nota como documento: ${documentName}` }
                });
            }
        } catch (error: any) {
            console.error('Error saving note as document:', error);
            alert(`Error al guardar la nota: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = async (id: string, url: string) => {
        if (!confirm('¿Estás seguro de eliminar este documento?')) return;

        try {
            // Extract path from URL roughly or store path? For now just delete record
            // Real delete from storage requires path. Let's assume we keep files for now or improved later
            // Actually, let's just delete the DB record to hide it

            const { error } = await supabase.from('shared_documents').delete().eq('id', id);

            if (!error) {
                setDocuments(documents.filter(d => d.id !== id));
            }
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const toggleTask = async (id: string) => {
        const task = sharedTasks.find(t => t.id === id);
        if (!task) return;
        const newStatus = !task.completed;

        setSharedTasks(sharedTasks.map(t => t.id === id ? { ...t, completed: newStatus } : t));
        await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
    };

    const netBalance = useMemo(() => {
        let balance = 0;
        sharedExpenses.forEach(exp => {
            const perPerson = exp.amount / 2;
            if (exp.paidBy === 'me') balance += perPerson;
            else balance -= perPerson;
        });
        return balance;
    }, [sharedExpenses]);

    // Helper function to render hub sections (PISO BARCELONA, ACTIVIDADES, COMPRAS)
    const renderHubSection = (sectionName: 'PISO BARCELONA' | 'ACTIVIDADES' | 'COMPRAS') => {
        const section = hubSections.find(s => s.name === sectionName);
        const sectionDocs = documents.filter(d => d.name.includes(sectionName));

        return (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
                <div className="bg-slate-900 p-8 text-white relative">
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black tracking-tight mb-2">{sectionName}</h3>
                        <p className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px]">Gestión Compartida</p>
                    </div>
                </div>

                {/* Sub-navigation */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 px-8 bg-slate-50/50 dark:bg-slate-900/50">
                    <button onClick={() => setActiveSubTab('documents')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'documents' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        Documentos
                        {activeSubTab === 'documents' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                    </button>
                    <button onClick={() => setActiveSubTab('notebook')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'notebook' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        Cuaderno & IA
                        {activeSubTab === 'notebook' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                    </button>
                    <button onClick={() => setActiveSubTab('whiteboard')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'whiteboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        Pizarra
                        {activeSubTab === 'whiteboard' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-8 flex-1 overflow-y-auto">
                    {activeSubTab === 'notebook' && (
                        <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-700 h-full flex flex-col">
                            {/* AI Integrations */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* NotebookLM */}
                                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-indigo-500/50 transition-all shadow-2xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-indigo-600/20 transition-all"></div>
                                    <div className="space-y-6 relative z-10">
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                            <Brain size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black text-white">NotebookLM</h4>
                                            <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Analiza documentos y genera insights inteligentes con la IA de Google.</p>
                                        </div>
                                    </div>
                                    <div className="mt-10 space-y-4 relative z-10">
                                        {section?.notebookUrl ? (
                                            <div className="flex gap-4">
                                                <a
                                                    href={section.notebookUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group/btn"
                                                >
                                                    Abrir Notebook <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        const url = prompt("Nueva URL de NotebookLM:", section.notebookUrl || '');
                                                        if (url !== null) await updateHubSection(sectionName, { notebookUrl: url });
                                                    }}
                                                    className="p-4 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={async () => {
                                                    const url = prompt("Introduce la URL de tu NotebookLM:");
                                                    if (url) await updateHubSection(sectionName, { notebookUrl: url });
                                                }}
                                                className="w-full bg-white/5 border border-white/10 hover:border-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                            >
                                                Vincular Notebook <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* OpenNotebookLM */}
                                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-pink-500/50 transition-all shadow-2xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-pink-600/20 transition-all"></div>
                                    <div className="space-y-6 relative z-10">
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                                            <Share2 size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black text-white">OpenNotebook</h4>
                                            <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Usa la alternativa Open Source para tu gestión de conocimiento.</p>
                                        </div>
                                    </div>
                                    <div className="mt-10 relative z-10">
                                        <a
                                            href="https://open-notebooklm.vercel.app/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full bg-pink-600 hover:bg-pink-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-pink-600/30 transition-all flex items-center justify-center gap-2 group/btn"
                                        >
                                            Lanzar Alpha <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Writing Board */}
                            <div className="flex-1 flex flex-col space-y-6">
                                <div className="flex justify-between items-center px-4">
                                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                                        <Edit3 size={16} className="text-indigo-500" /> Tablón de Notas Sincronizado
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse shadow-glow-amber' : 'bg-emerald-500 shadow-glow-emerald'}`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isSaving ? 'text-amber-500' : 'text-slate-400'}`}>
                                                {isSaving ? 'Guardando...' : 'En la nube'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => saveNotesAsDocument(sectionName, section?.boardContent || '')}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                                        >
                                            <FileText size={14} />
                                            Convertir en Documento
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10 shadow-inner flex-1 flex group focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                                    <textarea
                                        className="w-full bg-transparent border-none focus:outline-none resize-none text-xl font-medium leading-relaxed text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-700 font-serif"
                                        placeholder="Empezad a planificar aquí..."
                                        value={section?.boardContent || ''}
                                        onChange={(e) => handleSectionNotesChange(sectionName, e.target.value)}
                                        rows={10}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'whiteboard' && (
                        <div className="h-[600px] animate-in slide-in-from-right-4">
                            <Whiteboard
                                initialData={section?.whiteboardData}
                                onSave={(data) => updateHubSection(sectionName, { whiteboardData: data })}
                            />
                        </div>
                    )}

                    {activeSubTab === 'documents' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="flex justify-between items-center bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
                                <div>
                                    <h4 className="font-black text-sm">Documentos Compartidos</h4>
                                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Sube Word y PDF</p>
                                </div>
                                <label className="bg-white/20 p-3 rounded-2xl hover:bg-white/30 transition-colors cursor-pointer">
                                    <Plus size={20} />
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, sectionName)} disabled={isUploading} />
                                </label>
                            </div>

                            {sectionDocs.length > 0 ? (
                                <div className="space-y-4">
                                    {sectionDocs.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-6 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:shadow-lg transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{doc.name}</p>
                                                    <p className="text-xs text-slate-400 font-bold">{new Date(doc.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                                    <Download size={16} />
                                                </a>
                                                <button onClick={() => handleDeleteDocument(doc.id, doc.url)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-20 text-center text-slate-400 bg-white dark:bg-slate-900/50 m-4 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                                    <UploadCloud size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="font-black text-xs uppercase tracking-[0.2em]">Bóveda de Documentos</p>
                                    <p className="text-[10px] font-bold mt-2 opacity-60">Subid contratos, facturas o documentos importantes.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!partnership) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-pink-100 dark:shadow-none">
                    <Heart size={48} className="fill-current" />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Tu Dashboard Conjunto</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-4 px-10">
                        Crea un hub compartido para gestionar vuestras finanzas, tareas de casa y próximos viajes juntos.
                        Sincronización total en tiempo real.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left ml-2">Email de tu Pareja</label>
                        <div className="relative group">
                            <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-500 transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="amor@gmail.com"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-16 pr-8 py-5 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 font-bold"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => onInvitePartner(inviteEmail)}
                        className="w-full py-5 bg-pink-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-pink-500/30 hover:bg-pink-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Send size={18} /> Enviar Invitación
                    </button>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asegúrate de que tu pareja tenga una cuenta creada</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-4">
                <div className="flex items-center gap-6 group">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20 dark:shadow-none group-hover:scale-110 transition-transform duration-500 transform-gpu">
                        <Heart size={40} className="fill-current drop-shadow-lg" />
                    </div>
                    <div>
                        <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Dashboard Hub</h2>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="relative flex h-3 w-3">
                                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
                                <div className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></div>
                            </div>
                            <span className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest">Sincronización en vivo activada</span>
                        </div>
                    </div>
                </div>

                <nav className="flex p-2.5 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 gap-1.5 overflow-x-auto w-full md:w-auto backdrop-blur-xl">
                    {[
                        { id: 'dashboard', label: 'FEED', icon: LayoutDashboard },
                        { id: 'tasks', label: 'WORKHUB', icon: CheckSquare },
                        { id: 'calendar', label: 'VIAJES', icon: Plane },
                        { id: 'whiteboard', label: 'PIZARRA', icon: Edit3 },
                        { id: 'finance', label: 'GASTOS', icon: Receipt },
                        { id: 'piso', label: 'PISO BCN', icon: Home },
                        { id: 'activities', label: 'ACTIVIDADES', icon: Activity },
                        { id: 'shopping', label: 'COMPRAS', icon: ShoppingBag }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 transform-gpu active:scale-90 ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/40 translate-y-[-2px]'
                                : 'text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <tab.icon size={16} className={`${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </header>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

                {/* Left Column / Feed (Desktop) */}
                <div className={`col-span-12 lg:col-span-8 space-y-8 ${!['dashboard', 'whiteboard'].includes(activeTab) ? 'hidden lg:block' : ''}`}>
                    {activeTab === 'whiteboard' && sharedTrip && (
                        <div className="h-[750px] animate-in slide-in-from-bottom-6 duration-1000">
                            <Whiteboard
                                initialData={sharedTrip.whiteboardData}
                                onSave={(data) => updateTrip({ whiteboardData: data })}
                            />
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <section className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <Clock size={24} className="text-indigo-500" /> Actividad Reciente
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowFeedInput(!showFeedInput)}
                                        className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <span className="text-[10px] font-black p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 uppercase tracking-widest self-center">Realtime Feed</span>
                                </div>
                            </div>

                            {showFeedInput && (
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-2">
                                    <div className="flex gap-4">
                                        <input
                                            type="text"
                                            placeholder="Escribe algo para el muro..."
                                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm"
                                            value={newFeedMessage}
                                            onChange={e => setNewFeedMessage(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handlePostFeed()}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handlePostFeed}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                                        >
                                            <Send size={16} />
                                        </button>
                                        <button
                                            onClick={() => setShowFeedInput(false)}
                                            className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/30 dark:bg-slate-800/20 border-b border-slate-50 dark:border-slate-800">
                                <div
                                    onClick={() => setActiveTab('whiteboard')}
                                    className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] cursor-pointer group hover:scale-[1.02] transition-all shadow-xl shadow-indigo-500/20 overflow-hidden relative"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -mr-10 -mt-10"></div>
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white mb-6 group-hover:rotate-12 transition-transform">
                                            <Edit3 size={24} />
                                        </div>
                                        <h4 className="text-xl font-black text-white uppercase">Pizarra</h4>
                                        <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                                            ACCESO RÁPIDO <ArrowUpRight size={14} />
                                        </p>
                                    </div>
                                </div>
                                <div
                                    onClick={() => {
                                        setActiveTab('tasks');
                                        setActiveWorkTab('notebook');
                                    }}
                                    className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] cursor-pointer group hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20 overflow-hidden relative"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -mr-10 -mt-10"></div>
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white mb-6 group-hover:rotate-12 transition-transform">
                                            <FileText size={24} />
                                        </div>
                                        <h4 className="text-xl font-black text-white uppercase">Cuaderno</h4>
                                        <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                                            NOTAS & DOCUMENTOS <ArrowUpRight size={14} />
                                        </p>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setActiveTab('tasks')}
                                    className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] cursor-pointer group hover:border-pink-500/50 transition-all shadow-sm"
                                >
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-pink-500 transition-colors mb-6">
                                        <CheckSquare size={24} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase">Work Hub</h4>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Gestionar Proyectos</p>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-50 dark:divide-slate-800 p-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {isLoading ? (
                                    <div className="p-20 text-center"><Loader2 size={32} className="animate-spin text-indigo-500 mx-auto" /></div>
                                ) : activities.length > 0 ? (
                                    activities.map(activity => (
                                        <div key={activity.id} className="p-8 flex items-start gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all rounded-[2rem]">
                                            <div className={`p-4 rounded-2xl shrink-0 ${activity.type === 'expense' ? 'bg-emerald-100 text-emerald-600' :
                                                activity.type === 'task' ? 'bg-blue-100 text-blue-600' :
                                                    activity.type === 'calendar' ? 'bg-amber-100 text-amber-600' :
                                                        activity.type === 'note' ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {activity.type === 'expense' ? <Receipt size={20} /> :
                                                    activity.type === 'task' ? <CheckSquare size={20} /> :
                                                        activity.type === 'calendar' ? <Calendar size={20} /> :
                                                            activity.type === 'note' ? <Heart size={20} /> : <Zap size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-widest">
                                                    {activity.user_id === currentUser ? 'Tú ' : 'Tu pareja '}
                                                    {activity.action === 'created' ? 'creó' : activity.action === 'updated' ? 'actualizó' : 'eliminó'} un {activity.type}
                                                </p>
                                                <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                                    {activity.content.title || activity.content.vendor || 'Elemento sin nombre'}
                                                </h4>
                                                <div className="mt-3 flex items-center gap-2 text-slate-400">
                                                    <Clock size={12} />
                                                    <span className="text-[10px] font-bold">{new Date(activity.created_at).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No hay actividad reciente</div>
                                )}
                            </div>
                        </section>
                    )}

                    {activeTab === 'tasks' && (
                        <section className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px] flex flex-col">

                            {/* WorkHub Sub-tabs */}
                            <div className="flex border-b border-slate-100 dark:border-slate-800 px-10 bg-slate-50/50 dark:bg-slate-900/50">
                                <button onClick={() => setActiveWorkTab('feed')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeWorkTab === 'feed' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Resumen
                                    {activeWorkTab === 'feed' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                                </button>
                                <button onClick={() => setActiveWorkTab('tasks')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeWorkTab === 'tasks' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Tareas
                                    {activeWorkTab === 'tasks' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                                </button>
                                <button onClick={() => setActiveWorkTab('documents')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeWorkTab === 'documents' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Documentos
                                    {activeWorkTab === 'documents' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                                </button>
                                <button onClick={() => setActiveWorkTab('notebook')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeWorkTab === 'notebook' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Cuaderno
                                    {activeWorkTab === 'notebook' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                                </button>
                                <button onClick={() => setActiveWorkTab('whiteboard')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeWorkTab === 'whiteboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Pizarra
                                    {activeWorkTab === 'whiteboard' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                                </button>
                            </div>

                            {activeWorkTab === 'feed' && (
                                <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500">
                                    {/* Stats Grid */}
                                    <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/30 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                        <div
                                            onClick={() => setActiveWorkTab('tasks')}
                                            className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:border-indigo-500/50 transition-all group cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                                    <CheckSquare size={24} />
                                                </div>
                                                <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tareas Pendientes</h4>
                                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                                {sharedTasks.filter(t => !t.completed).length}
                                            </p>
                                        </div>

                                        <div
                                            onClick={() => setActiveWorkTab('documents')}
                                            className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:border-emerald-500/50 transition-all group cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                                    <FileText size={24} />
                                                </div>
                                                <ArrowUpRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Documentos WorkHub</h4>
                                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                                {documents.filter(d => d.name.includes('[WORKHUB]')).length}
                                            </p>
                                        </div>

                                        <div
                                            onClick={() => setActiveWorkTab('notebook')}
                                            className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:border-amber-500/50 transition-all group cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                                                    <Brain size={24} />
                                                </div>
                                                <ArrowUpRight size={16} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                                            </div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cuaderno Activo</h4>
                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 line-clamp-1 mt-2">
                                                {hubSections.find(s => s.name === 'WORKHUB')?.boardContent?.slice(0, 50) || 'Sin notas recientes'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Work Activity Feed */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                                                <Clock size={18} className="text-indigo-500" /> Actividad WorkHub
                                            </h3>
                                        </div>

                                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {activities.filter(a =>
                                                a.type === 'task' ||
                                                (a.type === 'file' && a.content.title?.includes('[WORKHUB]')) ||
                                                (a.type === 'note' && a.content.title?.includes('WORKHUB'))
                                            ).length > 0 ? (
                                                activities.filter(a =>
                                                    a.type === 'task' ||
                                                    (a.type === 'file' && a.content.title?.includes('[WORKHUB]')) ||
                                                    (a.type === 'note' && a.content.title?.includes('WORKHUB'))
                                                ).map(activity => (
                                                    <div key={activity.id} className="py-6 flex items-start gap-4 group">
                                                        <div className={`p-3 rounded-xl shrink-0 ${activity.type === 'task' ? 'bg-blue-50 text-blue-600' :
                                                            activity.type === 'file' ? 'bg-emerald-50 text-emerald-600' :
                                                                'bg-amber-50 text-amber-600'
                                                            }`}>
                                                            {activity.type === 'task' ? <CheckSquare size={16} /> :
                                                                activity.type === 'file' ? <FileText size={16} /> :
                                                                    <Brain size={16} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                {activity.user_id === currentUser ? 'Tú ' : 'Tu pareja '}
                                                                {activity.action === 'created' ? 'creó' : activity.action === 'updated' ? 'actualizó' : 'eliminó'}
                                                            </p>
                                                            <h4 className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5">
                                                                {activity.content.title?.replace('[WORKHUB] ', '').replace('WORKHUB', '') || 'Acción en WorkHub'}
                                                            </h4>
                                                            <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">
                                                                {new Date(activity.created_at).toLocaleDateString()} • {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-20 text-center">
                                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 opacity-30">
                                                        <Clock size={32} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin actividad reciente en el espacio de trabajo</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeWorkTab === 'tasks' && (
                                <>
                                    <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20">
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                placeholder="Nueva tarea compartida..."
                                                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-8 py-5 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 font-bold"
                                                value={newTaskTitle}
                                                onChange={e => setNewTaskTitle(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                            />
                                            <button
                                                onClick={handleAddTask}
                                                className="bg-indigo-600 text-white px-10 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
                                            >
                                                <Plus size={28} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-50 dark:divide-slate-800 flex-1 overflow-y-auto">
                                        {sharedTasks.map(task => (
                                            <div key={task.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                                <div className="flex items-center gap-6">
                                                    <button onClick={() => toggleTask(task.id)} className={`transition-all ${task.completed ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-600'}`}>
                                                        {task.completed ? <CheckSquare size={32} /> : <div className="w-8 h-8 rounded-xl border-4 border-current"></div>}
                                                    </button>
                                                    <h4 className={`text-xl font-black text-slate-900 dark:text-white ${task.completed ? 'line-through opacity-40' : ''}`}>{task.title}</h4>
                                                </div>
                                                <button onClick={() => handleDeleteTask(task.id)} className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                                            </div>
                                        ))}
                                        {sharedTasks.length === 0 && (
                                            <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No hay tareas pendientes</div>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeWorkTab === 'documents' && (
                                <div className="p-10 space-y-6 flex-1 overflow-y-auto animate-in slide-in-from-right-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                            WorkHub Docs <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] uppercase font-black tracking-widest">Secure</span>
                                        </h3>
                                        <label className={`cursor-pointer px-5 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                            Subir Documento
                                            <input type="file" className="hidden" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" onChange={(e) => handleFileUpload(e, 'WORKHUB')} disabled={isUploading} />
                                        </label>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                        {documents.filter(d => d.name.includes('[WORKHUB]')).length > 0 ? (
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivo</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamaño</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {documents.filter(d => d.name.includes('[WORKHUB]')).map(doc => (
                                                        <tr key={doc.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-2 rounded-lg ${doc.name.endsWith('.pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                                                        {doc.name.endsWith('.pdf') ? <FileText size={16} /> : <File size={16} />}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{doc.name.replace('[WORKHUB] ', '')}</p>
                                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Subido por {doc.user_id === currentUser ? 'mí' : 'pareja'}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                                {(doc.size / 1024 / 1024).toFixed(2)} MB
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <a
                                                                        href={doc.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                        title="Descargar"
                                                                    >
                                                                        <Download size={16} />
                                                                    </a>
                                                                    <button
                                                                        onClick={() => handleDeleteDocument(doc.id, doc.url)}
                                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="p-20 text-center text-slate-400 bg-white dark:bg-slate-900/50 m-4 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 opacity-50">
                                                    <File size={32} />
                                                </div>
                                                <p className="font-black text-xs uppercase tracking-[0.2em]">Bóveda de Documentos WorkHub</p>
                                                <p className="text-[10px] font-bold mt-2 opacity-60">Compartid contratos, facturas y archivos de trabajo importantes.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {activeWorkTab === 'notebook' && (
                                <div className="p-10 flex flex-col flex-1 animate-in slide-in-from-right-4">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Cuaderno de Trabajo</h3>
                                        <div className="flex items-center gap-4">
                                            {isSaving && <span className="text-[10px] font-bold text-indigo-500 animate-pulse">GUARDANDO...</span>}
                                            <button
                                                onClick={() => {
                                                    const section = hubSections.find(s => s.name === 'WORKHUB');
                                                    if (section) saveNotesAsDocument('WORKHUB', section.boardContent || '');
                                                }}
                                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                                            >
                                                <FileText size={14} />
                                                Convertir en Documento
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={hubSections.find(s => s.name === 'WORKHUB')?.boardContent || ''}
                                        onChange={(e) => handleSectionNotesChange('WORKHUB', e.target.value)}
                                        placeholder="Escribe aquí las notas de trabajo, actas de reuniones o ideas compartidas..."
                                        className="flex-1 w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-[2rem] p-10 focus:ring-4 focus:ring-indigo-500/5 transition-all text-lg font-medium leading-relaxed resize-none dark:text-slate-200"
                                    />
                                </div>
                            )}

                            {activeWorkTab === 'whiteboard' && (
                                <div className="h-[750px] animate-in slide-in-from-right-4 overflow-hidden rounded-b-[3rem]">
                                    <Whiteboard
                                        initialData={hubSections.find(s => s.name === 'WORKHUB')?.whiteboardData || ''}
                                        onSave={(data) => updateHubSection('WORKHUB', { whiteboardData: data })}
                                    />
                                </div>
                            )}
                        </section>
                    )}

                    {['calendar', 'piso', 'activities', 'shopping'].includes(activeTab) && (
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px] flex flex-col scale-in">
                            {activeTab === 'calendar' && sharedTrip ? (
                                <div className="flex flex-col h-full">
                                    {/* Section Header */}
                                    <div className="p-8 bg-slate-900 text-white relative overflow-hidden">
                                        <div className="relative z-10 flex justify-between items-start">
                                            <div>
                                                <h3 className="text-3xl font-black tracking-tight mb-2 uppercase">{sharedTrip.destination}</h3>
                                                <p className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                                                    {activeTab === 'calendar' ? 'Expedición Conjunta' : 'Centro de Gestión Compartida'}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowModal(true)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20">
                                                    <Sparkles size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        {activeTab === 'calendar' ? (
                                            <Plane className="absolute right-0 bottom-0 text-white/5 rotate-12 -mr-10 -mb-10" size={200} />
                                        ) : activeTab === 'piso' ? (
                                            <Home className="absolute right-0 bottom-0 text-white/5 rotate-12 -mr-10 -mb-10" size={200} />
                                        ) : activeTab === 'activities' ? (
                                            <Activity className="absolute right-0 bottom-0 text-white/5 rotate-12 -mr-10 -mb-10" size={200} />
                                        ) : (
                                            <ShoppingBag className="absolute right-0 bottom-0 text-white/5 rotate-12 -mr-10 -mb-10" size={200} />
                                        )}
                                    </div>

                                    {/* Sub-navigation */}
                                    <div className="flex border-b border-slate-100 dark:border-slate-800 px-8 bg-slate-50/50 dark:bg-slate-900/50">
                                        {activeTab === 'calendar' && (
                                            <button onClick={() => setActiveSubTab('itinerary')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'itinerary' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                                Itinerario
                                                {activeSubTab === 'itinerary' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                                            </button>
                                        )}
                                        <button onClick={() => setActiveSubTab('notebook')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'notebook' || (activeTab !== 'calendar' && activeSubTab === 'itinerary') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                            Tablón & IA
                                            {activeSubTab === 'notebook' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                                        </button>
                                        <button onClick={() => setActiveSubTab('whiteboard')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'whiteboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                            Pizarra
                                            {activeSubTab === 'whiteboard' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                                        </button>

                                        <button onClick={() => setActiveSubTab('documents')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'documents' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                            Documentos
                                            {activeSubTab === 'documents' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                                        </button>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="p-8 flex-1 overflow-y-auto">
                                        {activeSubTab === 'itinerary' && activeTab === 'calendar' && (
                                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                                <div className="p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col items-center">
                                                    <Plane size={40} className="text-slate-200 mb-4" />
                                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Planifica tu ruta aquí</p>
                                                    <input
                                                        className="mt-4 bg-transparent text-center border-b border-slate-200 focus:outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200"
                                                        value={sharedTrip.destination}
                                                        onChange={(e) => updateTrip({ destination: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {activeSubTab === 'notebook' && (
                                            <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-700 h-full flex flex-col">
                                                {/* AI Integrations Section */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* NotebookLM */}
                                                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-indigo-500/50 transition-all shadow-2xl overflow-hidden relative">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-indigo-600/20 transition-all"></div>
                                                        <div className="space-y-6 relative z-10">
                                                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                                <Brain size={32} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-2xl font-black text-white">NotebookLM</h4>
                                                                <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Analiza documentos y genera insights inteligentes con la IA de Google.</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-10 space-y-4 relative z-10">
                                                            {sharedTrip.notebookUrl ? (
                                                                <div className="flex gap-4">
                                                                    <a
                                                                        href={sharedTrip.notebookUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group/btn"
                                                                    >
                                                                        Abrir Notebook <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                                                    </a>
                                                                    <button
                                                                        onClick={() => {
                                                                            const url = prompt("Nueva URL de NotebookLM:", sharedTrip.notebookUrl || '');
                                                                            if (url !== null) updateTrip({ notebookUrl: url });
                                                                        }}
                                                                        className="p-4 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                                                                    >
                                                                        <Edit3 size={18} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        const url = prompt("Introduce la URL de tu NotebookLM:");
                                                                        if (url) updateTrip({ notebookUrl: url });
                                                                    }}
                                                                    className="w-full bg-white/5 border border-white/10 hover:border-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    Vincular Notebook <Plus size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* OpenNotebookLM */}
                                                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-pink-500/50 transition-all shadow-2xl overflow-hidden relative">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-pink-600/20 transition-all"></div>
                                                        <div className="space-y-6 relative z-10">
                                                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                                                                <Share2 size={32} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-2xl font-black text-white">OpenNotebook</h4>
                                                                <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Usa la alternativa Open Source para tu gestión de conocimiento.</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-10 relative z-10">
                                                            <a
                                                                href="https://open-notebooklm.vercel.app/"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-full bg-pink-600 hover:bg-pink-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-pink-600/30 transition-all flex items-center justify-center gap-2 group/btn"
                                                            >
                                                                Lanzar Alpha <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Unified Blackboard Section */}
                                                <div className="flex-1 flex flex-col space-y-6">
                                                    <div className="flex justify-between items-center px-4">
                                                        <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                                                            <Edit3 size={16} className="text-indigo-500" /> Tablón de Notas Sincronizado
                                                        </h4>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse shadow-glow-amber' : 'bg-emerald-500 shadow-glow-emerald'}`}></div>
                                                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isSaving ? 'text-amber-500' : 'text-slate-400'}`}>
                                                                    {isSaving ? 'Guardando...' : 'En la nube'}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => saveNotesAsDocument('VIAJE', sharedTrip.notes || '')}
                                                                className="px-4 py-2 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                                            >
                                                                <FileText size={14} />
                                                                Convertir en Documento
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10 shadow-inner flex-1 flex group focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                                                        <textarea
                                                            className="w-full bg-transparent border-none focus:outline-none resize-none text-xl font-medium leading-relaxed text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-700 font-serif"
                                                            placeholder="Empezad a planificar vuestro próximo paso aquí..."
                                                            value={sharedTrip.notes || ''}
                                                            onChange={(e) => handleNotesChange(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeSubTab === 'whiteboard' && sharedTrip && (
                                            <div className="h-[750px] animate-in zoom-in-95 duration-700">
                                                <Whiteboard
                                                    initialData={sharedTrip.whiteboardData}
                                                    onSave={(data) => updateTrip({ whiteboardData: data })}
                                                />
                                            </div>
                                        )}



                                        {activeSubTab === 'documents' && (
                                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                                        FilesHub <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] uppercase font-black tracking-widest">Secure</span>
                                                    </h3>
                                                    <label className={`cursor-pointer px-5 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                        Subir Word / PDF
                                                        <input type="file" className="hidden" accept=".pdf,.doc,.docx,image/*" onChange={handleFileUpload} disabled={isUploading} />
                                                    </label>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                                    {documents.length > 0 ? (
                                                        <table className="w-full text-left">
                                                            <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                                                <tr>
                                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivo</th>
                                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamaño</th>
                                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                                {documents.map(doc => (
                                                                    <tr key={doc.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group">
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`p-2 rounded-lg ${doc.name.endsWith('.pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                                                                    {doc.name.endsWith('.pdf') ? <FileText size={16} /> : <File size={16} />}
                                                                                </div>
                                                                                <div>
                                                                                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{doc.name}</p>
                                                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight">Subido por {doc.user_id === currentUser ? 'mí' : 'pareja'}</p>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                                            {(doc.size / 1024 / 1024).toFixed(2)} MB
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                                                                    className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                                                                    <Download size={16} />
                                                                                </a>
                                                                                <button onClick={() => handleDeleteDocument(doc.id, doc.url)}
                                                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                                                    <Trash2 size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="p-20 text-center text-slate-400 bg-white dark:bg-slate-900/50 m-4 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                                                            <UploadCloud size={48} className="mx-auto mb-4 opacity-10" />
                                                            <p className="font-black text-xs uppercase tracking-[0.2em]">Bóveda de Documentos</p>
                                                            <p className="text-[10px] font-bold mt-2 opacity-60">Subid contratos, reservas o guías compartidas.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === 'piso' ? (
                                renderHubSection('PISO BARCELONA')
                            ) : activeTab === 'activities' ? (
                                renderHubSection('ACTIVIDADES')
                            ) : activeTab === 'shopping' ? (
                                renderHubSection('COMPRAS')
                            ) : (
                                <div className="p-20 text-center py-32 flex flex-col items-center justify-center h-full bg-slate-50/50 dark:bg-slate-900/50 m-8 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 animate-pulse">
                                    {activeTab === 'calendar' ? <Plane size={64} className="text-indigo-200 mb-6" /> :
                                        activeTab === 'piso' ? <Home size={64} className="text-indigo-200 mb-6" /> :
                                            activeTab === 'activities' ? <Activity size={64} className="text-indigo-200 mb-6" /> :
                                                <ShoppingBag size={64} className="text-indigo-200 mb-6" />}

                                    <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white uppercase tracking-tight">
                                        {activeTab === 'calendar' ? 'Viajes en Pareja' :
                                            activeTab === 'piso' ? 'Gestión del Piso' :
                                                activeTab === 'activities' ? 'Actividades' : 'Lista de Compras'}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold max-w-xs mx-auto text-xs uppercase tracking-widest">
                                        Esta sección aún no ha sido inicializada.
                                    </p>

                                    <button
                                        onClick={() => activeTab === 'calendar' ? setShowTripModal(true) : handleCreateSection(activeTab)}
                                        className="mt-8 px-8 py-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-3"
                                    >
                                        <Plus size={16} /> Inicializar {activeTab === 'calendar' ? 'Expedición' : 'Módulo Hub'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                    {/* Background Decor */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl -mr-16 -mt-16"></div>

                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Presupuesto Mensual</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-black text-slate-300">€</span>
                                                <input
                                                    type="number"
                                                    value={monthlyBudget}
                                                    onChange={e => setMonthlyBudget(Number(e.target.value))}
                                                    className="w-32 bg-transparent text-3xl font-black text-slate-900 dark:text-white focus:outline-none border-b border-dashed border-slate-200 focus:border-indigo-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-500">
                                            <Receipt size={24} />
                                        </div>
                                    </div>

                                    <div className="h-[200px] w-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Gastos', value: Math.abs(netBalance) * 2 }, // Approximating total expenses as 2x net balance discrepancy or just showing net balance... 
                                                        // Actually, we should probably fetch REAL total shared expenses. 
                                                        // But sharedExpenses prop is just a list. let's sum it up.
                                                        { name: 'Gastos', value: sharedExpenses.reduce((acc, curr) => acc + curr.amount, 0) },
                                                        { name: 'Disponible', value: Math.max(0, monthlyBudget - sharedExpenses.reduce((acc, curr) => acc + curr.amount, 0)) }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {COLORS.map((color, index) => (
                                                        <Cell key={`cell-${index}`} fill={color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Center Text */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Restante</p>
                                            <p className="text-xl font-black text-indigo-600">
                                                {Math.round(((monthlyBudget - sharedExpenses.reduce((acc, curr) => acc + curr.amount, 0)) / monthlyBudget) * 100)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Gasto Total Acumulado</p>
                                        <p className="text-4xl font-black text-white">€{sharedExpenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</p>
                                        <div className="mt-4 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (sharedExpenses.reduce((acc, curr) => acc + curr.amount, 0) / monthlyBudget) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold mt-2 text-right">{Math.min(100, Math.round((sharedExpenses.reduce((acc, curr) => acc + curr.amount, 0) / monthlyBudget) * 100))}% del presupuesto</p>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tu Balance Neto</p>
                                        <p className={`text-3xl font-black ${netBalance > 0 ? 'text-emerald-500' : netBalance < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                            {netBalance === 0 ? 'Saldado' : `€${Math.abs(netBalance).toFixed(2)}`}
                                        </p>
                                        <span className="text-[10px] font-bold text-slate-400">{netBalance > 0 ? 'Te deben' : netBalance < 0 ? 'Debes' : 'Todo OK'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Category Breakdown & Expense List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Category Pie Chart */}
                                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                    <h4 className="font-black text-lg mb-6 text-slate-900 dark:text-white">Distribución por Categoría</h4>
                                    {sharedExpenses.length > 0 ? (
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={Object.entries(sharedExpenses.reduce((acc: any, curr) => {
                                                            acc[curr.category] = (acc[curr.category] || 0) + Math.abs(curr.amount);
                                                            return acc;
                                                        }, {})).map(([name, value]) => ({ name, value }))}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {Object.keys(sharedExpenses.reduce((acc: any, curr) => {
                                                            acc[curr.category] = (acc[curr.category] || 0) + Math.abs(curr.amount);
                                                            return acc;
                                                        }, {})).map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip
                                                        formatter={(value: number) => [`€${value}`, 'Gasto']}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <p className="text-center text-slate-400 font-bold py-10">Sin datos de categorías</p>
                                    )}
                                </div>

                                {/* Expense List */}
                                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <h4 className="font-black text-lg mb-6 text-slate-900 dark:text-white">Desglose de Gastos</h4>
                                    {sharedExpenses.length > 0 ? (
                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {sharedExpenses.map(expense => (
                                                <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                                                            <Receipt size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">{expense.description}</p>
                                                            <p className="text-xs text-slate-400 font-bold uppercase">{new Date(expense.date).toLocaleDateString()} • {expense.paidBy === 'me' ? 'Tú' : 'Pareja'}</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-black text-slate-900 dark:text-white">€{expense.amount}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-slate-400 font-bold py-10">No hay gastos registrados aún.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'whiteboard' && sharedTrip && (
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[700px] animate-in zoom-in-95 duration-500">
                            <Whiteboard
                                initialData={sharedTrip.whiteboardData}
                                onSave={(data) => updateTrip({ whiteboardData: data })}
                            />
                        </div>
                    )}
                </div>

                {/* Right Column / Quick Stats (Desktop) */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <section className="bg-gradient-to-br from-pink-500 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
                        <Sparkles className="absolute top-0 right-0 p-4 opacity-30 animate-pulse" size={60} />
                        <h4 className="text-lg font-black mb-6 uppercase tracking-tight">Status Pareja</h4>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0"><CheckSquare size={20} /></div>
                                <div>
                                    <p className="text-3xl font-black">{sharedTasks.filter(t => t.completed).length}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Tareas Completadas</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0"><Plane size={20} /></div>
                                <div>
                                    <p className="text-3xl font-black">{trips.length}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Viaje Planeado</p>
                                </div>
                            </div>
                        </div>
                        <button className="mt-8 w-full py-4 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Chat IA de Pareja</button>
                    </section>

                    <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Info Partners</h4>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-600 font-black">T</div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Tú</span>
                                </div>
                                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase">Online</div>
                            </div>
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-pink-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-pink-600 font-black">P</div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Pareja</span>
                                </div>
                                <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[8px] font-black uppercase italic">Invited</div>
                            </div>
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                                <button className="w-full py-3 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all">Disolver Partnership</button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            {/* Create Trip Modal */}
            {showTripModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Planear Nuevo Viaje</h3>
                            <button onClick={() => setShowTripModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Destino</label>
                                <div className="relative">
                                    <Plane className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Ej: Japón, París, Nueva York..."
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold"
                                        value={newTripData.destination}
                                        onChange={e => setNewTripData({ ...newTripData, destination: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold"
                                        value={newTripData.startDate}
                                        onChange={e => setNewTripData({ ...newTripData, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Fin</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold"
                                        value={newTripData.endDate}
                                        onChange={e => setNewTripData({ ...newTripData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Presupuesto Inicial (€)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold"
                                    value={newTripData.budget}
                                    onChange={e => setNewTripData({ ...newTripData, budget: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <button
                                onClick={confirmCreateTrip}
                                className="w-full py-5 bg-gradient-to-r from-pink-500 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all active:scale-95"
                            >
                                Crear Aventura
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnerHubView;
