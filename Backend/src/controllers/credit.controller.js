const { db } = require('../config/db');
const { randomUUID } = require('crypto');

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
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getHistory = (req, res) => {
    const userId = req.user.id;
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
};

// Internal function to transfer credits (can be exposed via API if needed)
// Now accepts receiverId (user id) rather than receiver email for efficiency
const transferCredits = async (senderId, receiverId, amount) => {
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

                    const targetReceiverId = receiverId;
                    // If receiverId is not provided or invalid, abort
                    if (!targetReceiverId) {
                        db.run('ROLLBACK');
                        reject(new Error('Receiver ID not provided'));
                        return;
                    }
                    
                    // Ensure receiver exists
                    const receiverCheck = 'SELECT id FROM users WHERE id = ?';
                    db.get(receiverCheck, [targetReceiverId], (err, receiverRow) => {
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
                        const transactionId = randomUUID();

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
                            db.run(updateReceiverQuery, [amount, targetReceiverId], function(err) {
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
                                db.run(insertTransactionQuery, [transactionId, senderId, targetReceiverId, amount], function(err) {
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
};

module.exports = { getBalance, getHistory, transferCredits };