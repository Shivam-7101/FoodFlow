import { Queue } from 'bullmq'
import { redis } from '../config/redis.js'
import ms from 'ms'

export const deliveryPartnerReactivateQueue = new Queue('delivery-partner-reactivate-queue', {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        delay: ms('3d'),
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
    },
})