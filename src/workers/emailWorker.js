import { Worker } from 'bullmq'
import { sendEmail } from '../services/email.service.js'
import * as utils from '../utils/index.js'
import { redis } from '../config/redis.js'

export const emailWorker = new Worker(
    'email-queue',
    async (job) => {

        switch (job.name) {
            case `email-verification`: {

                // console.log('2. EMAIL VERIFICATION REQUEST REACHES TO WORKER')
                const { to, userId, subject } = job.data || {}
                if (!to || !userId || !subject) throw new Error(`EMAIL WORKER ERR: missing required parameters, job id: ${job.id}`);

                console.log(`TO: ${to}, USERID: ${userId}, SUBJECT: ${subject}`)
                // console.log('3. ALL PARAMETERS VERIFIED BY THE WORKER')
                const otp = utils.otp.generateOtp()
                // console.log(`4. OTP GENERATED : ${otp}`)
                const otpHtml = utils.otp.getOtpHtml(otp)

                const isSaved = await utils.redis.setString({
                    prefix: 'otp',
                    id: userId,
                    data: otp,
                    EX: 120,
                    NX: 'NX'
                })

                // console.log(`5. OTP SAVED IN REDIS ${isSaved}`)

                if (!isSaved) throw new Error(`EMAIL WORKER ERR: Failed ot save otp for user: ${userId}`);

                // console.log('6. EMAIL SENDING FROM WORKER TO NODE-MAILER')
                await sendEmail({ to, subject, text: otpHtml })
                // console.log('8. EMAIL HAS BEEN SENT TO USER')
                break;
            }
            default:
                break;
        }
    },
    {
        connection: redis,
        concurrency: 10,
    }
)

emailWorker.on('completed', (job) => {
    console.log(`Job ${job.id} with job name ${job.name} and user ${job.data.userId} completed successfully`)
})

emailWorker.on('failed', (job, err) => {
    console.log(`Job ${job.id} with job name ${job.name} and user ${job.data.userId} failed with error: ${err.message}`)
})