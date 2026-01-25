const User = require('../models/user.model');
const { sendEmail } = require('./email.service');

const generateAndSendOtp = async (email) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await User.updateOtp(email, otp, otpExpires);
    await sendEmail(email, 'Verify your email', `Your OTP is ${otp}`, `<p>Your OTP is <b>${otp}</b></p>`);

    return { otp, otpExpires };
};

module.exports = { generateAndSendOtp };
