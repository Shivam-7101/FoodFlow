import { Queue } from 'bullmq'
import { redis } from '../config/redis.js'

export const emailQueue = new Queue(
    'email-queue',
    {
        connection: redis,
        defaultJobOptions: {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: true,
            removeOnFail: false
        }
    }
)