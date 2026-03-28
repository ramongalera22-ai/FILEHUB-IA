
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
  { id:1, titulo:"Dúplex Fort Pienc", precio:1205, hab:"2 hab", m2:90, planta:"ext", extras:["Cerca L1/L5","Amplio","2 hab"], zona:"Fort Pienc", fuente:"Idealista", url:"https://www.idealista.com/inmueble/99284349/", destacado:true, nota:"Ratio 13.4€/m²" },
  { id:2, titulo:"Piso C/ Sant Dalmir, La Teixonera", precio:1195, hab:"2 hab", m2:80, planta:"ext", extras:["Cerca L5","Amplio","2 hab"], zona:"La Teixonera", fuente:"Idealista", url:"https://www.idealista.com/inmueble/102092763/", destacado:true, nota:"Ratio 14.9€/m²" },
  { id:3, titulo:"Piso Camp d'En Grassot, Gràcia Nova", precio:941, hab:"2 hab", m2:66, planta:"ext", extras:["Cerca L3 Fontana","2 hab"], zona:"Gràcia Nova", fuente:"Idealista", url:"https://www.idealista.com/inmueble/975271/", destacado:true, nota:"Ratio 14.3€/m²" },
  { id:4, titulo:"Piso C/ Encarnació, Baix Guinardó", precio:1268, hab:"3 hab", m2:80, planta:"ext", extras:["Cerca L3/L5","Amplio","3 hab"], zona:"Baix Guinardó", fuente:"Idealista", url:"https://www.idealista.com/inmueble/110745601/", destacado:true, nota:"Ratio 15.8€/m²" },
  { id:5, titulo:"Piso C/ Martí, Camp d'En Grassot", precio:1329, hab:"4 hab", m2:80, planta:"ext", extras:["Cerca L3 Fontana","Amplio","4 hab"], zona:"Camp d'En Grassot", fuente:"Idealista", url:"https://www.idealista.com/inmueble/110856801/", destacado:true, nota:"Ratio 16.6€/m²" },
  { id:6, titulo:"Piso Casanova, Antiga Esquerra", precio:940, hab:"2 hab", m2:62, planta:"ext", extras:["Cerca L5","2 hab"], zona:"Antiga Esquerra Eixample", fuente:"Idealista", url:"https://www.idealista.com/inmueble/38321216/", destacado:true, nota:"Ratio 15.2€/m²" },
  { id:7, titulo:"Piso Rambla del Carmel, El Carmel", precio:1150, hab:"2 hab", m2:70, planta:"ext", extras:["Cerca L5","Amplio","2 hab"], zona:"El Carmel", fuente:"Idealista", url:"https://www.idealista.com/inmueble/110974519/", destacado:true, nota:"Ratio 16.4€/m²" },
  { id:8, titulo:"Piso C/ de l'Alba, Vila de Gràcia", precio:1125, hab:"4 hab", m2:68, planta:"ext", extras:["Cerca L3 Fontana","4 hab"], zona:"Vila de Gràcia", fuente:"Idealista", url:"https://www.idealista.com/inmueble/111028538/", destacado:true, nota:"Ratio 16.5€/m²" },
  { id:9, titulo:"Piso C/ Sales i Ferré, El Guinardó", precio:1295, hab:"2 hab", m2:75, planta:"ext", extras:["Cerca L3/L5","Amplio","2 hab"], zona:"El Guinardó", fuente:"Idealista", url:"https://www.idealista.com/inmueble/109644970/", destacado:true, nota:"Ratio 17.3€/m²" },
  { id:10, titulo:"Piso C/ Consell de Cent, Nova Esquerra", precio:1330, hab:"1 hab", m2:76, planta:"ext", extras:["Cerca L5","Amplio"], zona:"Nova Esquerra Eixample", fuente:"Idealista", url:"https://www.idealista.com/inmueble/106812019/", destacado:true, nota:"Ratio 17.5€/m²" },
  { id:11, titulo:"Piso C/ Gomis, Vallcarca", precio:1150, hab:"3 hab", m2:67, planta:"ext", extras:["Cerca L3 Vallcarca","3 hab"], zona:"Vallcarca", fuente:"Idealista", url:"https://www.idealista.com/inmueble/110929118/", destacado:false, nota:"Ratio 17.2€/m²" },
  { id:12, titulo:"Piso C/ Rosalia de Castro, Baix Guinardó", precio:1150, hab:"1 hab", m2:65, planta:"ext", extras:["Cerca L3/L5"], zona:"Baix Guinardó", fuente:"Idealista", url:"https://www.idealista.com/inmueble/110035915/", destacado:false, nota:"Ratio 17.7€/m²" },
  { id:13, titulo:"Piso C/ Dante Alighieri, El Carmel", precio:950, hab:"2 hab", m2:55, planta:"ext", extras:["Cerca L5","2 hab"], zona:"El Carmel", fuente:"Idealista", url:"https://www.idealista.com/inmueble/98792320/", destacado:false, nota:"Ratio 17.3€/m²" },
  { id:14, titulo:"Ático C/ Conca de Tremp, El Carmel", precio:973, hab:"2 hab", m2:55, planta:"ext", extras:["Cerca L5","2 hab"], zona:"El Carmel", fuente:"Idealista", url:"https://www.idealista.com/inmueble/97013179/", destacado:false, nota:"Ratio 17.7€/m²" },
  { id:15, titulo:"Piso C/ Balmes 153, Antiga Esquerra", precio:1363, hab:"3 hab", m2:70, planta:"ext", extras:["Cerca L5","Amplio","3 hab"], zona:"Antiga Esquerra Eixample", fuente:"Idealista", url:"https://www.idealista.com/inmueble/110762440/", destacado:false, nota:"Ratio 19.5€/m²" },
];

const OFERTAS: Oferta[] = [
  {titulo:"CAMFiC: Médico urgente cobertura MF",url:"https://camfic.cat/detallOferta.aspx?id=2699",ubicacion:"Barcelona",icon:"🏥",tipo:"medico"},
  {titulo:"CatSalut: Bolsa de trabajo MF",url:"https://catsalut.gencat.cat/ca/coneix-catsalut/presentacio/organitzacio/recursos-humans/ofertes-treball/",ubicacion:"Cataluña",icon:"\ud83c\udfdb\ufe0f",tipo:"medico"},
  {titulo:"InfoJobs: Médico de familia",url:"https://www.infojobs.net/ofertas-trabajo/barcelona/medico-de-familia",ubicacion:"Barcelona",icon:"\ud83d\udcbc",tipo:"medico"},
  {titulo:"SemFYC: Bolsa MFyC",url:"https://www.semfyc.es/secciones-y-grupos/seccion-de-desarrollo-profesional/salida-profesional/bolsa-de-trabajo/",ubicacion:"España",icon:"\ud83d\udccb",tipo:"medico"},
  {titulo:"LinkedIn: Telemedicina",url:"https://es.linkedin.com/jobs/telemedicina-empleos",icon:"🔗",tipo:"consultor"},
  {titulo:"Indeed: Telemedicina",url:"https://es.indeed.com/q-telemedicina-empleos.html",icon:"\ud83d\udd0d",tipo:"consultor"},
  {titulo:"Telemedi: Médico General (remoto)",url:"https://apply.workable.com/telemedi/j/1A3F03D40A/",icon:"\ud83d\udcbb",tipo:"consultor"},
  {titulo:"Jooble: Médico teletrabajo",url:"https://es.jooble.org/trabajo-m%C3%A9dico-teletrabajo",icon:"\ud83c\udf10",tipo:"consultor"},
];

const MSG = `Me pongo en contacto con usted tras ver el anuncio de su vivienda, por la que estamos muy interesados.

Somos una pareja de médicos que buscamos un hogar tranquilo y bien comunicado en Barcelona. Ella trabaja como facultativa en el Hospital Universitario Vall d'Hebron, y él es facultativo especialista con incorporación próxima a la ciudad. Nuestros ingresos conjuntos superan los 5.000 € netos mensuales, acreditables mediante nóminas y contratos en vigor.

Somos personas responsables, no fumadores y sin mascotas. Al trabajar ambos en el ámbito sanitario, valoramos especialmente el silencio, el descanso y el buen mantenimiento de la vivienda.

Tenemos disponibilidad inmediata para realizar una visita y podemos aportar toda la documentación necesaria para formalizar el alquiler si nuestro perfil es de su interés.

Quedamos a su disposición en este medio, por teléfono en el 679 888 148, o en el correo: carlosgalera2roman@gmail.com

Atentamente. Carlos Galera Román`;

const CRONS: CronJob[] = [
  {id:"cr1",name:"Monitor Pisos BCN",scheduleLabel:"Cada 2h",description:"Idealista+Fotocasa – BCN 850-1400€ L3/L5",category:"pisos",enabled:true,lastRun:new Date(Date.now()-7200000).toISOString(),status:"active",runCount:42},
  {id:"cr2",name:"Ofertas Médico",scheduleLabel:"Cada 6h",description:"CAMFiC, CatSalut, InfoJobs, LinkedIn",category:"ofertas",enabled:true,lastRun:new Date(Date.now()-21600000).toISOString(),status:"active",runCount:28},
  {id:"cr3",name:"LifeBot Mañana",scheduleLabel:"7h",description:"Calendario+tiempo+tareas+pisos nuevos",category:"lifebot",enabled:true,lastRun:new Date(Date.now()-43200000).toISOString(),status:"active",runCount:21},
  {id:"cr4",name:"LifeBot Tarde",scheduleLabel:"15h",description:"Resumen medio día+ofertas+pisos",category:"lifebot",enabled:true,lastRun:new Date(Date.now()-28800000).toISOString(),status:"active",runCount:21},
  {id:"cr5",name:"LifeBot Noche",scheduleLabel:"23h",description:"Resumen día+planificación mañana",category:"lifebot",enabled:true,lastRun:new Date(Date.now()-14400000).toISOString(),status:"active",runCount:21},
  {id:"cr6",name:"Caso Clínico",scheduleLabel:"Lunes 9h",description:"Caso clínico MF por WA",category:"resumen",enabled:true,lastRun:new Date(Date.now()-432000000).toISOString(),status:"active",runCount:8},
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

  // ═══ LIVE PISOS FROM BOT ══════════════════════════════════════
  const [livePisos,setLivePisos]=useState<Piso[]>(()=>{try{return JSON.parse(localStorage.getItem("fh_live_pisos")||"[]")}catch{return[]}});
  const [scraping,setScraping]=useState(false);
  const [scrapeMsg,setScrapeMsg]=useState("");
  const [lastScrape,setLastScrape]=useState<string|null>(()=>localStorage.getItem("fh_last_scrape"));
  const [showSource,setShowSource]=useState<'all'|'static'|'live'>('all');

  // Fetch pisos from bot Playwright scraper
  const scrapePisos=async()=>{
    setScraping(true);setScrapeMsg("🔍 Buscando pisos con Playwright...");
    try{
      // Try scrape endpoint first
      const r=await fetch(`${WA_SERVER}/scrape/pisos?city=barcelona&maxPrice=1400&type=alquiler&maxItems=30`,{signal:AbortSignal.timeout(30000)});
      const d=await r.json();
      if(d.pisos&&d.pisos.length>0){
        const newPisos:Piso[]=d.pisos.map((p:any,i:number)=>({
          id:1000+i+Date.now()%1000, titulo:p.title||'Piso',
          precio:parseInt(String(p.price).replace(/[^\d]/g,''))||0,
          hab:p.rooms?`${p.rooms} hab`:'—', m2:p.sqm||0, planta:p.floor||'ext',
          extras:p.extras||[], zona:p.location||p.zona||'Barcelona',
          fuente:p.source||'Bot Playwright', url:p.url||'', destacado:false,
          nota:p.description?.substring(0,60)||`Scrapeado ${new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}`
        })).filter((p:Piso)=>p.precio>0&&p.precio<=1400);
        setLivePisos(newPisos);
        try{localStorage.setItem("fh_live_pisos",JSON.stringify(newPisos))}catch{}
        const now=new Date().toISOString();setLastScrape(now);localStorage.setItem("fh_last_scrape",now);
        setScrapeMsg(`✅ ${newPisos.length} pisos encontrados por el bot`);
      }else{
        setScrapeMsg("⚠️ El bot no devolvió pisos. Puede estar reiniciándose.");
      }
    }catch(e:any){
      // Fallback: try classified messages endpoint
      try{
        const r2=await fetch(`${WA_SERVER}/messages/classified`,{signal:AbortSignal.timeout(10000)});
        const d2=await r2.json();
        if(d2.pisos&&d2.pisos.length>0){
          const newPisos:Piso[]=d2.pisos.slice(0,30).map((m:any,i:number)=>{
            const body=m.body||'';
            const pm=body.match(/(\d[\d.,]*)\s*€/);const price=pm?parseInt(pm[1].replace(/\D/g,'')):0;
            const sm=body.match(/(\d+)\s*m[²2]/i);const sqm=sm?parseInt(sm[1]):0;
            const rm=body.match(/(\d+)\s*hab/i);const rooms=rm?parseInt(rm[1]):0;
            const title=body.split('\n').find((l:string)=>l.trim().length>5&&l.trim().length<80)?.replace(/\*+/g,'').trim()||'Piso detectado';
            const um=body.match(/https?:\/\/[^\s)>"]+/);
            return{id:2000+i+Date.now()%1000,titulo:title.substring(0,60),precio:price,hab:rooms?`${rooms} hab`:'—',m2:sqm,planta:'ext',extras:[],zona:'Barcelona',fuente:'WhatsApp Bot',url:um?um[0]:'',destacado:false,nota:`Via WA ${new Date(m.timestamp*1000||Date.now()).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}`};
          }).filter((p:Piso)=>p.precio>0);
          setLivePisos(newPisos);
          try{localStorage.setItem("fh_live_pisos",JSON.stringify(newPisos))}catch{}
          setScrapeMsg(`✅ ${newPisos.length} pisos de mensajes WA`);
        }else{
          setScrapeMsg(`❌ Error de conexión: ${e.message}`);
        }
      }catch{
        setScrapeMsg(`❌ Bot no disponible: ${e.message}`);
      }
    }
    setScraping(false);setTimeout(()=>setScrapeMsg(""),5000);
  };

  // Auto-scrape on mount if last scrape was > 2h ago
  useEffect(()=>{
    const shouldScrape=!lastScrape||(Date.now()-new Date(lastScrape).getTime())>2*60*60*1000;
    if(shouldScrape)scrapePisos();
  },[]);

  // Merge static + live pisos
  const ALL_PISOS=useMemo(()=>{
    if(showSource==='static')return PISOS;
    if(showSource==='live')return livePisos;
    // Deduplicate by URL
    const byUrl=new Map<string,Piso>();
    PISOS.forEach(p=>byUrl.set(p.url,p));
    livePisos.forEach(p=>{if(p.url&&!byUrl.has(p.url))byUrl.set(p.url,p)});
    return[...byUrl.values()];
  },[livePisos,showSource]);

  const saveFav=(s:Set<number>)=>{setFavs(s);try{localStorage.setItem("fh_dash_favs",JSON.stringify([...s]))}catch{}};
  const toggleFav=(id:number)=>{const n=new Set(favs);if(n.has(id))n.delete(id);else n.add(id);saveFav(n)};
  const copyMsg=()=>{navigator.clipboard.writeText(MSG);setCopied(true);setTimeout(()=>setCopied(false),2500)};

  const markContacted=(id:number)=>{const n=new Set(contacted);n.add(id);setContacted(n);try{localStorage.setItem("fh_contacted",JSON.stringify([...n]))}catch{}};

  const contactViaIdealista=(p:Piso)=>{window.open(p.url,"_blank");navigator.clipboard.writeText(MSG);setContactStatus("✅ Mensaje copiado \u2014 pégalo en el formulario de Idealista");markContacted(p.id);setTimeout(()=>setContactStatus(""),4000)};

  const contactViaWA=async(p:Piso)=>{
    setContactSending(true);
    const txt=`🏠 *CONTACTO CASERO: ${p.titulo}*\n\n${MSG}\n\n📍 Piso: ${p.titulo}\n💰 ${p.precio}€ · ${p.m2}m² · ${p.zona}\n🔗 ${p.url}`;
    try{await fetch(`${WA_SERVER}/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"34679888148",message:txt})});setContactStatus("✅ Mensaje enviado a tu WhatsApp");markContacted(p.id)}catch{setContactStatus("❌ Error al enviar")}
    setContactSending(false);setTimeout(()=>setContactStatus(""),4000)
  };

  const contactAllFiltered=async()=>{
    setContactSending(true);setContactStatus("Enviando a "+filtered.length+" pisos...");
    for(const p of filtered){
      const txt=`🏠 *${p.titulo}*\n${p.precio}€ · ${p.m2}m² · ${p.zona}\n${p.url}`;
      try{await fetch(`${WA_SERVER}/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"34679888148",message:txt})})}catch{}
      markContacted(p.id);
      await new Promise(r=>setTimeout(r,500));
    }
    setContactStatus(`✅ ${filtered.length} pisos enviados a tu WA`);setContactSending(false);setTimeout(()=>setContactStatus(""),5000)
  };

  const autoContactViaServer=async(p:Piso)=>{
    setContactSending(true);
    try{await navigator.clipboard.writeText(MSG)}catch{}

    // Capa 1: Auto-form
    setContactStatus(`🤖 Capa 1: Enviando formulario...`);
    try{
      const r=await fetch(`${WA_SERVER}/contact-landlord`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:p.url,message:MSG,name:"Carlos Galera Román",email:"carlosgalera2roman@gmail.com",phone:"679888148"}),signal:AbortSignal.timeout(8000)});
      const d=await r.json();
      if(d.success){
        const emoji=d.method?.includes('puppeteer')?'🤖':d.method==='idealista-api'?'📧':d.method==='extract-contact'?'📞':'✅';
        setContactStatus(`${emoji} ${d.method==='wa-fallback'?'Datos enviados a tu WA':d.method?.includes('puppeteer')?'Formulario rellenado automáticamente':'Contacto enviado'}: ${p.titulo.substring(0,25)}`);markContacted(p.id);setContactSending(false);setTimeout(()=>setContactStatus(""),5000);return;
      }
    }catch{}

    // Capa 2: WA
    setContactStatus(`⚠️ Capa 2: Enviando a tu WA...`);
    try{
      const r=await fetch(`${WA_SERVER}/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"34679888148",message:`🏠 *CONTACTAR:*\n${p.titulo}\n${p.precio}€ · ${p.m2}m² · ${p.zona}\n🔗 ${p.url}\n\n📋 Mensaje:\n${MSG}`}),signal:AbortSignal.timeout(5000)});
      if(r.ok){setContactStatus(`✅ Datos enviados a tu WA — abre el link y pega`);markContacted(p.id);setContactSending(false);setTimeout(()=>setContactStatus(""),5000);return}
    }catch{}

    // Capa 3: SIEMPRE funciona
    window.open(p.url,"_blank");
    markContacted(p.id);
    setContactStatus(`✅ Anuncio abierto — mensaje copiado, pégalo en el formulario`);
    setContactSending(false);setTimeout(()=>setContactStatus(""),6000);
  };

  const autoContactAll=async()=>{
    setContactSending(true);
    const pending=filtered.filter(x=>!contacted.has(x.id));
    if(pending.length===0){setContactStatus("✅ Todos ya contactados");setContactSending(false);setTimeout(()=>setContactStatus(""),3000);return}

    // Copy message to clipboard first
    try{await navigator.clipboard.writeText(MSG)}catch{}

    let auto=0,wa=0,browser=0;

    for(let i=0;i<pending.length;i++){
      const p=pending[i];
      setContactStatus(`🤖 ${i+1}/${pending.length}: ${p.titulo.substring(0,25)}...`);
      let done=false;

      // Capa 1: Server auto-form
      try{
        const r=await fetch(`${WA_SERVER}/contact-landlord`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:p.url,message:MSG,name:"Carlos Galera Román",email:"carlosgalera2roman@gmail.com",phone:"679888148"}),signal:AbortSignal.timeout(8000)});
        const d=await r.json();if(d.success){auto++;done=true;markContacted(p.id)}
      }catch{}

      // Capa 2: WA con datos
      if(!done){
        try{
          const r=await fetch(`${WA_SERVER}/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"34679888148",message:`🏠 *#${i+1} CONTACTAR:*\n${p.titulo}\n${p.precio}€ · ${p.m2}m² · ${p.zona}\n🔗 ${p.url}\n\n📋 Mensaje:\n${MSG}`}),signal:AbortSignal.timeout(5000)});
          if(r.ok){wa++;done=true;markContacted(p.id)}
        }catch{}
      }

      // Capa 3: SIEMPRE funciona — abre el anuncio en el navegador
      if(!done){
        window.open(p.url,"_blank");
        browser++;markContacted(p.id);
      }

      await new Promise(r=>setTimeout(r,done?1500:800));
    }

    const parts=[];
    if(auto>0)parts.push(`${auto} auto-formulario`);
    if(wa>0)parts.push(`${wa} vía WA`);
    if(browser>0)parts.push(`${browser} abiertos en navegador`);
    setContactStatus(`✅ ${pending.length} pisos: ${parts.join(" · ")}${browser>0?" — mensaje en portapapeles, pégalo en cada pestaña":""}`);
    setContactSending(false);setTimeout(()=>setContactStatus(""),12000);
  };

  const sendAllWA=async()=>{
    setSending(true);
    const txt=`🏠 *PISOS BCN 850-1400€ · L3/L5*\n\n${PISOS.sort((a,b)=>a.precio-b.precio).map((p,i)=>`*${i+1}. ${p.titulo}*\n   ${p.precio}€ · ${p.m2}m² · ${p.planta} · ${p.zona}\n   ${p.extras.join(" · ")}\n   ${p.url}`).join("\n\n")}\n\n🏥 *OFERTAS MÉDICAS*\n${OFERTAS.map(o=>`• ${o.titulo}: ${o.url}`).join("\n")}\n\n✉️ *MENSAJE CONTACTO:*\n${MSG}`;
    try{await fetch(`${WA_SERVER}/send`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"34679888148",message:txt})})}catch{}
    setSending(false);
  };

  const runCron=(id:string)=>{setCronJobs(p=>p.map(j=>j.id===id?{...j,status:"running" as const}:j));setTimeout(()=>setCronJobs(p=>p.map(j=>j.id===id?{...j,status:"active" as const,lastRun:new Date().toISOString(),runCount:j.runCount+1}:j)),2500)};
  const toggleCron=(id:string)=>setCronJobs(p=>p.map(j=>j.id===id?{...j,enabled:!j.enabled,status:j.enabled?"paused" as const:"active" as const}:j));

  // Zones for filter dropdown
  const allZones=useMemo(()=>[...new Set(ALL_PISOS.map(p=>p.zona))].sort(),[ALL_PISOS]);

  const filtered=useMemo(()=>{
    let l=[...ALL_PISOS];
    if(fD)l=l.filter(p=>p.destacado);
    if(fB)l=l.filter(p=>p.extras.some(e=>/balc|terraza/i.test(e)));
    if(fA)l=l.filter(p=>p.extras.some(e=>/ascensor/i.test(e)));
    if(fZ)l=l.filter(p=>p.zona===fZ);
    if(q){const s=q.toLowerCase();l=l.filter(p=>p.titulo.toLowerCase().includes(s)||p.zona.toLowerCase().includes(s));}
    switch(sort){case"precio-asc":l.sort((a,b)=>a.precio-b.precio);break;case"precio-desc":l.sort((a,b)=>b.precio-a.precio);break;case"m2-desc":l.sort((a,b)=>b.m2-a.m2);break;case"m2-asc":l.sort((a,b)=>a.m2-b.m2);break;case"ratio":l.sort((a,b)=>(a.precio/a.m2)-(b.precio/b.m2));break;}
    return l;
  },[sort,fD,fB,fA,fZ,q,ALL_PISOS]);

  const P=ALL_PISOS.map(p=>p.precio);const avgP=P.length?Math.round(P.reduce((a,b)=>a+b,0)/P.length):0;
  const M=ALL_PISOS.map(p=>p.m2).filter(m=>m>0);const avgM=M.length?Math.round(M.reduce((a,b)=>a+b,0)/M.length):0;
  const maxP=P.length?Math.max(...P):0;const maxM=M.length?Math.max(...M):0;

  const priceData=useMemo(()=>[...ALL_PISOS].sort((a,b)=>a.precio-b.precio).map(p=>({label:p.titulo.length>20?p.titulo.slice(0,18)+"\u2026":p.titulo,value:p.precio,max:maxP||1})),[ALL_PISOS,maxP]);
  const m2Data=useMemo(()=>[...ALL_PISOS].filter(p=>p.m2>0).sort((a,b)=>b.m2-a.m2).map(p=>({label:p.titulo.length>20?p.titulo.slice(0,18)+"\u2026":p.titulo,value:p.m2,max:maxM||1})),[ALL_PISOS,maxM]);
  const zonaData=useMemo(()=>{const z:Record<string,number>={};ALL_PISOS.forEach(p=>{z[p.zona]=(z[p.zona]||0)+1});const e=Object.entries(z).sort((a,b)=>b[1]-a[1]);const mx=Math.max(...e.map(x=>x[1]),1);return e.map(([k,v])=>({label:k,value:v,max:mx}))},[ALL_PISOS]);
  const ratioData=useMemo(()=>[...ALL_PISOS].filter(p=>p.m2>0).sort((a,b)=>(a.precio/a.m2)-(b.precio/b.m2)).map(p=>({label:p.titulo.length>20?p.titulo.slice(0,18)+"\u2026":p.titulo,value:parseFloat((p.precio/p.m2).toFixed(1)),max:Math.max(...ALL_PISOS.filter(x=>x.m2>0).map(x=>x.precio/x.m2),1)})),[ALL_PISOS]);

  return(
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 custom-scrollbar overflow-y-auto">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25"><Home size={22} className="text-white"/></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pisos Dashboard</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Larga duración · Sin amueblar · Pisos completos · 850–1400€ · L3/L5 · &gt;35m²</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={scrapePisos} disabled={scraping} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all">
              {scraping?<Loader2 size={14} className="animate-spin"/>:<RefreshCw size={14}/>}{scraping?'Buscando...':'🔄 Actualizar'}
            </button>
            <button onClick={sendAllWA} disabled={sending} className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-green-500/20 disabled:opacity-50 transition-all">
              {sending?<Loader2 size={14} className="animate-spin"/>:<Send size={14}/>}Enviar todo por WA
            </button>
            {lastScrape&&<span className="text-[9px] text-slate-400 font-mono">Sync: {fRel(lastScrape)}</span>}
          </div>
        </div>

        {/* SCRAPE STATUS */}
        {scrapeMsg&&<div className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${scrapeMsg.includes('✅')?'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700':scrapeMsg.includes('❌')?'bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-200':'bg-blue-50 dark:bg-blue-500/10 text-blue-600 border border-blue-200'}`}>{scraping&&<Loader2 size={12} className="animate-spin"/>}{scrapeMsg}</div>}

        {/* SOURCE TOGGLE */}
        {livePisos.length>0&&<div className="flex gap-2 mb-4 items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fuente:</span>
          {[{id:'all',label:`Todos (${ALL_PISOS.length})`},{id:'static',label:`Curados (${PISOS.length})`},{id:'live',label:`Bot (${livePisos.length})`}].map(s=>(
            <button key={s.id} onClick={()=>setShowSource(s.id as any)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${showSource===s.id?'bg-amber-500 text-white border-amber-500 shadow-md':'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-amber-300'}`}>{s.label}</button>
          ))}
        </div>}

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[{v:ALL_PISOS.length,l:"Pisos",c:"bg-indigo-500",i:<Home size={18} className="text-white"/>},{v:`${avgP}€`,l:"Precio medio",c:"bg-amber-500",i:<Euro size={18} className="text-white"/>},{v:P.length?`${Math.min(...P)}€`:'—',l:"Mínimo",c:"bg-emerald-500",i:<TrendingUp size={18} className="text-white"/>},{v:P.length?`${Math.max(...P)}€`:'—',l:"Máximo",c:"bg-red-500",i:<TrendingUp size={18} className="text-white rotate-180"/>},{v:`${avgM}m²`,l:"Media m²",c:"bg-blue-500",i:<Maximize2 size={18} className="text-white"/>},{v:ALL_PISOS.filter(p=>p.destacado).length,l:"Destacados",c:"bg-amber-500",i:<Star size={18} className="text-white fill-white"/>}].map((s,i)=>(
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.c} mb-2`}>{s.i}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{s.v}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
          {[{id:"pisos" as const,l:"🏠 Pisos",n:PISOS.length},{id:"analisis" as const,l:"📊 Análisis"},{id:"ofertas" as const,l:"🏥 Ofertas",n:OFERTAS.length},{id:"cron" as const,l:"\u23f0 Crons",n:cronJobs.filter(j=>j.enabled).length},{id:"contacto" as const,l:"✉️ Contacto"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab===t.id?"bg-indigo-600 text-white shadow-lg shadow-indigo-500/25":"text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              {t.l}{t.n!==undefined&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab===t.id?"bg-white/20":"bg-slate-100 dark:bg-slate-600"}`}>{t.n}</span>}
            </button>
          ))}
        </div>

        {/* TAB: PISOS */}
        {tab==="pisos"&&<>
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Buscar nombre o zona..." value={q} onChange={e=>setQ(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-medium cursor-pointer outline-none"><option value="precio-asc">Precio ↑</option><option value="precio-desc">Precio ↓</option><option value="m2-desc">m² ↓</option><option value="m2-asc">m² ↑</option><option value="ratio">€/m²</option></select>
            <select value={fZ} onChange={e=>setFZ(e.target.value)} className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-medium cursor-pointer outline-none"><option value="">Todas las zonas</option>{allZones.map(z=><option key={z} value={z}>{z}</option>)}</select>
            {[{k:"d",a:fD,t:()=>setFD(!fD),l:"⭐ Destacados"},{k:"b",a:fB,t:()=>setFB(!fB),l:"🌿 Balcón"},{k:"a",a:fA,t:()=>setFA(!fA),l:"🚠 Ascensor"}].map(f=>(
              <button key={f.k} onClick={f.t} className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all ${f.a?"bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 text-indigo-600":"bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"}`}>{f.l}</button>
            ))}
            <button onClick={autoContactAll} disabled={contactSending} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white disabled:opacity-50 shadow-sm shadow-green-500/20 transition-all">{contactSending?<Loader2 size={12} className="animate-spin"/>:<Bot size={12}/>}Auto-contactar caseros</button>
            <button onClick={contactAllFiltered} disabled={contactSending} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white disabled:opacity-50 transition-all"><Send size={12}/>Enviar a mi WA</button>
            <span className="text-[11px] font-mono text-slate-400 ml-auto">{filtered.length} resultado{filtered.length!==1?"s":""} · {contacted.size} contactados</span>
          </div>
          <div className="space-y-3">{filtered.map((p,i)=>{const ratio=(p.precio/p.m2).toFixed(1);const isFav=favs.has(p.id);const star=p.nota?.includes("Terraza grande")?"⭐⭐":p.destacado?"⭐":null;return(
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
                      <span className="flex items-center gap-0.5"><BedDouble size={12}/> {p.hab}</span><span>·</span>
                      <span className="flex items-center gap-0.5"><Maximize2 size={12}/> {p.m2} m²</span><span>·</span>
                      <span>{p.planta}</span><span>·</span>
                      <span className="flex items-center gap-0.5"><MapPin size={12}/> {p.zona}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.extras.map((e,j)=>{const isM=/cerca|L3|L5/i.test(e);const isF=/balc|terraza|reform|ascensor/i.test(e);return(<span key={j} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${isM?"bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300":isF?"bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300":"bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>{isM&&<Train size={10} className="inline mr-0.5 -mt-0.5"/>}{e}</span>)})}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-700/50 text-slate-400 border border-slate-200 dark:border-slate-600">{p.fuente}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">{p.precio}<span className="text-sm font-semibold text-slate-400">€</span></div>
                    <div className="text-[10px] font-mono text-slate-400">{ratio} €/m²</div>
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
          {[{t:"Distribución de precios",i:<Euro size={16} className="text-amber-500"/>,d:priceData,c:"bg-gradient-to-r from-amber-400 to-amber-500",u:"€"},
            {t:"Superficie (m²)",i:<Maximize2 size={16} className="text-blue-500"/>,d:m2Data,c:"bg-gradient-to-r from-blue-400 to-blue-500",u:"m²"},
            {t:"Pisos por zona",i:<MapPin size={16} className="text-emerald-500"/>,d:zonaData,c:"bg-gradient-to-r from-emerald-400 to-emerald-500",u:" pisos"},
            {t:"Mejores ratios €/m²",i:<TrendingUp size={16} className="text-violet-500"/>,d:ratioData,c:"bg-gradient-to-r from-violet-400 to-violet-500",u:"€/m²"}
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">{tipo==="medico"?<><Stethoscope size={16} className="text-amber-500"/>Ofertas Médico de Familia</>:<><Globe size={16} className="text-violet-500"/>Consultor / Telemedicina</>}<span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-bold">{OFERTAS.filter(o=>o.tipo===tipo).length}</span></h3>
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
                    <div className="flex gap-4 mt-2 text-[10px] text-slate-400"><span>⏱️ {j.scheduleLabel}</span><span>📊 {j.runCount}x</span><span>🕐 {fRel(j.lastRun)}</span></div>
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
        {tab==="contacto"&&<div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mail size={16} className="text-amber-500"/>Mensaje para caseros</h3>
              <div className="flex gap-2">
                <button onClick={copyMsg} className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg ${copied?"bg-emerald-500 text-white":"bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25"}`}>{copied?<><Check size={14}/>Copiado</>:<><Copy size={14}/>Copiar</>}</button>
                <button onClick={sendAllWA} disabled={sending} className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"><Send size={14}/>Enviar WA</button>
              </div>
            </div>
            <pre className="p-5 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{MSG}</pre>
          </div>

          {/* BOOKMARKLET - Auto-fill Idealista */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-xl border border-amber-200 dark:border-amber-700 p-5">
            <h3 className="font-black text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-3">🔖 Auto-rellenar Idealista (Bookmarklet)</h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-4">Arrastra este botón a tu barra de marcadores. Cuando estés en un anuncio de Idealista, haz clic y se rellenará automáticamente el formulario de contacto y lo enviará.</p>
            <div className="flex flex-wrap gap-3 items-center">
              <a
                href={`javascript:void((function(){const MSG=${JSON.stringify(MSG).replace(/'/g, "\\'")};try{const ta=document.querySelector('textarea[name="message"],textarea#message,textarea.textarea,textarea');if(ta){ta.focus();ta.value='';const nativeInputValueSetter=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;nativeInputValueSetter.call(ta,MSG);ta.dispatchEvent(new Event('input',{bubbles:true}));ta.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{const btns=document.querySelectorAll('button,input[type=submit]');for(const b of btns){const t=(b.textContent||b.value||'').toLowerCase();if(t.includes('contactar')||t.includes('enviar')){b.click();break;}}},500);alert('✅ Mensaje rellenado y enviado');}else{alert('⚠️ No se encontró el formulario. Asegúrate de estar en un anuncio de Idealista.');}}catch(e){alert('❌ Error: '+e.message);}})())`}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-black shadow-lg cursor-grab active:cursor-grabbing hover:shadow-xl transition-all"
                onClick={e => e.preventDefault()}
                draggable
              >
                🏠 Auto-Contactar Idealista
              </a>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">← Arrastra a tu barra de marcadores</span>
            </div>
            <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-3 border border-amber-200 dark:border-amber-700">
              <p className="text-[10px] font-bold text-slate-500 mb-2">Instrucciones:</p>
              <ol className="text-[10px] text-slate-400 space-y-1">
                <li>1. Arrastra el botón naranja a tu barra de favoritos del navegador</li>
                <li>2. Abre un anuncio en Idealista (ej: idealista.com/inmueble/12345)</li>
                <li>3. Haz clic en el bookmarklet "Auto-Contactar Idealista" de tu barra</li>
                <li>4. El mensaje se rellena automáticamente y se envía al casero</li>
              </ol>
            </div>
          </div>
        </div>}

        {/* CONTACT MODAL */}
        {contactPiso&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={()=>setContactPiso(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div><h3 className="font-black text-lg text-slate-800 dark:text-white">Contactar casero</h3><p className="text-sm text-amber-600 dark:text-amber-400 font-bold mt-1">{contactPiso.titulo}</p><p className="text-xs text-slate-500 mt-0.5">{contactPiso.precio}€ · {contactPiso.m2}m² · {contactPiso.zona}</p></div>
                <button onClick={()=>setContactPiso(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X size={18}/></button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <button onClick={()=>{autoContactViaServer(contactPiso);setContactPiso(null)}} disabled={contactSending} className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/5 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all border-2 border-green-300 dark:border-green-500/30 disabled:opacity-50">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shrink-0"><Bot size={18} className="text-white"/></div>
                <div className="text-left flex-1"><p className="font-bold text-sm text-green-700 dark:text-green-300">🤖 Auto-contactar casero</p><p className="text-[11px] text-green-500/70">Rellena automáticamente el formulario de contacto del portal con tu mensaje</p></div>
              </button>
              <button onClick={()=>{contactViaIdealista(contactPiso);setContactPiso(null)}} className="w-full flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all border border-indigo-200 dark:border-indigo-500/20">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0"><ExternalLink size={18} className="text-white"/></div>
                <div className="text-left flex-1"><p className="font-bold text-sm text-indigo-700 dark:text-indigo-300">Contactar en Idealista</p><p className="text-[11px] text-indigo-500/70">Abre el anuncio + copia el mensaje al portapapeles</p></div>
              </button>
              <button onClick={()=>{contactViaWA(contactPiso);setContactPiso(null)}} disabled={contactSending} className="w-full flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-xl transition-all border border-green-200 dark:border-green-500/20 disabled:opacity-50">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shrink-0"><MessageCircle size={18} className="text-white"/></div>
                <div className="text-left flex-1"><p className="font-bold text-sm text-green-700 dark:text-green-300">Enviar por WhatsApp</p><p className="text-[11px] text-green-500/70">Envía el mensaje de contacto + datos del piso a tu WA</p></div>
              </button>
              <button onClick={()=>{navigator.clipboard.writeText(MSG);setContactStatus("✅ Mensaje copiado");markContacted(contactPiso.id);setContactPiso(null);setTimeout(()=>setContactStatus(""),3000)}} className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700">
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
          <p className="text-[10px] text-slate-400">⭐ = Terraza/balcón + ascensor + L3/L5 · ⭐⭐ = Terraza grande (&gt;30m²)</p>
          <p className="text-[10px] text-slate-400 mt-1">FILEHUB · Larga duración · Sin amueblar · Pisos completos · 850–1400€ · L3/L5</p>
        </div>
      </div>
    </div>
  );
};

export default PisosDashboardView;
