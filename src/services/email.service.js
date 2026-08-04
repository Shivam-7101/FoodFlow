import dotenv from 'dotenv/config'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.GOOGLE_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
    }
})

transporter.verify((error, success) => {
    if (error) {
        console.error('Error connecting to email server:', error)
    } else {
        console.log('Email server connection successful')
    }
})

export const sendEmail = async ({ to, subject, text }) => {
    const mailOptions = {
        from: process.env.GOOGLE_USER,
        to,
        subject,
        text
    }

    // console.log(`7. DETAILS OF USER=> FROM: ${mailOptions.from}, TO: ${mailOptions.to}, SUBJECT: ${mailOptions.subject}`)

    try {
        await transporter.sendMail(mailOptions)
        console.log('Email sent successfully')
    } catch (error) {
        console.error('Error sending email:', error)
    }
}