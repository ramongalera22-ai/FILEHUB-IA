require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Files (Storage)
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'FILEBASE 2.0 NASH' });
});

// Serve Frontend (Production/Docker mode)
// In Docker, we will copy the built 'dist' folder to 'public'
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'public')));
    app.use((req, res, next) => {
        // Only serve index.html if it's not an API or Auth route
        if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`🚀 FILEBASE 2.0 NASH Server running on port ${PORT}`);
    console.log(`📂 Data Directory: ${process.env.DATA_DIR || 'local'}`);
});
