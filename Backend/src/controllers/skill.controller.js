const { db } = require('../config/db');

const searchSkills = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

<<<<<<< HEAD
    try {
        const query = `
            SELECT name
            FROM skills
            WHERE LOWER(name) LIKE LOWER(?)
            LIMIT 10
        `;
        const searchTerm = `%${q}%`;

        db.all(query, [searchTerm], (err, rows) => {
            if (err) {
                console.error('Search skills error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            const skills = rows.map(row => row.name);
            res.json(skills);
        });
    } catch (error) {
        console.error('Search skills error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addSkill = async (req, res) => {
    const { name, type } = req.body;
    const userId = req.user.id;

    // Normalize skill name: capitalize first letter of each word
    const normalizedName = name.trim().replace(/\w\S*/g, (w) => 
        w.replace(/^\w/, (c) => c.toUpperCase())
    );

    try {
        db.serialize(() => {
            // First, ensure the skill exists in the skills table
            const skillInsertQuery = 'INSERT OR IGNORE INTO skills (name) VALUES (?)';
            db.run(skillInsertQuery, [normalizedName], function(err) {
                if (err) {
                    console.error('Error inserting skill:', err);
                    return res.status(500).json({ message: 'Server error' });
                }

                // Get the skill ID
                const skillSelectQuery = 'SELECT id FROM skills WHERE name = ?';
                db.get(skillSelectQuery, [normalizedName], (err, skillRow) => {
                    if (err) {
                        console.error('Error selecting skill:', err);
                        return res.status(500).json({ message: 'Server error' });
                    }

                    if (!skillRow) {
                        return res.status(500).json({ message: 'Skill not found after insertion' });
                    }

                    const skillId = skillRow.id;

                    // Insert the user-skill relationship
                    const relationQuery = `
                        INSERT OR REPLACE INTO user_skills (user_id, skill_id, skill_type)
                        VALUES (?, ?, ?)
                    `;
                    
                    db.run(relationQuery, [userId, skillId, type], function(err) {
                        if (err) {
                            console.error('Error adding skill to user:', err);
                            return res.status(500).json({ message: 'Server error' });
                        }

                        res.status(201).json({ message: `Skill '${normalizedName}' added to ${type} list` });
                    });
                });
            });
        });
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
        // Get the skill ID first
        const skillQuery = 'SELECT id FROM skills WHERE LOWER(name) = LOWER(?)';
        db.get(skillQuery, [name], (err, skillRow) => {
            if (err) {
                console.error('Error finding skill:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (!skillRow) {
                return res.status(404).json({ message: 'Skill not found' });
            }

            const skillId = skillRow.id;

            // Remove the user-skill relationship
            const deleteQuery = `
                DELETE FROM user_skills 
                WHERE user_id = ? AND skill_id = ? AND skill_type = ?
            `;
            
            db.run(deleteQuery, [userId, skillId, type], function(err) {
                if (err) {
                    console.error('Remove skill error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Skill not found in user\'s list' });
                }

                res.json({ message: `Skill '${name}' removed` });
            });
        });
    } catch (error) {
        console.error('Remove skill error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUserSkills = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT s.name, us.skill_type
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.id
            WHERE us.user_id = ?
        `;

        db.all(query, [userId], (err, rows) => {
            if (err) {
                console.error('Get user skills error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            // Organize skills by type
            const teach = [];
            const learn = [];

            rows.forEach(row => {
                if (row.skill_type === 'TEACH') {
                    teach.push(row.name);
                } else if (row.skill_type === 'LEARN') {
                    learn.push(row.name);
                }
            });

            res.json({
                teach: [...new Set(teach)], // Remove duplicates
                learn: [...new Set(learn)]  // Remove duplicates
            });
        });
    } catch (error) {
        console.error('Get user skills error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { searchSkills, addSkill, removeSkill, getUserSkills };