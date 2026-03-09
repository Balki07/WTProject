const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./database');
const { startAIService } = require('./ai-service');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '.'))); // Serve current dir static files
app.use(session({
    secret: 'secret-key-villupuram-portal',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour
}));

// AI Service
startAIService();

// --- Auth Routes ---

app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function (err) {
        if (err) return res.status(400).json({ error: 'Username already exists' });
        res.json({ message: 'User registered successfully' });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        req.session.user = { id: user.id, username: user.username, role: user.role };
        res.json({ message: 'Login successful', user: req.session.user });
    });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// --- News Routes ---

// Get Public News (Approved only)
app.get('/api/news/public', (req, res) => {
    const { category, search } = req.query;
    let query = `SELECT * FROM news WHERE status = 'approved'`;
    let params = [];

    if (category && category !== 'all') {
        query += ` AND category = ?`;
        params.push(category);
    }
    if (search) {
        query += ` AND (title LIKE ? OR content LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY timestamp DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get Admin News (All / Pending)
app.get('/api/news/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { status } = req.query;
    let query = `SELECT * FROM news`;
    let params = [];

    if (status) {
        query += ` WHERE status = ?`;
        params.push(status);
    }

    query += ` ORDER BY timestamp DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update News Status (Approve/Reject)
app.put('/api/news/:id/status', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { status, content, title } = req.body; // Allow editing content too
    const { id } = req.params;

    // Status update only
    if (status && !content) {
        db.run(`UPDATE news SET status = ? WHERE id = ?`, [status, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: `News status updated to ${status}` });
        });
    }
    // Full update (Edit)
    else {
        db.run(`UPDATE news SET status = ?, title = ?, content = ? WHERE id = ?`,
            [status || 'approved', title, content, id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'News updated and saved' });
            });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
