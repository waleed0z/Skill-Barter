const { db } = require('../config/db');
const { randomUUID } = require('crypto');

// Send an invitation to a user
const sendInvitation = async (req, res) => {
    const senderId = req.user.id;
    const { receiverId, skillId, message } = req.body;
    
    // Validate inputs
    if (!receiverId || !skillId) {
        return res.status(400).json({ message: 'Receiver ID and skill ID are required' });
    }
    
    try {
        // Check if the sender actually wants to learn this skill
        const skillCheckQuery = 'SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ? AND skill_type = "LEARN"';
        db.get(skillCheckQuery, [senderId, skillId], (err, skillRow) => {
            if (err) {
                console.error('Send invitation error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            
            if (!skillRow) {
                return res.status(400).json({ message: 'You must want to learn this skill to send an invitation' });
            }
            
            // Check if the receiver actually teaches this skill
            const receiverSkillCheckQuery = 'SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ? AND skill_type = "TEACH"';
            db.get(receiverSkillCheckQuery, [receiverId, skillId], (err, receiverSkillRow) => {
                if (err) {
                    console.error('Send invitation error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }
                
                if (!receiverSkillRow) {
                    return res.status(400).json({ message: 'The receiver does not teach this skill' });
                }
                
                // Check if an invitation already exists between these users for this skill
                const checkExistingQuery = 'SELECT id FROM invitations WHERE sender_id = ? AND receiver_id = ? AND skill_id = ? AND status = "pending"';
                db.get(checkExistingQuery, [senderId, receiverId, skillId], (err, existingInvite) => {
                    if (err) {
                        console.error('Send invitation error:', err);
                        return res.status(500).json({ message: 'Server error' });
                    }
                    
                    if (existingInvite) {
                        return res.status(400).json({ message: 'An invitation already exists for this skill' });
                    }
                    
                    // Create the invitation
                    const invitationId = randomUUID();
                    const insertQuery = `
                        INSERT INTO invitations (id, sender_id, receiver_id, skill_id, message, status)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    
                    db.run(insertQuery, [invitationId, senderId, receiverId, skillId, message || '', 'pending'], function(err) {
                        if (err) {
                            console.error('Send invitation error:', err);
                            return res.status(500).json({ message: 'Server error' });
                        }
                        
                        res.json({ 
                            message: 'Invitation sent successfully', 
                            invitationId: this.lastID 
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Send invitation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get user's invitations (sent/received)
const getUserInvitations = async (req, res) => {
    const userId = req.user.id;
    const { type } = req.query; // 'sent', 'received', or undefined for both
    
    try {
        let query, params;
        if (type === 'sent') {
            query = `
                SELECT i.*, s.name as skill_name, ur.name as receiver_name, us.name as sender_name
                FROM invitations i
                JOIN skills s ON i.skill_id = s.id
                JOIN users ur ON i.receiver_id = ur.id
                JOIN users us ON i.sender_id = us.id
                WHERE i.sender_id = ?
                ORDER BY i.created_at DESC
            `;
            params = [userId];
        } else if (type === 'received') {
            query = `
                SELECT i.*, s.name as skill_name, ur.name as receiver_name, us.name as sender_name
                FROM invitations i
                JOIN skills s ON i.skill_id = s.id
                JOIN users ur ON i.receiver_id = ur.id
                JOIN users us ON i.sender_id = us.id
                WHERE i.receiver_id = ?
                ORDER BY i.created_at DESC
            `;
            params = [userId];
        } else {
            query = `
                SELECT i.*, s.name as skill_name, ur.name as receiver_name, us.name as sender_name
                FROM invitations i
                JOIN skills s ON i.skill_id = s.id
                JOIN users ur ON i.receiver_id = ur.id
                JOIN users us ON i.sender_id = us.id
                WHERE i.sender_id = ? OR i.receiver_id = ?
                ORDER BY i.created_at DESC
            `;
            params = [userId, userId];
        }
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Get invitations error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            res.json(rows);
        });
    } catch (error) {
        console.error('Get invitations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Respond to an invitation (accept/decline)
const respondToInvitation = async (req, res) => {
    const userId = req.user.id;
    const { invitationId } = req.params;
    const { status } = req.body; // 'accepted' or 'declined'
    
    if (!['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ message: 'Status must be "accepted" or "declined"' });
    }
    
    try {
        // Check if the invitation exists and if the user is the receiver
        const checkQuery = 'SELECT sender_id, receiver_id, skill_id FROM invitations WHERE id = ? AND receiver_id = ? AND status = "pending"';
        db.get(checkQuery, [invitationId, userId], (err, invitation) => {
            if (err) {
                console.error('Respond to invitation error:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            
            if (!invitation) {
                return res.status(404).json({ message: 'Invitation not found or already responded to' });
            }
            
            // Update the invitation status
            const updateQuery = `
                UPDATE invitations 
                SET status = ?, responded_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            
            db.run(updateQuery, [status, invitationId], function(err) {
                if (err) {
                    console.error('Respond to invitation error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Invitation not found' });
                }
                
                // If accepted, create a session
                if (status === 'accepted') {
                    const sessionId = randomUUID();
                    const jitsiRoom = `skillbarter_${sessionId.replace(/-/g, '')}`;
                    
                    const sessionQuery = `
                        INSERT INTO sessions (id, student_id, teacher_id, skill_id, scheduled_time, duration, jitsi_room, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    // Default to tomorrow at 10 AM for 60 minutes if no specific time arranged
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(10, 0, 0, 0);
                    
                    db.run(sessionQuery, [
                        sessionId, 
                        invitation.sender_id,  // Student is the one who sent the invitation
                        invitation.receiver_id, // Teacher is the one who received and accepted
                        invitation.skill_id,
                        tomorrow.toISOString(), 
                        60, // 60 minutes
                        jitsiRoom,
                        'scheduled'
                    ], function(err) {
                        if (err) {
                            console.error('Create session from invitation error:', err);
                            // Still return success for the invitation response, but log the session error
                        }
                        
                        res.json({ message: `Invitation ${status} successfully` });
                    });
                } else {
                    res.json({ message: `Invitation ${status} successfully` });
                }
            });
        });
    } catch (error) {
        console.error('Respond to invitation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    sendInvitation,
    getUserInvitations,
    respondToInvitation
};