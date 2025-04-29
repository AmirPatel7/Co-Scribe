import nodemailer from 'nodemailer';
import mg from 'nodemailer-mailgun-transport';
import dotenv from "dotenv";

dotenv.config();

// Mailgun transport configuration
const mailgunAuth = {
    auth: {
        api_key: process.env.MAILGUN_API_KEY!,
        domain: process.env.MAILGUN_DOMAIN!,
    },
};

// Create a nodemailer transporter using Mailgun
const transporter = nodemailer.createTransport(mg(mailgunAuth));

// Function to send an email
export const sendEmail = async (to: string, subject: string, text: string) => {
    const mailOptions = {
        from: process.env.FROM_EMAIL!,  // Your support email
        to,
        subject,
        text,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};