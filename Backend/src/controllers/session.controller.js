const { db } = require('../config/db');
const { randomUUID } = require('crypto');
const { transferCredits } = require('../controllers/credit.controller');

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
    const { teacherId, skillId, scheduledTime, duration, courseInstanceId, sequenceNumber } = req.body;

    // Validate inputs
    if (!teacherId || !skillId || !scheduledTime || !duration) {
        return res.status(400).json({ message: 'Teacher ID, skill ID, scheduled time, and duration are required' });
    }

    try {
        // Generate a unique ID for the session
        const sessionId = randomUUID();

        // Generate a unique Jitsi room name based on session ID
        const jitsiRoom = `skillbarter_${sessionId.replace(/-/g, '')}`;

        // Determine credit amount (example: 1 credit per 30 minutes)
        const creditAmount = Math.max(1, Math.ceil(duration / 30));

        // Optionally create a course instance if requested
        if (req.body.createCourse) {
            // read skill to get total_sessions and payment_plan
            const skillQuery = 'SELECT total_sessions, payment_plan FROM skills WHERE id = ?';
            db.get(skillQuery, [skillId], (err, skillRow) => {
                if (err) {
                    console.error('Error fetching skill for course creation:', err);
                    return res.status(500).json({ message: 'Server error' });
                }

                const totalSessionsForCourse = (skillRow && skillRow.total_sessions) ? skillRow.total_sessions : (req.body.totalSessions || 1);
                const paymentPlan = (skillRow && skillRow.payment_plan) ? skillRow.payment_plan : (req.body.paymentPlan || 'per_session');

                const courseId = randomUUID();
                const insertCi = `INSERT INTO course_instances (id, skill_id, student_id, teacher_id, total_sessions, payment_plan) VALUES (?, ?, ?, ?, ?, ?)`;
                db.run(insertCi, [courseId, skillId, studentId, teacherId, totalSessionsForCourse, paymentPlan], function(err) {
                    if (err) {
                        console.error('Error creating course instance:', err);
                        return res.status(500).json({ message: 'Server error' });
                    }

                    // Insert the session attached to this course instance (sequence_number default to 1)
                    const query = `
                        INSERT INTO sessions (id, student_id, teacher_id, skill_id, course_instance_id, sequence_number, scheduled_time, duration, jitsi_room, credit_amount)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    db.run(query, [sessionId, studentId, teacherId, skillId, courseId, 1, scheduledTime, duration, jitsiRoom, creditAmount], function(err) {
                        if (err) {
                            console.error('Schedule session error (course):', err);
                            return res.status(500).json({ message: 'Server error' });
                        }

                        res.json({
                            message: 'Course session scheduled successfully',
                            sessionId: sessionId,
                            jitsiRoom: jitsiRoom,
                            courseInstanceId: courseId,
                            creditAmount
                        });
                    });
                });
            });
            return;
        }

        // If a courseInstanceId is provided, attach to session. Otherwise keep null.
        const query = `
            INSERT INTO sessions (id, student_id, teacher_id, skill_id, course_instance_id, sequence_number, scheduled_time, duration, jitsi_room, credit_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(query, [sessionId, studentId, teacherId, skillId, courseInstanceId || null, sequenceNumber || 1, scheduledTime, duration, jitsiRoom, creditAmount], function(err) {
            if (err) {
                console.error('Schedule session error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            res.json({
                message: 'Session scheduled successfully',
                sessionId: sessionId,
                jitsiRoom: jitsiRoom,
                creditAmount
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

                // If marking completed, handle payouts for course or single session
                if (status === 'completed') {
                    console.log(`[PAYOUT] Session ${sessionId} marked as completed, initiating payout...`);
                    // Retrieve session details
                    const sessionQuery = 'SELECT * FROM sessions WHERE id = ?';
                    db.get(sessionQuery, [sessionId], (err, sess) => {
                        if (err) {
                            console.error('[PAYOUT] Error fetching session for payout:', err);
                            return; // don't block response
                        }

                        if (!sess) {
                            console.error(`[PAYOUT] Session ${sessionId} not found`);
                            return;
                        }

                        const amount = sess.credit_amount || 0;
                        console.log(`[PAYOUT] Session credit_amount: ${amount}, course_instance_id: ${sess.course_instance_id}`);

                        if (sess.course_instance_id) {
                            // Update course instance completed_sessions and handle payment plan
                            const ciQuery = 'SELECT * FROM course_instances WHERE id = ?';
                            db.get(ciQuery, [sess.course_instance_id], (err, ci) => {
                                if (err) {
                                    console.error('Error fetching course instance:', err);
                                    return;
                                }
                                if (!ci) return;

                                const newCompleted = (ci.completed_sessions || 0) + 1;
                                const updateCi = 'UPDATE course_instances SET completed_sessions = ? WHERE id = ?';
                                db.run(updateCi, [newCompleted, ci.id], (err) => {
                                    if (err) {
                                        console.error('Error updating course instance progress:', err);
                                        return;
                                    }

                                    const plan = ci.payment_plan || 'per_session';
                                    if (plan === 'per_session') {
                                        // Direct transfer for per-session payment
                                        db.serialize(() => {
                                            db.run('BEGIN TRANSACTION');
                                            db.run('UPDATE users SET time_credits = time_credits - ? WHERE id = ?', [amount, ci.student_id], function(err) {
                                                if (err) {
                                                    console.error('Error deducting student credits:', err);
                                                    db.run('ROLLBACK');
                                                    return;
                                                }
                                                db.run('UPDATE users SET time_credits = time_credits + ? WHERE id = ?', [amount, ci.teacher_id], function(err) {
                                                    if (err) {
                                                        console.error('Error adding teacher credits:', err);
                                                        db.run('ROLLBACK');
                                                        return;
                                                    }
                                                    db.run('COMMIT', (err) => {
                                                        if (err) {
                                                            console.error('Error committing course payout:', err);
                                                        }
                                                    });
                                                });
                                            });
                                        });
                                    } else if (plan === 'per_course') {
                                        // accumulate held_credits
                                        const addHeld = 'UPDATE course_instances SET held_credits = held_credits + ? WHERE id = ?';
                                        db.run(addHeld, [amount, ci.id], (err) => {
                                            if (err) {
                                                console.error('Error adding held credits:', err);
                                                return;
                                            }
                                            // If course complete, release all held credits
                                            if (newCompleted >= ci.total_sessions) {
                                                const getHeld = 'SELECT held_credits FROM course_instances WHERE id = ?';
                                                db.get(getHeld, [ci.id], (err, row) => {
                                                    if (err) {
                                                        console.error('Error reading held credits:', err);
                                                        return;
                                                    }
                                                    const held = row ? row.held_credits || 0 : 0;
                                                    if (held > 0) {
                                                        // Direct transfer when course completes
                                                        db.serialize(() => {
                                                            db.run('BEGIN TRANSACTION');
                                                            db.run('UPDATE users SET time_credits = time_credits - ? WHERE id = ?', [held, ci.student_id], function(err) {
                                                                if (err) {
                                                                    console.error('Error deducting student credits:', err);
                                                                    db.run('ROLLBACK');
                                                                    return;
                                                                }
                                                                db.run('UPDATE users SET time_credits = time_credits + ? WHERE id = ?', [held, ci.teacher_id], function(err) {
                                                                    if (err) {
                                                                        console.error('Error adding teacher credits:', err);
                                                                        db.run('ROLLBACK');
                                                                        return;
                                                                    }
                                                                    db.run('COMMIT', (err) => {
                                                                        if (err) {
                                                                            console.error('Error committing held credits payout:', err);
                                                                        } else {
                                                                            const clearHeld = 'UPDATE course_instances SET held_credits = 0 WHERE id = ?';
                                                                            db.run(clearHeld, [ci.id]);
                                                                        }
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    } else if (plan === 'hybrid') {
                                        // pay 80% immediately, hold 20%
                                        const immediate = Math.ceil(amount * 0.8);
                                        const held = amount - immediate;
                                        // Direct transfer for immediate portion
                                        db.serialize(() => {
                                            db.run('BEGIN TRANSACTION');
                                            db.run('UPDATE users SET time_credits = time_credits - ? WHERE id = ?', [immediate, ci.student_id], function(err) {
                                                if (err) {
                                                    console.error('Error deducting student credits (hybrid):', err);
                                                    db.run('ROLLBACK');
                                                    return;
                                                }
                                                db.run('UPDATE users SET time_credits = time_credits + ? WHERE id = ?', [immediate, ci.teacher_id], function(err) {
                                                    if (err) {
                                                        console.error('Error adding teacher credits (hybrid):', err);
                                                        db.run('ROLLBACK');
                                                        return;
                                                    }
                                                    db.run('COMMIT', (err) => {
                                                        if (err) {
                                                            console.error('Error committing immediate payout:', err);
                                                        }
                                                    });
                                                });
                                            });
                                        });
                                        // Hold the rest
                                        const addHeld = 'UPDATE course_instances SET held_credits = held_credits + ? WHERE id = ?';
                                        db.run(addHeld, [held, ci.id], (err) => {
                                            if (err) {
                                                console.error('Error adding held credits (hybrid):', err);
                                                return;
                                            }
                                            if (newCompleted >= ci.total_sessions) {
                                                const getHeld = 'SELECT held_credits FROM course_instances WHERE id = ?';
                                                db.get(getHeld, [ci.id], (err, row) => {
                                                    if (err) {
                                                        console.error('Error reading held credits:', err);
                                                        return;
                                                    }
                                                    const heldTotal = row ? row.held_credits || 0 : 0;
                                                    if (heldTotal > 0) {
                                                        // Direct transfer for held portion
                                                        db.serialize(() => {
                                                            db.run('BEGIN TRANSACTION');
                                                            db.run('UPDATE users SET time_credits = time_credits - ? WHERE id = ?', [heldTotal, ci.student_id], function(err) {
                                                                if (err) {
                                                                    console.error('Error deducting student held credits:', err);
                                                                    db.run('ROLLBACK');
                                                                    return;
                                                                }
                                                                db.run('UPDATE users SET time_credits = time_credits + ? WHERE id = ?', [heldTotal, ci.teacher_id], function(err) {
                                                                    if (err) {
                                                                        console.error('Error adding teacher held credits:', err);
                                                                        db.run('ROLLBACK');
                                                                        return;
                                                                    }
                                                                    db.run('COMMIT', (err) => {
                                                                        if (err) {
                                                                            console.error('Error committing held payout:', err);
                                                                        } else {
                                                                            const clearHeld = 'UPDATE course_instances SET held_credits = 0 WHERE id = ?';
                                                                            db.run(clearHeld, [ci.id]);
                                                                        }
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            });
                        } else {
                            // Single session: transfer immediately
                            console.log(`[PAYOUT] Single session payout: student=${sess.student_id}, teacher=${sess.teacher_id}, amount=${amount}`);
                            if (amount > 0) {
                                // Direct transfer: deduct from student, add to teacher
                                db.serialize(() => {
                                    db.run('BEGIN TRANSACTION');
                                    db.run('UPDATE users SET time_credits = time_credits - ? WHERE id = ?', [amount, sess.student_id], function(err) {
                                        if (err) {
                                            console.error('[PAYOUT] Error deducting student credits:', err);
                                            db.run('ROLLBACK');
                                            return;
                                        }
                                        console.log(`[PAYOUT] Deducted ${amount} from student ${sess.student_id}`);
                                        db.run('UPDATE users SET time_credits = time_credits + ? WHERE id = ?', [amount, sess.teacher_id], function(err) {
                                            if (err) {
                                                console.error('[PAYOUT] Error adding teacher credits:', err);
                                                db.run('ROLLBACK');
                                                return;
                                            }
                                            console.log(`[PAYOUT] Added ${amount} to teacher ${sess.teacher_id}`);
                                            db.run('COMMIT', (err) => {
                                                if (err) {
                                                    console.error('[PAYOUT] Error committing payout transaction:', err);
                                                } else {
                                                    console.log(`[PAYOUT] SUCCESS: transferred ${amount} credits from ${sess.student_id} to ${sess.teacher_id}`);
                                                }
                                            });
                                        });
                                    });
                                });
                            }
                        }
                    });
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
        // Check if user is part of this session and retrieve needed fields
        const sessionQuery = 'SELECT student_id, teacher_id, jitsi_room, credit_amount, course_instance_id, held_credits FROM sessions WHERE id = ?';
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

            // If the joining user is the student, ensure they have enough credits and move credits into held state
            const amount = session.credit_amount || 0;
            if (session.student_id === userId && amount > 0) {
                // Check student balance
                db.get('SELECT time_credits FROM users WHERE id = ?', [userId], (err, row) => {
                    if (err) {
                        console.error('Join session error (balance check):', err);
                        return res.status(500).json({ message: 'Server error' });
                    }

                    const balance = row ? (row.time_credits || 0) : 0;
                    if (balance < amount) {
                        return res.status(400).json({ message: 'Insufficient credits to join the session' });
                    }

                    // Deduct from student and hold the credits (either in course_instances or sessions)
                    if (session.course_instance_id) {
                        // Course session: add to course_instances.held_credits (and possibly transfer immediate portion for hybrid)
                        const ciQuery = 'SELECT payment_plan FROM course_instances WHERE id = ?';
                        db.get(ciQuery, [session.course_instance_id], (err, ci) => {
                            if (err) {
                                console.error('Join session error fetching course instance:', err);
                                return res.status(500).json({ message: 'Server error' });
                            }

                            const plan = (ci && ci.payment_plan) ? ci.payment_plan : 'per_session';
                            if (plan === 'hybrid') {
                                const immediate = Math.ceil(amount * 0.8);
                                const held = amount - immediate;
                                // Deduct full amount from student, immediately credit teacher immediate portion, and add held to course_instances
                                db.serialize(() => {
                                    db.run('BEGIN TRANSACTION');
                                    db.run('UPDATE users SET time_credits = time_credits - ? WHERE id = ?', [amount, userId], function(err) {
                                        if (err) {
                                            console.error('Join session error deducting student credits (hybrid):', err);
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ message: 'Server error' });
                                        }
                                        db.run('UPDATE users SET time_credits = time_credits + ? WHERE id = ?', [immediate, session.teacher_id], function(err) {
                                            if (err) {
                                                console.error('Join session error crediting teacher immediate (hybrid):', err);
                                                db.run('ROLLBACK');
                                                return res.status(500).json({ message: 'Server error' });
                                            }
                                            db.run('UPDATE course_instances SET held_credits = held_credits + ? WHERE id = ?', [held, session.course_instance_id], function(err) {
                                                if (err) {
                                                    console.error('Join session error adding held to course instance (hybrid):', err);
                                                    db.run('ROLLBACK');
                                                    return res.status(500).json({ message: 'Server error' });
                                                }
                                                db.run('COMMIT', (err) => {
                                                    if (err) console.error('Join session commit error (hybrid):', err);
                                                    // Return Jitsi room info regardless
                                                           return res.json({ jitsiRoom: session.jitsi_room, sessionId, deducted: true, debugUser: userId, debugSessionStudent: session.student_id });
                                                });
                                            });
                                        });
                                    });
                                });
                            } else {
                                // per_session or per_course: deduct from student and add to course_instances held_credits
                                db.serialize(() => {
                                    db.run('BEGIN TRANSACTION');
                                    db.run('UPDATE users SET time_credits = time_credits - ? WHERE id = ?', [amount, userId], function(err) {
                                        if (err) {
                                            console.error('Join session error deducting student credits:', err);
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ message: 'Server error' });
                                        }
                                        db.run('UPDATE course_instances SET held_credits = held_credits + ? WHERE id = ?', [amount, session.course_instance_id], function(err) {
                                            if (err) {
                                                console.error('Join session error adding held to course instance:', err);
                                                db.run('ROLLBACK');
                                                return res.status(500).json({ message: 'Server error' });
                                            }
                                            db.run('COMMIT', (err) => {
                                                if (err) console.error('Join session commit error:', err);
                                                       return res.json({ jitsiRoom: session.jitsi_room, sessionId, deducted: true, debugUser: userId, debugSessionStudent: session.student_id });
                                            });
                                        });
                                    });
                                });
                            }
                        });
                        return; // response already sent in transaction callbacks
                    } else {
                        // Single session: deduct from student and add held_credits on the session row
                        db.serialize(() => {
                            db.run('BEGIN TRANSACTION');
                            db.run('UPDATE users SET time_credits = time_credits - ? WHERE id = ?', [amount, userId], function(err) {
                                if (err) {
                                    console.error('Join session error deducting student credits:', err);
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ message: 'Server error' });
                                }
                                db.run('UPDATE sessions SET held_credits = held_credits + ? WHERE id = ?', [amount, sessionId], function(err) {
                                    if (err) {
                                        console.error('Join session error adding held to session:', err);
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ message: 'Server error' });
                                    }
                                    db.run('COMMIT', (err) => {
                                        if (err) console.error('Join session commit error:', err);
                                               return res.json({ jitsiRoom: session.jitsi_room, sessionId, deducted: true, debugUser: userId, debugSessionStudent: session.student_id });
                                    });
                                });
                            });
                        });
                        return; // response sent in callbacks
                    }
                });
                return; // handled student join path
            }

            // Return the Jitsi room information for non-student or zero-amount sessions
            res.json({ jitsiRoom: session.jitsi_room, sessionId });
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