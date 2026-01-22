const nodemailer = require('nodemailer');
require('dotenv').config();

const createTransporter = async () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('No email credentials provided. Emails will be logged to console.');
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const sendEmail = async (to, subject, text, html) => {
    const transporter = await createTransporter();

    if (!transporter) {
        console.log(`[Mock Email] To: ${to}, Subject: ${subject}, Text: ${text}`);
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
            html
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = { sendEmail };
