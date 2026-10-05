import { redis } from '../config/redis.js'
import { Queue } from 'bullmq'
import ms from 'ms'

export const orderLifecycleQueue = new Queue(
    'order-lifecycle-queue',
    {
        connection: redis,
        defaultJobOptions: {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: ms('5000s')
            },
            removeOnComplete: true,
            removeOnFail: true
        }
    }
)