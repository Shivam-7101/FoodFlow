import { Worker } from 'bullmq'
import { redis } from '../config/redis.js'
import { Restaurant, User } from '../models/index.js'
import { ErrorCodes, BadRequestError, NotFoundError, ConflictError } from '../errors/index.js'
import mongoose from 'mongoose'
import * as queue from '../queues/index.js'

const restaurantReactivateWorker = new Worker(
    'restaurant-reactivate-queue',
    async (job) => {
        const { restaurantId } = job.data
        if (!restaurantId?.trim()) {
            throw new BadRequestError(`EMAIL WORKER ERR: Missing job data.`)
        }
        const session = await mongoose.startSession()
        try {
            await session.withTransaction(async () => {
                const restaurant = await Restaurant.findOneAndUpdate(
                    {
                        _id: restaurantId,
                        status: 'SUSPENDED'
                    },
                    {
                        $set: {
                            status: 'ACTIVE'
                        }
                    },
                    {
                        returnDocument: 'after',
                        session
                    }
                )
                let ownerId;

                if (!restaurant) {
                    const existingRestaurant = await Restaurant.findById()
                    if (!existingRestaurant || existingRestaurant?.status !== 'ACTIVE') throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);

                    ownerId = existingRestaurant.ownerId
                } else {
                    ownerId = restaurant.ownerId
                }

                let username, userEmail;
                const user = await User.findByIdAndUpdate(

                    ownerId,
                    {
                        $set: {
                            role: 'RESTAURANT_OWNER'
                        }
                    },
                    {
                        returnDocument: 'after',
                        session
                    }
                )
                if (!user) {
                    const existingUser = await User.findById(ownerId)
                    if (!existingUser) throw new NotFoundError(ErrorCodes.AUTH.USER_NOT_FOUND);
                    if (existingUser.role !== 'CUSTOMER' && existingUser.role !== 'RESTAURANT_OWNER') throw new ConflictError(`RESTAURANT REACTIVATE ERR: user possesses an invalid role`);

                    username = existingUser.username
                    userEmail = existingUser.email
                } else {
                    username = user.username
                    userEmail = user.email
                }

                await queue.emailQueue.add('restaurantReactivated', {
                    to: userEmail,
                    subject: 'Your Restaurant Has Been Reactivated',
                    name: username,
                })
            })
        } finally {
            await session.endSession()
        }
    },
    {
        connection: redis,
        concurrency: 10
    }
)