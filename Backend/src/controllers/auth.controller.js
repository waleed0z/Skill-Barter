const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendEmail } = require('../services/email.service');
require('dotenv').config();

const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        const newUser = await User.createUser({ name, email, password, otp, otpExpires });

        await sendEmail(email, 'Verify your email', `Your OTP is ${otp}`, `<p>Your OTP is <b>${otp}</b></p>`);

        res.status(201).json({
            message: 'User created successfully. Please verify your email.',
            userId: newUser.id
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findUserByEmail(email);

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });

        if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

        await User.verifyUser(email);
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Please verify your email first' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        const { password: _, otp: __, ...userSafe } = user;
        res.json({
            message: 'Login successful',
            token,
            user: userSafe
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findUserByEmail(email);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 3600000);

        await User.setPasswordResetToken(email, token, expires);

        const resetLink = `${process.env.APP_URL}/reset-password/${token}`;
        await sendEmail(email, 'Password Reset', `Reset link: ${resetLink}`, `<a href="${resetLink}">Reset Password</a>`);

        res.json({ message: 'Password reset link sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, newPassword: password, token } = req.body;

        const user = await User.findUserByEmail(email);
        if (!user || user.resetPasswordToken !== token) {
            return res.status(400).json({ message: 'Invalid token or email' });
        }

        await User.updatePassword(email, password);
        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findUserByEmail(req.user.email);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { password, ...userSafe } = user;
        res.json(userSafe);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { signup, verifyEmail, login, forgotPassword, resetPassword, getProfile };
