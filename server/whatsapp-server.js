/**
 * FILEHUB - WhatsApp Bot Server v5
 * Fixes v5:
 *  - CORS restringido a dominios conocidos
 *  - WS ping/pong cada 20s (Railway corta conexiones inactivas a los 30s)
 *  - Baileys keepAliveIntervalMs: 20000 (evita que Railway mate la sesión WA)
 *  - Reconexión con exponential backoff (3s→6s→12s→24s→60s)
 *  - Persistencia de mensajes en JSON en disco
 *  - QR expiry broadcast a los ~115s (QR caduca en 2min)
 *  - Manejo correcto de sesión corrupta / bad session / loggedOut / connectionReplaced
 *  - extractBody separado para limpieza
 *  - Limite de historial en memoria (500 msgs) + guardado periódico
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestWaWebVersion
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

const AUTH_DIR = IS_PROD
    ? path.join(__dirname, '.whatsapp-auth')
    : path.join(__dirname, '..', '.whatsapp-auth');

const HISTORY_FILE = IS_PROD
    ? path.join(__dirname, '.whatsapp-history.json')
    : path.join(__dirname, '..', '.whatsapp-history.json');

const MAX_HISTORY = 500;

const ALLOWED_ORIGINS = [
    'https://filehub-ia-pi.vercel.app',
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

// ============ LOAD HISTORY ============
try {
    if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        messageHistory = JSON.parse(raw).slice(-MAX_HISTORY);
        console.log(`📂 Historial cargado: ${messageHistory.length} mensajes`);
    }
} catch (e) {
    console.log('⚠️ No se pudo cargar historial:', e.message);
    messageHistory = [];
}

function saveHistory() {
    try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(messageHistory.slice(-MAX_HISTORY))); }
    catch (e) { console.error('Error guardando historial:', e.message); }
}
setInterval(saveHistory, 30000);

// ============ APP ============
const app = express();

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return callback(null, true);
        console.warn(`⚠️ CORS bloqueado: ${origin}`);
        return callback(new Error('CORS no permitido'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
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
    console.log(`📡 WS conectado desde ${ip}`);
    wsClients.add(ws);
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.send(JSON.stringify({ type: 'status', status: connectionStatus, qr: qrCodeData }));
    if (messageHistory.length > 0) {
        ws.send(JSON.stringify({ type: 'history', messages: messageHistory.slice(-100) }));
    }

    ws.on('close', () => { wsClients.delete(ws); });
    ws.on('error', () => { wsClients.delete(ws); });

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
                const jid = msg.phone.includes('@') ? msg.phone : `${msg.phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
                await sock.sendMessage(jid, { text: msg.text });
                const outMsg = {
                    id: `out_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                    from: 'me', to: msg.phone.replace(/[^0-9]/g, ''), body: msg.text,
                    timestamp: Date.now(), type: 'outgoing', status: 'sent'
                };
                addToHistory(outMsg);
                broadcast({ type: 'message', message: outMsg });
            }
            // ── SCRAPING COMMANDS ─────────────────────────────────────────
            if (msg.type === 'scrape_pisos') {
                const { city = 'murcia', maxItems = 15, propertyType = 'alquiler', maxPrice } = msg;
                ws.send(JSON.stringify({ type: 'scrape_status', target: 'pisos', status: 'searching', message: `🔍 Buscando pisos en ${city}...` }));
                try {
                    let url = `https://www.idealista.com/${propertyType}-viviendas/${city.toLowerCase()}-${city.toLowerCase()}/`;
                    if (maxPrice) url += `hasta-${maxPrice}-euros/`;
                    // Try direct fetch first (no Apify needed for basic search)
                    const resp = await fetch(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'es-ES,es;q=0.9' }
                    });
                    const html = await resp.text();
                    // Basic extraction
                    const items = [];
                    const titleReg = /class="item-link"[^>]*href="([^"]+)"[^>]*>([^<]+)</g;
                    const priceReg = /class="item-price[^"]*"[^>]*>([^<]+)</g;
                    let tm, pm;
                    while ((tm = titleReg.exec(html)) !== null && items.length < maxItems) {
                        pm = priceReg.exec(html);
                        items.push({
                            id: `scrape_piso_${Date.now()}_${items.length}`,
                            title: tm[2].trim(),
                            url: 'https://www.idealista.com' + tm[1],
                            price: pm ? pm[1].trim() : '—',
                            location: city,
                            description: '',
                            source: 'idealista',
                            timestamp: Date.now()
                        });
                    }
                    ws.send(JSON.stringify({ type: 'scrape_results', target: 'pisos', items, count: items.length }));
                } catch (err) {
                    ws.send(JSON.stringify({ type: 'scrape_status', target: 'pisos', status: 'error', message: `Error: ${err.message}` }));
                }
            }
            if (msg.type === 'scrape_jobs') {
                const { query = 'enfermero', city = 'murcia', maxItems = 15 } = msg;
                ws.send(JSON.stringify({ type: 'scrape_status', target: 'jobs', status: 'searching', message: `🔍 Buscando "${query}" en ${city}...` }));
                try {
                    const url = `https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${encodeURIComponent(query)}&province=${encodeURIComponent(city)}`;
                    const resp = await fetch(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'es-ES,es;q=0.9' }
                    });
                    const html = await resp.text();
                    const items = [];
                    const offerReg = /href="(https:\/\/www\.infojobs\.net\/[^"]+\/oferta-trabajo[^"]+)"[^>]*>([^<]+)</g;
                    const salaryReg = /salary[^>]*>([^<]+)</g;
                    let om, sm;
                    while ((om = offerReg.exec(html)) !== null && items.length < maxItems) {
                        sm = salaryReg.exec(html);
                        items.push({
                            id: `scrape_job_${Date.now()}_${items.length}`,
                            title: om[2].trim(),
                            url: om[1],
                            company: '—',
                            location: city,
                            salary: sm ? sm[1].trim() : 'A consultar',
                            description: '',
                            source: 'infojobs',
                            timestamp: Date.now()
                        });
                    }
                    ws.send(JSON.stringify({ type: 'scrape_results', target: 'jobs', items, count: items.length }));
                } catch (err) {
                    ws.send(JSON.stringify({ type: 'scrape_status', target: 'jobs', status: 'error', message: `Error: ${err.message}` }));
                }
            }
        } catch (err) { console.error('WS msg error:', err.message); }
    });
});

// Ping every 20s to keep Railway WS alive (Railway kills idle connections after 30s)
const wsPingInterval = setInterval(() => {
    wsClients.forEach(ws => {
        if (!ws.isAlive) { wsClients.delete(ws); return ws.terminate(); }
        ws.isAlive = false;
        ws.ping();
    });
}, 20000);
wss.on('close', () => clearInterval(wsPingInterval));

function addToHistory(msg) {
    if (messageHistory.some(m => m.id === msg.id)) return;
    messageHistory.push(msg);
    if (messageHistory.length > MAX_HISTORY) messageHistory = messageHistory.slice(-MAX_HISTORY);
}

function broadcast(data) {
    const json = JSON.stringify(data);
    wsClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            try { ws.send(json); } catch (e) { wsClients.delete(ws); }
        }
    });
}

// ============ REST ============
app.get('/', (req, res) => res.json({
    service: 'FileHub WA Bot v5', status: connectionStatus,
    connected: connectionStatus === 'connected',
    clients: wsClients.size, messages: messageHistory.length,
    uptime: Math.round(process.uptime()) + 's'
}));

app.get('/status', (req, res) => res.json({
    status: connectionStatus, hasQR: !!qrCodeData,
    connected: connectionStatus === 'connected',
    clients: wsClients.size, messages: messageHistory.length
}));

app.get('/qr', (req, res) => res.json({ qr: qrCodeData, status: connectionStatus }));

app.post('/connect', async (req, res) => {
    if (connectionStatus === 'connected') return res.json({ success: true, message: 'Ya conectado' });
    if (isStarting) return res.json({ success: true, message: 'Ya iniciando...' });
    try {
        reconnectAttempts = 0;
        await startWhatsApp();
        res.json({ success: true, message: 'Iniciando conexión...' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/disconnect', async (req, res) => {
    try {
        stopReconnect();
        isStarting = false;
        reconnectAttempts = MAX_RECONNECT + 1;
        if (qrExpiryTimer) { clearTimeout(qrExpiryTimer); qrExpiryTimer = null; }
        if (sock) { try { await sock.logout(); } catch (e) {} sock = null; }
        connectionStatus = 'disconnected';
        qrCodeData = null;
        broadcast({ type: 'status', status: 'disconnected', message: 'Desconectado manualmente' });
        if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        res.json({ success: true, message: 'Desconectado' });
    } catch (err) {
        connectionStatus = 'disconnected'; sock = null;
        res.json({ success: true, message: 'Desconectado' });
    }
});

app.post('/send', async (req, res) => {
    const { phone, message } = req.body;
    if (!sock || connectionStatus !== 'connected') return res.status(400).json({ success: false, error: 'No conectado' });
    if (!phone || !message) return res.status(400).json({ success: false, error: 'Faltan phone o message' });
    try {
        const jid = phone.includes('@') ? phone : `${phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/messages', (req, res) => {
    const limit = parseInt(req.query.limit) || 200;
    res.json({ messages: messageHistory.slice(-limit) });
});

app.get('/messages/classified', (req, res) => {
    const pisos = [], jobs = [];
    messageHistory.forEach(msg => {
        if (!msg.body || msg.type === 'outgoing') return;
        if (['[', '📷', '🎵', '🎥'].some(p => msg.body.startsWith(p))) return;
        const t = msg.body.toLowerCase();
        if (
            (t.includes('piso') || t.includes('vivienda') || t.includes('alquiler') || t.includes('apartamento') || t.includes('habitación') || t.includes('casa ') || t.includes('ático') || t.includes('estudio') || t.includes('loft') || t.includes('duplex')) &&
            (t.includes('€') || t.includes('eur') || t.includes('precio') || t.includes('mes') || t.includes('m2') || t.includes('m²') || t.includes('zona') || t.includes('barrio') || t.includes('habitaciones') || t.includes('baño') || t.includes('dormitorio'))
        ) pisos.push(msg);
        if (
            (t.includes('oferta') || t.includes('puesto') || t.includes('empleo') || t.includes('trabajo') || t.includes('vacante') || t.includes('contrato') || t.includes('buscamos') || t.includes('se necesita') || t.includes('incorporación')) &&
            (t.includes('salario') || t.includes('€') || t.includes('eur') || t.includes('empresa') || t.includes('jornada') || t.includes('requisitos') || t.includes('experiencia') || t.includes('contrat') || t.includes('sueldo'))
        ) jobs.push(msg);
    });
    res.json({ pisos, jobs });
});

// ============ EMAIL ============
const nodemailer = require('nodemailer');
app.post('/send-email', async (req, res) => {
    const { to, subject, html, gmailUser, gmailAppPassword } = req.body;
    if (!to || !subject || !html) return res.status(400).json({ error: 'Faltan to, subject, html' });
    const user = gmailUser || process.env.GMAIL_USER;
    const pass = (gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
    if (!user || !pass) return res.status(400).json({ error: 'Se necesitan credenciales de Gmail' });
    try {
        const t = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
        await t.sendMail({ from: `FileHub IA <${user}>`, to, subject, html });
        res.json({ success: true, message: `Email enviado a ${to}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ APIFY ============
const APIFY_TOKEN = process.env.APIFY_API_KEY || '';
const APIFY_BASE = 'https://api.apify.com/v2';

async function runApifyActor(actorId, input, token) {
    const runRes = await fetch(`${APIFY_BASE}/acts/${actorId}/runs?token=${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
    });
    if (!runRes.ok) throw new Error(`Apify failed: ${runRes.status}`);
    const { data } = await runRes.json();
    if (!data?.id) throw new Error('No run ID');
    const start = Date.now();
    let status = 'RUNNING';
    while (status === 'RUNNING' || status === 'READY') {
        if (Date.now() - start > 300000) throw new Error('Timeout');
        await new Promise(r => setTimeout(r, 3000));
        const s = await (await fetch(`${APIFY_BASE}/actor-runs/${data.id}?token=${token}`)).json();
        status = s.data?.status;
    }
    if (status !== 'SUCCEEDED') throw new Error(`Status: ${status}`);
    return await (await fetch(`${APIFY_BASE}/datasets/${data.defaultDatasetId}/items?token=${token}`)).json();
}

app.post('/scrape/pisos', async (req, res) => {
    const token = req.body.token || APIFY_TOKEN;
    if (!token) return res.status(400).json({ error: 'Falta APIFY_API_KEY' });
    const { city = 'barcelona', maxItems = 20, propertyType = 'alquiler' } = req.body;
    try {
        const items = await runApifyActor('apify~web-scraper', {
            startUrls: [{ url: `https://www.idealista.com/${propertyType}-viviendas/${city}/` }],
            pageFunction: `async function pageFunction({$}) {
                const r=[];$('.item').each((i,el)=>{if(i>=${maxItems})return false;const $e=$(el);r.push({title:$e.find('.item-link').text().trim(),price:$e.find('.item-price').text().trim(),detail:$e.find('.item-detail').text().trim(),link:'https://www.idealista.com'+$e.find('.item-link').attr('href')});});return r;}`,
            maxRequestsPerCrawl: 5, maxConcurrency: 1
        }, token);
        const pisos = (Array.isArray(items)?items.flat():[]).map((item,i)=>({
            id:`apify_piso_${Date.now()}_${i}`,title:item.title||`Piso en ${city}`,
            price:item.price||'Consultar',location:city,sqm:0,rooms:0,baths:0,
            description:item.detail||'',rawText:JSON.stringify(item),
            url:item.link||'',timestamp:Date.now(),source:'apify',sent:false
        }));
        res.json({ success: true, pisos, count: pisos.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/scrape/jobs', async (req, res) => {
    const token = req.body.token || APIFY_TOKEN;
    if (!token) return res.status(400).json({ error: 'Falta APIFY_API_KEY' });
    const { query = 'desarrollador', city = 'barcelona', maxItems = 20 } = req.body;
    try {
        const items = await runApifyActor('apify~web-scraper', {
            startUrls: [{ url: `https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${encodeURIComponent(query)}` }],
            pageFunction: `async function pageFunction({$}) {
                const r=[];$('.ij-OfferCardContent').each((i,el)=>{if(i>=${maxItems})return false;const $e=$(el);r.push({title:$e.find('.ij-OfferCardContent-description-title-link').text().trim(),company:$e.find('.ij-OfferCardContent-description-subtitle-link').text().trim(),location:$e.find('.ij-OfferCardContent-description-list-item-truncate').first().text().trim(),salary:$e.find('.ij-OfferCardContent-description-salary').text().trim(),link:$e.find('.ij-OfferCardContent-description-title-link').attr('href')});});return r;}`,
            maxRequestsPerCrawl: 3, maxConcurrency: 1
        }, token);
        const jobs = (Array.isArray(items)?items.flat():[]).map((item,i)=>({
            id:`apify_job_${Date.now()}_${i}`,title:item.title||query,
            company:item.company||'No especificada',salary:item.salary||'A consultar',
            location:item.location||city,type:'No especificada',description:'',
            rawText:JSON.stringify(item),url:item.link||'',
            timestamp:Date.now(),source:'apify',sent:false
        }));
        res.json({ success: true, jobs, count: jobs.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/scrape/run', async (req, res) => {
    const { actorId, input, token: t } = req.body;
    const token = t || APIFY_TOKEN;
    if (!token) return res.status(400).json({ error: 'Falta token' });
    if (!actorId) return res.status(400).json({ error: 'Falta actorId' });
    try {
        const items = await runApifyActor(actorId, input || {}, token);
        res.json({ success: true, items, count: Array.isArray(items) ? items.length : 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ RECONNECT CONTROL ============
function stopReconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function scheduleReconnect(attempt) {
    stopReconnect();
    const delay = Math.round(Math.min(3000 * Math.pow(2, attempt - 1), 60000) + Math.random() * 2000);
    console.log(`🔄 Reconectando en ${Math.round(delay/1000)}s (intento ${attempt}/${MAX_RECONNECT})`);
    broadcast({ type: 'status', status: 'connecting', message: `Reconectando en ${Math.round(delay/1000)}s (intento ${attempt}/${MAX_RECONNECT})...` });
    reconnectTimer = setTimeout(() => startWhatsApp(), delay);
}

// ============ WHATSAPP ============
async function startWhatsApp() {
    if (isStarting) return;
    isStarting = true;
    connectionStatus = 'connecting';
    qrCodeData = null;
    if (qrExpiryTimer) { clearTimeout(qrExpiryTimer); qrExpiryTimer = null; }
    broadcast({ type: 'status', status: 'connecting', message: 'Iniciando conexión...' });
    console.log('🔄 Iniciando WhatsApp...');

    let waVersion;
    try {
        const { version } = await fetchLatestWaWebVersion({});
        waVersion = version;
        console.log('📦 WA version:', waVersion.join('.'));
    } catch { waVersion = [2, 3000, 1034715486]; }

    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

    let state, saveCreds;
    try {
        ({ state, saveCreds } = await useMultiFileAuthState(AUTH_DIR));
    } catch (err) {
        console.error('❌ Auth state corrupto:', err.message);
        if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        isStarting = false;
        if (reconnectAttempts < MAX_RECONNECT) { reconnectAttempts++; scheduleReconnect(reconnectAttempts); }
        return;
    }

    const logger = pino({ level: 'silent' });

    try {
        sock = makeWASocket({
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
            version: waVersion, logger,
            browser: ['Ubuntu', 'Chrome', '122.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: undefined,
            keepAliveIntervalMs: 20000,   // KEY: keeps WA session alive on Railway
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            retryRequestDelayMs: 2000,
        });
    } catch (err) {
        console.error('❌ Error creando socket:', err.message);
        isStarting = false;
        if (reconnectAttempts < MAX_RECONNECT) { reconnectAttempts++; scheduleReconnect(reconnectAttempts); }
        return;
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📱 QR generado');
            try {
                qrCodeData = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                connectionStatus = 'qr_ready';
                isStarting = false;
                broadcast({ type: 'qr', qr: qrCodeData, status: 'qr_ready' });
                // Notify when QR expires (~115s, QR TTL is 2min)
                if (qrExpiryTimer) clearTimeout(qrExpiryTimer);
                qrExpiryTimer = setTimeout(() => {
                    if (connectionStatus === 'qr_ready') {
                        qrCodeData = null;
                        broadcast({ type: 'qr_expired', message: 'El código QR ha expirado. Pulsa "Regenerar QR".' });
                        console.log('⏰ QR expirado');
                    }
                }, 115000);
            } catch (err) { console.error('Error QR:', err.message); }
        }

        if (connection === 'close') {
            isStarting = false;
            if (qrExpiryTimer) { clearTimeout(qrExpiryTimer); qrExpiryTimer = null; }
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔌 Desconectado. Código: ${code}`);

            const logout = code === DisconnectReason.loggedOut;
            const badSession = code === DisconnectReason.badSession;
            const replaced = code === DisconnectReason.connectionReplaced;
            const forbidden = code === 403;

            if (logout || badSession || forbidden) {
                connectionStatus = 'disconnected'; qrCodeData = null; sock = null;
                if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                broadcast({ type: 'status', status: 'disconnected', message: logout ? 'Sesión cerrada desde el teléfono.' : 'Sesión inválida. Reconecta con QR.' });
                reconnectAttempts = 0;
            } else if (replaced) {
                connectionStatus = 'disconnected'; sock = null;
                broadcast({ type: 'status', status: 'disconnected', message: 'Sesión reemplazada en otro dispositivo.' });
            } else if (reconnectAttempts < MAX_RECONNECT) {
                reconnectAttempts++;
                connectionStatus = 'connecting';
                sock = null;
                scheduleReconnect(reconnectAttempts);
            } else {
                connectionStatus = 'disconnected'; qrCodeData = null; sock = null;
                if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                broadcast({ type: 'status', status: 'disconnected', message: 'No se pudo reconectar. Reconecta manualmente.' });
                reconnectAttempts = 0;
            }
        }

        if (connection === 'open') {
            console.log('✅ WhatsApp conectado!');
            connectionStatus = 'connected'; qrCodeData = null;
            isStarting = false; reconnectAttempts = 0;
            stopReconnect();
            if (qrExpiryTimer) { clearTimeout(qrExpiryTimer); qrExpiryTimer = null; }
            broadcast({ type: 'status', status: 'connected', message: '¡Conectado!' });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
        if (type !== 'notify') return;
        for (const msg of msgs) {
            if (!msg.message) continue;
            const senderJid = msg.key.remoteJid;
            if (!senderJid || senderJid.endsWith('@g.us')) continue;
            const isFromMe = msg.key.fromMe;
            const contactNumber = senderJid.replace('@s.whatsapp.net', '');
            const body = extractBody(msg);
            if (body === null) continue;

            if (isFromMe) {
                const dup = messageHistory.some(h =>
                    h.body === body && h.to === contactNumber &&
                    Math.abs(h.timestamp - ((msg.messageTimestamp||Date.now()/1000)*1000)) < 5000
                );
                if (!dup) {
                    const m = { id: msg.key.id||`out_${Date.now()}`, from:'me', to:contactNumber, body,
                        timestamp:(msg.messageTimestamp||Date.now()/1000)*1000, type:'outgoing', status:'sent' };
                    addToHistory(m); broadcast({ type:'message', message:m });
                }
            } else {
                const senderName = msg.pushName || contactNumber;
                const m = { id: msg.key.id||`in_${Date.now()}`, from:contactNumber, fromName:senderName,
                    to:'me', body, timestamp:(msg.messageTimestamp||Date.now()/1000)*1000,
                    type:'incoming', status:'delivered' };
                addToHistory(m); broadcast({ type:'message', message:m });
                console.log(`📩 ${senderName}: ${body.substring(0,60)}`);
            }
        }
    });

    sock.ev.on('messages.update', (updates) => {
        for (const u of updates) {
            if (u.update?.status) {
                const map = {2:'sent',3:'delivered',4:'read'};
                const s = map[u.update.status];
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
    if (u.pollCreationMessage||u.pollCreationMessageV3) return `📊 Encuesta: ${u.pollCreationMessage?.name||u.pollCreationMessageV3?.name||''}`;
    if (u.buttonsResponseMessage) return u.buttonsResponseMessage.selectedDisplayText||'[Respuesta botón]';
    if (u.listResponseMessage) return u.listResponseMessage.title||'[Respuesta lista]';
    if (u.reactionMessage||u.pollUpdateMessage||u.protocolMessage||u.senderKeyDistributionMessage) return null;
    return '[Mensaje]';
}

// ============ START ============
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║  🤖 FILEHUB WhatsApp Bot Server v5            ║
║  WS ping/pong · backoff · historial · CORS    ║
║  Puerto: ${String(PORT).padEnd(6)}                          ║
╚════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { saveHistory(); process.exit(0); });
process.on('SIGINT', () => { saveHistory(); process.exit(0); });
