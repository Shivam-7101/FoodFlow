import { Worker } from 'bullmq'
import { redis } from '../config/redis.js'
import { DeliveryPartner } from '../models/index.js'
import { ErrorCodes, BadRequestError, NotFoundError, ConflictError } from '../errors/index.js'
import mongoose from 'mongoose'
import * as queue from '../queues/index.js'

const deliveryPartnerReactivateWorker = new Worker(
    'delivery-partner-reactivate-queue',
    async (job) => {
        const { deliveryPartnerId } = job.data
        if (!deliveryPartnerId?.trim()) {
            throw new BadRequestError(`DELIVERY PARTNER REACTIVATE ERR: Missing job data.`)
        }
        const session = await mongoose.startSession()
        try {
            await session.withTransaction(async () => {
                const deliveryPartner = await DeliveryPartner.findOneAndUpdate(
                    {
                        _id: deliveryPartnerId,
                        status: 'SUSPENDED'
                    },
                    {
                        $set: {
                            status: 'ACTIVE',
                        },
                    },
                    {
                        returnDocument: 'after',
                        session
                    }
                )
                let userId, username, userEmail;

                if (!deliveryPartner) {
                    const existingDeliveryPartner = await DeliveryPartner.findById(deliveryPartnerId)
                    if (!existingDeliveryPartner || existingDeliveryPartner?.status !== 'ACTIVE') throw new NotFoundError(ErrorCodes.DELIVERY_PARTNER.DELIVERY_PARTNER_NOT_FOUND);

                    userId = existingDeliveryPartner.userId
                } else {
                    userId = deliveryPartner.userId
                }
                const user = await User.findOneAndUpdate(
                    { 
                        _id: userId, 
                        role: 'CUSTOMER'
                    },
                    {
                        $set: {
                            role: 'DELIVERY_PARTNER'
                        }
                    },
                    {
                        returnDocument: 'after',
                        session
                    }
                )
                if (!user) {
                    const existingUser = await User.findById(userId)
                    if (!existingUser) throw new NotFoundError(ErrorCodes.AUTH.USER_NOT_FOUND);
                    if (existingUser.role !== 'CUSTOMER' && existingUser.role !== 'DELIVERY_PARTNER') throw new ConflictError(`DELIVERY PARTNER REACTIVATE ERR: user possesses an invalid role`);

                    username = existingUser.username
                    userEmail = existingUser.email
                }else{
                    username = user.username
                    userEmail = user.email
                }

                await queue.emailQueue.add('deliveryPartnerReactivated', {
                    to: userEmail,
                    subject: 'Your Delivery Partner Account Has Been Reactivated',
                    name: username
                })
            })
        } finally {
            await session.endSession()
        }
    },
    {
        connection: redis,
        concurrency: 5,
    }
)