const { driver } = require('../config/db');

const searchSkills = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (s:Skill)
             WHERE toLower(s.name) CONTAINS toLower($q)
             RETURN s.name AS name
             LIMIT 10`,
            { q }
        );
        const skills = result.records.map(record => record.get('name'));
        res.json(skills);
    } catch (error) {
        console.error('Search skills error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        await session.close();
    }
};

const addSkill = async (req, res) => {
    const { name, type } = req.body;
    const userId = req.user.id;
    const session = driver.session();

    // Normalize skill name: capitalize first letter of each word
    const normalizedName = name.trim().replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));

    try {
        const relationType = type === 'TEACH' ? 'TEACHES' : 'WANTS_TO_LEARN';

        // Merge Plugin pattern: Ensure Skill exists, then create relationship
        await session.run(
            `
            MATCH (u:User {id: $userId})
            MERGE (s:Skill {name: $name})
            MERGE (u)-[:${relationType}]->(s)
            RETURN s
            `,
            { userId, name: normalizedName }
        );

        res.status(201).json({ message: `Skill '${normalizedName}' added to ${type} list` });
    } catch (error) {
        console.error('Add skill error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        await session.close();
    }
};

const removeSkill = async (req, res) => {
    const { name } = req.params;
    const { type } = req.query;
    const userId = req.user.id;

    if (!type || !['TEACH', 'LEARN'].includes(type)) {
        return res.status(400).json({ message: 'Valid type (TEACH or LEARN) is required' });
    }

    const session = driver.session();
    try {
        const relationType = type === 'TEACH' ? 'TEACHES' : 'WANTS_TO_LEARN';

        await session.run(
            `
            MATCH (u:User {id: $userId})-[r:${relationType}]->(s:Skill {name: $name})
            DELETE r
            `,
            { userId, name }
        );

        res.json({ message: `Skill '${name}' removed` });
    } catch (error) {
        console.error('Remove skill error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        await session.close();
    }
};

const getUserSkills = async (req, res) => {
    const userId = req.user.id;
    const session = driver.session();
    try {
        const result = await session.run(
            `
            MATCH (u:User {id: $userId})
            OPTIONAL MATCH (u)-[:TEACHES]->(t:Skill)
            OPTIONAL MATCH (u)-[:WANTS_TO_LEARN]->(l:Skill)
            RETURN collect(DISTINCT t.name) AS teach, collect(DISTINCT l.name) AS learn
            `,
            { userId }
        );

        const record = result.records[0];
        res.json({
            teach: record.get('teach').filter(s => s !== null),
            learn: record.get('learn').filter(s => s !== null)
        });
    } catch (error) {
        console.error('Get user skills error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        await session.close();
    }
};

module.exports = { searchSkills, addSkill, removeSkill, getUserSkills };
