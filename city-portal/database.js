const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Connect to SQLite database
const db = new sqlite3.Database('./city-portal.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user'
        )`);

        // News Table
        db.run(`CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            status TEXT DEFAULT 'pending',
            category TEXT,
            source TEXT,
            ai_summary TEXT,
            importance TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Admin User if not exists
        const adminUsername = 'admin';
        const adminPassword = 'adminpassword123'; // In production, use env vars
        const role = 'admin';

        db.get(`SELECT * FROM users WHERE username = ?`, [adminUsername], (err, row) => {
            if (!row) {
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync(adminPassword, salt);
                db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
                    [adminUsername, hash, role],
                    (err) => {
                        if (err) console.error(err.message);
                        else console.log('Admin user created.');
                    }
                );
            }
        });
    });
}

module.exports = db;
