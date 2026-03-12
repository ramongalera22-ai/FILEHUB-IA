/**
 * FILEHUB - WhatsApp Bot Server v4 (baileys package + fetchLatestWaWebVersion)
 * Servidor WebSocket + REST para conexión de WhatsApp vía QR
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestWaWebVersion } = require('baileys');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');

// ============ CONFIG ============
const PORT = process.env.PORT || 3001;
const AUTH_DIR = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '.whatsapp-auth') 
  : path.join(__dirname, '..', '.whatsapp-auth');

// ============ STATE ============
let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let wsClients = new Set();
let messageHistory = [];
let isStarting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;

// ============ APP ============
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

// ============ WEBSOCKET ============
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    console.log('📡 Cliente WebSocket conectado');
    wsClients.add(ws);
    ws.send(JSON.stringify({ type: 'status', status: connectionStatus, qr: qrCodeData }));
    if (messageHistory.length > 0) {
        ws.send(JSON.stringify({ type: 'history', messages: messageHistory.slice(-100) }));
    }
    ws.on('close', () => { wsClients.delete(ws); });
    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'send_message' && sock && connectionStatus === 'connected') {
                const jid = msg.phone.includes('@') ? msg.phone : `${msg.phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
                await sock.sendMessage(jid, { text: msg.text });
                const outMsg = {
                    id: `out_${Date.now()}`,
                    from: 'me', to: msg.phone, body: msg.text,
                    timestamp: Date.now(), type: 'outgoing', status: 'sent'
                };
                messageHistory.push(outMsg);
                broadcast({ type: 'message', message: outMsg });
            }
        } catch (err) {
            console.error('Error WS:', err.message);
        }
    });
});

function broadcast(data) {
    const json = JSON.stringify(data);
    wsClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) ws.send(json);
    });
}

// ============ REST ============
app.get('/status', (req, res) => {
    res.json({ status: connectionStatus, hasQR: !!qrCodeData, connected: connectionStatus === 'connected' });
});

app.get('/qr', (req, res) => {
    res.json({ qr: qrCodeData, status: connectionStatus });
});

app.post('/connect', async (req, res) => {
    if (connectionStatus === 'connected') return res.json({ success: true, message: 'Ya conectado' });
    if (isStarting) return res.json({ success: true, message: 'Ya iniciando...' });
    try {
        reconnectAttempts = 0;
        await startWhatsApp();
        res.json({ success: true, message: 'Iniciando conexión...' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/disconnect', async (req, res) => {
    try {
        isStarting = false;
        reconnectAttempts = MAX_RECONNECT;
        if (sock) {
            try { await sock.logout(); } catch (e) { }
            sock = null;
        }
        connectionStatus = 'disconnected';
        qrCodeData = null;
        broadcast({ type: 'status', status: 'disconnected' });
        if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        res.json({ success: true, message: 'Desconectado' });
    } catch (err) {
        connectionStatus = 'disconnected';
        sock = null;
        res.json({ success: true, message: 'Desconectado' });
    }
});

app.post('/send', async (req, res) => {
    const { phone, message } = req.body;
    if (!sock || connectionStatus !== 'connected') return res.status(400).json({ error: 'No conectado' });
    try {
        const jid = phone.includes('@') ? phone : `${phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/messages', (req, res) => {
    res.json({ messages: messageHistory.slice(-200) });
});

// ============ CLASSIFIED MESSAGES (pisos / jobs) ============
app.get('/messages/classified', (req, res) => {
    const pisos = [];
    const jobs = [];

    messageHistory.forEach(msg => {
        if (!msg.body || msg.body.startsWith('[') || msg.body.startsWith('📷') || msg.body.startsWith('🎵')) return;
        const t = msg.body.toLowerCase();

        // Pisos keywords
        if (
            (t.includes('piso') || t.includes('vivienda') || t.includes('alquiler') || t.includes('apartamento') || t.includes('habitación') || t.includes('casa ')) &&
            (t.includes('€') || t.includes('eur') || t.includes('precio') || t.includes('mes') || t.includes('m2') || t.includes('m²') || t.includes('zona') || t.includes('barrio') || t.includes('habitaciones') || t.includes('baño'))
        ) {
            pisos.push(msg);
        }

        // Jobs keywords
        if (
            (t.includes('oferta') || t.includes('puesto') || t.includes('empleo') || t.includes('trabajo') || t.includes('vacante') || t.includes('contrato')) &&
            (t.includes('salario') || t.includes('€') || t.includes('eur') || t.includes('empresa') || t.includes('jornada') || t.includes('requisitos') || t.includes('experiencia') || t.includes('contrat'))
        ) {
            jobs.push(msg);
        }
    });

    res.json({ pisos, jobs });
});

// ============ EMAIL SENDING ============
const nodemailer = require('nodemailer');

app.post('/send-email', async (req, res) => {
    const { to, subject, html, gmailUser, gmailAppPassword } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Faltan campos: to, subject, html' });
    }

    // Use provided credentials or env vars — strip spaces from app password
    const user = gmailUser || process.env.GMAIL_USER;
    const pass = (gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    if (!user || !pass) {
        return res.status(400).json({
            error: 'Se necesitan credenciales de Gmail. Envía gmailUser y gmailAppPassword en el body, o configura GMAIL_USER y GMAIL_APP_PASSWORD en .env'
        });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        });

        await transporter.sendMail({
            from: `FileHub IA <${user}>`,
            to,
            subject,
            html
        });

        res.json({ success: true, message: `Email enviado a ${to}` });
    } catch (err) {
        console.error('Error enviando email:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============ APIFY SCRAPING ============
const APIFY_TOKEN = process.env.APIFY_API_KEY || '';
const APIFY_BASE = 'https://api.apify.com/v2';

// Generic Apify actor runner
async function runApifyActor(actorId, input, token) {
    const url = `${APIFY_BASE}/acts/${actorId}/runs?token=${token}`;
    const runRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
    });
    if (!runRes.ok) throw new Error(`Apify run failed: ${runRes.status} ${await runRes.text()}`);
    const runData = await runRes.json();
    const runId = runData.data?.id;
    if (!runId) throw new Error('No run ID returned');

    // Wait for completion (poll every 3s, max 5 min)
    const maxWait = 300000;
    const start = Date.now();
    let status = 'RUNNING';
    while (status === 'RUNNING' || status === 'READY') {
        if (Date.now() - start > maxWait) throw new Error('Apify run timeout');
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
        const statusData = await statusRes.json();
        status = statusData.data?.status;
    }
    if (status !== 'SUCCEEDED') throw new Error(`Apify run status: ${status}`);

    // Get dataset items
    const datasetId = runData.data?.defaultDatasetId;
    const itemsRes = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}`);
    return await itemsRes.json();
}

// Scrape pisos (apartments) - Idealista
app.post('/scrape/pisos', async (req, res) => {
    const token = req.body.token || APIFY_TOKEN;
    if (!token) return res.status(400).json({ error: 'Falta APIFY_API_KEY' });

    const { city = 'barcelona', maxPrice = 1200, minSize = 30, maxItems = 20, propertyType = 'alquiler' } = req.body;

    try {
        console.log(`🔍 Scraping pisos: ${propertyType} en ${city}, max ${maxPrice}€...`);
        // Use web scraper actor for Idealista
        const items = await runApifyActor('apify~web-scraper', {
            startUrls: [
                { url: `https://www.idealista.com/${propertyType}-viviendas/${city}/` }
            ],
            pseudoUrls: [
                { purl: `https://www.idealista.com/${propertyType}-viviendas/${city}/[.*]` }
            ],
            pageFunction: `async function pageFunction(context) {
                const { $, request } = context;
                const results = [];
                $('.item-multimedia-container').closest('.item').each((i, el) => {
                    if (i >= ${maxItems}) return false;
                    const $el = $(el);
                    const title = $el.find('.item-link').text().trim();
                    const price = $el.find('.item-price').text().trim();
                    const detail = $el.find('.item-detail').text().trim();
                    const link = $el.find('.item-link').attr('href');
                    results.push({ title, price, detail, link: 'https://www.idealista.com' + link, source: 'idealista' });
                });
                return results;
            }`,
            maxRequestsPerCrawl: 5,
            maxConcurrency: 1
        }, token);

        const pisos = (Array.isArray(items) ? items.flat() : []).map((item, i) => ({
            id: `apify_piso_${Date.now()}_${i}`,
            title: item.title || `Piso en ${city}`,
            price: item.price || 'Consultar',
            location: city,
            sqm: 0,
            rooms: 0,
            baths: 0,
            description: item.detail || '',
            rawText: JSON.stringify(item),
            link: item.link || '',
            timestamp: Date.now(),
            source: 'apify',
            sent: false
        }));

        console.log(`✅ ${pisos.length} pisos encontrados`);
        res.json({ success: true, pisos, count: pisos.length });
    } catch (err) {
        console.error('❌ Error scraping pisos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Scrape jobs - InfoJobs
app.post('/scrape/jobs', async (req, res) => {
    const token = req.body.token || APIFY_TOKEN;
    if (!token) return res.status(400).json({ error: 'Falta APIFY_API_KEY' });

    const { query = 'desarrollador', city = 'barcelona', maxItems = 20 } = req.body;

    try {
        console.log(`🔍 Scraping jobs: "${query}" en ${city}...`);
        const items = await runApifyActor('apify~web-scraper', {
            startUrls: [
                { url: `https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${encodeURIComponent(query)}&provinceIds=9&categoryIds=` }
            ],
            pageFunction: `async function pageFunction(context) {
                const { $, request } = context;
                const results = [];
                $('.ij-OfferCardContent').each((i, el) => {
                    if (i >= ${maxItems}) return false;
                    const $el = $(el);
                    const title = $el.find('.ij-OfferCardContent-description-title-link').text().trim();
                    const company = $el.find('.ij-OfferCardContent-description-subtitle-link').text().trim();
                    const location = $el.find('.ij-OfferCardContent-description-list-item-truncate').first().text().trim();
                    const salary = $el.find('.ij-OfferCardContent-description-salary').text().trim();
                    const link = $el.find('.ij-OfferCardContent-description-title-link').attr('href');
                    results.push({ title, company, location, salary, link, source: 'infojobs' });
                });
                return results;
            }`,
            maxRequestsPerCrawl: 3,
            maxConcurrency: 1
        }, token);

        const jobs = (Array.isArray(items) ? items.flat() : []).map((item, i) => ({
            id: `apify_job_${Date.now()}_${i}`,
            title: item.title || query,
            company: item.company || 'No especificada',
            salary: item.salary || 'A consultar',
            location: item.location || city,
            type: 'No especificada',
            description: '',
            rawText: JSON.stringify(item),
            link: item.link || '',
            timestamp: Date.now(),
            source: 'apify',
            sent: false
        }));

        console.log(`✅ ${jobs.length} ofertas encontradas`);
        res.json({ success: true, jobs, count: jobs.length });
    } catch (err) {
        console.error('❌ Error scraping jobs:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Generic scrape endpoint
app.post('/scrape/run', async (req, res) => {
    const { actorId, input, token: bodyToken } = req.body;
    const token = bodyToken || APIFY_TOKEN;
    if (!token) return res.status(400).json({ error: 'Falta APIFY_API_KEY' });
    if (!actorId) return res.status(400).json({ error: 'Falta actorId' });

    try {
        console.log(`🔍 Running Apify actor: ${actorId}`);
        const items = await runApifyActor(actorId, input || {}, token);
        res.json({ success: true, items, count: Array.isArray(items) ? items.length : 0 });
    } catch (err) {
        console.error('❌ Error running actor:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============ WHATSAPP ============
async function startWhatsApp() {
    if (isStarting) return;
    isStarting = true;
    connectionStatus = 'connecting';
    qrCodeData = null;
    broadcast({ type: 'status', status: 'connecting' });

    console.log('🔄 Iniciando conexión WhatsApp...');

    // Fetch latest WhatsApp Web version to avoid 405 errors
    let waVersion;
    try {
        const { version } = await fetchLatestWaWebVersion({});
        waVersion = version;
        console.log('📦 Versión WhatsApp Web:', waVersion.join('.'));
    } catch (err) {
        console.log('⚠️ No se pudo obtener versión, usando defaults');
        waVersion = [2, 3000, 1034715486]; // fallback
    }

    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const logger = pino({ level: 'silent' });

    sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        version: waVersion,
        logger,
        browser: ['Ubuntu', 'Chrome', '120.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 25000,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
    });

    // ---- CONNECTION UPDATE ----
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📱 ¡Código QR generado!');
            try {
                qrCodeData = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                connectionStatus = 'qr_ready';
                isStarting = false;
                broadcast({ type: 'qr', qr: qrCodeData, status: 'qr_ready' });
            } catch (err) {
                console.error('Error QR:', err.message);
            }
        }

        if (connection === 'close') {
            isStarting = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔌 Desconectado. Código: ${statusCode}`);

            const isLoggedOut = statusCode === DisconnectReason.loggedOut;
            const isBadSession = statusCode === DisconnectReason.badSession;

            if (isLoggedOut || isBadSession) {
                console.log('🚫 Sesión terminada.');
                connectionStatus = 'disconnected';
                qrCodeData = null;
                sock = null;
                if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                broadcast({ type: 'status', status: 'disconnected', message: 'Sesión terminada.' });
                reconnectAttempts = 0;
            } else if (reconnectAttempts < MAX_RECONNECT) {
                reconnectAttempts++;
                const delay = Math.min(3000 * reconnectAttempts, 15000);
                console.log(`🔄 Reconectando (${reconnectAttempts}/${MAX_RECONNECT}) en ${delay / 1000}s...`);
                connectionStatus = 'connecting';
                broadcast({ type: 'status', status: 'connecting', message: `Reconectando (${reconnectAttempts}/${MAX_RECONNECT})...` });
                setTimeout(() => startWhatsApp(), delay);
            } else {
                console.log('❌ Máximo de reconexiones alcanzado.');
                connectionStatus = 'disconnected';
                qrCodeData = null;
                sock = null;
                if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                broadcast({ type: 'status', status: 'disconnected', message: 'Error de conexión.' });
                reconnectAttempts = 0;
            }
        }

        if (connection === 'open') {
            console.log('✅ ¡WhatsApp conectado exitosamente!');
            connectionStatus = 'connected';
            qrCodeData = null;
            isStarting = false;
            reconnectAttempts = 0;
            broadcast({ type: 'status', status: 'connected', message: '¡Conectado!' });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // ---- MESSAGES ----
    sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
        if (type !== 'notify') return;

        for (const msg of msgs) {
            if (!msg.message) continue;

            const senderJid = msg.key.remoteJid;
            if (!senderJid || senderJid.endsWith('@g.us')) continue;

            const isFromMe = msg.key.fromMe;
            const contactNumber = senderJid.replace('@s.whatsapp.net', '');

            // Extract message body
            let body = '';
            const m = msg.message;

            // Unwrap wrapper messages (ephemeral, viewOnce, editedMessage, etc.)
            const unwrap = (msgObj) => {
                if (!msgObj) return msgObj;
                if (msgObj.ephemeralMessage?.message) return unwrap(msgObj.ephemeralMessage.message);
                if (msgObj.viewOnceMessage?.message) return unwrap(msgObj.viewOnceMessage.message);
                if (msgObj.viewOnceMessageV2?.message) return unwrap(msgObj.viewOnceMessageV2.message);
                if (msgObj.viewOnceMessageV2Extension?.message) return unwrap(msgObj.viewOnceMessageV2Extension.message);
                if (msgObj.documentWithCaptionMessage?.message) return unwrap(msgObj.documentWithCaptionMessage.message);
                if (msgObj.editedMessage?.message?.protocolMessage?.editedMessage) return unwrap(msgObj.editedMessage.message.protocolMessage.editedMessage);
                if (msgObj.protocolMessage?.editedMessage) return unwrap(msgObj.protocolMessage.editedMessage);
                return msgObj;
            };

            const um = unwrap(m);
            if (!um) continue;

            if (um.conversation) body = um.conversation;
            else if (um.extendedTextMessage?.text) body = um.extendedTextMessage.text;
            else if (um.imageMessage) body = '📷 ' + (um.imageMessage.caption || '[Imagen]');
            else if (um.videoMessage) body = '🎥 ' + (um.videoMessage.caption || '[Video]');
            else if (um.audioMessage) body = '🎵 [Audio]';
            else if (um.documentMessage) body = `📄 [${um.documentMessage.fileName || 'Documento'}]`;
            else if (um.stickerMessage) body = '🏷️ [Sticker]';
            else if (um.contactMessage) body = `👤 [${um.contactMessage.displayName || 'Contacto'}]`;
            else if (um.contactsArrayMessage) body = `👥 [${um.contactsArrayMessage.contacts?.length || 0} Contactos]`;
            else if (um.locationMessage) body = '📍 [Ubicación]';
            else if (um.liveLocationMessage) body = '📍 [Ubicación en vivo]';
            else if (um.reactionMessage) continue; // skip reactions
            else if (um.pollCreationMessage || um.pollCreationMessageV3) body = `📊 Encuesta: ${um.pollCreationMessage?.name || um.pollCreationMessageV3?.name || ''}`;
            else if (um.pollUpdateMessage) continue; // skip poll votes
            else if (um.buttonsResponseMessage) body = um.buttonsResponseMessage.selectedDisplayText || '[Respuesta botón]';
            else if (um.listResponseMessage) body = um.listResponseMessage.title || um.listResponseMessage.singleSelectReply?.selectedRowId || '[Respuesta lista]';
            else if (um.templateButtonReplyMessage) body = um.templateButtonReplyMessage.selectedDisplayText || '[Respuesta plantilla]';
            else if (um.interactiveResponseMessage) {
                try {
                    const parsed = JSON.parse(um.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson || '{}');
                    body = parsed.id || '[Respuesta interactiva]';
                } catch { body = '[Respuesta interactiva]'; }
            }
            else if (um.protocolMessage) continue; // skip protocol messages (edits, deletes, etc.)
            else if (um.senderKeyDistributionMessage) continue; // internal
            else body = '[Mensaje]';

            if (isFromMe) {
                // Outgoing message (bot response or sent from phone)
                // Deduplicate: check if we already have this message from websocket send_message
                const msgId = msg.key.id;
                const alreadyExists = messageHistory.some(h =>
                    h.body === body && h.to === contactNumber &&
                    Math.abs(h.timestamp - ((msg.messageTimestamp || Date.now() / 1000) * 1000)) < 5000
                );

                if (!alreadyExists) {
                    const outMsg = {
                        id: msgId || `out_${Date.now()}`,
                        from: 'me',
                        to: contactNumber,
                        body,
                        timestamp: (msg.messageTimestamp || Date.now() / 1000) * 1000,
                        type: 'outgoing',
                        status: 'sent'
                    };
                    messageHistory.push(outMsg);
                    broadcast({ type: 'message', message: outMsg });
                    console.log(`📤 Bot → ${contactNumber}: ${body.substring(0, 60)}`);
                }
            } else {
                // Incoming message
                const senderName = msg.pushName || contactNumber;
                const inMsg = {
                    id: msg.key.id || `in_${Date.now()}`,
                    from: contactNumber,
                    fromName: senderName,
                    to: 'me',
                    body,
                    timestamp: (msg.messageTimestamp || Date.now() / 1000) * 1000,
                    type: 'incoming',
                    status: 'delivered'
                };

                messageHistory.push(inMsg);
                broadcast({ type: 'message', message: inMsg });
                console.log(`📩 ${senderName}: ${body.substring(0, 60)}`);
            }
        }
    });

    sock.ev.on('messages.update', (updates) => {
        for (const u of updates) {
            if (u.update?.status) {
                const map = { 2: 'sent', 3: 'delivered', 4: 'read' };
                broadcast({ type: 'message_status', id: u.key.id, status: map[u.update.status] || 'sent' });
            }
        }
    });
}

// ============ START ============
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║   🤖 FILEHUB WhatsApp Bot Server v4           ║
║   baileys + fetchLatestWaWebVersion            ║
║   Puerto: ${PORT}                               ║
║   API:    http://localhost:${PORT}               ║
║   WS:     ws://localhost:${PORT}/ws              ║
╠════════════════════════════════════════════════╣
║   Listo. Usa la webapp para conectar.          ║
╚════════════════════════════════════════════════╝
  `);
});
