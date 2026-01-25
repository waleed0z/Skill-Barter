const { driver } = require('../config/db');
const bcrypt = require('bcryptjs');

const createUser = async (userData) => {
    const session = driver.session();
    try {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const result = await session.run(
            `CREATE (u:User {
                id: randomUUID(),
                name: $name,
                email: $email,
                password: $password,
                timeCredits: 0,
                createdAt: datetime(),
                isVerified: false,
                otp: $otp,
                otpExpires: $otpExpires
            }) RETURN u`,
            {
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                otp: userData.otp,
                otpExpires: userData.otpExpires.toISOString() // Store as ISO string
            }
        );
        return result.records[0].get('u').properties;
    } finally {
        await session.close();
    }
};

const findUserByEmail = async (email) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {email: $email}) RETURN u`,
            { email }
        );
        if (result.records.length === 0) return null;
        return result.records[0].get('u').properties;
    } finally {
        await session.close();
    }
};

const verifyUser = async (email) => {
    const session = driver.session();
    try {
        await session.run(
            `MATCH (u:User {email: $email})
             SET u.isVerified = true, u.otp = null, u.otpExpires = null
             RETURN u`,
            { email }
        );
    } finally {
        await session.close();
    }
};

const setPasswordResetToken = async (email, token, expires) => {
    const session = driver.session();
    try {
        const expiresStr = expires.toISOString();
        await session.run(
            `MATCH (u:User {email: $email})
             SET u.resetPasswordToken = $token, u.resetPasswordExpires = $expires
             RETURN u`,
            { email, token, expires: expiresStr }
        );
    } finally {
        await session.close();
    }
};

const updatePassword = async (email, newPassword) => {
    const session = driver.session();
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await session.run(
            `MATCH (u:User {email: $email})
             SET u.password = $password, u.resetPasswordToken = null, u.resetPasswordExpires = null
             RETURN u`,
            { email, password: hashedPassword }
        );
    } finally {
        await session.close();
    }
};

const updateOtp = async (email, otp, otpExpires) => {
    const session = driver.session();
    try {
        await session.run(
            `MATCH (u:User {email: $email})
             SET u.otp = $otp, u.otpExpires = $otpExpires
             RETURN u`,
            { email, otp, otpExpires: otpExpires.toISOString() }
        );
    } finally {
        await session.close();
    }
};

module.exports = { createUser, findUserByEmail, verifyUser, setPasswordResetToken, updatePassword, updateOtp };
