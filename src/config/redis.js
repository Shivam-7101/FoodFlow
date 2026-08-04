import { Redis } from 'ioredis'

export const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null
})

redis.on('connect', () => console.log('REDIS CONNECTED'))
redis.on('error', (error) => console.log(`REDIS CONNECTION FAILED ERR: ${error.message}`))