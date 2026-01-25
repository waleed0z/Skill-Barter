const { driver } = require('../config/db');

const getBalance = async (req, res) => {
    const userId = req.user.id;
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {id: $userId}) RETURN u.timeCredits AS balance`,
            { userId }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const balance = result.records[0].get('balance').toNumber();
        res.json({ balance });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        await session.close();
    }
};

const getHistory = async (req, res) => {
    const userId = req.user.id;
    const session = driver.session();
    try {
        // Find transactions where user was sender or receiver
        const result = await session.run(
            `
            MATCH (u:User {id: $userId})
            OPTIONAL MATCH (u)-[:SENT]->(t:Transaction)-[:TO]->(receiver:User)
            RETURN t, 'SENT' AS type, receiver.name AS otherParty
            UNION
            MATCH (u:User {id: $userId})<-[:TO]-(t:Transaction)<-[:SENT]-(sender:User)
            RETURN t, 'RECEIVED' AS type, sender.name AS otherParty
            ORDER BY t.date DESC
            `,
            { userId }
        );

        const history = result.records.map(record => {
            const t = record.get('t')?.properties;
            if (!t) return null;
            return {
                id: t.id,
                amount: t.amount.toNumber(),
                date: t.date,
                type: record.get('type'),
                otherParty: record.get('otherParty')
            };
        }).filter(item => item !== null);

        res.json(history);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        await session.close();
    }
};

// Internal function to transfer credits (can be exposed via API if needed)
const transferCredits = async (senderId, receiverEmail, amount) => {
    const session = driver.session();
    const tx = session.beginTransaction();
    try {
        // Check sender balance
        const senderRes = await tx.run(
            `MATCH (u:User {id: $senderId}) RETURN u.timeCredits AS balance`,
            { senderId }
        );
        if (senderRes.records.length === 0) throw new Error('Sender not found');

        const balance = senderRes.records[0].get('balance').toNumber();
        if (balance < amount) throw new Error('Insufficient credits');

        // Check receiver
        const receiverRes = await tx.run(
            `MATCH (u:User {email: $receiverEmail}) RETURN u`,
            { receiverEmail }
        );
        if (receiverRes.records.length === 0) throw new Error('Receiver not found');

        // Perform Transfer
        await tx.run(
            `
            MATCH (sender:User {id: $senderId})
            MATCH (receiver:User {email: $receiverEmail})
            CREATE (t:Transaction {id: randomUUID(), amount: $amount, date: datetime()})
            CREATE (sender)-[:SENT]->(t)-[:TO]->(receiver)
            SET sender.timeCredits = sender.timeCredits - $amount
            SET receiver.timeCredits = receiver.timeCredits + $amount
            `,
            { senderId, receiverEmail, amount }
        );

        await tx.commit();
        return { success: true };
    } catch (error) {
        await tx.rollback();
        throw error;
    } finally {
        await session.close();
    }
};

module.exports = { getBalance, getHistory, transferCredits };
