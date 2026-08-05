import { Queue } from 'bullmq'
import { redis } from '../config/redis.js'
import ms from 'ms'

export const restaurantReactivateQueue = new Queue(
    'restaurant-reactivate-queue',
    {
        connection: redis,
        defaultJobOptions: {
            attempts: 5,
            delay: ms('3d'),
            backoff: {
                type: 'exponential',
                delay: 1000,

            },
            removeOnComplete: true,
            removeOnFail: false
        }
    }
)