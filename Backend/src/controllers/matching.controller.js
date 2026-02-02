const { db } = require('../config/db');

// Find matches based on skills
const findMatches = async (req, res) => {
    const userId = req.user.id;
    const { skillId, skillName } = req.query;

    try {
        // If skillName is provided, find the skill ID
        let targetSkillId = skillId;
        if (skillName && !targetSkillId) {
            const skillQuery = 'SELECT id FROM skills WHERE LOWER(name) = LOWER(?)';
            db.get(skillQuery, [skillName], (err, skillRow) => {
                if (err) {
                    console.error('Find matches error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }

                if (!skillRow) {
                    return res.status(404).json({ message: 'Skill not found' });
                }

                targetSkillId = skillRow.id;
                findMatchingUsers(userId, targetSkillId, res);
            });
        } else {
            findMatchingUsers(userId, targetSkillId, res);
        }
    } catch (error) {
        console.error('Find matches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Helper function to find matching users
function findMatchingUsers(userId, skillId, res) {
    if (!skillId) {
        return res.status(400).json({ message: 'Skill ID or skill name is required' });
    }

    // Find users who teach the skill we want to learn
    const query = `
        SELECT DISTINCT u.id, u.name, u.email,
               s.id as skill_id,
               s.name as skill_name,
               (SELECT AVG(r.rating) FROM ratings r WHERE r.ratee_id = u.id) as avg_rating,
               (SELECT COUNT(*) FROM ratings r WHERE r.ratee_id = u.id) as total_ratings
        FROM users u
        JOIN user_skills us ON u.id = us.user_id
        JOIN skills s ON us.skill_id = s.id
        LEFT JOIN ratings r ON u.id = r.ratee_id
        WHERE us.skill_type = 'TEACH' AND us.skill_id = ?
          AND u.id != ?
        GROUP BY u.id, s.name
        ORDER BY avg_rating DESC, total_ratings DESC
    `;

    db.all(query, [skillId, userId], (err, rows) => {
        if (err) {
            console.error('Find matches error:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        res.json(rows);
    });
}

// Find potential mutual exchanges
const findMutualExchanges = async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Get skills the user wants to learn
        const learnerSkillsQuery = `
            SELECT s.id, s.name
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.id
            WHERE us.user_id = ? AND us.skill_type = 'LEARN'
        `;
        
        db.all(learnerSkillsQuery, [userId], (err, learnerSkills) => {
            if (err) {
                console.error('Find mutual exchanges error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            
            // Get skills the user teaches
            const teacherSkillsQuery = `
                SELECT s.id, s.name
                FROM user_skills us
                JOIN skills s ON us.skill_id = s.id
                WHERE us.user_id = ? AND us.skill_type = 'TEACH'
            `;
            
            db.all(teacherSkillsQuery, [userId], (err, teacherSkills) => {
                if (err) {
                    console.error('Find mutual exchanges error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }
                
                // Find users who want to learn what we teach AND teach what we want to learn
                if (learnerSkills.length > 0 && teacherSkills.length > 0) {
                    // Create placeholders for the IN clauses
                    const learnerPlaceholders = learnerSkills.map(() => '?').join(',');
                    const teacherPlaceholders = teacherSkills.map(() => '?').join(',');

                    const mutualQuery = `
                        SELECT DISTINCT u.id, u.name, u.email,
                               (SELECT GROUP_CONCAT(st.name, ', ')
                                FROM user_skills ust2
                                JOIN skills st ON ust2.skill_id = st.id
                                WHERE ust2.user_id = u.id AND ust2.skill_type = 'TEACH') as teaches,
                               (SELECT GROUP_CONCAT(sl.name, ', ')
                                FROM user_skills usl2
                                JOIN skills sl ON usl2.skill_id = sl.id
                                WHERE usl2.user_id = u.id AND usl2.skill_type = 'LEARN') as wants_to_learn,
                               (SELECT AVG(r.rating) FROM ratings r WHERE r.ratee_id = u.id) as avg_rating
                        FROM users u
                        JOIN user_skills ust ON u.id = ust.user_id
                        JOIN skills st ON ust.skill_id = st.id
                        JOIN user_skills usl ON u.id = usl.user_id
                        JOIN skills sl ON usl.skill_id = sl.id
                        LEFT JOIN ratings r ON u.id = r.ratee_id
                        WHERE ust.skill_type = 'TEACH' AND ust.skill_id IN (${learnerPlaceholders})
                          AND usl.skill_type = 'LEARN' AND usl.skill_id IN (${teacherPlaceholders})
                          AND u.id != ?
                        GROUP BY u.id
                        ORDER BY avg_rating DESC
                    `;

                    // Combine all the parameters
                    const allParams = [
                        ...learnerSkills.map(s => s.id),
                        ...teacherSkills.map(s => s.id),
                        userId
                    ];

                    db.all(mutualQuery, allParams, (err, rows) => {
                        if (err) {
                            console.error('Find mutual exchanges error:', err);
                            return res.status(500).json({ message: 'Server error' });
                        }
                        res.json(rows);
                    });
                } else {
                    res.json([]);
                }
            });
        });
    } catch (error) {
        console.error('Find mutual exchanges error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    findMatches,
    findMutualExchanges
};