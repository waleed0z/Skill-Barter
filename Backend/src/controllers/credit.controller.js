<<<<<<< HEAD
const { db } = require('../config/db');

const getBalance = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = 'SELECT time_credits AS balance FROM users WHERE id = ?';
        db.get(query, [userId], (err, row) => {
            if (err) {
                console.error('Get balance error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (!row) {
                return res.status(404).json({ message: 'User not found' });
            }

            const balance = row.balance;
            res.json({ balance });
        });
=======
const { getDb } = require('../config/db');
const { randomUUID } = require('crypto');

const getBalance = async (req, res) => {
    const userId = req.user.id;
    const db = getDb();
    try {
        const row = await db.get(`SELECT timeCredits AS balance FROM users WHERE id = ?`, userId);
        if (!row) return res.status(404).json({ message: 'User not found' });
        res.json({ balance: row.balance });
>>>>>>> 47edef2aa75b60229a33724a191985c3eef2b901
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getHistory = async (req, res) => {
    const userId = req.user.id;
<<<<<<< HEAD
    try {
        // Find transactions where user was sender or receiver
        const query = `
            SELECT 
                t.id,
                t.amount,
                t.date,
                CASE 
                    WHEN t.sender_id = ? THEN 'SENT' 
                    ELSE 'RECEIVED' 
                END AS type,
                u.name AS other_party
            FROM transactions t
            JOIN users u ON 
                CASE 
                    WHEN t.sender_id = ? THEN u.id = t.receiver_id
                    ELSE u.id = t.sender_id
                END
            WHERE t.sender_id = ? OR t.receiver_id = ?
            ORDER BY t.date DESC
        `;
        
        db.all(query, [userId, userId, userId, userId], (err, rows) => {
            if (err) {
                console.error('Get history error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            const history = rows.map(row => ({
                id: row.id,
                amount: row.amount,
                date: row.date,
                type: row.type,
                otherParty: row.other_party
            }));

            res.json(history);
        });
=======
    const db = getDb();
    try {
        const rows = await db.all(`SELECT * FROM (
            SELECT t.id, t.amount, t.date, 'SENT' AS type, u2.name AS otherParty
            FROM transactions t JOIN users u2 ON t.receiver_id = u2.id
            WHERE t.sender_id = ?
            UNION ALL
            SELECT t.id, t.amount, t.date, 'RECEIVED' AS type, u1.name AS otherParty
            FROM transactions t JOIN users u1 ON t.sender_id = u1.id
            WHERE t.receiver_id = ?
        ) ORDER BY date DESC`, userId, userId);

        res.json(rows);
>>>>>>> 47edef2aa75b60229a33724a191985c3eef2b901
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Internal function to transfer credits (can be exposed via API if needed)
const transferCredits = async (senderId, receiverEmail, amount) => {
<<<<<<< HEAD
    return new Promise(async (resolve, reject) => {
        // Begin transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            try {
                // Check sender balance
                const senderQuery = 'SELECT time_credits AS balance FROM users WHERE id = ?';
                db.get(senderQuery, [senderId], (err, senderRow) => {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(new Error('Error checking sender balance'));
                        return;
                    }
                    
                    if (!senderRow) {
                        db.run('ROLLBACK');
                        reject(new Error('Sender not found'));
                        return;
                    }
                    
                    const balance = senderRow.balance;
                    if (balance < amount) {
                        db.run('ROLLBACK');
                        reject(new Error('Insufficient credits'));
                        return;
                    }
                    
                    // Get receiver ID
                    const receiverQuery = 'SELECT id FROM users WHERE email = ?';
                    db.get(receiverQuery, [receiverEmail], (err, receiverRow) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(new Error('Error finding receiver'));
                            return;
                        }
                        
                        if (!receiverRow) {
                            db.run('ROLLBACK');
                            reject(new Error('Receiver not found'));
                            return;
                        }
                        
                        const receiverId = receiverRow.id;
                        const transactionId = require('uuid').v4();
                        
                        // Update sender balance
                        const updateSenderQuery = 'UPDATE users SET time_credits = time_credits - ? WHERE id = ?';
                        db.run(updateSenderQuery, [amount, senderId], function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                reject(new Error('Error updating sender balance'));
                                return;
                            }
                            
                            // Update receiver balance
                            const updateReceiverQuery = 'UPDATE users SET time_credits = time_credits + ? WHERE id = ?';
                            db.run(updateReceiverQuery, [amount, receiverId], function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(new Error('Error updating receiver balance'));
                                    return;
                                }
                                
                                // Insert transaction record
                                const insertTransactionQuery = `
                                    INSERT INTO transactions (id, sender_id, receiver_id, amount, date)
                                    VALUES (?, ?, ?, ?, datetime('now'))
                                `;
                                db.run(insertTransactionQuery, [transactionId, senderId, receiverId, amount], function(err) {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        reject(new Error('Error recording transaction'));
                                        return;
                                    }
                                    
                                    // Commit transaction
                                    db.run('COMMIT', (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            reject(new Error('Error committing transaction'));
                                            return;
                                        }
                                        
                                        resolve({ success: true });
                                    });
                                });
                            });
                        });
                    });
                });
            } catch (error) {
                db.run('ROLLBACK');
                reject(error);
            }
        });
    });
=======
    const db = getDb();
    try {
        await db.run('BEGIN TRANSACTION');

        const sender = await db.get(`SELECT timeCredits FROM users WHERE id = ?`, senderId);
        if (!sender) throw new Error('Sender not found');
        if (sender.timeCredits < amount) throw new Error('Insufficient credits');

        const receiver = await db.get(`SELECT id FROM users WHERE email = ?`, receiverEmail);
        if (!receiver) throw new Error('Receiver not found');

        await db.run(`UPDATE users SET timeCredits = timeCredits - ? WHERE id = ?`, amount, senderId);
        await db.run(`UPDATE users SET timeCredits = timeCredits + ? WHERE id = ?`, amount, receiver.id);

        const txId = randomUUID();
        const date = new Date().toISOString();
        await db.run(`INSERT INTO transactions (id, amount, date, sender_id, receiver_id) VALUES (?, ?, ?, ?, ?)`, txId, amount, date, senderId, receiver.id);

        await db.run('COMMIT');
        return { success: true };
    } catch (error) {
        await db.run('ROLLBACK');
        throw error;
    }
>>>>>>> 47edef2aa75b60229a33724a191985c3eef2b901
};

module.exports = { getBalance, getHistory, transferCredits };