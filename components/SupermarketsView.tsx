import React, { useState, useEffect } from 'react';
import { ShoppingItem, ShoppingOrder } from '../types';
import {
    ShoppingCart,
    Search,
    Zap,
    Plus,
    Minus,
    Trash2,
    CheckCircle,
    Package,
    Sparkles,
    RefreshCw,
    CreditCard,
    MapPin,
    History,
    X,
    ChevronRight,
    Store,
    ArrowLeft,
    AlertCircle,
    Star,
    ExternalLink,
    ListPlus,
    Table,
    PlusCircle
} from 'lucide-react';
import { BotPanelSupermercados } from './BotPanel';

interface SupermarketsViewProps {
    items: ShoppingItem[];
    orders: ShoppingOrder[];
    onAddItem: (item: ShoppingItem) => void;
    onToggleItem: (id: string) => void;
    onDeleteItem: (id: string) => void;
    onAddOrder: (order: ShoppingOrder) => void;
}

const RECURRENT_PRODUCTS = [
    { id: 'rec-1', name: "Café Molido Mezcla Alcampo 250g", price: 2.15, category: "Despensa", image: "☕" },
    { id: 'rec-2', name: "Bebida de Avena Alcampo Calcio 6x1L", price: 5.46, category: "Lácteos", image: "🥛" },
    { id: 'rec-3', name: "Plátano Canario IGP bolsa 1kg", price: 1.98, category: "Frutería", image: "🍌" },
    { id: 'rec-4', name: "Brócoli microondas Florette 225g", price: 1.99, category: "Fresco", image: "🥦" },
    { id: 'rec-5', name: "Patatas microondas Auchan 400g", price: 1.49, category: "Despensa", image: "🥔" },
    { id: 'rec-6', name: "Lomo Adobado Extra Emcesa 600g", price: 4.99, category: "Carnicería", image: "🥩" },
    { id: 'rec-7', name: "Longanizas de Pollo Aldelis 10ud", price: 3.99, category: "Carnicería", image: "🌭" },
    { id: 'rec-8', name: "Burger Vacuno King El Pozo 2ud", price: 5.25, category: "Carnicería", image: "🍔" },
    { id: 'rec-9', name: "Carne Picada Mixta El Pozo 800g", price: 6.25, category: "Carnicería", image: "🍖" },
    { id: 'rec-10', name: "Jamón Cocido Extra El Pozo 150g", price: 1.90, category: "Charcutería", image: "🥓" },
    { id: 'rec-11', name: "Queso Gouda Lonchas Auchan 200g", price: 1.50, category: "Lácteos", image: "🧀" },
    { id: 'rec-12', name: "Huevos L Los Fresquitos 10ud", price: 2.49, category: "Lácteos", image: "🥚" },
    { id: 'rec-13', name: "Atún Claro Aceite Oliva Alcampo 6x52g", price: 4.24, category: "Despensa", image: "🐟" },
    { id: 'rec-14', name: "Salsa Boloñesa Helios 380g", price: 1.70, category: "Despensa", image: "🥫" },
    { id: 'rec-15', name: "Pan Molde Proteico Tradipan 450g", price: 2.09, category: "Panadería", image: "🍞" },
    { id: 'rec-16', name: "Galletas Napolitanas Cuétara 426g", price: 2.27, category: "Dulces", image: "🍪" }
];

const SupermarketsView: React.FC<SupermarketsViewProps> = ({
    items, orders, onAddItem, onToggleItem, onDeleteItem, onAddOrder
}) => {
    const [activeScreen, setActiveScreen] = useState<'hub' | 'alcampo'>('hub');
    const [activeTab, setActiveTab] = useState('shop'); // 'shop' | 'smart-list' | 'manual-list' | 'history'
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState(RECURRENT_PRODUCTS);
    const [cart, setCart] = useState<any[]>([]);
    const [rawList, setRawList] = useState('');
    const [detectedItems, setDetectedItems] = useState<any[]>([]);

    // Estado para la Lista Manual (Cesta Aparte)
    const [manualList, setManualList] = useState<any[]>([]);
    const [newManualItem, setNewManualItem] = useState({ name: '', price: '' });

    // Estados de Checkout
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState(1); // 1: Datos, 2: Pago, 3: Confirmado
    const [address, setAddress] = useState({ street: '', city: '', zip: '' });
    const [payment, setPayment] = useState({ card: '', expiry: '', cvc: '' });

    // Estados de carga
    const [isLoading, setIsLoading] = useState(false);
    const [isOrdering, setIsOrdering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Búsqueda real con IA conectada a Google Search
    const searchRealProducts = async (queryText: string) => {
        if (!queryText || queryText.length < 3) return;
        setIsLoading(true);
        setError(null);
        try {
            const systemPrompt = `Eres el buscador de Alcampo. Busca "${queryText}". Devuelve JSON: { "products": [{ "name", "price", "category", "image", "link" }] }.`;
            const payload = {
                contents: [{ parts: [{ text: `Busca productos reales en compraonline.alcampo.es para: "${queryText}".` }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                tools: [{ "google_search": {} }],
                generationConfig: { responseMimeType: "application/json" }
            };

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error.message);

            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            if (parsed.products && parsed.products.length > 0) {
                setProducts(parsed.products.map((p: any, i: number) => ({ ...p, id: `ai-${i}-${Date.now()}` })));
            } else {
                setError(`No hay resultados para "${queryText}".`);
            }
        } catch (err) {
            console.error(err);
            setError("Error de conexión. Mostrando recurrentes.");
            setProducts(RECURRENT_PRODUCTS);
        } finally {
            setIsLoading(false);
        }
    };

    const processSmartList = async () => {
        if (!rawList.trim()) return;
        setIsLoading(true);
        try {
            const systemPrompt = `Analiza la lista y busca equivalentes en Alcampo. JSON: { "matches": [{ originalText, name, price, image, match: true }] }`;
            const payload = {
                contents: [{ parts: [{ text: rawList }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                tools: [{ "google_search": {} }],
                generationConfig: { responseMimeType: "application/json" }
            };
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);

            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            setDetectedItems(parsed.matches || []);
        } catch (err) {
            setError("Error analizando lista.");
        } finally {
            setIsLoading(false);
        }
    };

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find((item: any) => item.name === product.name);
            if (existing) return prev.map((item: any) => item.name === product.name ? { ...item, qty: item.qty + 1 } : item);
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const updateQty = (name: string, delta: number) => {
        setCart(prev => prev.map((item: any) => {
            if (item.name === name) return { ...item, qty: Math.max(1, item.qty + delta) };
            return item;
        }));
    };

    const removeFromCart = (name: string) => {
        setCart(prev => prev.filter((item: any) => item.name !== name));
    };

    // Funciones para Lista Manual
    const addManualItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newManualItem.name || !newManualItem.price) return;
        const newItem = {
            id: `manual-${Date.now()}`,
            name: newManualItem.name,
            price: parseFloat(newManualItem.price),
            image: "📦",
            category: "Manual"
        };
        setManualList(prev => [...prev, newItem]);
        setNewManualItem({ name: '', price: '' });
    };

    const removeManualItem = (id: string) => {
        setManualList(prev => prev.filter(item => item.id !== id));
    };

    const addManualToMainCart = (item: any) => {
        addToCart(item);
    };

    const finalizePurchase = async () => {
        setIsOrdering(true);
        try {
            const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
            const orderData: ShoppingOrder = {
                id: `ord-${Date.now()}`,
                items: cart,
                total: total,
                address,
                status: 'Completado',
                createdAt: Date.now(),
                store: 'Alcampo Antigravity',
                date: new Date().toISOString()
            };

            onAddOrder(orderData);
            setCheckoutStep(3);
            setCart([]);
        } catch (err) {
            setError("Error al procesar la transacción.");
        } finally {
            setIsOrdering(false);
        }
    };

    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const totalManualPrice = manualList.reduce((acc, item) => acc + item.price, 0);

    if (activeScreen === 'hub') {
        return (
            <div className="min-h-screen bg-[#f8fafc] p-8 text-[#0f172a] font-sans animate-in fade-in">

      <div className="px-4 pb-2 pt-4"><BotPanelSupermercados /></div>
                <div className="max-w-6xl mx-auto">
                    <header className="mb-10">
                        <h1 className="text-4xl font-black tracking-tighter mb-2">SUPERMERCADOS <span className="text-red-600">HUB</span></h1>
                        <p className="text-slate-500 font-medium">Gestiona tus compras en tus supermercados favoritos</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div
                            onClick={() => setActiveScreen('alcampo')}
                            className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl cursor-pointer hover:scale-105 transition-transform group"
                        >
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 transition-colors">
                                <Store size={32} className="text-red-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 group-hover:text-red-600 transition-colors">Alcampo</h3>
                            <p className="text-slate-500 font-bold text-sm mt-2">Catálogo IA, Lista Inteligente, Envíos.</p>
                            <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Conectado
                            </div>
                        </div>

                        {/* Placeholder for others */}
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 border-dashed opacity-60">
                            <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-6">
                                <Store size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-400">Mercadona</h3>
                            <p className="text-slate-400 font-bold text-sm mt-2">Próximamente</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans p-4 md:p-8 animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto">

                {/* Cabecera */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveScreen('hub')} className="p-3 bg-white hover:bg-slate-100 rounded-2xl border border-slate-200 shadow-sm transition-all mr-2">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="bg-red-600 p-3 rounded-2xl text-white shadow-xl shadow-red-100 group">
                            <ShoppingCart size={28} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter leading-none">ALCAMPO <span className="text-red-600">Store</span></h1>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                <Star size={10} className="text-amber-500 fill-amber-500" /> Compra inteligente unificada
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => window.open('https://www.compraonline.alcampo.es/', '_blank')}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            Web Alcampo <ExternalLink size={14} />
                        </button>

                        <nav className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto max-w-[90vw] no-scrollbar">
                            {[
                                { id: 'shop', icon: Search, label: 'Tienda' },
                                { id: 'smart-list', icon: Sparkles, label: 'Lista IA' },
                                { id: 'manual-list', icon: Table, label: 'Lista Manual' },
                                { id: 'history', icon: History, label: 'Pedidos' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <tab.icon size={14} /> {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </header>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold shadow-sm">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-2 space-y-6">

                        {activeTab === 'shop' && (
                            <>
                                <div className="relative group">
                                    <div className={`absolute left-5 top-1/2 -translate-y-1/2 ${isLoading ? 'text-red-500' : 'text-slate-400'}`}>
                                        <Search size={22} className={isLoading ? "animate-spin" : ""} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscador en tiempo real..."
                                        className="w-full pl-14 pr-32 py-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-600 outline-none text-lg font-medium transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && searchRealProducts(searchTerm)}
                                    />
                                    <button onClick={() => searchRealProducts(searchTerm)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#0f172a] text-white px-6 py-2 rounded-2xl text-xs font-bold hover:bg-red-600 transition-all">
                                        BUSCAR
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in duration-500 pb-10">
                                    {products.map((product: any) => (
                                        <div key={product.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden">
                                            <div className="flex items-center gap-4">
                                                <div className="text-4xl bg-slate-50 w-20 h-20 flex items-center justify-center rounded-[2rem] group-hover:bg-red-50 transition-all group-hover:scale-105">
                                                    {product.image}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{product.category}</span>
                                                    <h3 className="font-bold text-slate-800 text-sm leading-tight mt-1 line-clamp-2 h-8">{product.name}</h3>
                                                    <p className="text-xl font-black text-slate-900 mt-2">{product.price.toFixed(2)}€</p>
                                                </div>
                                            </div>
                                            <button onClick={() => addToCart(product)} className="mt-4 w-full bg-slate-50 text-slate-900 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all border border-slate-100">
                                                <Plus size={16} /> Añadir a cesta
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {activeTab === 'smart-list' && (
                            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-8 animate-in slide-in-from-bottom-5">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-50 p-3 rounded-2xl text-red-600"><Sparkles size={24} /></div>
                                    <h2 className="text-2xl font-black tracking-tight italic">Análisis Inteligente</h2>
                                </div>
                                <textarea
                                    className="w-full h-40 p-6 bg-slate-50 border-none rounded-[2rem] outline-none text-lg font-medium placeholder:text-slate-300 focus:ring-4 focus:ring-red-500/5 transition-all shadow-inner"
                                    placeholder="Ej: café, huevos, pan de molde..."
                                    value={rawList}
                                    onChange={(e) => setRawList(e.target.value)}
                                />
                                <button onClick={processSmartList} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-red-600 transition-all flex items-center justify-center gap-3">
                                    {isLoading ? <RefreshCw className="animate-spin" /> : <><ListPlus size={20} /> ANALIZAR LISTA</>}
                                </button>

                                <div className="space-y-3">
                                    {detectedItems.map((item, i) => (
                                        <div key={i} className={`p-5 rounded-[2rem] border flex items-center justify-between ${item.match ? 'bg-white border-green-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl">{item.image || '🛍️'}</span>
                                                <p className="text-sm font-bold text-slate-800">{item.name || item.originalText}</p>
                                            </div>
                                            {item.match && (
                                                <button onClick={() => addToCart(item)} className="bg-green-50 text-green-600 p-2 rounded-xl hover:bg-green-600 hover:text-white transition-all">
                                                    <Plus size={20} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* NUEVA PESTAÑA: LISTA MANUAL */}
                        {activeTab === 'manual-list' && (
                            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl space-y-8 animate-in slide-in-from-bottom-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-900 p-3 rounded-2xl text-white"><Table size={24} /></div>
                                        <h2 className="text-2xl font-black tracking-tight">Cesta Personalizada</h2>
                                    </div>
                                    <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 text-xs font-black text-slate-400">
                                        TOTAL: {totalManualPrice.toFixed(2)}€
                                    </div>
                                </div>

                                <form onSubmit={addManualItem} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nombre del producto..."
                                        className="md:col-span-1.5 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-slate-200"
                                        value={newManualItem.name}
                                        onChange={e => setNewManualItem({ ...newManualItem, name: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Precio €"
                                        className="p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-slate-200"
                                        value={newManualItem.price}
                                        onChange={e => setNewManualItem({ ...newManualItem, price: e.target.value })}
                                    />
                                    <button type="submit" className="bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-red-600 transition-all flex items-center justify-center gap-2 py-4">
                                        <PlusCircle size={16} /> AÑADIR A TABLA
                                    </button>
                                </form>

                                <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="p-5">Producto</th>
                                                <th className="p-5 text-right">Precio</th>
                                                <th className="p-5 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {manualList.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="p-10 text-center text-slate-300 font-bold italic">No hay productos manuales añadidos</td>
                                                </tr>
                                            ) : (
                                                manualList.map((item) => (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xl">{item.image}</span>
                                                                <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-right font-black text-slate-900">{item.price.toFixed(2)}€</td>
                                                        <td className="p-5 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => addManualToMainCart(item)}
                                                                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                                    title="Pasar a cesta principal"
                                                                >
                                                                    <ShoppingCart size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => removeManualItem(item.id)}
                                                                    className="p-2 text-slate-300 hover:text-red-600 transition-all"
                                                                    title="Eliminar de esta tabla"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-5">
                                <h2 className="text-2xl font-black tracking-tight">Historial de Compras</h2>
                                {orders.length === 0 ? (
                                    <div className="bg-white p-20 rounded-[3rem] text-center border border-slate-200 border-dashed">
                                        <Package className="mx-auto text-slate-200 mb-6" size={80} />
                                        <p className="text-slate-400 font-bold italic">Tu historial está vacío.</p>
                                    </div>
                                ) : (
                                    orders.map(order => (
                                        <div key={order.id} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="bg-green-50 p-4 rounded-xl text-green-600 shadow-inner">
                                                    <CheckCircle size={28} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-lg leading-tight">Pedido #{order.id.slice(-6).toUpperCase()}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(order.createdAt || order.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <p className="text-2xl font-black text-slate-900 tracking-tighter">{order.total.toFixed(2)}€</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Panel Lateral: Mi Cesta Principal */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden sticky top-8">
                            <div className="bg-[#0f172a] p-10 text-white flex justify-between items-center relative overflow-hidden group">
                                <div className="relative z-10">
                                    <h2 className="text-xl font-black tracking-tighter italic uppercase leading-none">Mi Cesta</h2>
                                    <p className="text-[9px] text-slate-400 font-black tracking-[0.2em] uppercase mt-1">Check-out principal</p>
                                </div>
                                <div className="bg-red-600 w-12 h-12 rounded-[1.2rem] flex items-center justify-center font-black text-lg shadow-2xl relative z-10 rotate-2 group-hover:rotate-0 transition-transform">
                                    {cart.length}
                                </div>
                                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <ShoppingCart size={150} />
                                </div>
                            </div>

                            <div className="p-8 min-h-[200px] max-h-[40vh] overflow-y-auto space-y-6 scrollbar-hide">
                                {cart.length === 0 ? (
                                    <div className="text-center py-10 opacity-20">
                                        <ShoppingCart className="mx-auto mb-4" size={40} />
                                        <p className="font-black text-[10px] uppercase">Vacía</p>
                                    </div>
                                ) : (
                                    cart.map((item: any) => (
                                        <div key={item.name} className="flex items-center gap-4 group animate-in slide-in-from-right-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-3xl shadow-sm">
                                                {item.image}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-slate-800 truncate uppercase leading-none tracking-tight">{item.name}</p>
                                                <p className="text-xs font-black text-red-600 mt-1.5">{item.price.toFixed(2)}€</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-1 border border-slate-100 shadow-inner">
                                                    <button onClick={() => updateQty(item.name, -1)} className="p-0.5 text-slate-400 hover:text-red-500"><Minus size={12} /></button>
                                                    <span className="text-[10px] font-black text-slate-700">{item.qty}</span>
                                                    <button onClick={() => updateQty(item.name, 1)} className="p-0.5 text-slate-400 hover:text-green-600"><Plus size={12} /></button>
                                                </div>
                                                <button onClick={() => removeFromCart(item.name)} className="p-1 text-slate-200 hover:text-red-600"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-10 bg-slate-50/50 border-t border-slate-100">
                                <div className="flex justify-between items-end mb-8">
                                    <div>
                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] block mb-2">Total Compra</span>
                                        <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{totalPrice.toFixed(2)}<span className="text-xl ml-1">€</span></span>
                                    </div>
                                </div>
                                <button
                                    disabled={cart.length === 0}
                                    onClick={() => setIsCheckoutOpen(true)}
                                    className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-red-700 transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-4 group"
                                >
                                    <Zap size={22} className="group-hover:animate-bounce" fill="currentColor" /> PAGAR AHORA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal de Checkout */}
                {isCheckoutOpen && (
                    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                                <h2 className="text-3xl font-black tracking-tighter italic uppercase">Finalizar</h2>
                                <button onClick={() => setIsCheckoutOpen(false)} className="p-3 bg-white hover:bg-red-50 rounded-2xl shadow-sm transition-all"><X size={20} /></button>
                            </div>

                            <div className="p-10">
                                {checkoutStep === 1 && (
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">📍 Datos de Envío</p>
                                        <input placeholder="Dirección..." className="w-full p-6 bg-slate-50 rounded-2xl outline-none font-bold" value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input placeholder="Ciudad" className="w-full p-6 bg-slate-50 rounded-2xl outline-none font-bold" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
                                            <input placeholder="C.P." className="w-full p-6 bg-slate-50 rounded-2xl outline-none font-bold" value={address.zip} onChange={e => setAddress({ ...address, zip: e.target.value })} />
                                        </div>
                                        <button onClick={() => setCheckoutStep(2)} className="w-full py-6 bg-[#0f172a] text-white rounded-[2rem] font-black mt-4 flex items-center justify-center gap-2 uppercase tracking-tighter">Siguiente <ChevronRight size={18} /></button>
                                    </div>
                                )}

                                {checkoutStep === 2 && (
                                    <div className="space-y-8">
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">💳 Pago Seguro</p>
                                        <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-8 rounded-[3rem] text-white space-y-8 relative overflow-hidden group shadow-2xl">
                                            <input placeholder="Tarjeta de crédito..." className="bg-transparent text-2xl font-mono w-full border-b border-white/10 pb-4 outline-none placeholder:text-white/10" value={payment.card} onChange={e => setPayment({ ...payment, card: e.target.value })} />
                                            <div className="flex gap-10">
                                                <input placeholder="MM/AA" className="bg-transparent font-mono outline-none w-20 text-lg" value={payment.expiry} onChange={e => setPayment({ ...payment, expiry: e.target.value })} />
                                                <input placeholder="CVV" className="bg-transparent font-mono outline-none w-12 text-lg" value={payment.cvc} onChange={e => setPayment({ ...payment, cvc: e.target.value })} />
                                            </div>
                                        </div>
                                        <button onClick={finalizePurchase} disabled={isOrdering} className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-red-200">
                                            {isOrdering ? <RefreshCw className="animate-spin mx-auto" /> : `CONFIRMAR ${totalPrice.toFixed(2)}€`}
                                        </button>
                                    </div>
                                )}

                                {checkoutStep === 3 && (
                                    <div className="text-center py-12 space-y-8 animate-in zoom-in duration-700">
                                        <div className="w-32 h-32 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-200 animate-bounce"><CheckCircle size={64} /></div>
                                        <h3 className="text-4xl font-black italic uppercase leading-none tracking-tighter">¡LISTO!</h3>
                                        <p className="text-slate-500 font-bold px-8">Tu pedido ha sido procesado correctamente.</p>
                                        <button onClick={() => { setIsCheckoutOpen(false); setCheckoutStep(1); setActiveTab('history'); }} className="w-full py-6 bg-[#0f172a] text-white rounded-[2rem] font-black text-xl shadow-2xl">Ver Historial</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SupermarketsView;
