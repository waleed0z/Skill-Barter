const { db } = require('../config/db');

// Get ratings for a user
const getUserRatings = async (req, res) => {
    const userId = req.user.id;
    const { direction } = req.query; // 'received' or 'given'
    
    try {
        let query, params;
        if (direction === 'given') {
            query = `
                SELECT r.*, s.scheduled_time as session_time, u.name as ratee_name, sk.name as skill_name
                FROM ratings r
                JOIN sessions s ON r.session_id = s.id
                JOIN users u ON r.ratee_id = u.id
                JOIN skills sk ON r.skill_id = sk.id
                WHERE r.rater_id = ?
                ORDER BY r.created_at DESC
            `;
            params = [userId];
        } else {
            // Default to 'received' - ratings about this user
            query = `
                SELECT r.*, s.scheduled_time as session_time, u.name as rater_name, sk.name as skill_name
                FROM ratings r
                JOIN sessions s ON r.session_id = s.id
                JOIN users u ON r.rater_id = u.id
                JOIN skills sk ON r.skill_id = sk.id
                WHERE r.ratee_id = ?
                ORDER BY r.created_at DESC
            `;
            params = [userId];
        }
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Get ratings error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            console.log('Ratings returned from DB:', rows); // Debug log
            res.json(rows);
        });
    } catch (error) {
        console.error('Get ratings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get average rating for a user
const getUserAverageRating = async (req, res) => {
    const userId = req.user.id;
    
    try {
        const query = `
            SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
            FROM ratings
            WHERE ratee_id = ?
        `;
        db.get(query, [userId], (err, row) => {
            if (err) {
                console.error('Get average rating error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            res.json({
                averageRating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(2) : 0,
                totalRatings: row.total_ratings || 0
            });
        });
    } catch (error) {
        console.error('Get average rating error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Submit a rating for a session
const submitRating = async (req, res) => {
    const raterId = req.user.id;
    const { sessionId, rateeId, skillId, rating, review } = req.body;

    // Validate inputs
    if (!sessionId || !rateeId || !skillId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Session ID, ratee ID, skill ID, and rating (1-5) are required' });
    }

    try {
        // Check if the session exists and if the rater participated in it
        const sessionQuery = 'SELECT student_id, teacher_id, status FROM sessions WHERE id = ?';
        db.get(sessionQuery, [sessionId], (err, session) => {
            if (err) {
                console.error('Submit rating error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }

            // Verify that the session is completed before allowing rating
            if (session.status !== 'completed') {
                return res.status(400).json({ message: 'Cannot rate a session that is not completed' });
            }

            // Verify that the rater was part of this session
            if ((raterId !== session.student_id && raterId !== session.teacher_id) ||
                (raterId === session.student_id && rateeId !== session.teacher_id) ||
                (raterId === session.teacher_id && rateeId !== session.student_id)) {
                return res.status(403).json({ message: 'Not authorized to rate this session' });
            }

            // Check if a rating already exists for this session and rater
            const checkRatingQuery = 'SELECT id FROM ratings WHERE session_id = ? AND rater_id = ?';
            db.get(checkRatingQuery, [sessionId, raterId], (err, existingRating) => {
                if (err) {
                    console.error('Check existing rating error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }

                if (existingRating) {
                    return res.status(400).json({ message: 'Rating already submitted for this session' });
                }

                // Insert the rating
                const insertQuery = `
                    INSERT INTO ratings (session_id, rater_id, ratee_id, skill_id, rating, review)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                db.run(insertQuery, [sessionId, raterId, rateeId, skillId, rating, review], function(err) {
                    if (err) {
                        console.error('Submit rating error:', err);
                        return res.status(500).json({ message: 'Server error' });
                    }
                    res.json({ message: 'Rating submitted successfully', id: this.lastID });
                });
            });
        });
    } catch (error) {
        console.error('Submit rating error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getUserRatings,
    getUserAverageRating,
    submitRating
};