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
};

module.exports = { createUser, findUserByEmail, verifyUser, setPasswordResetToken, updatePassword, updateOtp };
