
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Home, MapPin, Maximize2, BedDouble, Bath, Send, Sparkles,
    RefreshCw, Mail, Trash2, Wifi, WifiOff, Euro, Clock,
    CheckCircle2, AlertTriangle, ExternalLink, Eye, Search,
    MessageCircle, Heart, HeartOff, Filter, Star, Loader2,
    X, ChevronDown, ChevronUp, Bot, Zap, Globe, Plus,
    Copy, Check, Briefcase, BarChart3, TrendingUp, Train,
    Play, Pause, Activity, Edit3, Save, AlertCircle,
    Stethoscope, Phone, Settings, ArrowUpDown, Building2
} from 'lucide-react';

interface Property {
    id: string; title: string; price: string; location: string;
    sqm: number; rooms: number; baths: number; description: string;
    rawText: string; timestamp: number;
    source: 'whatsapp' | 'manual' | 'scrape' | 'curated' | string;
    sent: boolean; senderPhone?: string; senderName?: string;
    url?: string; favorite?: boolean; extras?: string[];
    destacado?: boolean; planta?: string; zona?: string;
}

interface SearchFilters { city: string; maxPrice: string; minRooms: string; propertyType: 'alquiler' | 'venta'; }

interface CronJob {
    id: string; name: string; schedule: string; scheduleLabel: string;
    description: string; category: 'pisos' | 'ofertas' | 'lifebot' | 'resumen';
    enabled: boolean; lastRun?: string; nextRun?: string;
    status: 'active' | 'paused' | 'error' | 'running'; runCount: number;
}

interface Oferta { titulo: string; url: string; ubicacion?: string; icon: string; tipo: 'medico' | 'consultor'; }

const WA_SERVER = import.meta.env.VITE_WA_SERVER_URL || 'https://whatsapp-filehub-production.up.railway.app';
const WA_WS = import.meta.env.VITE_WA_WS_URL || 'wss://whatsapp-filehub-production.up.railway.app/ws';
const STORAGE_KEY = 'filehub_pisos_bot_v3';
const CRON_KEY = 'filehub_pisos_crons_v2';

const CURATED_PISOS: Property[] = [
    { id:'cur_1', title:'Ático Milà i Fontanals, Vila de Gràcia', price:'1.200€', location:'Vila de Gràcia', sqm:45, rooms:0, baths:0, description:'Terraza grande >30m²', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:true, extras:['Ascensor','TERRAZA 50m²','Cerca L3 Fontana'], planta:'4ª ext', zona:'Vila de Gràcia' },
    { id:'cur_2', title:'Piso Dos de Maig 211, Sagrada Família', price:'1.275€', location:'Sagrada Família', sqm:67, rooms:2, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:true, extras:['Ascensor','Balcón','Cerca L5 Sagrada Familia'], planta:'4ª ext', zona:'Sagrada Família' },
    { id:'cur_3', title:'Piso Encarnació, Baix Guinardó', price:'1.268€', location:'Baix Guinardó', sqm:80, rooms:3, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:true, extras:['Ascensor','Balcón','Cerca L5 El Coll/La Teixonera'], planta:'4ª ext', zona:'Baix Guinardó' },
    { id:'cur_4', title:"Piso Martí, Camp d'En Grassot", price:'1.329€', location:"Camp d'En Grassot", sqm:80, rooms:4, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:true, extras:['Ascensor','Sin amueblar',"Cerca L5 Camp de l'Arpa"], planta:'2ª ext', zona:"Camp d'En Grassot" },
    { id:'cur_5', title:"Piso l'Alba, Vila de Gràcia", price:'1.125€', location:'Vila de Gràcia', sqm:68, rooms:4, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:true, extras:['Balcón','Cerca L3 Fontana'], planta:'1ª ext', zona:'Vila de Gràcia' },
    { id:'cur_6', title:'Piso Torrent de les Flors, Vila de Gràcia', price:'1.250€', location:'Vila de Gràcia', sqm:49, rooms:1, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:true, extras:['Ascensor','Balcón','Cerca L3 Joanic'], planta:'3ª ext', zona:'Vila de Gràcia' },
    { id:'cur_7', title:'Piso Rambla del Carmel', price:'1.150€', location:'El Carmel', sqm:70, rooms:2, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:true, extras:['Balcón','Reformado','Cerca L5 El Coll'], planta:'2ª ext', zona:'El Carmel' },
    { id:'cur_8', title:'Piso Sant Dalmir, La Teixonera', price:'1.195€', location:'La Teixonera', sqm:80, rooms:2, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:false, extras:['Ascensor','Cerca L5 Teixonera'], planta:'3ª ext', zona:'La Teixonera' },
    { id:'cur_9', title:'Piso Casanova, Antiga Esquerra Eixample', price:'940€', location:'Antiga Esquerra Eixample', sqm:62, rooms:2, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:true, extras:['Balcón','Cerca L5 Hospital Clínic'], planta:'5ª ext', zona:'Antiga Esquerra Eixample' },
    { id:'cur_10', title:"Piso Camp d'En Grassot, Gràcia Nova", price:'941€', location:'Gràcia Nova', sqm:66, rooms:2, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:false, extras:['Ascensor',"Cerca L5 Camp de l'Arpa"], planta:'Entreplanta ext', zona:'Gràcia Nova' },
    { id:'cur_11', title:'Piso Rosalia de Castro, Baix Guinardó', price:'1.150€', location:'Baix Guinardó', sqm:65, rooms:1, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:false, extras:['Ascensor','Cerca L3/L5 Guinardó'], planta:'1ª ext', zona:'Baix Guinardó' },
    { id:'cur_12', title:'Piso Dante Alighieri, El Carmel', price:'950€', location:'El Carmel', sqm:55, rooms:2, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:false, extras:['Ascensor','Cerca L5 El Carmel'], planta:'1ª ext', zona:'El Carmel' },
    { id:'cur_13', title:'Ático Conca de Tremp, El Carmel', price:'973€', location:'El Carmel', sqm:55, rooms:2, baths:0, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:false, extras:['Cerca L5 El Carmel'], planta:'4ª ext', zona:'El Carmel' },
    { id:'cur_14', title:'Piso València 54, Nova Esquerra Eixample', price:'1.125€', location:'Nova Esquerra Eixample', sqm:45, rooms:1, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:true, extras:['Ascensor','Balcón','Cerca L5 Entença'], planta:'6ª ext', zona:'Nova Esquerra Eixample' },
    { id:'cur_15', title:'Piso Paseo Sant Joan, Dreta Eixample', price:'1.328€', location:'Dreta Eixample', sqm:56, rooms:2, baths:1, description:'', rawText:'', timestamp:Date.now(), source:'curated', sent:false, url:'https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc', destacado:false, extras:['Ascensor','Cerca L5 Verdaguer'], planta:'1ª ext', zona:'Dreta Eixample' },
];

const OFERTAS: Oferta[] = [
    { titulo:'CAMFiC: Médico urgente cobertura MF', url:'https://camfic.cat/detallOferta.aspx?id=2699', ubicacion:'Barcelona', icon:'🏥', tipo:'medico' },
    { titulo:'CatSalut: Bolsa de trabajo MF', url:'https://catsalut.gencat.cat/ca/coneix-catsalut/presentacio/organitzacio/recursos-humans/ofertes-treball/', ubicacion:'Cataluña', icon:'🏛️', tipo:'medico' },
    { titulo:'InfoJobs: Médico de familia', url:'https://www.infojobs.net/ofertas-trabajo/barcelona/medico-de-familia', ubicacion:'Barcelona', icon:'💼', tipo:'medico' },
    { titulo:'SemFYC: Bolsa MFyC', url:'https://www.semfyc.es/secciones-y-grupos/seccion-de-desarrollo-profesional/salida-profesional/bolsa-de-trabajo/', ubicacion:'España', icon:'📋', tipo:'medico' },
    { titulo:'LinkedIn: Telemedicina', url:'https://es.linkedin.com/jobs/telemedicina-empleos', icon:'🔗', tipo:'consultor' },
    { titulo:'Indeed: Telemedicina', url:'https://es.indeed.com/q-telemedicina-empleos.html', icon:'🔍', tipo:'consultor' },
    { titulo:'Telemedi: Médico General (remoto)', url:'https://apply.workable.com/telemedi/j/1A3F03D40A/', icon:'💻', tipo:'consultor' },
    { titulo:'Jooble: Médico teletrabajo', url:'https://es.jooble.org/trabajo-m%C3%A9dico-teletrabajo', icon:'🌐', tipo:'consultor' },
];

const MENSAJE_CONTACTO = `Buenas tardes,\n\nNos ponemos en contacto con usted tras ver el anuncio de su vivienda. Estamos muy interesados en el inmueble, ya que por nuestras circunstancias profesionales buscamos un hogar tranquilo y bien comunicado.\n\nSomos una pareja de médicos con una situación financiera muy sólida:\n• Ella: Facultativa en el Hospital Universitario Vall d'Hebron.\n• Él: Facultativo especialista (actualmente ejerciendo fuera con traslado próximo a Barcelona).\n• Ingresos conjuntos: Superan los 5.000€ netos mensuales, totalmente demostrables mediante nóminas y contratos.\n\nSomos personas responsables, no fumadores y no tenemos mascotas. Al trabajar ambos en el sector sanitario, valoramos especialmente el silencio, el descanso y el buen mantenimiento de la vivienda.\n\nTenemos disponibilidad inmediata para realizar una visita y aportar toda la documentación necesaria para formalizar el alquiler si el perfil les resulta de interés.\n\nMi correo es carlosgalera2roman@gmail.com\n\nUn saludo cordial.`;

const DEFAULT_CRONS: CronJob[] = [
    { id:'c1', name:'Monitor Pisos BCN', schedule:'0 */2 * * *', scheduleLabel:'Cada 2h', description:'Idealista + Fotocasa – alquileres BCN 850-1400€ L3/L5.', category:'pisos', enabled:true, lastRun:new Date(Date.now()-7200000).toISOString(), nextRun:new Date(Date.now()+7200000).toISOString(), status:'active', runCount:42 },
    { id:'c2', name:'Ofertas Médico Familia', schedule:'0 */6 * * *', scheduleLabel:'Cada 6h', description:'CAMFiC, CatSalut, InfoJobs, LinkedIn – médico familia BCN.', category:'ofertas', enabled:true, lastRun:new Date(Date.now()-21600000).toISOString(), nextRun:new Date(Date.now()+21600000).toISOString(), status:'active', runCount:28 },
    { id:'c3', name:'LifeBot Mañana', schedule:'0 7 * * *', scheduleLabel:'7h', description:'Calendario + tiempo + tareas + pisos nuevos por WA.', category:'lifebot', enabled:true, lastRun:new Date(Date.now()-43200000).toISOString(), nextRun:new Date(Date.now()+43200000).toISOString(), status:'active', runCount:21 },
    { id:'c4', name:'LifeBot Tarde', schedule:'0 15 * * *', scheduleLabel:'15h', description:'Resumen medio día + ofertas + pisos actualizados.', category:'lifebot', enabled:true, lastRun:new Date(Date.now()-28800000).toISOString(), nextRun:new Date(Date.now()+28800000).toISOString(), status:'active', runCount:21 },
    { id:'c5', name:'LifeBot Noche', schedule:'0 23 * * *', scheduleLabel:'23h', description:'Resumen día completo + planificación mañana.', category:'lifebot', enabled:true, lastRun:new Date(Date.now()-14400000).toISOString(), nextRun:new Date(Date.now()+36000000).toISOString(), status:'active', runCount:21 },
    { id:'c6', name:'Caso Clínico Semanal', schedule:'0 9 * * 1', scheduleLabel:'Lunes 9h', description:'Caso clínico MF por WA.', category:'resumen', enabled:true, lastRun:new Date(Date.now()-432000000).toISOString(), nextRun:new Date(Date.now()+259200000).toISOString(), status:'active', runCount:8 },
];

const CRON_CATS: Record<string, { label:string; icon:any; bg:string; text:string }> = {
    pisos:{ label:'Pisos', icon:Home, bg:'bg-indigo-500/10', text:'text-indigo-400' },
    ofertas:{ label:'Ofertas', icon:Briefcase, bg:'bg-emerald-500/10', text:'text-emerald-400' },
    lifebot:{ label:'LifeBot', icon:Zap, bg:'bg-amber-500/10', text:'text-amber-400' },
    resumen:{ label:'Resumen', icon:Globe, bg:'bg-violet-500/10', text:'text-violet-400' },
};

function parsePisoFromText(text: string, msgId: string, ts: number, phone?: string, name?: string): Property | null {
    const t = text.toLowerCase();
    if (!['piso','vivienda','alquiler','apartamento','ático','estudio','loft','duplex'].some(k=>t.includes(k))) return null;
    if (!['€','precio','mes','m2','m²','zona','habitaciones','baño'].some(k=>t.includes(k))) return null;
    const ext = (kw:string)=>{const m=text.match(new RegExp(`${kw}[:\\*\\s]*(.*)`, 'i'));return m?m[1].trim().replace(/\*+/g,'').trim():'';};
    const pm=text.match(/(\d[\d.,]*)\s*€/); const price=ext('Precio')||ext('Alquiler')||(pm?pm[0]:'Consultar');
    const sm=text.match(/(\d+)\s*m[²2]/i); const sqm=parseInt(ext('Metros')||ext('m2'))||(sm?parseInt(sm[1]):0);
    const rm=text.match(/(\d+)\s*(?:hab|dormitorio|habitaci)/i); const rooms=parseInt(ext('Habitaciones'))||(rm?parseInt(rm[1]):0);
    const bm=text.match(/(\d+)\s*(?:baño|bañ)/i); const baths=parseInt(ext('Baños'))||(bm?parseInt(bm[1]):0);
    const title=ext('Título')||ext('Piso')||text.split('\n').find(l=>l.trim().length>5&&l.trim().length<80)?.replace(/\*+/g,'').trim()||'Inmueble detectado';
    const loc=ext('Zona')||ext('Ubicación')||ext('Barrio')||'No especificada';
    const um=text.match(/https?:\/\/[^\s\)>"]+/);
    return { id:`wa_${msgId}_${ts}`, title:title.substring(0,80), price, location:loc.substring(0,60), sqm, rooms, baths, description:text.substring(0,300), rawText:text, timestamp:ts, source:'whatsapp', sent:false, senderPhone:phone, senderName:name, url:um?um[0]:undefined };
}

function fmtRel(iso?:string):string { if(!iso)return'—'; const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1)return'ahora'; if(m<60)return`hace ${m}m`; const h=Math.floor(m/60); if(h<24)return`hace ${h}h`; return`hace ${Math.floor(h/24)}d`; }
function fmtNext(iso?:string):string { if(!iso)return'—'; const d=new Date(iso).getTime()-Date.now(); if(d<0)return'pendiente'; const m=Math.floor(d/60000); if(m<60)return`en ${m}m`; const h=Math.floor(m/60); if(h<24)return`en ${h}h`; return`en ${Math.floor(h/24)}d`; }
function parsePrice(p:string):number { const m=p.replace(/[^\d]/g,''); return m?parseInt(m):0; }

const WhatsAppPisosView: React.FC = () => {
    const [waProps, setWaProps] = useState<Property[]>(()=>{ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]} });
    const [wsOn, setWsOn] = useState(false);
    const [tab, setTab] = useState<'dashboard'|'live'|'buscar'|'ofertas'|'cron'|'contacto'>('dashboard');
    const [selProp, setSelProp] = useState<Property|null>(null);
    const [sf, setSf] = useState<SearchFilters>({city:'barcelona',maxPrice:'1400',minRooms:'',propertyType:'alquiler'});
    const [searching, setSearching] = useState(false);
    const [searchRes, setSearchRes] = useState<Property[]>([]);
    const [scrapeMsg, setScrapeMsg] = useState('');
    const [quickMsg, setQuickMsg] = useState('');
    const [sendingId, setSendingId] = useState<string|null>(null);
    const [syncing, setSyncing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [sortBy, setSortBy] = useState('precio-asc');
    const [fDest, setFDest] = useState(false);
    const [crons, setCrons] = useState<CronJob[]>(()=>{ try{const s=localStorage.getItem(CRON_KEY);return s?JSON.parse(s):DEFAULT_CRONS}catch{return DEFAULT_CRONS} });
    const wsRef = useRef<WebSocket|null>(null);
    const reconRef = useRef<ReturnType<typeof setTimeout>|null>(null);

    const persist = useCallback((u:Property[])=>{ setWaProps(u); localStorage.setItem(STORAGE_KEY,JSON.stringify(u.slice(0,200))); },[]);
    useEffect(()=>{ localStorage.setItem(CRON_KEY,JSON.stringify(crons)); },[crons]);

    // WS Connection
    const connectWS = useCallback(()=>{
        if(wsRef.current?.readyState===WebSocket.OPEN)return;
        try{
            const ws=new WebSocket(WA_WS); wsRef.current=ws;
            ws.onopen=()=>setWsOn(true);
            ws.onclose=()=>{setWsOn(false);reconRef.current=setTimeout(connectWS,5000);};
            ws.onerror=()=>ws.close();
            ws.onmessage=(e)=>{try{
                const d=JSON.parse(e.data);
                if(d.type==='message'&&d.message?.type==='incoming'){
                    const msg=d.message; const p=parsePisoFromText(msg.body||'',msg.id,msg.timestamp,msg.from,msg.fromName);
                    if(p) setWaProps(prev=>{if(prev.some(x=>x.id===p.id))return prev;const u=[p,...prev];localStorage.setItem(STORAGE_KEY,JSON.stringify(u.slice(0,200)));return u;});
                }
                if(d.type==='history'){
                    const np:Property[]=[]; (d.messages||[]).forEach((m:any)=>{if(m.type!=='incoming'||!m.body)return;const p=parsePisoFromText(m.body,m.id,m.timestamp,m.from,m.fromName);if(p)np.push(p);});
                    if(np.length>0)setWaProps(prev=>{const ids=new Set(prev.map(p=>p.id));const u=[...prev,...np.filter(p=>!ids.has(p.id))];localStorage.setItem(STORAGE_KEY,JSON.stringify(u.slice(0,200)));return u;});
                }
                if(d.type==='scrape_results'&&d.target==='pisos'){
                    const items:Property[]=(d.items||[]).map((i:any)=>({id:i.id||`sc_${Date.now()}_${Math.random()}`,title:i.title||'Piso',price:i.price||'—',location:i.location||'',sqm:i.sqm||0,rooms:i.rooms||0,baths:i.baths||0,description:i.description||'',rawText:'',timestamp:Date.now(),source:'scrape',sent:false,url:i.url}));
                    setSearchRes(items);setSearching(false);setScrapeMsg(`✅ ${items.length} pisos encontrados`);
                }
                if(d.type==='bot_scrape_results'&&d.target==='pisos'){
                    const items:Property[]=(d.items||[]).map((i:any)=>({id:i.id||`bot_${Date.now()}_${Math.random()}`,title:i.title||'Piso',price:i.price||'—',location:i.location||d.city||'',sqm:0,rooms:0,baths:0,description:i.description||'',rawText:'',timestamp:Date.now(),source:'scrape',sent:false,url:i.url}));
                    setWaProps(prev=>{const ids=new Set(prev.map(p=>p.id));const u=[...items.filter(p=>!ids.has(p.id)),...prev];localStorage.setItem(STORAGE_KEY,JSON.stringify(u.slice(0,200)));return u;});
                    setScrapeMsg(`🤖 Bot: ${items.length} pisos`);
                }
                if(d.type==='scrape_status')setScrapeMsg(d.message||'');
            }catch{}};
            const pi=setInterval(()=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'ping'}))},15000);
            ws.addEventListener('close',()=>clearInterval(pi));
        }catch{}
    },[]);
    useEffect(()=>{connectWS();return()=>{if(reconRef.current)clearTimeout(reconRef.current);wsRef.current?.close();};},[connectWS]);

    const syncServer=async()=>{setSyncing(true);try{const r=await fetch(`${WA_SERVER}/messages/classified`);const d=await r.json();const np:Property[]=[];(d.pisos||[]).forEach((m:any)=>{const p=parsePisoFromText(m.body,m.id,m.timestamp,m.from,m.fromName);if(p)np.push(p);});if(np.length>0)setWaProps(prev=>{const ids=new Set(prev.map(p=>p.id));const u=[...prev,...np.filter(p=>!ids.has(p.id))];localStorage.setItem(STORAGE_KEY,JSON.stringify(u.slice(0,200)));return u;});}catch{}setSyncing(false);};

    const handleSearch=()=>{
        if(!sf.city.trim())return;setSearching(true);setScrapeMsg(`🔍 Buscando en ${sf.city}...`);setSearchRes([]);
        if(wsRef.current?.readyState===WebSocket.OPEN){wsRef.current.send(JSON.stringify({type:'scrape_pisos',city:sf.city,maxPrice:sf.maxPrice||undefined,rooms:sf.minRooms||undefined,propertyType:sf.propertyType,maxItems:20}));setTimeout(()=>{setSearching(p=>{if(p)setScrapeMsg('⏱️ Timeout');return false;});},30000);}
        else{const params=new URLSearchParams({city:sf.city,type:sf.propertyType,limit:'20'});if(sf.maxPrice)params.set('maxPrice',sf.maxPrice);fetch(`${WA_SERVER}/scrape/pisos?${params}`).then(r=>r.json()).then(d=>{const items:Property[]=(d.pisos||[]).map((i:any,n:number)=>({id:`r_${Date.now()}_${n}`,title:i.title||'Piso',price:i.price||'—',location:i.location||sf.city,sqm:i.sqm||0,rooms:i.rooms||0,baths:i.baths||0,description:i.description||'',rawText:'',timestamp:Date.now(),source:'scrape',sent:false,url:i.url}));setSearchRes(items);setScrapeMsg(`✅ ${items.length} pisos`);}).catch(()=>setScrapeMsg('❌ Error')).finally(()=>setSearching(false));}
    };

    const sendWA=async(prop:Property,msg?:string)=>{if(!prop.senderPhone)return;setSendingId(prop.id);try{const r=await fetch(`${WA_SERVER}/send`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:prop.senderPhone,message:msg||quickMsg||MENSAJE_CONTACTO})});if(r.ok)persist(waProps.map(p=>p.id===prop.id?{...p,sent:true}:p));}catch{}setSendingId(null);};
    const sendContactWA=async()=>{try{await fetch(`${WA_SERVER}/send`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:'34679888148',message:`📋 MENSAJE CONTACTO:\n\n${MENSAJE_CONTACTO}`})});setScrapeMsg('✅ Enviado a tu WA');}catch{setScrapeMsg('❌ Error');}};
    const toggleFav=(id:string)=>persist(waProps.map(p=>p.id===id?{...p,favorite:!p.favorite}:p));
    const addPiso=(prop:Property)=>{if(waProps.some(p=>p.id===prop.id))return;persist([prop,...waProps]);};
    const delPiso=(id:string)=>persist(waProps.filter(p=>p.id!==id));
    const copyMsg=()=>{navigator.clipboard.writeText(MENSAJE_CONTACTO);setCopied(true);setTimeout(()=>setCopied(false),2500);};
    const toggleCron=(id:string)=>setCrons(p=>p.map(j=>j.id===id?{...j,enabled:!j.enabled,status:j.enabled?'paused':'active'}:j));
    const runCron=(id:string)=>{setCrons(p=>p.map(j=>j.id===id?{...j,status:'running'}:j));if(wsRef.current?.readyState===WebSocket.OPEN){const j=crons.find(j=>j.id===id);if(j)wsRef.current.send(JSON.stringify({type:'cron_trigger',jobId:id,jobName:j.name}));}setTimeout(()=>{setCrons(p=>p.map(j=>j.id===id?{...j,status:'active',lastRun:new Date().toISOString(),runCount:j.runCount+1}:j));},2500);};

    const sorted=useMemo(()=>{let l=fDest?CURATED_PISOS.filter(p=>p.destacado):[...CURATED_PISOS];switch(sortBy){case'precio-asc':return l.sort((a,b)=>parsePrice(a.price)-parsePrice(b.price));case'precio-desc':return l.sort((a,b)=>parsePrice(b.price)-parsePrice(a.price));case'm2-desc':return l.sort((a,b)=>b.sqm-a.sqm);case'ratio':return l.sort((a,b)=>(parsePrice(a.price)/a.sqm)-(parsePrice(b.price)/b.sqm));default:return l;}},[sortBy,fDest]);
    const liveN=waProps.length; const favN=waProps.filter(p=>p.favorite).length; const actCrons=crons.filter(j=>j.enabled).length;

    const PropCard=({prop,showAdd=false}:{prop:Property;showAdd?:boolean})=>(
        <div className={`group bg-white dark:bg-slate-800 rounded-2xl border transition-all hover:shadow-lg overflow-hidden ${prop.favorite?'border-pink-300 dark:border-pink-500/40':prop.destacado?'border-amber-300/50 dark:border-amber-500/30':'border-slate-200 dark:border-slate-700'}`}>
            <div className="px-4 pt-3 flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${prop.source==='whatsapp'?'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400':prop.source==='curated'?'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400':prop.source==='scrape'?'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400':'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {prop.source==='whatsapp'?'💬 WA':prop.source==='curated'?'⭐ Curado':prop.source==='scrape'?'🔍 Scrape':'✏️'}
                </span>
                <div className="flex gap-1">
                    {prop.source!=='curated'&&<button onClick={()=>toggleFav(prop.id)} className="p-1.5 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-500/10">{prop.favorite?<Heart size={14} className="text-pink-500 fill-pink-500"/>:<HeartOff size={14} className="text-slate-400"/>}</button>}
                    {showAdd&&<button onClick={()=>addPiso(prop)} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10"><Plus size={14} className="text-emerald-600"/></button>}
                    {!showAdd&&prop.source!=='curated'&&<button onClick={()=>delPiso(prop.id)} className="p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100"><Trash2 size={14} className="text-slate-400 hover:text-red-500"/></button>}
                </div>
            </div>
            <div className="p-4 pt-2">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-black text-sm text-slate-800 dark:text-white leading-snug line-clamp-2">{prop.title}</p>
                    <span className="shrink-0 text-base font-black text-amber-600 dark:text-amber-400">{prop.price}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-2"><MapPin size={11}/><span className="truncate">{prop.zona||prop.location}</span></div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                    {prop.sqm>0&&<span className="flex items-center gap-1 text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg"><Maximize2 size={9}/>{prop.sqm}m²</span>}
                    {prop.rooms>0&&<span className="flex items-center gap-1 text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg"><BedDouble size={9}/>{prop.rooms}hab</span>}
                    {prop.planta&&<span className="text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">{prop.planta}</span>}
                    {prop.sqm>0&&<span className="text-[10px] font-mono text-slate-400 px-2 py-1">{(parsePrice(prop.price)/prop.sqm).toFixed(1)}€/m²</span>}
                    {prop.sent&&<span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">✓ Enviado</span>}
                </div>
                {prop.extras&&prop.extras.length>0&&<div className="flex gap-1 flex-wrap mb-3">{prop.extras.map((e,j)=>(<span key={j} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${/cerca|L3|L5/i.test(e)?'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300':/balc|terraza|reform|ascensor/i.test(e)?'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300':'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{e}</span>))}</div>}
                <div className="flex gap-2">
                    {prop.url&&<a href={prop.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-300 transition-all"><ExternalLink size={12}/>Ver anuncio</a>}
                    {prop.senderPhone&&<button onClick={()=>sendWA(prop)} disabled={sendingId===prop.id} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-xl text-xs font-bold text-white shadow-sm shadow-green-500/20">{sendingId===prop.id?<Loader2 size={12} className="animate-spin"/>:<MessageCircle size={12}/>}{sendingId===prop.id?'...':'WhatsApp'}</button>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25"><Home size={24} className="text-white"/></div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Pisos Bot WA</h2>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${wsOn?'bg-emerald-500 animate-pulse':'bg-red-500'}`}/><span className="text-xs text-slate-500">{wsOn?'Bot conectado':'Desconectado'}</span></div>
                            <span className="text-[10px] text-slate-400">·</span><span className="text-[10px] font-bold text-amber-500">{actCrons} crons activos</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={syncServer} disabled={syncing} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-amber-400/50 disabled:opacity-50">{syncing?<Loader2 size={14} className="animate-spin"/>:<RefreshCw size={14}/>}Sync</button>
                    <button onClick={sendContactWA} className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-green-500/20"><Send size={14}/>Contacto WA</button>
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[{v:CURATED_PISOS.length,l:'Curados BCN',i:Star,bg:'bg-amber-500/10',tc:'text-amber-400'},{v:liveN,l:'Live WA',i:MessageCircle,bg:'bg-green-500/10',tc:'text-green-400'},{v:favN,l:'Favoritos',i:Heart,bg:'bg-pink-500/10',tc:'text-pink-400'},{v:actCrons,l:'Crons',i:Clock,bg:'bg-indigo-500/10',tc:'text-indigo-400'},{v:OFERTAS.length,l:'Ofertas',i:Briefcase,bg:'bg-emerald-500/10',tc:'text-emerald-400'},{v:crons.reduce((s,j)=>s+j.runCount,0),l:'Ejecuciones',i:Activity,bg:'bg-violet-500/10',tc:'text-violet-400'}].map((s,i)=>(
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5"><div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2`}><s.i size={18} className={s.tc}/></div><div className="text-xl font-black text-slate-800 dark:text-white">{s.v}</div><div className="text-[10px] text-slate-500 font-medium">{s.l}</div></div>
                ))}
            </div>

            {/* BOT COMMANDS */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/5 rounded-2xl border border-green-200 dark:border-green-500/20 p-4">
                <div className="flex items-start gap-3"><div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center shadow-md shrink-0"><Bot size={18} className="text-white"/></div>
                    <div><p className="font-black text-sm text-green-700 dark:text-green-400 mb-1">Comandos Bot WhatsApp</p>
                        <div className="flex flex-wrap gap-1.5">{['/buscar piso barcelona 1400','/pisos','/ofertas medico','/lifebot','/ayuda'].map(c=>(<span key={c} className="font-mono text-[10px] bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg">{c}</span>))}</div>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto">
                {([{id:'dashboard' as const,l:`🏠 BCN (${CURATED_PISOS.length})`},{id:'live' as const,l:`💬 Live (${liveN})`},{id:'buscar' as const,l:'🔍 Buscar'},{id:'ofertas' as const,l:`🏥 Ofertas`},{id:'cron' as const,l:`⏰ Crons (${actCrons})`},{id:'contacto' as const,l:'✉️ Contacto'}]).map(t=>(
                    <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${tab===t.id?'bg-white dark:bg-slate-700 text-amber-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{t.l}</button>
                ))}
            </div>

            {/* TAB: DASHBOARD */}
            {tab==='dashboard'&&(<div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                    <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-medium cursor-pointer outline-none"><option value="precio-asc">Precio ↑</option><option value="precio-desc">Precio ↓</option><option value="m2-desc">m² ↓</option><option value="ratio">€/m²</option></select>
                    <button onClick={()=>setFDest(!fDest)} className={`text-xs font-bold px-3 py-2 rounded-lg border ${fDest?'bg-amber-50 dark:bg-amber-900/30 border-amber-300 text-amber-600':'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>⭐ Destacados</button>
                    <span className="text-[10px] font-mono text-slate-400 ml-auto">{sorted.length} pisos · 850–1400€ · L3/L5</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{sorted.map(p=><PropCard key={p.id} prop={p}/>)}</div>
            </div>)}

            {/* TAB: LIVE */}
            {tab==='live'&&(<div>
                {waProps.length===0?(<div className="flex flex-col items-center py-16 text-center"><div className="text-5xl mb-4">💬</div><p className="font-bold text-slate-600 dark:text-slate-300">Sin pisos en tiempo real</p><p className="text-xs text-slate-400 mt-1 max-w-xs">Aparecerán cuando el bot reciba mensajes con anuncios por WhatsApp</p></div>)
                :(<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{waProps.sort((a,b)=>b.timestamp-a.timestamp).map(p=><PropCard key={p.id} prop={p}/>)}</div>)}
            </div>)}

            {/* TAB: BUSCAR */}
            {tab==='buscar'&&(<div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <h3 className="font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Search size={16} className="text-amber-500"/>Búsqueda de pisos</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Ciudad</label><input value={sf.city} onChange={e=>setSf(f=>({...f,city:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&handleSearch()} placeholder="barcelona..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"/></div>
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Precio max €</label><input type="number" value={sf.maxPrice} onChange={e=>setSf(f=>({...f,maxPrice:e.target.value}))} placeholder="1400" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"/></div>
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Hab. mín.</label><input type="number" value={sf.minRooms} onChange={e=>setSf(f=>({...f,minRooms:e.target.value}))} placeholder="2" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"/></div>
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tipo</label><select value={sf.propertyType} onChange={e=>setSf(f=>({...f,propertyType:e.target.value as any}))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"><option value="alquiler">Alquiler</option><option value="venta">Venta</option></select></div>
                    </div>
                    <button onClick={handleSearch} disabled={searching} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-xl shadow-lg shadow-amber-500/20 hover:opacity-90 disabled:opacity-50">{searching?<Loader2 size={18} className="animate-spin"/>:<Search size={18}/>}{searching?'Buscando...':'Buscar pisos ahora'}</button>
                    {scrapeMsg&&<p className={`text-xs font-bold mt-2 text-center ${scrapeMsg.startsWith('❌')?'text-red-500':'text-emerald-600'}`}>{scrapeMsg}</p>}
                </div>
                {searchRes.length>0&&<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{searchRes.map(p=><PropCard key={p.id} prop={p} showAdd/>)}</div>}
            </div>)}

            {/* TAB: OFERTAS */}
            {tab==='ofertas'&&(<div className="space-y-6">
                {(['medico','consultor'] as const).map(tipo=>(<div key={tipo}>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">{tipo==='medico'?<><Stethoscope size={16} className="text-amber-500"/>Ofertas Médico de Familia</>:<><Globe size={16} className="text-violet-500"/>Consultor / Telemedicina</>}<span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-bold">{OFERTAS.filter(o=>o.tipo===tipo).length}</span></h3>
                    <div className="space-y-2">{OFERTAS.filter(o=>o.tipo===tipo).map((o,i)=>(<a key={i} href={o.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"><span className="text-xl">{o.icon}</span><div className="flex-1 min-w-0"><div className="text-sm font-bold text-slate-900 dark:text-white truncate">{o.titulo}</div>{o.ubicacion&&<div className="text-xs text-slate-400 mt-0.5">{o.ubicacion}</div>}</div><ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-500 shrink-0"/></a>))}</div>
                </div>))}
            </div>)}

            {/* TAB: CRON */}
            {tab==='cron'&&(<div className="space-y-3">
                {crons.map(job=>{const cat=CRON_CATS[job.category]||CRON_CATS.pisos;return(
                    <div key={job.id} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 p-4 ${!job.enabled?'opacity-50':''}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                                <div className={`w-10 h-10 ${cat.bg} rounded-xl flex items-center justify-center shrink-0`}><cat.icon size={18} className={cat.text}/></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap"><h3 className="font-black text-sm text-slate-800 dark:text-white">{job.name}</h3><span className={`flex items-center gap-1 text-[10px] font-bold ${job.status==='running'?'text-blue-400':job.status==='active'?'text-emerald-400':'text-slate-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${job.status==='running'?'bg-blue-400 animate-pulse':job.status==='active'?'bg-emerald-400':'bg-slate-500'}`}/>{job.status==='running'?'Ejecutando...':job.status==='active'?'Activo':'Pausado'}</span></div>
                                    <p className="text-xs text-slate-500 mt-0.5">{job.description}</p>
                                    <div className="flex gap-4 mt-2 text-[10px] text-slate-400"><span>⏱️ {job.scheduleLabel}</span><span>📊 {job.runCount}x</span><span>🕐 {fmtRel(job.lastRun)}</span><span>➡️ {fmtNext(job.nextRun)}</span></div>
                                </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                <button onClick={()=>runCron(job.id)} disabled={job.status==='running'||!job.enabled} className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 hover:bg-indigo-100 disabled:opacity-30">{job.status==='running'?<Loader2 size={14} className="animate-spin"/>:<Play size={14}/>}</button>
                                <button onClick={()=>toggleCron(job.id)} className={`p-2 rounded-lg ${job.enabled?'bg-amber-50 dark:bg-amber-500/10 text-amber-500':'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{job.enabled?<Pause size={14}/>:<Play size={14}/>}</button>
                            </div>
                        </div>
                    </div>
                );})}
            </div>)}

            {/* TAB: CONTACTO */}
            {tab==='contacto'&&(<div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mail size={16} className="text-amber-500"/>Mensaje para caseros</h3>
                    <div className="flex gap-2">
                        <button onClick={copyMsg} className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg ${copied?'bg-emerald-500 text-white':'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{copied?<><Check size={14}/>Copiado</>:<><Copy size={14}/>Copiar</>}</button>
                        <button onClick={sendContactWA} className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"><Send size={14}/>Enviar WA</button>
                    </div>
                </div>
                <pre className="p-5 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{MENSAJE_CONTACTO}</pre>
            </div>)}

            {/* FOOTER */}
            <div className="text-center pt-4"><p className="text-[10px] text-slate-400">⭐ = Terraza/balcón + ascensor + L3/L5 · FILEHUB · 850–1400€ · Sin Raval/La Mina</p></div>
        </div>
    );
};

export default WhatsAppPisosView;
