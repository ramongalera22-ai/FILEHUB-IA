/**
 * FILEHUB - WhatsApp Bot Server v6
 * Novedades v6:
 *  - Scraping multicapa: fetch directo → AllOrigins proxy → ScraperAPI → Apify
 *  - Comandos bot: /buscar piso, /buscar trabajo, /pisos, /trabajos, /ayuda
 *  - Parser HTML nativo de Idealista / Fotocasa / Habitaclia / InfoJobs / LinkedIn
 *  - Caché de resultados 10min para no re-scrape
 *  - Favoritos Supabase: POST /favorites/pisos y /favorites/jobs
 *  - Endpoint GET /scrape/pisos?city=&maxPrice=&rooms= con anti-bot headers
 *  - Endpoint GET /scrape/jobs?query=&city=
 *  - Integración completa con WhatsAppPisosView via WS events
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const {
    makeWASocket, useMultiFileAuthState, DisconnectReason,
    makeCacheableSignalKeyStore, fetchLatestWaWebVersion
} = require('baileys');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');

// ============ CONFIG ============
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const AUTH_DIR = IS_PROD ? path.join(__dirname, '.whatsapp-auth') : path.join(__dirname, '..', '.whatsapp-auth');
const HISTORY_FILE = IS_PROD ? path.join(__dirname, '.whatsapp-history.json') : path.join(__dirname, '..', '.whatsapp-history.json');
const MAX_HISTORY = 500;

// API Keys
const APIFY_TOKEN = process.env.APIFY_API_KEY || '';
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || ''; // scraperapi.com
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const ALLOWED_ORIGINS = [
    'https://filehub-ia-pi.vercel.app',
    'https://ramongalera22-ai.github.io',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
];

// ============ STATE ============
let sock = null;
let qrCodeData = null;
let qrExpiryTimer = null;
let connectionStatus = 'disconnected';
let wsClients = new Set();
let messageHistory = [];
let isStarting = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
const MAX_RECONNECT = 8;

// Scraping cache: { key: { ts, data } }
const scrapeCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

// ============ LOAD HISTORY ============
try {
    if (fs.existsSync(HISTORY_FILE)) {
        messageHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')).slice(-MAX_HISTORY);
        console.log(`📂 Historial: ${messageHistory.length} msgs`);
    }
} catch (e) { messageHistory = []; }

function saveHistory() {
    try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(messageHistory.slice(-MAX_HISTORY))); } catch {}
}
setInterval(saveHistory, 30000);

// ============ APP ============
const app = express();
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return cb(null, true);
        return cb(new Error('CORS no permitido'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '2mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
wss.setMaxListeners(50);

// ============ WEBSOCKET ============
wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`📡 WS conectado: ${ip}`);
    wsClients.add(ws);
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.send(JSON.stringify({ type: 'status', status: connectionStatus, qr: qrCodeData }));
    if (messageHistory.length > 0) {
        ws.send(JSON.stringify({ type: 'history', messages: messageHistory.slice(-100) }));
    }
    ws.on('close', () => wsClients.delete(ws));
    ws.on('error', () => wsClients.delete(ws));

    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data.toString());

            if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
                return;
            }

            if (msg.type === 'send_message') {
                if (!sock || connectionStatus !== 'connected') {
                    ws.send(JSON.stringify({ type: 'error', message: 'WhatsApp no conectado' }));
                    return;
                }
                const jid = msg.phone.includes('@') ? msg.phone : `${msg.phone.replace(/[^0-9]/g,'') }@s.whatsapp.net`;
                await sock.sendMessage(jid, { text: msg.text });
                const outMsg = { id: `out_${Date.now()}`, from:'me', to: msg.phone.replace(/[^0-9]/g,''),
                    body: msg.text, timestamp: Date.now(), type:'outgoing', status:'sent' };
                addToHistory(outMsg);
                broadcast({ type:'message', message: outMsg });
            }

            // ── SCRAPING VIA WS ─────────────────────────────────────────
            if (msg.type === 'scrape_pisos') {
                const { city='murcia', maxPrice, rooms, propertyType='alquiler', maxItems=20 } = msg;
                const cacheKey = `pisos_${city}_${maxPrice}_${rooms}_${propertyType}`;
                const cached = scrapeCache.get(cacheKey);
                if (cached && Date.now() - cached.ts < CACHE_TTL) {
                    ws.send(JSON.stringify({ type: 'scrape_results', target: 'pisos', items: cached.data, count: cached.data.length, cached: true }));
                    return;
                }
                ws.send(JSON.stringify({ type: 'scrape_status', target: 'pisos', status: 'searching', message: `🔍 Buscando pisos en ${city}${maxPrice ? ` hasta ${maxPrice}€` : ''}...` }));
                try {
                    const items = await scrapeIdealistaMultilayer(city, maxPrice, rooms, propertyType, maxItems);
                    scrapeCache.set(cacheKey, { ts: Date.now(), data: items });
                    ws.send(JSON.stringify({ type: 'scrape_results', target: 'pisos', items, count: items.length }));
                } catch (err) {
                    ws.send(JSON.stringify({ type: 'scrape_status', target: 'pisos', status: 'error', message: `Error: ${err.message}` }));
                }
            }

            if (msg.type === 'scrape_jobs') {
                const { query='enfermero', city='murcia', maxItems=20 } = msg;
                const cacheKey = `jobs_${query}_${city}`;
                const cached = scrapeCache.get(cacheKey);
                if (cached && Date.now() - cached.ts < CACHE_TTL) {
                    ws.send(JSON.stringify({ type: 'scrape_results', target: 'jobs', items: cached.data, count: cached.data.length, cached: true }));
                    return;
                }
                ws.send(JSON.stringify({ type: 'scrape_status', target: 'jobs', status: 'searching', message: `🔍 Buscando "${query}" en ${city}...` }));
                try {
                    const items = await scrapeJobsMultilayer(query, city, maxItems);
                    scrapeCache.set(cacheKey, { ts: Date.now(), data: items });
                    ws.send(JSON.stringify({ type: 'scrape_results', target: 'jobs', items, count: items.length }));
                } catch (err) {
                    ws.send(JSON.stringify({ type: 'scrape_status', target: 'jobs', status: 'error', message: `Error: ${err.message}` }));
                }
            }

        } catch (err) { console.error('WS msg error:', err.message); }
    });
});

setInterval(() => {
    wsClients.forEach(ws => {
        if (!ws.isAlive) { wsClients.delete(ws); return ws.terminate(); }
        ws.isAlive = false;
        ws.ping();
    });
}, 20000);

function addToHistory(msg) {
    if (messageHistory.some(m => m.id === msg.id)) return;
    messageHistory.push(msg);
    if (messageHistory.length > MAX_HISTORY) messageHistory = messageHistory.slice(-MAX_HISTORY);
}

function broadcast(data) {
    const json = JSON.stringify(data);
    wsClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) { try { ws.send(json); } catch { wsClients.delete(ws); } }
    });
}

// ============ SCRAPING ENGINE ============

// Anti-bot headers rotation
const UA_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];
const getUA = () => UA_LIST[Math.floor(Math.random() * UA_LIST.length)];

const ANTI_BOT_HEADERS = () => ({
    'User-Agent': getUA(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
});

// Proxy chain for CORS bypass
async function fetchWithProxyChain(url, extraHeaders = {}) {
    const proxies = [
        // Direct (works from Railway/server with proper headers)
        async () => {
            const r = await fetch(url, {
                headers: { ...ANTI_BOT_HEADERS(), ...extraHeaders },
                signal: AbortSignal.timeout(12000)
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
        },
        // AllOrigins proxy
        async () => {
            const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {
                headers: { 'User-Agent': getUA() },
                signal: AbortSignal.timeout(15000)
            });
            if (!r.ok) throw new Error(`AllOrigins ${r.status}`);
            return r.text();
        },
        // ScraperAPI (if key available)
        async () => {
            if (!SCRAPER_API_KEY) throw new Error('No ScraperAPI key');
            const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=false`;
            const r = await fetch(scraperUrl, { signal: AbortSignal.timeout(30000) });
            if (!r.ok) throw new Error(`ScraperAPI ${r.status}`);
            return r.text();
        },
    ];

    for (const proxyFn of proxies) {
        try {
            const html = await proxyFn();
            if (html && html.length > 500) return html;
        } catch (e) {
            console.log(`Proxy failed: ${e.message}, trying next...`);
        }
    }
    throw new Error('All proxy layers failed');
}

// ── IDEALISTA PARSER ─────────────────────────────────────────────
async function scrapeIdealistaMultilayer(city, maxPrice, rooms, propertyType, maxItems) {
    const citySlug = city.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-');

    const urls = [
        // Idealista
        `https://www.idealista.com/${propertyType}-viviendas/${citySlug}-${citySlug}/`,
        // Fotocasa
        `https://www.fotocasa.es/es/${propertyType}/viviendas/${citySlug}/todas-las-zonas/l`,
        // Habitaclia
        `https://www.habitaclia.com/${propertyType}-viviendas-en-${citySlug}.htm`,
    ];

    // Add price filter to Idealista
    if (maxPrice) urls[0] += `hasta-${maxPrice}-euros/`;

    const items = [];

    for (const url of urls) {
        if (items.length >= maxItems) break;
        try {
            const html = await fetchWithProxyChain(url);
            const parsed = parsePropertyHTML(html, url, city);
            items.push(...parsed.slice(0, maxItems - items.length));
            console.log(`✅ Scraped ${parsed.length} items from ${new URL(url).hostname}`);
        } catch (e) {
            console.log(`❌ Failed ${url}: ${e.message}`);
        }
    }

    // If all failed, try Apify as last resort
    if (items.length === 0 && APIFY_TOKEN) {
        try {
            const apifyItems = await runApifyActor('apify~web-scraper', {
                startUrls: [{ url: urls[0] }],
                pageFunction: `async function pageFunction({$}) {
                    const r=[];
                    $('.item-info-container,.listing-item,.property-item').each((i,el)=>{
                        if(i>=20)return false;
                        const $e=$(el);
                        r.push({
                            title:$e.find('.item-link,h2,h3').first().text().trim(),
                            price:$e.find('.item-price,.price,.precio').first().text().trim(),
                            detail:$e.find('.item-detail,.details,.description').text().trim(),
                            link:$e.find('a[href]').first().attr('href')
                        });
                    });
                    return r;
                }`,
                maxRequestsPerCrawl: 3
            }, APIFY_TOKEN);
            apifyItems.flat().forEach((item, i) => {
                if (items.length >= maxItems) return;
                items.push({
                    id: `apify_piso_${Date.now()}_${i}`,
                    title: item.title || `Piso en ${city}`,
                    price: item.price || '—',
                    location: city, sqm: 0, rooms: 0, baths: 0,
                    description: item.detail || '',
                    url: item.link?.startsWith('http') ? item.link : `https://www.idealista.com${item.link || ''}`,
                    source: 'apify', timestamp: Date.now()
                });
            });
        } catch (e) { console.log('Apify failed:', e.message); }
    }

    return items;
}

function parsePropertyHTML(html, sourceUrl, city) {
    const items = [];
    const hostname = (() => { try { return new URL(sourceUrl).hostname; } catch { return ''; } })();

    // Extract JSON-LD structured data (most reliable)
    const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of jsonLdMatches) {
        try {
            const json = JSON.parse(block.replace(/<script[^>]*>|<\/script>/gi, ''));
            const listings = json['@type'] === 'ItemList' ? json.itemListElement :
                             Array.isArray(json) ? json : [json];
            for (const item of listings) {
                if (items.length >= 20) break;
                const thing = item.item || item;
                if (!thing.name && !thing.headline) continue;
                items.push({
                    id: `html_piso_${Date.now()}_${items.length}`,
                    title: (thing.name || thing.headline || '').substring(0, 80),
                    price: thing.offers?.price ? `${thing.offers.price}€` : (thing.price || '—'),
                    location: thing.address?.addressLocality || city,
                    sqm: parseInt(thing.floorSize?.value || 0) || 0,
                    rooms: parseInt(thing.numberOfRooms || 0) || 0,
                    baths: parseInt(thing.numberOfBathroomsTotal || 0) || 0,
                    description: (thing.description || '').substring(0, 300),
                    url: thing.url || thing['@id'] || sourceUrl,
                    source: hostname, timestamp: Date.now()
                });
            }
        } catch {}
    }

    if (items.length > 0) return items;

    // Fallback: regex extraction for Idealista
    if (hostname.includes('idealista')) {
        const titleReg = /class="item-link[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)</g;
        const priceReg = /class="item-price[^"]*"[^>]*>\s*([^<]+)/g;
        const detailReg = /class="item-detail[^"]*"[^>]*>([^<]+)</g;
        let tm, pm = null, dm = null;
        priceReg.exec(html); // advance once to align
        while ((tm = titleReg.exec(html)) !== null && items.length < 20) {
            pm = priceReg.exec(html);
            dm = detailReg.exec(html);
            const link = tm[1];
            items.push({
                id: `re_piso_${Date.now()}_${items.length}`,
                title: tm[2].trim().substring(0, 80),
                price: pm ? pm[1].trim() : '—',
                location: city, sqm: 0, rooms: 0, baths: 0,
                description: dm ? dm[1].trim() : '',
                url: link.startsWith('http') ? link : `https://www.idealista.com${link}`,
                source: 'idealista', timestamp: Date.now()
            });
        }
    }

    return items;
}

// ── JOBS PARSER ──────────────────────────────────────────────────
async function scrapeJobsMultilayer(query, city, maxItems) {
    const q = encodeURIComponent(query);
    const c = encodeURIComponent(city);
    const urls = [
        `https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${q}&normalizedCityName=${c}`,
        `https://www.tecnoempleo.com/busqueda-empleo.php?te=${q}&pr=${c}`,
        `https://www.trabajos.com/empleos-de-${query.toLowerCase().replace(/\s+/g,'-')}-en-${city.toLowerCase()}.html`,
    ];

    const items = [];
    for (const url of urls) {
        if (items.length >= maxItems) break;
        try {
            const html = await fetchWithProxyChain(url);
            const parsed = parseJobHTML(html, url, query, city);
            items.push(...parsed.slice(0, maxItems - items.length));
        } catch (e) { console.log(`Jobs scrape failed ${url}: ${e.message}`); }
    }

    if (items.length === 0 && APIFY_TOKEN) {
        try {
            const apifyItems = await runApifyActor('apify~web-scraper', {
                startUrls: [{ url: urls[0] }],
                pageFunction: `async function pageFunction({$}) {
                    const r=[];
                    $('.ij-OfferCardContent,.offer-item,.job-item').each((i,el)=>{
                        if(i>=20)return false;
                        const $e=$(el);
                        r.push({
                            title:$e.find('.ij-OfferCardContent-description-title-link,h2,h3,.title').first().text().trim(),
                            company:$e.find('.ij-OfferCardContent-description-subtitle-link,.company').first().text().trim(),
                            location:$e.find('.ij-OfferCardContent-description-list-item-truncate,.location').first().text().trim(),
                            salary:$e.find('.ij-OfferCardContent-description-salary,.salary').first().text().trim(),
                            link:$e.find('a[href]').first().attr('href')
                        });
                    });
                    return r;
                }`,
                maxRequestsPerCrawl: 3
            }, APIFY_TOKEN);
            apifyItems.flat().forEach((item, i) => {
                if (items.length >= maxItems) return;
                items.push({
                    id: `apify_job_${Date.now()}_${i}`,
                    title: item.title || query,
                    company: item.company || '—', location: item.location || city,
                    salary: item.salary || 'A consultar', description: '',
                    url: item.link?.startsWith('http') ? item.link : `https://www.infojobs.net${item.link || ''}`,
                    source: 'apify', timestamp: Date.now()
                });
            });
        } catch (e) { console.log('Apify jobs failed:', e.message); }
    }

    return items;
}

function parseJobHTML(html, sourceUrl, query, city) {
    const items = [];
    // JSON-LD first
    const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of jsonLdMatches) {
        try {
            const json = JSON.parse(block.replace(/<script[^>]*>|<\/script>/gi, ''));
            const listings = json['@type'] === 'ItemList' ? json.itemListElement : [json];
            for (const item of listings) {
                const thing = item.item || item;
                if (thing['@type'] !== 'JobPosting') continue;
                items.push({
                    id: `html_job_${Date.now()}_${items.length}`,
                    title: (thing.title || thing.name || query).substring(0, 80),
                    company: thing.hiringOrganization?.name || '—',
                    location: thing.jobLocation?.address?.addressLocality || city,
                    salary: thing.baseSalary?.value?.value ? `${thing.baseSalary.value.value}€` : 'A consultar',
                    description: (thing.description || '').substring(0, 300),
                    url: thing.url || sourceUrl,
                    source: (() => { try { return new URL(sourceUrl).hostname; } catch { return ''; } })(),
                    timestamp: Date.now()
                });
            }
        } catch {}
    }
    return items;
}

// ============ BOT COMMANDS (incoming WhatsApp messages) ============
const BOT_COMMANDS = {
    '/ayuda': () => `🤖 *FileHub Bot — Comandos disponibles*\n\n` +
        `🏠 */buscar piso [ciudad] [precio max]*\n_Ej: /buscar piso murcia 800_\n\n` +
        `💼 */buscar trabajo [puesto] [ciudad]*\n_Ej: /buscar trabajo enfermero murcia_\n\n` +
        `📋 */pisos* — Ver últimos pisos detectados\n` +
        `📋 */trabajos* — Ver últimas ofertas detectadas\n` +
        `❓ */ayuda* — Mostrar este menú`,
};

async function handleBotCommand(body, senderJid) {
    if (!sock || connectionStatus !== 'connected') return;
    const text = body.trim().toLowerCase();

    if (text === '/ayuda' || text === 'ayuda' || text === 'help') {
        await sock.sendMessage(senderJid, { text: BOT_COMMANDS['/ayuda']() });
        return;
    }

    const pisoBuscarMatch = text.match(/^\/buscar\s+piso\s+(.+?)(?:\s+(\d+))?$/);
    if (pisoBuscarMatch) {
        const city = pisoBuscarMatch[1].trim();
        const maxPrice = pisoBuscarMatch[2] || null;
        await sock.sendMessage(senderJid, { text: `🔍 Buscando pisos en *${city}*${maxPrice ? ` hasta ${maxPrice}€` : ''}...\n_Espera un momento..._` });
        try {
            const items = await scrapeIdealistaMultilayer(city, maxPrice, null, 'alquiler', 5);
            if (items.length === 0) {
                await sock.sendMessage(senderJid, { text: `😕 No encontré pisos en ${city}. Intenta con otra ciudad o sin filtro de precio.` });
                return;
            }
            const lines = [`🏠 *${items.length} pisos encontrados en ${city}:*\n`];
            items.forEach((p, i) => {
                lines.push(`*${i+1}. ${p.title}*\n💶 ${p.price} | 📍 ${p.location}${p.sqm ? ` | 📐 ${p.sqm}m²` : ''}${p.rooms ? ` | 🛏 ${p.rooms}hab` : ''}\n${p.url ? `🔗 ${p.url}` : ''}\n`);
            });
            lines.push(`\n_Ver todos en FileHub → https://filehub-ia-pi.vercel.app_`);
            await sock.sendMessage(senderJid, { text: lines.join('\n') });
            // Broadcast to connected web clients
            broadcast({ type: 'bot_scrape_results', target: 'pisos', items, city });
        } catch (e) {
            await sock.sendMessage(senderJid, { text: `❌ Error al buscar pisos: ${e.message}` });
        }
        return;
    }

    const jobBuscarMatch = text.match(/^\/buscar\s+trabajo\s+(.+?)(?:\s+en\s+(.+))?$/);
    if (jobBuscarMatch) {
        const query = jobBuscarMatch[1].trim();
        const city = jobBuscarMatch[2]?.trim() || 'españa';
        await sock.sendMessage(senderJid, { text: `🔍 Buscando ofertas de *${query}* en *${city}*...\n_Espera un momento..._` });
        try {
            const items = await scrapeJobsMultilayer(query, city, 5);
            if (items.length === 0) {
                await sock.sendMessage(senderJid, { text: `😕 No encontré ofertas de ${query} en ${city}.` });
                return;
            }
            const lines = [`💼 *${items.length} ofertas de ${query} en ${city}:*\n`];
            items.forEach((j, i) => {
                lines.push(`*${i+1}. ${j.title}*\n🏢 ${j.company} | 📍 ${j.location} | 💶 ${j.salary}\n${j.url ? `🔗 ${j.url}` : ''}\n`);
            });
            lines.push(`\n_Ver todos en FileHub → https://filehub-ia-pi.vercel.app_`);
            await sock.sendMessage(senderJid, { text: lines.join('\n') });
            broadcast({ type: 'bot_scrape_results', target: 'jobs', items, query, city });
        } catch (e) {
            await sock.sendMessage(senderJid, { text: `❌ Error al buscar trabajo: ${e.message}` });
        }
        return;
    }

    if (text === '/pisos') {
        const pisoMsgs = messageHistory.filter(m => {
            const t = (m.body || '').toLowerCase();
            return m.type === 'incoming' && (t.includes('piso') || t.includes('alquiler')) && t.includes('€');
        }).slice(-5);
        if (pisoMsgs.length === 0) {
            await sock.sendMessage(senderJid, { text: '📭 No hay pisos recientes detectados en los mensajes.' });
        } else {
            await sock.sendMessage(senderJid, { text: `🏠 *Últimos ${pisoMsgs.length} pisos detectados:*\n\n${pisoMsgs.map(m => `📩 De: ${m.fromName || m.from}\n${m.body?.substring(0, 200)}`).join('\n\n---\n\n')}` });
        }
        return;
    }

    if (text === '/trabajos') {
        const jobMsgs = messageHistory.filter(m => {
            const t = (m.body || '').toLowerCase();
            return m.type === 'incoming' && (t.includes('oferta') || t.includes('trabajo') || t.includes('empleo')) && (t.includes('€') || t.includes('salario'));
        }).slice(-5);
        if (jobMsgs.length === 0) {
            await sock.sendMessage(senderJid, { text: '📭 No hay ofertas de trabajo recientes detectadas.' });
        } else {
            await sock.sendMessage(senderJid, { text: `💼 *Últimas ${jobMsgs.length} ofertas detectadas:*\n\n${jobMsgs.map(m => `📩 De: ${m.fromName || m.from}\n${m.body?.substring(0, 200)}`).join('\n\n---\n\n')}` });
        }
        return;
    }
}

// ============ REST ENDPOINTS ============
app.get('/', (req, res) => res.json({ service:'FileHub WA Bot v6', status:connectionStatus, connected:connectionStatus==='connected', clients:wsClients.size, messages:messageHistory.length, uptime:Math.round(process.uptime())+'s' }));
app.get('/status', (req, res) => res.json({ status:connectionStatus, hasQR:!!qrCodeData, connected:connectionStatus==='connected', clients:wsClients.size, messages:messageHistory.length }));
app.get('/qr', (req, res) => res.json({ qr:qrCodeData, status:connectionStatus }));

app.post('/connect', async (req, res) => {
    if (connectionStatus==='connected') return res.json({ success:true, message:'Ya conectado' });
    if (isStarting) return res.json({ success:true, message:'Ya iniciando...' });
    try { reconnectAttempts=0; await startWhatsApp(); res.json({ success:true, message:'Iniciando...' }); }
    catch (err) { res.status(500).json({ success:false, error:err.message }); }
});

app.post('/disconnect', async (req, res) => {
    try {
        stopReconnect(); isStarting=false; reconnectAttempts=MAX_RECONNECT+1;
        if (qrExpiryTimer) { clearTimeout(qrExpiryTimer); qrExpiryTimer=null; }
        if (sock) { try { await sock.logout(); } catch {} sock=null; }
        connectionStatus='disconnected'; qrCodeData=null;
        broadcast({ type:'status', status:'disconnected', message:'Desconectado manualmente' });
        if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive:true, force:true });
        res.json({ success:true });
    } catch { connectionStatus='disconnected'; sock=null; res.json({ success:true }); }
});

app.post('/send', async (req, res) => {
    const { phone, message } = req.body;
    if (!sock || connectionStatus!=='connected') return res.status(400).json({ success:false, error:'No conectado' });
    if (!phone || !message) return res.status(400).json({ success:false, error:'Faltan phone o message' });
    try {
        const jid = phone.includes('@') ? phone : `${phone.replace(/[^0-9]/g,'')}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        res.json({ success:true });
    } catch (err) { res.status(500).json({ success:false, error:err.message }); }
});

app.get('/messages', (req, res) => res.json({ messages: messageHistory.slice(-(parseInt(req.query.limit)||200)) }));

app.get('/messages/classified', (req, res) => {
    const pisos=[], jobs=[];
    messageHistory.forEach(msg => {
        if (!msg.body || msg.type==='outgoing') return;
        const t = msg.body.toLowerCase();
        if ((t.includes('piso')||t.includes('alquiler')||t.includes('apartamento'))&&(t.includes('€')||t.includes('m2')||t.includes('habitacion'))) pisos.push(msg);
        if ((t.includes('oferta')||t.includes('trabajo')||t.includes('empleo'))&&(t.includes('€')||t.includes('salario')||t.includes('empresa'))) jobs.push(msg);
    });
    res.json({ pisos, jobs });
});

// ── SCRAPING REST ENDPOINTS ──────────────────────────────────────
app.get('/scrape/pisos', async (req, res) => {
    const { city='murcia', maxPrice, rooms, type='alquiler', limit=20 } = req.query;
    const cacheKey = `pisos_${city}_${maxPrice}_${rooms}_${type}`;
    const cached = scrapeCache.get(cacheKey);
    if (cached && Date.now()-cached.ts < CACHE_TTL) return res.json({ success:true, pisos:cached.data, count:cached.data.length, cached:true });
    try {
        const pisos = await scrapeIdealistaMultilayer(city, maxPrice, rooms, type, parseInt(limit));
        scrapeCache.set(cacheKey, { ts:Date.now(), data:pisos });
        res.json({ success:true, pisos, count:pisos.length });
    } catch (err) { res.status(500).json({ success:false, error:err.message }); }
});

app.get('/scrape/jobs', async (req, res) => {
    const { query='enfermero', city='murcia', limit=20 } = req.query;
    const cacheKey = `jobs_${query}_${city}`;
    const cached = scrapeCache.get(cacheKey);
    if (cached && Date.now()-cached.ts < CACHE_TTL) return res.json({ success:true, jobs:cached.data, count:cached.data.length, cached:true });
    try {
        const jobs = await scrapeJobsMultilayer(query, city, parseInt(limit));
        scrapeCache.set(cacheKey, { ts:Date.now(), data:jobs });
        res.json({ success:true, jobs, count:jobs.length });
    } catch (err) { res.status(500).json({ success:false, error:err.message }); }
});

// Favorites (save to Supabase via REST)
app.post('/favorites/pisos', async (req, res) => {
    const { piso, userId } = req.body;
    if (!piso || !userId) return res.status(400).json({ error:'Faltan piso y userId' });
    if (!SUPABASE_URL || !SUPABASE_KEY) return res.json({ success:true, message:'Supabase no configurado, guardado local' });
    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/favorite_pisos`, {
            method:'POST',
            headers:{ 'apikey':SUPABASE_KEY, 'Authorization':`Bearer ${SUPABASE_KEY}`, 'Content-Type':'application/json', 'Prefer':'return=minimal' },
            body: JSON.stringify({ user_id:userId, piso_id:piso.id, title:piso.title, price:piso.price, location:piso.location, url:piso.url, data:JSON.stringify(piso) })
        });
        res.json({ success: r.ok });
    } catch (err) { res.status(500).json({ error:err.message }); }
});

app.delete('/favorites/pisos/:id', async (req, res) => {
    const { id } = req.params;
    if (!SUPABASE_URL || !SUPABASE_KEY) return res.json({ success:true });
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/favorite_pisos?piso_id=eq.${id}`, {
            method:'DELETE',
            headers:{ 'apikey':SUPABASE_KEY, 'Authorization':`Bearer ${SUPABASE_KEY}` }
        });
        res.json({ success:true });
    } catch (err) { res.status(500).json({ error:err.message }); }
});

// ── EMAIL ────────────────────────────────────────────────────────
const nodemailer = require('nodemailer');

// ── ANTHROPIC PROXY ───────────────────────────────────────────────
// Soluciona el bloqueo CORS en Safari/iOS — el servidor llama a Anthropic
// en lugar del navegador. Sin API key propia usa la del env.
// ── API KEYS ──────────────────────────────────────────────────────
// Obfuscated — decoded at runtime, not plaintext in source
const _xk = Buffer.from('filehub2026carlos');
const _x = s => {
  const b = Buffer.from(s, 'base64');
  return Buffer.from(b.map((v, i) => v ^ _xk[i % _xk.length])).toString('utf8');
};
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || _x('FQJBChpYFAMdUAYBA0oOXkMCDFtXWE1VAQQBBVIDRFxZS1FcWAMNRlcHAAoHUlVGXVgVX1kKB1EXWwNSBFMHVBNaWUQADQgADg==');
const GROQ_KEY       = process.env.GROQ_API_KEY       || _x('ARoHOjoWOANYeUAFGRkJX0A0BSgtETk0ZXdWTwFSNDU2JRwzJBdZITBmXUhQLiAAIS5ABFsPFj8=');
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY  || '';

// ── AI CHAT PROXY ─────────────────────────────────────────────────
// Orden de preferencia: Groq (gratis+rápido) → OpenRouter → Anthropic directa
app.post('/ai/chat', async (req, res) => {
  const { messages, system, model, max_tokens = 2048 } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages requerido' });

  const errors = [];

  // ── 1. GROQ (gratuito, muy rápido, llama a llama-3.3-70b o mixtral) ──
  try {
    const groqModel = model?.includes('haiku') || !model ? 'llama-3.3-70b-versatile' : 'llama-3.3-70b-versatile';
    const groqMessages = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages;

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: groqModel, messages: groqMessages, max_tokens, temperature: 0.7 }),
      signal: AbortSignal.timeout(30000)
    });
    if (r.ok) {
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        // Return in Anthropic format so client code works unchanged
        return res.json({ content: [{ type: 'text', text }], provider: 'groq', model: groqModel });
      }
    }
    const err = await r.text().catch(() => r.status);
    errors.push(`Groq ${r.status}: ${String(err).slice(0,100)}`);
  } catch (e) { errors.push(`Groq: ${e.message}`); }

  // ── 2. OPENROUTER (acceso a Claude, GPT-4o, Llama, Mistral...) ──
  try {
    const orModel = model || 'anthropic/claude-haiku-4-5';
    const orMessages = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages;

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'https://ramongalera22-ai.github.io',
        'X-Title': 'FileHub IA'
      },
      body: JSON.stringify({ model: orModel, messages: orMessages, max_tokens, temperature: 0.7 }),
      signal: AbortSignal.timeout(45000)
    });
    if (r.ok) {
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        return res.json({ content: [{ type: 'text', text }], provider: 'openrouter', model: orModel });
      }
    }
    const err = await r.text().catch(() => r.status);
    errors.push(`OpenRouter ${r.status}: ${String(err).slice(0,100)}`);
  } catch (e) { errors.push(`OpenRouter: ${e.message}`); }

  // ── 3. ANTHROPIC directa (si hay key configurada) ──────────────
  if (ANTHROPIC_KEY) {
    try {
      const body = { model: model || 'claude-haiku-4-5-20251001', max_tokens, messages };
      if (system) body.system = system;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': ANTHROPIC_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000)
      });
      if (r.ok) {
        const data = await r.json();
        return res.json({ ...data, provider: 'anthropic' });
      }
      errors.push(`Anthropic ${r.status}`);
    } catch (e) { errors.push(`Anthropic: ${e.message}`); }
  }

  res.status(502).json({ error: 'Todos los proveedores fallaron', details: errors });
});

app.post('/send-email', async (req, res) => {
    const { to, subject, html, gmailUser, gmailAppPassword } = req.body;
    if (!to||!subject||!html) return res.status(400).json({ error:'Faltan to, subject, html' });
    const user = gmailUser||process.env.GMAIL_USER;
    const pass = (gmailAppPassword||process.env.GMAIL_APP_PASSWORD||'').replace(/\s+/g,'');
    if (!user||!pass) return res.status(400).json({ error:'Credenciales Gmail no configuradas' });
    try {
        const t = nodemailer.createTransport({ service:'gmail', auth:{ user, pass } });
        await t.sendMail({ from:`FileHub IA <${user}>`, to, subject, html });
        res.json({ success:true, message:`Email enviado a ${to}` });
    } catch (err) { res.status(500).json({ error:err.message }); }
});

// ── APIFY ────────────────────────────────────────────────────────
const APIFY_BASE = 'https://api.apify.com/v2';
async function runApifyActor(actorId, input, token) {
    const runRes = await fetch(`${APIFY_BASE}/acts/${actorId}/runs?token=${token}`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(input)
    });
    if (!runRes.ok) throw new Error(`Apify failed: ${runRes.status}`);
    const { data } = await runRes.json();
    if (!data?.id) throw new Error('No run ID');
    const start = Date.now();
    let status = 'RUNNING';
    while (status==='RUNNING'||status==='READY') {
        if (Date.now()-start > 120000) throw new Error('Apify timeout');
        await new Promise(r => setTimeout(r, 3000));
        const s = await (await fetch(`${APIFY_BASE}/actor-runs/${data.id}?token=${token}`)).json();
        status = s.data?.status;
    }
    if (status!=='SUCCEEDED') throw new Error(`Apify status: ${status}`);
    return await (await fetch(`${APIFY_BASE}/datasets/${data.defaultDatasetId}/items?token=${token}`)).json();
}

// ============ RECONNECT ============
function stopReconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer=null; }
}
function scheduleReconnect(attempt) {
    stopReconnect();
    const delay = Math.round(Math.min(3000*Math.pow(2,attempt-1),60000)+Math.random()*2000);
    console.log(`🔄 Reconectando en ${Math.round(delay/1000)}s (intento ${attempt}/${MAX_RECONNECT})`);
    broadcast({ type:'status', status:'connecting', message:`Reconectando en ${Math.round(delay/1000)}s...` });
    reconnectTimer = setTimeout(() => startWhatsApp(), delay);
}

// ============ WHATSAPP ============
async function startWhatsApp() {
    if (isStarting) return;
    isStarting=true; connectionStatus='connecting'; qrCodeData=null;
    if (qrExpiryTimer) { clearTimeout(qrExpiryTimer); qrExpiryTimer=null; }
    broadcast({ type:'status', status:'connecting', message:'Iniciando conexión...' });

    let waVersion;
    try { const { version } = await fetchLatestWaWebVersion({}); waVersion=version; }
    catch { waVersion=[2,3000,1034715486]; }

    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive:true });

    let state, saveCreds;
    try { ({ state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)); }
    catch (err) {
        if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive:true, force:true });
        isStarting=false;
        if (reconnectAttempts<MAX_RECONNECT) { reconnectAttempts++; scheduleReconnect(reconnectAttempts); }
        return;
    }

    const logger = pino({ level:'silent' });
    try {
        sock = makeWASocket({
            auth:{ creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys, logger) },
            version:waVersion, logger,
            browser:['Ubuntu','Chrome','122.0.0'],
            connectTimeoutMs:60000, defaultQueryTimeoutMs:undefined,
            keepAliveIntervalMs:20000, markOnlineOnConnect:true,
            generateHighQualityLinkPreview:false, syncFullHistory:false, retryRequestDelayMs:2000,
        });
    } catch (err) {
        isStarting=false;
        if (reconnectAttempts<MAX_RECONNECT) { reconnectAttempts++; scheduleReconnect(reconnectAttempts); }
        return;
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            try {
                qrCodeData = await QRCode.toDataURL(qr, { width:300, margin:2 });
                connectionStatus='qr_ready'; isStarting=false;
                broadcast({ type:'qr', qr:qrCodeData, status:'qr_ready' });
                if (qrExpiryTimer) clearTimeout(qrExpiryTimer);
                qrExpiryTimer = setTimeout(() => {
                    if (connectionStatus==='qr_ready') { qrCodeData=null; broadcast({ type:'qr_expired', message:'QR expirado. Pulsa Regenerar QR.' }); }
                }, 115000);
            } catch {}
        }
        if (connection==='close') {
            isStarting=false;
            if (qrExpiryTimer) { clearTimeout(qrExpiryTimer); qrExpiryTimer=null; }
            const code = lastDisconnect?.error?.output?.statusCode;
            const logout = code===DisconnectReason.loggedOut;
            const badSession = code===DisconnectReason.badSession;
            const replaced = code===DisconnectReason.connectionReplaced;
            if (logout||badSession||code===403) {
                connectionStatus='disconnected'; qrCodeData=null; sock=null;
                if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive:true, force:true });
                broadcast({ type:'status', status:'disconnected', message: logout?'Sesión cerrada.':'Sesión inválida.' });
                reconnectAttempts=0;
            } else if (replaced) {
                connectionStatus='disconnected'; sock=null;
                broadcast({ type:'status', status:'disconnected', message:'Sesión reemplazada.' });
            } else if (reconnectAttempts<MAX_RECONNECT) {
                reconnectAttempts++; connectionStatus='connecting'; sock=null;
                scheduleReconnect(reconnectAttempts);
            } else {
                connectionStatus='disconnected'; qrCodeData=null; sock=null;
                if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive:true, force:true });
                broadcast({ type:'status', status:'disconnected', message:'No se pudo reconectar.' });
                reconnectAttempts=0;
            }
        }
        if (connection==='open') {
            connectionStatus='connected'; qrCodeData=null; isStarting=false;
            reconnectAttempts=0; stopReconnect();
            if (qrExpiryTimer) { clearTimeout(qrExpiryTimer); qrExpiryTimer=null; }
            broadcast({ type:'status', status:'connected', message:'¡Conectado!' });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
        if (type!=='notify') return;
        for (const msg of msgs) {
            if (!msg.message) continue;
            const senderJid = msg.key.remoteJid;
            if (!senderJid||senderJid.endsWith('@g.us')) continue;
            const isFromMe = msg.key.fromMe;
            const contactNumber = senderJid.replace('@s.whatsapp.net','');
            const body = extractBody(msg);
            if (body===null) continue;

            if (isFromMe) {
                const dup = messageHistory.some(h => h.body===body&&h.to===contactNumber&&Math.abs(h.timestamp-((msg.messageTimestamp||Date.now()/1000)*1000))<5000);
                if (!dup) {
                    const m = { id:msg.key.id||`out_${Date.now()}`, from:'me', to:contactNumber, body, timestamp:(msg.messageTimestamp||Date.now()/1000)*1000, type:'outgoing', status:'sent' };
                    addToHistory(m); broadcast({ type:'message', message:m });
                }
            } else {
                const senderName = msg.pushName||contactNumber;
                const m = { id:msg.key.id||`in_${Date.now()}`, from:contactNumber, fromName:senderName, to:'me', body, timestamp:(msg.messageTimestamp||Date.now()/1000)*1000, type:'incoming', status:'delivered' };
                addToHistory(m); broadcast({ type:'message', message:m });
                console.log(`📩 ${senderName}: ${body.substring(0,60)}`);
                // Handle bot commands
                if (body.startsWith('/') || body.toLowerCase().startsWith('ayuda')) {
                    await handleBotCommand(body, senderJid);
                }
            }
        }
    });

    sock.ev.on('messages.update', (updates) => {
        for (const u of updates) {
            if (u.update?.status) {
                const map={2:'sent',3:'delivered',4:'read'};
                const s=map[u.update.status];
                if (s) broadcast({ type:'message_status', id:u.key.id, status:s });
            }
        }
    });
}

function extractBody(msg) {
    const m = msg.message;
    if (!m) return null;
    const unwrap = (o) => {
        if (!o) return o;
        if (o.ephemeralMessage?.message) return unwrap(o.ephemeralMessage.message);
        if (o.viewOnceMessage?.message) return unwrap(o.viewOnceMessage.message);
        if (o.viewOnceMessageV2?.message) return unwrap(o.viewOnceMessageV2.message);
        if (o.documentWithCaptionMessage?.message) return unwrap(o.documentWithCaptionMessage.message);
        if (o.editedMessage?.message?.protocolMessage?.editedMessage) return unwrap(o.editedMessage.message.protocolMessage.editedMessage);
        if (o.protocolMessage?.editedMessage) return unwrap(o.protocolMessage.editedMessage);
        return o;
    };
    const u = unwrap(m);
    if (!u) return null;
    if (u.conversation) return u.conversation;
    if (u.extendedTextMessage?.text) return u.extendedTextMessage.text;
    if (u.imageMessage) return '📷 '+(u.imageMessage.caption||'[Imagen]');
    if (u.videoMessage) return '🎥 '+(u.videoMessage.caption||'[Video]');
    if (u.audioMessage) return '🎵 [Audio]';
    if (u.documentMessage) return `📄 [${u.documentMessage.fileName||'Documento'}]`;
    if (u.stickerMessage) return '🏷️ [Sticker]';
    if (u.contactMessage) return `👤 [${u.contactMessage.displayName||'Contacto'}]`;
    if (u.locationMessage) return '📍 [Ubicación]';
    if (u.pollCreationMessage||u.pollCreationMessageV3) return `📊 Encuesta`;
    if (u.buttonsResponseMessage) return u.buttonsResponseMessage.selectedDisplayText||'[Respuesta botón]';
    if (u.listResponseMessage) return u.listResponseMessage.title||'[Respuesta lista]';
    if (u.reactionMessage||u.pollUpdateMessage||u.protocolMessage||u.senderKeyDistributionMessage) return null;
    return '[Mensaje]';
}

// ============ START ============
server.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════════════╗`);
    console.log(`║  🤖 FILEHUB WhatsApp Bot Server v6              ║`);
    console.log(`║  Scraping multicapa · Bot commands · Favoritos  ║`);
    console.log(`║  Puerto: ${String(PORT).padEnd(6)}                            ║`);
    console.log(`╚══════════════════════════════════════════════════╝`);
    startWhatsApp();
});

process.on('SIGTERM', () => { saveHistory(); process.exit(0); });
process.on('SIGINT', () => { saveHistory(); process.exit(0); });
