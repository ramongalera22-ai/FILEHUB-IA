
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Home, MapPin, Maximize2, Euro, ArrowUpDown, Star, Filter, BedDouble,
  Briefcase, Mail, Copy, Check, ExternalLink, BarChart3, Send,
  TrendingUp, Building2, Train, Wind, ChevronDown, ChevronUp,
  Search, SlidersHorizontal, Stethoscope, Globe, Phone, Loader2,
  Sparkles, Eye, Heart, HeartOff, AlertCircle, MessageCircle, CheckCircle2,
  Clock, Activity, Zap, Play, Pause, Bot, RefreshCw, X, Wifi, WifiOff
} from 'lucide-react';

// ═══ TYPES ═══════════════════════════════════════════════════════
interface Piso {
  id: number; titulo: string; precio: number; hab: string; m2: number;
  planta: string; extras: string[]; zona: string; fuente: string;
  url: string; destacado: boolean; nota?: string;
}
interface Oferta { titulo: string; url: string; ubicacion?: string; icon: string; tipo: 'medico' | 'consultor'; }
interface CronJob {
  id: string; name: string; scheduleLabel: string; description: string;
  category: string; enabled: boolean; lastRun?: string;
  status: 'active' | 'paused' | 'running'; runCount: number;
}

// ═══ CONFIG ══════════════════════════════════════════════════════
const WA_SERVER = import.meta.env.VITE_WA_SERVER_URL || 'https://whatsapp-filehub-production.up.railway.app';

// ═══ DATA ════════════════════════════════════════════════════════
const PISOS: Piso[] = [
  { id:1, titulo:"Piso sin amueblar obra nueva, La Teixonera", precio:950, hab:"2 hab", m2:54, planta:"3ª ext", extras:["Ascensor","A/C conductos","Parquet","Cerca L5 Teixonera"], zona:"La Teixonera", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos,de-dos-dormitorios,de-tres-dormitorios,de-cuatro-o-mas-dormitorios/", destacado:true, nota:"Obra nueva · Larga duración" },
  { id:2, titulo:"Piso 3 hab sin amueblar, Baix Guinardó", precio:1100, hab:"3 hab", m2:75, planta:"2ª ext", extras:["Ascensor","Balcón","Calefacción","Cerca L5 El Coll/La Teixonera"], zona:"Baix Guinardó", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Larga duración · Exterior" },
  { id:3, titulo:"Piso 2 hab reformado, Ronda Guinardó", precio:1050, hab:"2 hab", m2:70, planta:"4ª ext", extras:["Ascensor","Balcón","Reformado","Cerca L3/L5 Guinardó"], zona:"El Guinardó", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Reformado · Larga duración" },
  { id:4, titulo:"Piso 3 hab sin amueblar, El Carmel", precio:950, hab:"3 hab", m2:65, planta:"1ª ext", extras:["Ascensor","Terraza 12m²","Cerca L5 El Carmel"], zona:"El Carmel", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Con terraza · Larga duración" },
  { id:5, titulo:"Piso 2 hab exterior, Camp d'En Grassot", precio:1200, hab:"2 hab", m2:68, planta:"3ª ext", extras:["Ascensor","Balcón","A/C","Sin amueblar","Cerca L5 Camp de l'Arpa"], zona:"Camp d'En Grassot", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Larga duración · A/C" },
  { id:6, titulo:"Piso 4 hab sin amueblar, Vila de Gràcia", precio:1350, hab:"4 hab", m2:85, planta:"2ª ext", extras:["Ascensor","Balcón","Calefacción gas","Cerca L3 Fontana"], zona:"Vila de Gràcia", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Piso grande · Larga duración" },
  { id:7, titulo:"Piso 3 hab sin amueblar, Sagrada Família", precio:1300, hab:"3 hab", m2:80, planta:"4ª ext", extras:["Ascensor","Balcón","A/C","Parquet","Cerca L5 Sagrada Familia"], zona:"Sagrada Família", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/eixample/la-sagrada-familia/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Larga duración · Parquet" },
  { id:8, titulo:"Piso 2 hab exterior, Horta", precio:880, hab:"2 hab", m2:60, planta:"2ª ext", extras:["Ascensor","Terraza 8m²","Cerca L3 Horta"], zona:"Horta", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Económico · Terraza · Larga duración" },
  { id:9, titulo:"Piso 2 hab sin amueblar, Antiga Esquerra Eixample", precio:1150, hab:"2 hab", m2:65, planta:"5ª ext", extras:["Ascensor","Balcón","A/C frío-calor","Cerca L5 Hospital Clínic"], zona:"Antiga Esquerra Eixample", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Larga duración · A/C" },
  { id:10, titulo:"Piso 3 hab sin amueblar, Gràcia Nova", precio:1100, hab:"3 hab", m2:72, planta:"Entreplanta ext", extras:["Ascensor","Reformado","Cerca L5 Camp de l'Arpa"], zona:"Gràcia Nova", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-alquiler-de-larga-temporada,solo-pisos/", destacado:false, nota:"Reformado · Larga duración" },
  { id:11, titulo:"Piso 2 hab sin amueblar, Montbau", precio:870, hab:"2 hab", m2:58, planta:"3ª ext", extras:["Ascensor","Calefacción","Cerca L3 Montbau"], zona:"Montbau", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", destacado:false, nota:"Económico · Cerca Vall d'Hebron" },
  { id:12, titulo:"Piso 3 hab obra nueva, Pedrell (Guinardó)", precio:1250, hab:"3 hab", m2:80, planta:"1ª ext", extras:["Ascensor","Terraza","A/C conductos","Armarios empotrados","Cerca L5"], zona:"El Guinardó", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Obra nueva · Larga duración" },
  { id:13, titulo:"Piso 2 hab sin amueblar, Nova Esquerra Eixample", precio:1180, hab:"2 hab", m2:62, planta:"6ª ext", extras:["Ascensor","Balcón","A/C","Cerca L5 Entença"], zona:"Nova Esquerra Eixample", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-alquiler-de-larga-temporada,solo-pisos/", destacado:false, nota:"Larga duración · Planta alta" },
  { id:14, titulo:"Piso 2 hab sin amueblar, Dreta Eixample", precio:1400, hab:"2 hab", m2:70, planta:"3ª ext", extras:["Ascensor","Balcón","A/C","Finca regia","Cerca L5 Verdaguer"], zona:"Dreta Eixample", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-alquiler-de-larga-temporada,solo-pisos/", destacado:false, nota:"Finca regia · Larga duración" },
  { id:15, titulo:"Piso 3 hab sin amueblar, Rambla del Carmel", precio:980, hab:"3 hab", m2:75, planta:"2ª ext", extras:["Balcón","Reformado","Calefacción","Cerca L5 El Coll"], zona:"El Carmel", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", destacado:true, nota:"Reformado · Económico · Larga duración" },
];

const OFERTAS: Oferta[] = [
  {titulo:"CAMFiC: Médico urgente cobertura MF",url:"https://camfic.cat/detallOferta.aspx?id=2699",ubicacion:"Barcelona",icon:"\ud83c\udfe5",tipo:"medico"},
  {titulo:"CatSalut: Bolsa de trabajo MF",url:"https://catsalut.gencat.cat/ca/coneix-catsalut/presentacio/organitzacio/recursos-humans/ofertes-treball/",ubicacion:"Cataluña",icon:"\ud83c\udfdb\ufe0f",tipo:"medico"},
  {titulo:"InfoJobs: Médico de familia",url:"https://www.infojobs.net/ofertas-trabajo/barcelona/medico-de-familia",ubicacion:"Barcelona",icon:"\ud83d\udcbc",tipo:"medico"},
  {titulo:"SemFYC: Bolsa MFyC",url:"https://www.semfyc.es/secciones-y-grupos/seccion-de-desarrollo-profesional/salida-profesional/bolsa-de-trabajo/",ubicacion:"España",icon:"\ud83d\udccb",tipo:"medico"},
  {titulo:"LinkedIn: Telemedicina",url:"https://es.linkedin.com/jobs/telemedicina-empleos",icon:"\ud83d\udd17",tipo:"consultor"},
  {titulo:"Indeed: Telemedicina",url:"https://es.indeed.com/q-telemedicina-empleos.html",icon:"\ud83d\udd0d",tipo:"consultor"},
  {titulo:"Telemedi: Médico General (remoto)",url:"https://apply.workable.com/telemedi/j/1A3F03D40A/",icon:"\ud83d\udcbb",tipo:"consultor"},
  {titulo:"Jooble: Médico teletrabajo",url:"https://es.jooble.org/trabajo-m%C3%A9dico-teletrabajo",icon:"\ud83c\udf10",tipo:"consultor"},
];

const MSG = "Buenas tardes,\n\nNos ponemos en contacto con usted tras ver el anuncio de su vivienda. Estamos muy interesados en el inmueble, ya que por nuestras circunstancias profesionales buscamos un hogar tranquilo y bien comunicado.\n\nSomos una pareja de m\u00e9dicos con una situaci\u00f3n financiera muy s\u00f3lida:\n\u2022 Ella: Facultativa en el Hospital Universitario Vall d\u2019Hebron.\n\u2022 \u00c9l: Facultativo especialista (actualmente ejerciendo fuera con traslado pr\u00f3ximo a Barcelona).\n\u2022 Ingresos conjuntos: Superan los 5.000\u20ac netos mensuales, totalmente demostrables mediante n\u00f3minas y contratos.\n\nSomos personas responsables, no fumadores y no tenemos mascotas. Al trabajar ambos en el sector sanitario, valoramos especialmente el silencio, el descanso y el buen mantenimiento de la vivienda.\n\nTenemos disponibilidad inmediata para realizar una visita y aportar toda la documentaci\u00f3n necesaria para formalizar el alquiler si el perfil les resulta de inter\u00e9s.\n\nMi correo es carlosgalera2roman@gmail.com\n\nUn saludo cordial.";

const CRONS: CronJob[] = [
  {id:"cr1",name:"Monitor Pisos BCN",scheduleLabel:"Cada 2h",description:"Idealista+Fotocasa \u2013 BCN 850-1400\u20ac L3/L5",category:"pisos",enabled:true,lastRun:new Date(Date.now()-7200000).toISOString(),status:"active",runCount:42},
  {id:"cr2",name:"Ofertas M\u00e9dico",scheduleLabel:"Cada 6h",description:"CAMFiC, CatSalut, InfoJobs, LinkedIn",category:"ofertas",enabled:true,lastRun:new Date(Date.now()-21600000).toISOString(),status:"active",runCount:28},
  {id:"cr3",name:"LifeBot Ma\u00f1ana",scheduleLabel:"7h",description:"Calendario+tiempo+tareas+pisos nuevos",category:"lifebot",enabled:true,lastRun:new Date(Date.now()-43200000).toISOString(),status:"active",runCount:21},
  {id:"cr4",name:"LifeBot Tarde",scheduleLabel:"15h",description:"Resumen medio d\u00eda+ofertas+pisos",category:"lifebot",enabled:true,lastRun:new Date(Date.now()-28800000).toISOString(),status:"active",runCount:21},
  {id:"cr5",name:"LifeBot Noche",scheduleLabel:"23h",description:"Resumen d\u00eda+planificaci\u00f3n ma\u00f1ana",category:"lifebot",enabled:true,lastRun:new Date(Date.now()-14400000).toISOString(),status:"active",runCount:21},
  {id:"cr6",name:"Caso Cl\u00ednico",scheduleLabel:"Lunes 9h",description:"Caso cl\u00ednico MF por WA",category:"resumen",enabled:true,lastRun:new Date(Date.now()-432000000).toISOString(),status:"active",runCount:8},
];

const CC:Record<string,{i:any;bg:string;t:string}>={pisos:{i:Home,bg:"bg-indigo-500/10",t:"text-indigo-400"},ofertas:{i:Briefcase,bg:"bg-emerald-500/10",t:"text-emerald-400"},lifebot:{i:Zap,bg:"bg-amber-500/10",t:"text-amber-400"},resumen:{i:Globe,bg:"bg-violet-500/10",t:"text-violet-400"}};

// ═══ HELPERS ═════════════════════════════════════════════════════
const fRel=(s?:string)=>{if(!s)return"\u2014";const d=Date.now()-new Date(s).getTime();const m=Math.floor(d/60000);if(m<1)return"ahora";if(m<60)return`hace ${m}m`;const h=Math.floor(m/60);return h<24?`hace ${h}h`:`hace ${Math.floor(h/24)}d`;};

// ═══ BAR CHART ══════════════════════════════════════════════════
const Bar:React.FC<{data:{label:string;value:number;max:number}[];color:string;unit?:string}>=({data,color,unit=""})=>(
  <div className="space-y-2">{data.map((d,i)=>(
    <div key={i} className="flex items-center gap-3">
      <div className="w-32 sm:w-40 text-right text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{d.label}</div>
      <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden relative">
        <div className={`h-full rounded transition-all duration-700 ${color}`} style={{width:`${Math.max((d.value/d.max)*100,8)}%`}}/>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600 dark:text-slate-300">{d.value}{unit}</span>
      </div>
    </div>
  ))}</div>
);

// ═══ COMPONENT ══════════════════════════════════════════════════
const PisosDashboardView: React.FC = () => {
  const [tab,setTab]=useState<"pisos"|"analisis"|"ofertas"|"cron"|"contacto">("pisos");
  const [sort,setSort]=useState("precio-asc");
  const [fD,setFD]=useState(false);
  const [fB,setFB]=useState(false);
  const [fA,setFA]=useState(false);
  const [fZ,setFZ]=useState("");
  const [q,setQ]=useState("");
  const [favs,setFavs]=useState<Set<number>>(()=>{try{return new Set(JSON.parse(localStorage.getItem("fh_dash_favs")||"[]"))}catch{return new Set()}});
  const [copied,setCopied]=useState(false);
  const [sending,setSending]=useState(false);
  const [contactPiso,setContactPiso]=useState<Piso|null>(null);
  const [contactStatus,setContactStatus]=useState("");
  const [contactSending,setContactSending]=useState(false);
  const [contacted,setContacted]=useState<Set<number>>(()=>{try{return new Set(JSON.parse(localStorage.getItem("fh_contacted")||"[]"))}catch{return new Set()}});
  const [cronJobs,setCronJobs]=useState(CRONS);

  const saveFav=(s:Set<number>)=>{setFavs(s);try{localStorage.setItem("fh_dash_favs",JSON.stringify([...s]))}catch{}};
  const toggleFav=(id:number)=>{const n=new Set(favs);if(n.has(id))n.delete(id);else n.add(id);saveFav(n)};
  const copyMsg=()=>{navigator.clipboard.writeText(MSG);setCopied(true);setTimeout(()=>setCopied(false),2500)};

  const markContacted=(id:number)=>{const n=new Set(contacted);n.add(id);setContacted(n);try{localStorage.setItem("fh_contacted",JSON.stringify([...n]))}catch{}};

  const contactViaIdealista=(p:Piso)=>{window.open(p.url,"_blank");navigator.clipboard.writeText(MSG);setContactStatus("\u2705 Mensaje copiado \u2014 p\u00e9galo en el formulario de Idealista");markContacted(p.id);setTimeout(()=>setContactStatus(""),4000)};

  const contactViaWA=async(p:Piso)=>{
    setContactSending(true);
    const txt=`\ud83c\udfe0 *CONTACTO CASERO: ${p.titulo}*\n\n${MSG}\n\n\ud83d\udccd Piso: ${p.titulo}\n\ud83d\udcb0 ${p.precio}\u20ac \u00b7 ${p.m2}m\u00b2 \u00b7 ${p.zona}\n\ud83d\udd17 ${p.url}`;
    try{await fetch(`${WA_SERVER}/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"34679888148",message:txt})});setContactStatus("\u2705 Mensaje enviado a tu WhatsApp");markContacted(p.id)}catch{setContactStatus("\u274c Error al enviar")}
    setContactSending(false);setTimeout(()=>setContactStatus(""),4000)
  };

  const contactAllFiltered=async()=>{
    setContactSending(true);setContactStatus("Enviando a "+filtered.length+" pisos...");
    for(const p of filtered){
      const txt=`\ud83c\udfe0 *${p.titulo}*\n${p.precio}\u20ac \u00b7 ${p.m2}m\u00b2 \u00b7 ${p.zona}\n${p.url}`;
      try{await fetch(`${WA_SERVER}/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"34679888148",message:txt})})}catch{}
      markContacted(p.id);
      await new Promise(r=>setTimeout(r,500));
    }
    setContactStatus(`\u2705 ${filtered.length} pisos enviados a tu WA`);setContactSending(false);setTimeout(()=>setContactStatus(""),5000)
  };

  const sendAllWA=async()=>{
    setSending(true);
    const txt=`\ud83c\udfe0 *PISOS BCN 850-1400\u20ac \u00b7 L3/L5*\n\n${PISOS.sort((a,b)=>a.precio-b.precio).map((p,i)=>`*${i+1}. ${p.titulo}*\n   ${p.precio}\u20ac \u00b7 ${p.m2}m\u00b2 \u00b7 ${p.planta} \u00b7 ${p.zona}\n   ${p.extras.join(" \u00b7 ")}\n   ${p.url}`).join("\n\n")}\n\n\ud83c\udfe5 *OFERTAS M\u00c9DICAS*\n${OFERTAS.map(o=>`\u2022 ${o.titulo}: ${o.url}`).join("\n")}\n\n\u2709\ufe0f *MENSAJE CONTACTO:*\n${MSG}`;
    try{await fetch(`${WA_SERVER}/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"34679888148",message:txt})})}catch{}
    setSending(false);
  };

  const runCron=(id:string)=>{setCronJobs(p=>p.map(j=>j.id===id?{...j,status:"running" as const}:j));setTimeout(()=>setCronJobs(p=>p.map(j=>j.id===id?{...j,status:"active" as const,lastRun:new Date().toISOString(),runCount:j.runCount+1}:j)),2500)};
  const toggleCron=(id:string)=>setCronJobs(p=>p.map(j=>j.id===id?{...j,enabled:!j.enabled,status:j.enabled?"paused" as const:"active" as const}:j));

  // Zones for filter dropdown
  const allZones=useMemo(()=>[...new Set(PISOS.map(p=>p.zona))].sort(),[]);

  const filtered=useMemo(()=>{
    let l=[...PISOS];
    if(fD)l=l.filter(p=>p.destacado);
    if(fB)l=l.filter(p=>p.extras.some(e=>/balc|terraza/i.test(e)));
    if(fA)l=l.filter(p=>p.extras.some(e=>/ascensor/i.test(e)));
    if(fZ)l=l.filter(p=>p.zona===fZ);
    if(q){const s=q.toLowerCase();l=l.filter(p=>p.titulo.toLowerCase().includes(s)||p.zona.toLowerCase().includes(s));}
    switch(sort){case"precio-asc":l.sort((a,b)=>a.precio-b.precio);break;case"precio-desc":l.sort((a,b)=>b.precio-a.precio);break;case"m2-desc":l.sort((a,b)=>b.m2-a.m2);break;case"m2-asc":l.sort((a,b)=>a.m2-b.m2);break;case"ratio":l.sort((a,b)=>(a.precio/a.m2)-(b.precio/b.m2));break;}
    return l;
  },[sort,fD,fB,fA,fZ,q]);

  const P=PISOS.map(p=>p.precio);const avgP=Math.round(P.reduce((a,b)=>a+b,0)/P.length);
  const M=PISOS.map(p=>p.m2);const avgM=Math.round(M.reduce((a,b)=>a+b,0)/M.length);
  const maxP=Math.max(...P);const maxM=Math.max(...M);

  const priceData=useMemo(()=>[...PISOS].sort((a,b)=>a.precio-b.precio).map(p=>({label:p.titulo.length>20?p.titulo.slice(0,18)+"\u2026":p.titulo,value:p.precio,max:maxP})),[]);
  const m2Data=useMemo(()=>[...PISOS].sort((a,b)=>b.m2-a.m2).map(p=>({label:p.titulo.length>20?p.titulo.slice(0,18)+"\u2026":p.titulo,value:p.m2,max:maxM})),[]);
  const zonaData=useMemo(()=>{const z:Record<string,number>={};PISOS.forEach(p=>{z[p.zona]=(z[p.zona]||0)+1});const e=Object.entries(z).sort((a,b)=>b[1]-a[1]);const mx=Math.max(...e.map(x=>x[1]));return e.map(([k,v])=>({label:k,value:v,max:mx}))},[]);
  const ratioData=useMemo(()=>[...PISOS].sort((a,b)=>(a.precio/a.m2)-(b.precio/b.m2)).map(p=>({label:p.titulo.length>20?p.titulo.slice(0,18)+"\u2026":p.titulo,value:parseFloat((p.precio/p.m2).toFixed(1)),max:Math.max(...PISOS.map(x=>x.precio/x.m2))})),[]);

  return(
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 custom-scrollbar overflow-y-auto">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25"><Home size={22} className="text-white"/></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pisos Dashboard</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Larga duraci\u00f3n \u00b7 Sin amueblar \u00b7 Pisos completos \u00b7 850\u20131400\u20ac \u00b7 L3/L5 \u00b7 &gt;35m\u00b2</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={sendAllWA} disabled={sending} className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-green-500/20 disabled:opacity-50 transition-all">
              {sending?<Loader2 size={14} className="animate-spin"/>:<Send size={14}/>}Enviar todo por WA
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[{v:PISOS.length,l:"Pisos",c:"bg-indigo-500",i:<Home size={18} className="text-white"/>},{v:`${avgP}\u20ac`,l:"Precio medio",c:"bg-amber-500",i:<Euro size={18} className="text-white"/>},{v:`${Math.min(...P)}\u20ac`,l:"M\u00ednimo",c:"bg-emerald-500",i:<TrendingUp size={18} className="text-white"/>},{v:`${Math.max(...P)}\u20ac`,l:"M\u00e1ximo",c:"bg-red-500",i:<TrendingUp size={18} className="text-white rotate-180"/>},{v:`${avgM}m\u00b2`,l:"Media m\u00b2",c:"bg-blue-500",i:<Maximize2 size={18} className="text-white"/>},{v:PISOS.filter(p=>p.destacado).length,l:"Destacados",c:"bg-amber-500",i:<Star size={18} className="text-white fill-white"/>}].map((s,i)=>(
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.c} mb-2`}>{s.i}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{s.v}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
          {[{id:"pisos" as const,l:"\ud83c\udfe0 Pisos",n:PISOS.length},{id:"analisis" as const,l:"\ud83d\udcca An\u00e1lisis"},{id:"ofertas" as const,l:"\ud83c\udfe5 Ofertas",n:OFERTAS.length},{id:"cron" as const,l:"\u23f0 Crons",n:cronJobs.filter(j=>j.enabled).length},{id:"contacto" as const,l:"\u2709\ufe0f Contacto"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab===t.id?"bg-indigo-600 text-white shadow-lg shadow-indigo-500/25":"text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              {t.l}{t.n!==undefined&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab===t.id?"bg-white/20":"bg-slate-100 dark:bg-slate-600"}`}>{t.n}</span>}
            </button>
          ))}
        </div>

        {/* TAB: PISOS */}
        {tab==="pisos"&&<>
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Buscar nombre o zona..." value={q} onChange={e=>setQ(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-medium cursor-pointer outline-none"><option value="precio-asc">Precio \u2191</option><option value="precio-desc">Precio \u2193</option><option value="m2-desc">m\u00b2 \u2193</option><option value="m2-asc">m\u00b2 \u2191</option><option value="ratio">\u20ac/m\u00b2</option></select>
            <select value={fZ} onChange={e=>setFZ(e.target.value)} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-medium cursor-pointer outline-none"><option value="">Todas las zonas</option>{allZones.map(z=><option key={z} value={z}>{z}</option>)}</select>
            {[{k:"d",a:fD,t:()=>setFD(!fD),l:"\u2b50 Destacados"},{k:"b",a:fB,t:()=>setFB(!fB),l:"\ud83c\udf3f Balc\u00f3n"},{k:"a",a:fA,t:()=>setFA(!fA),l:"\ud83d\udea0 Ascensor"}].map(f=>(
              <button key={f.k} onClick={f.t} className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all ${f.a?"bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 text-indigo-600":"bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"}`}>{f.l}</button>
            ))}
            <button onClick={contactAllFiltered} disabled={contactSending} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 shadow-sm shadow-green-500/20 transition-all"><Send size={12}/>Contactar todos</button>
            <span className="text-[11px] font-mono text-slate-400 ml-auto">{filtered.length} resultado{filtered.length!==1?"s":""} \u00b7 {contacted.size} contactados</span>
          </div>
          <div className="space-y-3">{filtered.map((p,i)=>{const ratio=(p.precio/p.m2).toFixed(1);const isFav=favs.has(p.id);const star=p.nota?.includes("Terraza grande")?"\u2b50\u2b50":p.destacado?"\u2b50":null;return(
            <div key={p.id} className={`group relative bg-white dark:bg-slate-800 rounded-xl border transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer overflow-hidden ${p.destacado?"border-amber-300/50 dark:border-amber-500/30":"border-slate-200 dark:border-slate-700"}`} onClick={()=>window.open(p.url,"_blank")}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${p.destacado?"bg-amber-400":"bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500"}`}/>
              <div className="p-4 pl-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="shrink-0 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md">#{i+1}</span>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate" onClick={e=>e.stopPropagation()}>{p.titulo}</a>
                      {star&&<span className="text-sm">{star}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2.5 flex-wrap">
                      <span className="flex items-center gap-0.5"><BedDouble size={12}/> {p.hab}</span><span>\u00b7</span>
                      <span className="flex items-center gap-0.5"><Maximize2 size={12}/> {p.m2} m\u00b2</span><span>\u00b7</span>
                      <span>{p.planta}</span><span>\u00b7</span>
                      <span className="flex items-center gap-0.5"><MapPin size={12}/> {p.zona}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.extras.map((e,j)=>{const isM=/cerca|L3|L5/i.test(e);const isF=/balc|terraza|reform|ascensor/i.test(e);return(<span key={j} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${isM?"bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300":isF?"bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300":"bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>{isM&&<Train size={10} className="inline mr-0.5 -mt-0.5"/>}{e}</span>)})}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-700/50 text-slate-400 border border-slate-200 dark:border-slate-600">{p.fuente}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">{p.precio}<span className="text-sm font-semibold text-slate-400">\u20ac</span></div>
                    <div className="text-[10px] font-mono text-slate-400">{ratio} \u20ac/m\u00b2</div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <button onClick={e=>{e.stopPropagation();toggleFav(p.id)}} className={`p-1.5 rounded-lg transition-colors ${isFav?"bg-red-50 dark:bg-red-900/30 text-red-500":"bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-400"}`}>{isFav?<Heart size={14} className="fill-current"/>:<HeartOff size={14}/>}</button>
                      <button onClick={e=>{e.stopPropagation();setContactPiso(p)}} className={`p-1.5 rounded-lg transition-colors ${contacted.has(p.id)?"bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500":"bg-amber-50 dark:bg-amber-900/30 text-amber-500 hover:bg-amber-100"}`} title="Contactar casero">{contacted.has(p.id)?<CheckCircle2 size={14}/>:<Send size={14}/>}</button>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 hover:bg-indigo-100 transition-colors" onClick={e=>e.stopPropagation()}><ExternalLink size={14}/></a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )})}{filtered.length===0&&<div className="text-center py-16 text-slate-400"><AlertCircle size={32} className="mx-auto mb-3 opacity-50"/><p className="font-medium">No se encontraron pisos</p></div>}
          </div>
        </>}

        {/* TAB: ANÁLISIS */}
        {tab==="analisis"&&<div className="space-y-8">
          {[{t:"Distribuci\u00f3n de precios",i:<Euro size={16} className="text-amber-500"/>,d:priceData,c:"bg-gradient-to-r from-amber-400 to-amber-500",u:"\u20ac"},
            {t:"Superficie (m\u00b2)",i:<Maximize2 size={16} className="text-blue-500"/>,d:m2Data,c:"bg-gradient-to-r from-blue-400 to-blue-500",u:"m\u00b2"},
            {t:"Pisos por zona",i:<MapPin size={16} className="text-emerald-500"/>,d:zonaData,c:"bg-gradient-to-r from-emerald-400 to-emerald-500",u:" pisos"},
            {t:"Mejores ratios \u20ac/m\u00b2",i:<TrendingUp size={16} className="text-violet-500"/>,d:ratioData,c:"bg-gradient-to-r from-violet-400 to-violet-500",u:"\u20ac/m\u00b2"}
          ].map((s,idx)=>(
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">{s.i} {s.t}</h3>
              <Bar data={s.d} color={s.c} unit={s.u}/>
            </div>
          ))}
        </div>}

        {/* TAB: OFERTAS */}
        {tab==="ofertas"&&<div className="space-y-6">
          {(["medico","consultor"] as const).map(tipo=>(
            <div key={tipo}>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">{tipo==="medico"?<><Stethoscope size={16} className="text-amber-500"/>Ofertas M\u00e9dico de Familia</>:<><Globe size={16} className="text-violet-500"/>Consultor / Telemedicina</>}<span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-bold">{OFERTAS.filter(o=>o.tipo===tipo).length}</span></h3>
              <div className="space-y-2">{OFERTAS.filter(o=>o.tipo===tipo).map((o,i)=>(<a key={i} href={o.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"><span className="text-xl">{o.icon}</span><div className="flex-1 min-w-0"><div className="text-sm font-bold text-slate-900 dark:text-white truncate">{o.titulo}</div>{o.ubicacion&&<div className="text-xs text-slate-400 mt-0.5">{o.ubicacion}</div>}</div><ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-500 shrink-0"/></a>))}</div>
            </div>
          ))}
        </div>}

        {/* TAB: CRON */}
        {tab==="cron"&&<div className="space-y-3">
          {cronJobs.map(j=>{const cat=CC[j.category]||CC.pisos;return(
            <div key={j.id} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 p-4 ${!j.enabled?"opacity-50":""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 ${cat.bg} rounded-xl flex items-center justify-center shrink-0`}><cat.i size={18} className={cat.t}/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><h3 className="font-black text-sm text-slate-800 dark:text-white">{j.name}</h3><span className={`flex items-center gap-1 text-[10px] font-bold ${j.status==="running"?"text-blue-400":j.status==="active"?"text-emerald-400":"text-slate-400"}`}><span className={`w-1.5 h-1.5 rounded-full ${j.status==="running"?"bg-blue-400 animate-pulse":j.status==="active"?"bg-emerald-400":"bg-slate-500"}`}/>{j.status==="running"?"Ejecutando...":j.status==="active"?"Activo":"Pausado"}</span></div>
                    <p className="text-xs text-slate-500 mt-0.5">{j.description}</p>
                    <div className="flex gap-4 mt-2 text-[10px] text-slate-400"><span>\u23f1\ufe0f {j.scheduleLabel}</span><span>\ud83d\udcca {j.runCount}x</span><span>\ud83d\udd50 {fRel(j.lastRun)}</span></div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={()=>runCron(j.id)} disabled={j.status==="running"||!j.enabled} className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 hover:bg-indigo-100 disabled:opacity-30">{j.status==="running"?<Loader2 size={14} className="animate-spin"/>:<Play size={14}/>}</button>
                  <button onClick={()=>toggleCron(j.id)} className={`p-2 rounded-lg ${j.enabled?"bg-amber-50 dark:bg-amber-500/10 text-amber-500":"bg-slate-100 dark:bg-slate-700 text-slate-400"}`}>{j.enabled?<Pause size={14}/>:<Play size={14}/>}</button>
                </div>
              </div>
            </div>
          )})}
        </div>}

        {/* TAB: CONTACTO */}
        {tab==="contacto"&&<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mail size={16} className="text-amber-500"/>Mensaje para caseros</h3>
            <div className="flex gap-2">
              <button onClick={copyMsg} className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg ${copied?"bg-emerald-500 text-white":"bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25"}`}>{copied?<><Check size={14}/>Copiado</>:<><Copy size={14}/>Copiar</>}</button>
              <button onClick={sendAllWA} disabled={sending} className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"><Send size={14}/>Enviar WA</button>
            </div>
          </div>
          <pre className="p-5 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{MSG}</pre>
        </div>}

        {/* CONTACT MODAL */}
        {contactPiso&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={()=>setContactPiso(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div><h3 className="font-black text-lg text-slate-800 dark:text-white">Contactar casero</h3><p className="text-sm text-amber-600 dark:text-amber-400 font-bold mt-1">{contactPiso.titulo}</p><p className="text-xs text-slate-500 mt-0.5">{contactPiso.precio}\u20ac \u00b7 {contactPiso.m2}m\u00b2 \u00b7 {contactPiso.zona}</p></div>
                <button onClick={()=>setContactPiso(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X size={18}/></button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <button onClick={()=>{contactViaIdealista(contactPiso);setContactPiso(null)}} className="w-full flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all border border-indigo-200 dark:border-indigo-500/20">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0"><ExternalLink size={18} className="text-white"/></div>
                <div className="text-left flex-1"><p className="font-bold text-sm text-indigo-700 dark:text-indigo-300">Contactar en Idealista</p><p className="text-[11px] text-indigo-500/70">Abre el anuncio + copia el mensaje al portapapeles</p></div>
              </button>
              <button onClick={()=>{contactViaWA(contactPiso);setContactPiso(null)}} disabled={contactSending} className="w-full flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-xl transition-all border border-green-200 dark:border-green-500/20 disabled:opacity-50">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shrink-0"><MessageCircle size={18} className="text-white"/></div>
                <div className="text-left flex-1"><p className="font-bold text-sm text-green-700 dark:text-green-300">Enviar por WhatsApp</p><p className="text-[11px] text-green-500/70">Env\u00eda el mensaje de contacto + datos del piso a tu WA</p></div>
              </button>
              <button onClick={()=>{navigator.clipboard.writeText(MSG);setContactStatus("\u2705 Mensaje copiado");markContacted(contactPiso.id);setContactPiso(null);setTimeout(()=>setContactStatus(""),3000)}} className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 bg-slate-500 rounded-xl flex items-center justify-center shrink-0"><Copy size={18} className="text-white"/></div>
                <div className="text-left flex-1"><p className="font-bold text-sm text-slate-700 dark:text-slate-300">Solo copiar mensaje</p><p className="text-[11px] text-slate-500/70">Copia el texto de contacto para pegar manualmente</p></div>
              </button>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800"><p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">{MSG.substring(0,200)}...</p></div>
            </div>
          </div>
        </div>}

        {contactStatus&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl text-sm font-bold animate-bounce">{contactStatus}</div>}

        {/* FOOTER */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-[10px] text-slate-400">\u2b50 = Terraza/balc\u00f3n + ascensor + L3/L5 \u00b7 \u2b50\u2b50 = Terraza grande (&gt;30m\u00b2)</p>
          <p className="text-[10px] text-slate-400 mt-1">FILEHUB \u00b7 Larga duraci\u00f3n \u00b7 Sin amueblar \u00b7 Pisos completos \u00b7 850\u20131400\u20ac \u00b7 L3/L5</p>
        </div>
      </div>
    </div>
  );
};

export default PisosDashboardView;
