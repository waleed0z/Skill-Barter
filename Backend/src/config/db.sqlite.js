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
        const sql = `
        CREATE TABLE IF NOT EXISTS users (
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
        );

        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            is_course INTEGER DEFAULT 0,
            total_sessions INTEGER,
            payment_plan TEXT DEFAULT 'per_session'
        );

        CREATE TABLE IF NOT EXISTS user_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            skill_id INTEGER NOT NULL,
            skill_type TEXT CHECK(skill_type IN ('TEACH', 'LEARN')) NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
            UNIQUE(user_id, skill_id, skill_type)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            day_of_week INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            is_available BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            teacher_id TEXT NOT NULL,
            skill_id INTEGER NOT NULL,
            course_instance_id TEXT,
            sequence_number INTEGER DEFAULT 1,
            scheduled_time DATETIME NOT NULL,
            duration INTEGER NOT NULL,
            jitsi_room TEXT,
            credit_amount INTEGER DEFAULT 0,
            status TEXT CHECK(status IN ('scheduled', 'completed', 'cancelled', 'missed')) DEFAULT 'scheduled',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ratings (
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
        );

        CREATE TABLE IF NOT EXISTS invitations (
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
        );

        CREATE TABLE IF NOT EXISTS course_instances (
            id TEXT PRIMARY KEY,
            skill_id INTEGER NOT NULL,
            student_id TEXT NOT NULL,
            teacher_id TEXT NOT NULL,
            total_sessions INTEGER NOT NULL,
            completed_sessions INTEGER DEFAULT 0,
            payment_plan TEXT DEFAULT 'per_session',
            held_credits INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
        );
        `;

        db.exec(sql, (err) => {
            if (err) {
                console.error('Error creating database tables:', err);
                reject(err);
                return;
            }

            console.log('Database tables created successfully');
            // Ensure sessions table has held_credits column (for holding payments until completion)
            db.get("PRAGMA table_info(sessions)", (prErr, prRow) => {
                if (prErr) {
                    console.error('Error checking sessions table info:', prErr);
                    return resolve();
                }
                // Run pragma to get all columns and check presence
                db.all("PRAGMA table_info(sessions)", (err2, cols) => {
                    if (err2) {
                        console.error('Error reading sessions table info:', err2);
                        return resolve();
                    }
                    const hasHeld = cols && cols.some(c => c.name === 'held_credits');
                    if (!hasHeld) {
                        db.run('ALTER TABLE sessions ADD COLUMN held_credits INTEGER DEFAULT 0', (alterErr) => {
                            if (alterErr) console.error('Error adding held_credits to sessions:', alterErr);
                            else console.log('Added held_credits column to sessions table');
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        });
    });
}

// Export the database and initialization function
module.exports = { db, createTables };