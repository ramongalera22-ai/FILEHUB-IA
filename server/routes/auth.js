const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'nash-secret-key-change-me';

// Register
router.post('/register', (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const hashedPassword = bcrypt.hashSync(password, 8);
        const userId = uuidv4();

        db.prepare(`INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)`).run(userId, email, hashedPassword, name || 'User');

        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: userId, email, name: name || 'User' } });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    try {
        const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ token: null, error: 'Invalid Password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Validate Token (Session Check)
router.get('/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Malformed token' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Failed to authenticate token' });

        try {
            const user = db.prepare(`SELECT id, email, name FROM users WHERE id = ?`).get(decoded.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json({ user });
        } catch (dbErr) {
            return res.status(500).json({ error: dbErr.message });
        }
    });
});

module.exports = router;
