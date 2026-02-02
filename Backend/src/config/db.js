<<<<<<< HEAD
const { db, createTables } = require('./db.sqlite');

// Verify connection by running a simple query
const verifyConnection = async () => {
    // First, create the tables if they don't exist
    await createTables();

    return new Promise((resolve, reject) => {
        // Test the connection by running a simple query
        db.get('SELECT 1 as test', (err, row) => {
            if (err) {
                console.error('SQLite connection failed:', err);
                reject(err);
            } else {
                console.log('Connected to SQLite database');
                resolve(row);
            }
        });
    });
};

module.exports = { db, verifyConnection };
=======
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

const dbFile = process.env.SQLITE_FILE || path.resolve(__dirname, '../../data/db.sqlite');
let db;

const initDb = async () => {
    db = await open({ filename: dbFile, driver: sqlite3.Database });
    await db.exec(`PRAGMA foreign_keys = ON;`);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            timeCredits INTEGER DEFAULT 0,
            createdAt TEXT,
            isVerified INTEGER DEFAULT 0,
            otp TEXT,
            otpExpires TEXT,
            resetPasswordToken TEXT,
            resetPasswordExpires TEXT
        );
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            skill_id INTEGER NOT NULL,
            relation_type TEXT NOT NULL,
            UNIQUE(user_id, skill_id, relation_type),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            amount INTEGER NOT NULL,
            date TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            FOREIGN KEY(sender_id) REFERENCES users(id),
            FOREIGN KEY(receiver_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
    `);
    console.log('SQLite DB initialized at', dbFile);
};

const getDb = () => {
    if (!db) throw new Error('Database not initialized. Call initDb first.');
    return db;
};

const verifyConnection = async () => {
    if (!db) await initDb();
};

module.exports = { initDb, getDb, verifyConnection };
>>>>>>> 47edef2aa75b60229a33724a191985c3eef2b901
