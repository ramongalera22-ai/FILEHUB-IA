const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nash-secret-key-change-me';

// Middleware to verify Token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).send({ error: 'No token provided.' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).send({ error: 'Failed to authenticate token.' });
        req.userId = decoded.id;
        next();
    });
};

router.use(verifyToken);

// --- Data Routes (Mocking Firestore) ---

// Get User Data (Collection)
router.get('/data/:collection', (req, res) => {
    const collection = req.params.collection;
    try {
        const rows = db.prepare(`SELECT * FROM documents WHERE collection_name = ?`).all(collection);
        const docs = rows.map(row => JSON.parse(row.data));
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Set/Update Document
router.post('/data/:collection/:id', (req, res) => {
    const collection = req.params.collection;
    const id = req.params.id;
    const data = req.body;
    const dataStr = JSON.stringify({ ...data, id });

    try {
        db.prepare(`INSERT INTO documents (collection_name, doc_id, data, updated_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(collection_name, doc_id) 
        DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP`).run(collection, id, dataStr);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Document
router.delete('/data/:collection/:id', (req, res) => {
    const collection = req.params.collection;
    const id = req.params.id;

    try {
        db.prepare(`DELETE FROM documents WHERE collection_name = ? AND doc_id = ?`).run(collection, id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- File Storage Routes ---

// Configure Multer
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Upload File
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileId = uuidv4();
    const fileUrl = `/uploads/${req.file.filename}`;

    try {
        db.prepare(`INSERT INTO files (id, name, original_name, mime_type, size, path, url) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
            fileId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.file.path, fileUrl
        );
        res.json({
            id: fileId,
            name: req.file.originalname,
            url: fileUrl,
            size: req.file.size,
            type: req.file.mimetype
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List Files
router.get('/files', (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM files`).all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
