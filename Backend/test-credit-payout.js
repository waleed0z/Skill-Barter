const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const dbPath = path.join(__dirname, 'src', 'database.sqlite');

if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found at ${dbPath}`);
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

// Test function
async function testCreditPayout() {
    return new Promise((resolve) => {
        // 1. Create two test users
        const student_id = uuid();
        const teacher_id = uuid();
        const session_id = uuid();
        
        console.log('Creating test users...');
        console.log(`Student ID: ${student_id}`);
        console.log(`Teacher ID: ${teacher_id}`);
        
        // Insert student with 10 credits
        db.run(
            `INSERT OR REPLACE INTO users (id, name, email, password, time_credits, is_verified) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [student_id, 'Test Student', `student${Date.now()}@test.com`, 'pwd', 10, 1],
            (err) => {
                if (err) {
                    console.error('Error creating student:', err);
                    return resolve();
                }
                
                // Insert teacher with 0 credits
                db.run(
                    `INSERT OR REPLACE INTO users (id, name, email, password, time_credits, is_verified) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [teacher_id, 'Test Teacher', `teacher${Date.now()}@test.com`, 'pwd', 0, 1],
                    (err) => {
                        if (err) {
                            console.error('Error creating teacher:', err);
                            return resolve();
                        }
                        
                        // Insert session (skill_id can reference existing skill)
                        db.run(
                            `INSERT OR REPLACE INTO sessions 
                             (id, student_id, teacher_id, skill_id, scheduled_time, duration, jitsi_room, credit_amount, status) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [session_id, student_id, teacher_id, 1, '2025-01-01 10:00', 30, 'test_room', 1, 'scheduled'],
                            (err) => {
                                if (err) {
                                    console.error('Error creating session:', err);
                                    return resolve();
                                }
                                
                                console.log('\nInitial state:');
                                checkBalances(student_id, teacher_id, () => {
                                    // Now simulate the payout
                                    console.log('\nSimulating payout (1 credit from student to teacher)...');
                                    performPayout(student_id, teacher_id, 1, () => {
                                        console.log('\nFinal state:');
                                        checkBalances(student_id, teacher_id, resolve);
                                    });
                                });
                            }
                        );
                    }
                );
            }
        );
    });
}

function checkBalances(student_id, teacher_id, callback) {
    db.get(
        `SELECT id, name, time_credits FROM users WHERE id = ?`,
        [student_id],
        (err, student) => {
            if (err) {
                console.error('Error fetching student:', err);
                return callback();
            }
            
            db.get(
                `SELECT id, name, time_credits FROM users WHERE id = ?`,
                [teacher_id],
                (err, teacher) => {
                    if (err) {
                        console.error('Error fetching teacher:', err);
                        return callback();
                    }
                    
                    console.log(`Student (${student.name}): ${student.time_credits} credits`);
                    console.log(`Teacher (${teacher.name}): ${teacher.time_credits} credits`);
                    callback();
                }
            );
        }
    );
}

function performPayout(student_id, teacher_id, amount, callback) {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('UPDATE users SET time_credits = time_credits - ? WHERE id = ?', [amount, student_id], function(err) {
            if (err) {
                console.error('Error deducting student credits:', err);
                db.run('ROLLBACK');
                return callback();
            }
            console.log('Deducted ' + amount + ' from student');
            
            db.run('UPDATE users SET time_credits = time_credits + ? WHERE id = ?', [amount, teacher_id], function(err) {
                if (err) {
                    console.error('Error adding teacher credits:', err);
                    db.run('ROLLBACK');
                    return callback();
                }
                console.log('Added ' + amount + ' to teacher');
                
                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('Error committing transaction:', err);
                    } else {
                        console.log('Transaction committed successfully');
                    }
                    callback();
                });
            });
        });
    });
}

testCreditPayout().then(() => {
    console.log('\nTest completed');
    db.close();
    process.exit(0);
});
