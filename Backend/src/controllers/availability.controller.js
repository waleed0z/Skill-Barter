const { db } = require('../config/db');

// Get user's availability
const getUserAvailability = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT id, day_of_week, start_time, end_time, is_available
            FROM availability
            WHERE user_id = ?
            ORDER BY day_of_week, start_time
        `;
        db.all(query, [userId], (err, rows) => {
            if (err) {
                console.error('Get availability error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            res.json(rows);
        });
    } catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Set user's availability
const setUserAvailability = async (req, res) => {
    const userId = req.user.id;
    const { dayOfWeek, startTime, endTime } = req.body;

    // Validate inputs
    if (dayOfWeek < 0 || dayOfWeek > 6 || !startTime || !endTime) {
        return res.status(400).json({ message: 'Invalid input: dayOfWeek (0-6), startTime and endTime required' });
    }

    try {
        // Check if this availability slot already exists for this user
        const checkQuery = `
            SELECT id FROM availability
            WHERE user_id = ? AND day_of_week = ? AND start_time = ? AND end_time = ?
        `;

        db.get(checkQuery, [userId, dayOfWeek, startTime, endTime], (err, existingSlot) => {
            if (err) {
                console.error('Check availability error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (existingSlot) {
                // Slot already exists, just update availability to true
                const updateQuery = `
                    UPDATE availability
                    SET is_available = TRUE
                    WHERE id = ?
                `;
                db.run(updateQuery, [existingSlot.id], function(err) {
                    if (err) {
                        console.error('Update availability error:', err);
                        return res.status(500).json({ message: 'Server error' });
                    }
                    res.json({ message: 'Availability updated successfully', id: existingSlot.id });
                });
            } else {
                // Slot doesn't exist, create new one
                const insertQuery = `
                    INSERT INTO availability (user_id, day_of_week, start_time, end_time, is_available)
                    VALUES (?, ?, ?, ?, TRUE)
                `;
                db.run(insertQuery, [userId, dayOfWeek, startTime, endTime], function(err) {
                    if (err) {
                        console.error('Insert availability error:', err);
                        return res.status(500).json({ message: 'Server error' });
                    }
                    res.json({ message: 'Availability added successfully', id: this.lastID });
                });
            }
        });
    } catch (error) {
        console.error('Set availability error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Remove user's availability slot
const removeAvailability = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    
    try {
        const query = 'DELETE FROM availability WHERE user_id = ? AND id = ?';
        db.run(query, [userId, id], function(err) {
            if (err) {
                console.error('Remove availability error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Availability slot not found' });
            }
            res.json({ message: 'Availability slot removed successfully' });
        });
    } catch (error) {
        console.error('Remove availability error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Set availability as unavailable
const setUnavailable = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    
    try {
        const query = 'UPDATE availability SET is_available = FALSE WHERE user_id = ? AND id = ?';
        db.run(query, [userId, id], function(err) {
            if (err) {
                console.error('Set unavailable error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Availability slot not found' });
            }
            res.json({ message: 'Availability slot marked as unavailable' });
        });
    } catch (error) {
        console.error('Set unavailable error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getUserAvailability,
    setUserAvailability,
    removeAvailability,
    setUnavailable
};