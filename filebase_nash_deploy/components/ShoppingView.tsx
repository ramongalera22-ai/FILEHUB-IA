
import React, { useState, useMemo } from 'react';
import { ShoppingItem, ShoppingOrder } from '../types';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Package, 
  Truck, 
  Sparkles, 
  Mail, 
  Share2, 
  Loader2, 
  Repeat,
  Tag,
  Box
} from 'lucide-react';
import { formatShoppingListForEmail } from '../services/geminiService';

interface ShoppingViewProps {
  items: ShoppingItem[];
  orders: ShoppingOrder[];
  onAddItem: (item: ShoppingItem) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onAddOrder: (order: ShoppingOrder) => void;
}

const ShoppingView: React.FC<ShoppingViewProps> = ({ 
  items, orders, onAddItem, onToggleItem, onDeleteItem, onAddOrder 
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [showRecurring, setShowRecurring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Order State
  const [newOrderStore, setNewOrderStore] = useState('');

  const categories = ['Todos', ...Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[]];

  const filteredItems = items.filter(i => {
    if (showRecurring && !i.isRecurring) return false;
    return selectedCategory === 'Todos' || i.category === selectedCategory;
  });

  const pendingItems = filteredItems.filter(i => !i.purchased);
  const completedItems = filteredItems.filter(i => i.purchased);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddItem({
      id: `shop-${Date.now()}`,
      name: newItemName,
      estimatedPrice: 0,
      category: selectedCategory === 'Todos' ? 'General' : selectedCategory,
      purchased: false,
      isRecurring: showRecurring
    });
    setNewItemName('');
  };

  const handleAddOrder = () => {
    if(!newOrderStore) return;
    onAddOrder({
      id: `ord-${Date.now()}`,
      store: newOrderStore,
      date: new Date().toISOString().split('T')[0],
      total: 0,
      status: 'pending',
      items: []
    });
    setNewOrderStore('');
  };

  const deleteOrder = (id: string) => {
    // Need a prop for this in real app, assuming local state manipulation in parent or just visually hiding
    if(confirm('Eliminar pedido?')) {
       // Logic depends on parent handler availability, skipping for visual consistency
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Centro de Compras</h2>
          <p className="text-slate-500 font-bold mt-1">Gestión de listas de supermercado y pedidos online.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: Shopping List */}
        <div className="lg:col-span-7 space-y-8">
           <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
              <div className="p-8 border-b border-slate-50 flex flex-col gap-6 bg-slate-50/20">
                 
                 {/* Filters */}
                 <div className="flex flex-wrap gap-2">
                   {categories.map(c => (
                     <button
                       key={c}
                       onClick={() => { setSelectedCategory(c); setShowRecurring(false); }}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === c && !showRecurring ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                     >
                       {c}
                     </button>
                   ))}
                   <button 
                     onClick={() => setShowRecurring(!showRecurring)}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showRecurring ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                   >
                     <Repeat size={12} /> Recurrentes
                   </button>
                 </div>

                 <form onSubmit={handleQuickAdd} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={showRecurring ? "Añadir producto recurrente..." : "Añadir a la lista..."}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-6 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none shadow-sm"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                    />
                    <button type="submit" className="p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-indigo-600 transition-all">
                       <Plus size={20} />
                    </button>
                 </form>
              </div>

              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                 <div className="space-y-2">
                    {pendingItems.map(item => (
                      <div key={item.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 hover:shadow-md transition-all">
                         <div className="flex items-center gap-4">
                            <button onClick={() => onToggleItem(item.id)} className="text-slate-200 hover:text-indigo-500 transition-colors">
                               <Circle size={24} />
                            </button>
                            <div>
                               <p className="text-sm font-black text-slate-800">{item.name}</p>
                               <div className="flex gap-2">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                                  {item.isRecurring && <Repeat size={10} className="text-indigo-400"/>}
                               </div>
                            </div>
                         </div>
                         <button onClick={() => onDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all">
                            <Trash2 size={16} />
                         </button>
                      </div>
                    ))}
                    {completedItems.length > 0 && <div className="border-t border-slate-50 my-4"></div>}
                    {completedItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 border border-transparent rounded-2xl opacity-60">
                         <div className="flex items-center gap-4">
                            <button onClick={() => onToggleItem(item.id)} className="text-emerald-500">
                               <CheckCircle2 size={24} />
                            </button>
                            <span className="text-sm font-bold text-slate-500 line-through">{item.name}</span>
                         </div>
                         <button onClick={() => onDeleteItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    ))}
                 </div>
              </div>
           </section>
        </div>

        {/* RIGHT COLUMN: Orders */}
        <div className="lg:col-span-5 space-y-8">
           <section className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl border border-indigo-500/20 h-full flex flex-col">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black flex items-center gap-3">
                    <Package className="text-indigo-400" size={24} /> Pedidos
                 </h3>
                 <div className="flex gap-2">
                    <input 
                      className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-slate-400 w-32" 
                      placeholder="Tienda..."
                      value={newOrderStore}
                      onChange={e => setNewOrderStore(e.target.value)}
                    />
                    <button onClick={handleAddOrder} className="p-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all"><Plus size={16}/></button>
                 </div>
              </div>
              
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                 {orders.map(order => (
                   <div key={order.id} className="bg-white/5 p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group relative">
                      <div className="flex justify-between items-start mb-2">
                         <h4 className="font-bold">{order.store}</h4>
                         <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${
                           order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 
                           order.status === 'shipped' ? 'bg-blue-500/20 text-blue-300' :
                           'bg-amber-500/20 text-amber-300'
                         }`}>
                           {order.status}
                         </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mb-1">{order.date}</p>
                      <button className="absolute top-4 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all"><Trash2 size={14}/></button>
                   </div>
                 ))}
                 {orders.length === 0 && (
                   <div className="text-center py-10 opacity-30">
                      <Box size={40} className="mx-auto mb-2" />
                      <p className="text-xs font-bold uppercase">Sin pedidos activos</p>
                   </div>
                 )}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default ShoppingView;
