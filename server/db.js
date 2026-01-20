const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'filebase.db');
const db = new Database(dbPath);

// Initialize Tables
// Users Table
db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Documents Table (Firestore Replacement)
db.exec(`CREATE TABLE IF NOT EXISTS documents (
    collection_name TEXT,
    doc_id TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_name, doc_id)
)`);

// Files Table (Storage Replacement)
db.exec(`CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT,
    original_name TEXT,
    mime_type TEXT,
    size INTEGER,
    path TEXT,
    url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Add better-sqlite3 compatibility layer for existing code if needed
// The current code might expect db.run, db.get, db.all with callbacks
// Let's check how db is used in other files.

module.exports = db;
