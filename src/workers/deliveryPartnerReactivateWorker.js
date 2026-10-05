import { Worker } from 'bullmq'
import { redis } from '../config/redis.js'
import { DeliveryPartner, Order } from '../models/index.js'
import { ErrorCodes, BadRequestError, NotFoundError, ConflictError } from '../errors/index.js'
import mongoose from 'mongoose'
import * as queue from '../queues/index.js'
import * as constants from '../constants.js'
import { SOCKET_EVENTS, wsEventEmitter } from '../config/ws.js'
import { getDistance } from 'geolib'
import convertUnits from 'convert-units'
import ms from 'ms'

export const deliveryPartnerReactivateWorker = new Worker(
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
                } else {
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

export const findNearestDeliveryPartnerWorker = new Worker(
    'delivery-routing-queue',
    async (job) => {

        switch (true) {
            case job.name.startsWith('match_driver_'): {
                let { restaurantCoordinates, orderId, userId, restaurantId, deliveryPartnerToBeExclude = [], radiusInKm } = job.data
                let isDeliveryPartnerExist = false

                const excludedSet = new Set(deliveryPartnerToBeExclude)

                if (radiusInKm > constants.MAX_DISTANCE_TO_FIND_DELIVERY_PARTNER) {
                    wsEventEmitter.emit(SOCKET_EVENTS.DELIVERY_PARTNER_ORDER_REJECTED, { userId, restaurantId, orderId, reason: 'delivery partner not found.' })

                    await queue.orderLifecycleQueue.add(`reject_order_${orderId}`, { orderId, reason: 'delivery partner not found' })
                    return;
                }

                try {
                    const deliveryPartners = await DeliveryPartner.find({
                        status: constants.DELIVERY_PARTNER_STATUS.ACTIVE,
                        isActive: true,
                        isOnline: true,
                        currentLocation: {
                            $nearSphere: {
                                $geometry: {
                                    type: "Point",
                                    coordinates: restaurantCoordinates
                                },
                                $maxDistance: convertUnits(radiusInKm).from('km').to('m')
                            }
                        }
                    })
                    // console.log(`DELIVERY PARTNERS: `, deliveryPartners)

                    if (!deliveryPartners.length) {
                        await queue.findNearestDeliveryPartnerQueue.add(
                            `match_driver_${orderId}`,
                            { restaurantCoordinates, orderId, userId, restaurantId, deliveryPartnerToBeExclude, radiusInKm: radiusInKm + 2 }
                        )
                        return
                    }

                    deliveryPartners.forEach(item => {

                        if (excludedSet.has(item._id.toString())) {
                            return
                        }
                        isDeliveryPartnerExist = true

                        const distance = getDistance({ lng: item.currentLocation.coordinates[0], lat: item.currentLocation.coordinates[1] }, { lng: restaurantCoordinates[0], lat: restaurantCoordinates[1] })

                        // console.log('-----WORKER-----')
                        // console.log('DELIVERY_PARTNER: ', item)
                        // console.log('DISTANCE: ', distance)
                        // console.log('-----WORKER-----')
                        wsEventEmitter.emit(SOCKET_EVENTS.DELIVERY_PARTNER_NEW_ORDER, { orderId, distance, deliveryPartnerId: item._id.toString() })
                        excludedSet.add(item._id.toString())
                    })

                    if (!isDeliveryPartnerExist) {
                        await queue.findNearestDeliveryPartnerQueue.add(
                            `match_driver_${orderId}`,
                            { restaurantCoordinates, orderId, userId, restaurantId, deliveryPartnerToBeExclude, radiusInKm: radiusInKm + 2 }
                        )
                        return
                    }

                    await queue.findNearestDeliveryPartnerQueue.add(
                        `verify_acceptance_${orderId}`,
                        { restaurantCoordinates, orderId, userId, restaurantId, deliveryPartnerToBeExclude: Array.from(excludedSet), radiusInKm: radiusInKm },
                        { delay: ms('30s') }
                    )


                } catch (error) {
                    console.log(`FIND_NEAREST_DELIVERY_PARTNER_WORKER_ERR: `, error)
                    throw error
                }
                break;
            }

            case job.name.startsWith('verify_acceptance_'): {

                ({ restaurantCoordinates, orderId, userId, restaurantId, deliveryPartnerToBeExclude, radiusInKm } = job.data)

                try {
                    const order = await Order.findById(orderId)

                    if (!order || order.deliveryPartnerId || order.status === constants.ORDER_STATUS.PICKED_UP) {
                        return
                    }
                    if (order.status === constants.ORDER_STATUS.READY_FOR_PICKUP) {
                        wsEventEmitter.emit(SOCKET_EVENTS.DELIVERY_PARTNER_ORDER_REJECTED, { userId, restaurantId, orderId, reason: 'delivery partner not found.' })

                        await queue.orderLifecycleQueue.add(`reject_order_${orderId}`, { orderId, reason: 'delivery partner not found' })
                        return;
                    }

                    queue.findNearestDeliveryPartnerQueue.add(
                        `match_driver_${orderId}`,
                        { restaurantCoordinates, orderId, userId, restaurantId, deliveryPartnerToBeExclude, radiusInKm: radiusInKm + 2 }
                    )

                } catch (error) {
                    console.error(`FIND_NEAREST_DELIVERY_PARTNER_WORKER_ERR: `, error)
                    throw error
                }
                break;
            }
            default:
                break;
        }
    }, {
    connection: redis,
    concurrency: 5,
}
)

findNearestDeliveryPartnerWorker.on('error', (error) => {
    console.log(`FIND_NEAREST_DELIVERY_PARTNER_WORKER_ERR: `, error.message)
})