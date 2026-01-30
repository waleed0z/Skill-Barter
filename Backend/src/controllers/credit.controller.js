const { getDb } = require('../config/db');
const { randomUUID } = require('crypto');

const getBalance = async (req, res) => {
    const userId = req.user.id;
    const db = getDb();
    try {
        const row = await db.get(`SELECT timeCredits AS balance FROM users WHERE id = ?`, userId);
        if (!row) return res.status(404).json({ message: 'User not found' });
        res.json({ balance: row.balance });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getHistory = async (req, res) => {
    const userId = req.user.id;
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
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Internal function to transfer credits (can be exposed via API if needed)
const transferCredits = async (senderId, receiverEmail, amount) => {
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
};

module.exports = { getBalance, getHistory, transferCredits };
