<<<<<<< HEAD
const { db } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const createUser = async (userData) => {
    return new Promise(async (resolve, reject) => {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const userId = uuidv4();

        const query = `
            INSERT INTO users (id, name, email, password, time_credits, is_verified)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const params = [
            userId,
            userData.name,
            userData.email,
            hashedPassword,
            0, // time_credits default to 0
            1  // is_verified default to true (no OTP required)
        ];

        db.run(query, params, function(err) {
            if (err) {
                console.error('Error creating user:', err);
                reject(err);
            } else {
                // Return the created user
                const selectQuery = 'SELECT * FROM users WHERE id = ?';
                db.get(selectQuery, [userId], (err, row) => {
                    if (err) {
                        console.error('Error retrieving created user:', err);
                        reject(err);
                    } else {
                        // Map database columns to JavaScript properties and convert booleans
                        if (row) {
                            row.isVerified = Boolean(row.is_verified);
                        }
                        resolve(row);
                    }
                });
            }
        });
    });
};

const findUserByEmail = async (email) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM users WHERE email = ?';
        db.get(query, [email], (err, row) => {
            if (err) {
                console.error('Error finding user by email:', err);
                reject(err);
            } else {
                // Map database columns to JavaScript properties and convert booleans
                if (row) {
                    // Convert snake_case to camelCase and handle boolean conversions
                    row.isVerified = Boolean(row.is_verified);
                }
                resolve(row);
            }
        });
    });
};

const verifyUser = async (email) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE users
            SET is_verified = 1, otp = NULL, otp_expires = NULL
            WHERE email = ?
        `;
        db.run(query, [email], function(err) {
            if (err) {
                console.error('Error verifying user:', err);
                reject(err);
            } else {
                resolve(this.changes > 0); // Return true if a row was updated
            }
        });
    });
};

const setPasswordResetToken = async (email, token, expires) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE users 
            SET reset_password_token = ?, reset_password_expires = ? 
            WHERE email = ?
        `;
        db.run(query, [token, expires.toISOString(), email], function(err) {
            if (err) {
                console.error('Error setting password reset token:', err);
                reject(err);
            } else {
                resolve(this.changes > 0);
            }
        });
    });
};

const updatePassword = async (email, newPassword) => {
    return new Promise(async (resolve, reject) => {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const query = `
            UPDATE users 
            SET password = ?, reset_password_token = NULL, reset_password_expires = NULL 
            WHERE email = ?
        `;
        db.run(query, [hashedPassword, email], function(err) {
            if (err) {
                console.error('Error updating password:', err);
                reject(err);
            } else {
                resolve(this.changes > 0);
            }
        });
    });
};

const updateOtp = async (email, otp, otpExpires) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE users 
            SET otp = ?, otp_expires = ? 
            WHERE email = ?`;
        db.run(query, [otp, otpExpires.toISOString(), email], function(err) {
            if (err) {
                console.error('Error updating OTP:', err);
                reject(err);
            } else {
                resolve(this.changes > 0);
            }
        });
    });
=======
const { getDb } = require('../config/db');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const createUser = async (userData) => {
    const db = getDb();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const isVerified = 0;

    await db.run(
        `INSERT INTO users (id, name, email, password, timeCredits, createdAt, isVerified, otp, otpExpires)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        id, userData.name, userData.email, hashedPassword, createdAt, isVerified, userData.otp, userData.otpExpires.toISOString()
    );

    const user = await db.get(`SELECT * FROM users WHERE id = ?`, id);
    // convert isVerified to boolean
    user.isVerified = Boolean(user.isVerified);
    return user;
};

const findUserByEmail = async (email) => {
    const db = getDb();
    const user = await db.get(`SELECT * FROM users WHERE email = ?`, email);
    if (!user) return null;
    user.isVerified = Boolean(user.isVerified);
    return user;
};

const verifyUser = async (email) => {
    const db = getDb();
    await db.run(`UPDATE users SET isVerified = 1, otp = NULL, otpExpires = NULL WHERE email = ?`, email);
};

const setPasswordResetToken = async (email, token, expires) => {
    const db = getDb();
    const expiresStr = expires.toISOString();
    await db.run(`UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE email = ?`, token, expiresStr, email);
};

const updatePassword = async (email, newPassword) => {
    const db = getDb();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run(`UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE email = ?`, hashedPassword, email);
};

const updateOtp = async (email, otp, otpExpires) => {
    const db = getDb();
    await db.run(`UPDATE users SET otp = ?, otpExpires = ? WHERE email = ?`, otp, otpExpires.toISOString(), email);
>>>>>>> 47edef2aa75b60229a33724a191985c3eef2b901
};

module.exports = { 
    createUser, 
    findUserByEmail, 
    verifyUser, 
    setPasswordResetToken, 
    updatePassword, 
    updateOtp 
};