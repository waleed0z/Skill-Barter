const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Get user's sessions
const getUserSessions = async (req, res) => {
    const userId = req.user.id;
    const { role } = req.query; // 'student', 'teacher', or undefined for both

    try {
        let query, params;
        if (role === 'student') {
            query = `
                SELECT s.*, st.name as student_name, t.name as teacher_name, sk.name as skill_name, s.skill_id
                FROM sessions s
                JOIN users st ON s.student_id = st.id
                JOIN users t ON s.teacher_id = t.id
                JOIN skills sk ON s.skill_id = sk.id
                WHERE s.student_id = ?
                ORDER BY s.scheduled_time DESC
            `;
            params = [userId];
        } else if (role === 'teacher') {
            query = `
                SELECT s.*, st.name as student_name, t.name as teacher_name, sk.name as skill_name, s.skill_id
                FROM sessions s
                JOIN users st ON s.student_id = st.id
                JOIN users t ON s.teacher_id = t.id
                JOIN skills sk ON s.skill_id = sk.id
                WHERE s.teacher_id = ?
                ORDER BY s.scheduled_time DESC
            `;
            params = [userId];
        } else {
            query = `
                SELECT s.*, st.name as student_name, t.name as teacher_name, sk.name as skill_name, s.skill_id
                FROM sessions s
                JOIN users st ON s.student_id = st.id
                JOIN users t ON s.teacher_id = t.id
                JOIN skills sk ON s.skill_id = sk.id
                WHERE s.student_id = ? OR s.teacher_id = ?
                ORDER BY s.scheduled_time DESC
            `;
            params = [userId, userId];
        }

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Get sessions error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            res.json(rows);
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Schedule a new session
const scheduleSession = async (req, res) => {
    const studentId = req.user.id;
    const { teacherId, skillId, scheduledTime, duration } = req.body;

    // Validate inputs
    if (!teacherId || !skillId || !scheduledTime || !duration) {
        return res.status(400).json({ message: 'Teacher ID, skill ID, scheduled time, and duration are required' });
    }

    try {
        // Generate a unique ID for the session
        const sessionId = uuidv4();

        // Generate a unique Jitsi room name based on session ID
        const jitsiRoom = `skillbarter_${sessionId.replace(/-/g, '')}`;

        const query = `
            INSERT INTO sessions (id, student_id, teacher_id, skill_id, scheduled_time, duration, jitsi_room)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(query, [sessionId, studentId, teacherId, skillId, scheduledTime, duration, jitsiRoom], function(err) {
            if (err) {
                console.error('Schedule session error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            // Update credit balance - student pays teacher
            // For now, we'll just record the transaction without changing balances
            // In a real system, you would deduct credits from student and add to teacher

            res.json({
                message: 'Session scheduled successfully',
                sessionId: this.lastID,
                jitsiRoom: jitsiRoom
            });
        });
    } catch (error) {
        console.error('Schedule session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update session status
const updateSessionStatus = async (req, res) => {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'completed', 'cancelled', 'missed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        // Check if user is involved in this session (either as student or teacher)
        const checkQuery = 'SELECT student_id, teacher_id FROM sessions WHERE id = ?';
        db.get(checkQuery, [sessionId], (err, session) => {
            if (err) {
                console.error('Update session status error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (!session || (session.student_id !== userId && session.teacher_id !== userId)) {
                return res.status(403).json({ message: 'Not authorized to update this session' });
            }

            const updateQuery = 'UPDATE sessions SET status = ? WHERE id = ?';
            db.run(updateQuery, [status, sessionId], function(err) {
                if (err) {
                    console.error('Update session status error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Session not found' });
                }
                res.json({ message: 'Session status updated successfully' });
            });
        });
    } catch (error) {
        console.error('Update session status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Join a session via Jitsi
const joinSession = async (req, res) => {
    const userId = req.user.id;
    const { sessionId } = req.params;

    try {
        // Check if user is part of this session
        const sessionQuery = 'SELECT student_id, teacher_id, jitsi_room FROM sessions WHERE id = ?';
        db.get(sessionQuery, [sessionId], (err, session) => {
            if (err) {
                console.error('Join session error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }

            if (session.student_id !== userId && session.teacher_id !== userId) {
                return res.status(403).json({ message: 'Not authorized to join this session' });
            }

            if (!session.jitsi_room) {
                return res.status(404).json({ message: 'Jitsi room not available for this session' });
            }

            // Return the Jitsi room information
            res.json({
                jitsiRoom: session.jitsi_room,
                sessionId: sessionId
            });
        });
    } catch (error) {
        console.error('Join session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getUserSessions,
    scheduleSession,
    updateSessionStatus,
    joinSession
};