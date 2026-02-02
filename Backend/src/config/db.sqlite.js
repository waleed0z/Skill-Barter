const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, '../database.sqlite');

// Create database file if it doesn't exist
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON;');

// Create tables function
function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                time_credits INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_verified BOOLEAN DEFAULT FALSE,
                otp TEXT,
                otp_expires DATETIME,
                reset_password_token TEXT,
                reset_password_expires DATETIME
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err);
                    reject(err);
                    return;
                }

                // Skills table
                db.run(`CREATE TABLE IF NOT EXISTS skills (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                )`, (err) => {
                    if (err) {
                        console.error('Error creating skills table:', err);
                        reject(err);
                        return;
                    }

                    // User skills junction table (for TEACH/WANT TO LEARN relationships)
                    db.run(`CREATE TABLE IF NOT EXISTS user_skills (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        skill_id INTEGER NOT NULL,
                        skill_type TEXT CHECK(skill_type IN ('TEACH', 'LEARN')) NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
                        UNIQUE(user_id, skill_id, skill_type)
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating user_skills table:', err);
                            reject(err);
                            return;
                        }

                        // Transactions table
                        db.run(`CREATE TABLE IF NOT EXISTS transactions (
                            id TEXT PRIMARY KEY,
                            sender_id TEXT NOT NULL,
                            receiver_id TEXT NOT NULL,
                            amount INTEGER NOT NULL,
                            date DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
                        )`, (err) => {
                            if (err) {
                                console.error('Error creating transactions table:', err);
                                reject(err);
                                return;
                            }

                            // Availability table
                            db.run(`CREATE TABLE IF NOT EXISTS availability (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                user_id TEXT NOT NULL,
                                day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
                                start_time TEXT NOT NULL, -- Format: HH:MM
                                end_time TEXT NOT NULL, -- Format: HH:MM
                                is_available BOOLEAN DEFAULT TRUE,
                                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                            )`, (err) => {
                                if (err) {
                                    console.error('Error creating availability table:', err);
                                    reject(err);
                                    return;
                                }

                                // Sessions table
                                db.run(`CREATE TABLE IF NOT EXISTS sessions (
                                    id TEXT PRIMARY KEY,
                                    student_id TEXT NOT NULL,
                                    teacher_id TEXT NOT NULL,
                                    skill_id INTEGER NOT NULL,
                                    scheduled_time DATETIME NOT NULL,
                                    duration INTEGER NOT NULL, -- Duration in minutes
                                    jitsi_room TEXT,
                                    status TEXT CHECK(status IN ('scheduled', 'completed', 'cancelled', 'missed')) DEFAULT 'scheduled',
                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                                    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                                    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
                                )`, (err) => {
                                    if (err) {
                                        console.error('Error creating sessions table:', err);
                                        reject(err);
                                        return;
                                    }

                                    // Ratings table
                                    db.run(`CREATE TABLE IF NOT EXISTS ratings (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        session_id TEXT NOT NULL,
                                        rater_id TEXT NOT NULL,
                                        ratee_id TEXT NOT NULL,
                                        skill_id INTEGER NOT NULL,
                                        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                                        review TEXT,
                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                                        FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
                                        FOREIGN KEY (ratee_id) REFERENCES users(id) ON DELETE CASCADE,
                                        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
                                        UNIQUE(session_id, rater_id)
                                    )`, (err) => {
                                        if (err) {
                                            console.error('Error creating ratings table:', err);
                                            reject(err);
                                            return;
                                        }

                                        // Invitations table
                                        db.run(`CREATE TABLE IF NOT EXISTS invitations (
                                            id TEXT PRIMARY KEY,
                                            sender_id TEXT NOT NULL,
                                            receiver_id TEXT NOT NULL,
                                            skill_id INTEGER NOT NULL,
                                            message TEXT,
                                            status TEXT CHECK(status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                            responded_at DATETIME,
                                            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                                            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
                                            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
                                        )`, (err) => {
                                            if (err) {
                                                console.error('Error creating invitations table:', err);
                                                reject(err);
                                                return;
                                            }

                                            console.log('Database tables created successfully');
                                            resolve();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

// Export the database and initialization function
module.exports = { db, createTables };