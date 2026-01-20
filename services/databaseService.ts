
import { Expense, Project, Task, Goal, ShoppingItem, ShoppingOrder, CalendarEvent, Idea, OllamaConfig, OpenNotebookConfig, Debt, Investment, Presentation, SharedExpense, SharedDebt, WeightEntry, NutritionPlan, Trip, StoredFile, WorkDocument } from '../types';

const DB_NAME = 'FileHubDB';
const DB_VERSION = 2; // Incremented version

export interface AppDatabase {
  expenses: Expense[];
  debts: Debt[];
  investments: Investment[];
  projects: Project[];
  presentations: Presentation[];
  tasks: Task[];
  goals: Goal[];
  shoppingItems: ShoppingItem[];
  shoppingOrders: ShoppingOrder[];
  calendarEvents: CalendarEvent[];
  ideas: Idea[];
  sharedExpenses: SharedExpense[];
  sharedDebts: SharedDebt[];
  weightEntries: WeightEntry[];
  nutritionPlans: NutritionPlan[];
  trips: Trip[];
  files: StoredFile[];
  privateNotes?: string; // Current notebook content
  privateDocuments?: WorkDocument[]; // Saved notebook documents
  ollamaConfig?: OllamaConfig;
  openNotebookConfig?: OpenNotebookConfig; // Added
}

/**
 * Servicio de Base de Datos IndexedDB para FILEHUB
 */
export const dbService = {
  /**
   * Inicializa la base de datos local
   */
  initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Guarda todo el estado de la aplicación
   */
  async saveFullState(state: AppDatabase): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['appState'], 'readwrite');
      const store = transaction.objectStore('appState');
      const request = store.put(state, 'currentAppState');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Recupera el estado guardado
   */
  async loadState(): Promise<AppDatabase | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['appState'], 'readonly');
      const store = transaction.objectStore('appState');
      const request = store.get('currentAppState');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Limpia toda la base de datos
   */
  async clearAll(): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['appState'], 'readwrite');
      const store = transaction.objectStore('appState');
      const request = store.delete('currentAppState');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};