const { getDb } = require('../config/db');

const searchSkills = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    const db = getDb();
    try {
        const rows = await db.all(`SELECT name FROM skills WHERE LOWER(name) LIKE '%' || LOWER(?) || '%' LIMIT 10`, q);
        res.json(rows.map(r => r.name));
    } catch (error) {
        console.error('Search skills error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addSkill = async (req, res) => {
    const { name, type } = req.body;
    const userId = req.user.id;
    const db = getDb();

    // Normalize skill name: capitalize first letter of each word
    const normalizedName = name.trim().replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));

    try {
        const relationType = type === 'TEACH' ? 'TEACHES' : 'WANTS_TO_LEARN';

        // Ensure skill exists
        await db.run(`INSERT OR IGNORE INTO skills (name) VALUES (?)`, normalizedName);
        const skill = await db.get(`SELECT id FROM skills WHERE name = ?`, normalizedName);

        // Create relationship in join table
        await db.run(`INSERT OR IGNORE INTO user_skills (user_id, skill_id, relation_type) VALUES (?, ?, ?)`, userId, skill.id, relationType);

        res.status(201).json({ message: `Skill '${normalizedName}' added to ${type} list` });
    } catch (error) {
        console.error('Add skill error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const removeSkill = async (req, res) => {
    const { name } = req.params;
    const { type } = req.query;
    const userId = req.user.id;
    const db = getDb();

    if (!type || !['TEACH', 'LEARN'].includes(type)) {
        return res.status(400).json({ message: 'Valid type (TEACH or LEARN) is required' });
    }

    try {
        const relationType = type === 'TEACH' ? 'TEACHES' : 'WANTS_TO_LEARN';
        const skill = await db.get(`SELECT id FROM skills WHERE LOWER(name) = LOWER(?)`, name);
        if (!skill) return res.status(404).json({ message: 'Skill not found' });

        await db.run(`DELETE FROM user_skills WHERE user_id = ? AND skill_id = ? AND relation_type = ?`, userId, skill.id, relationType);

        res.json({ message: `Skill '${name}' removed` });
    } catch (error) {
        console.error('Remove skill error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUserSkills = async (req, res) => {
    const userId = req.user.id;
    const db = getDb();
    try {
        const teachRows = await db.all(`SELECT s.name FROM skills s JOIN user_skills us ON s.id = us.skill_id WHERE us.user_id = ? AND us.relation_type = 'TEACHES'`, userId);
        const learnRows = await db.all(`SELECT s.name FROM skills s JOIN user_skills us ON s.id = us.skill_id WHERE us.user_id = ? AND us.relation_type = 'WANTS_TO_LEARN'`, userId);

        res.json({
            teach: teachRows.map(r => r.name),
            learn: learnRows.map(r => r.name)
        });
    } catch (error) {
        console.error('Get user skills error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { searchSkills, addSkill, removeSkill, getUserSkills };
