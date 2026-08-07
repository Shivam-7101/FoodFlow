import { User, Restaurant, DeliveryPartner, Session, Food } from '../models/index.js'
import * as queue from '../queues/index.js'
import { ErrorCodes, BadRequestError, NotFoundError, ValidationError, ConflictError } from '../errors/index.js'
import ms from 'ms'
import mongoose from 'mongoose'
import * as adminValidation from '../validators/adminValidations.js'

export const updateUserToInactive = async ({ body }) => {

    const result = adminValidation.updateUserToInactive.safeParse({ body })
    if (!result.success) throw new ValidationError(`ERR: ${result.error.issues.map(issue => issue.message).join(', ')}`);
    const userId = result.data.body

    const user = await User.findOneAndUpdate(
        {
            _id: userId,
            isActive: true
        },
        {
            isActive: false
        },
        {
            returnDocument: 'after'
        }
    )

    if (!user) {
        const existingUser = await User.findById(userId)
        if (existingUser?.isActive) {
            return
        }
        throw new NotFoundError(ErrorCodes.AUTH.USER_NOT_FOUND)
    }

    await Session.updateMany(
        {
            userId: userId
        },
        {
            $set: {
                hashedRefreshToken: null,
                isValid: false,
                expiresAt: new Date(Date.now() + ms('2d'))
            }
        }
    )

    await queue.emailQueue.add('accountBlocked', { to: user.email, name: user.name, subject: 'Account Blocked' })
}

export const approveRestaurantCreationRequests = async () => {

    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {

            const restaurants = await Restaurant.aggregate([
                {
                    $match: {
                        status: 'PENDING'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: "ownerId",
                        foreignField: "_id",
                        as: 'ownerDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$ownerDetails',
                        preserveNullAndEmptyArrays: true
                    }
                }
            ], { session })

            const restaurantBulkOperations = []
            const userBulkOperations = []

            for (const restaurant of restaurants) {

                const shouldApprove = restaurant.ownerDetails?.isActive && restaurant.ownerDetails?.isVerified && restaurant.ownerDetails?.role === 'CUSTOMER'

                restaurantBulkOperations.push({
                    updateOne: {
                        filter: {
                            _id: restaurant._id,
                            status: 'PENDING'
                        },
                        update: {
                            $set: {
                                status: shouldApprove ? 'ACTIVE' : 'REJECTED',
                                isActive: shouldApprove
                            }
                        }
                    }
                })

                if (shouldApprove) {
                    userBulkOperations.push({
                        updateOne: {
                            filter: {
                                _id: restaurant.ownerDetails?._id,
                                isActive: true,
                                isVerified: true,
                                role: "CUSTOMER"
                            },
                            update: {
                                $set: {
                                    role: "RESTAURANT_OWNER"
                                }
                            }

                        }
                    })

                    await queue.emailQueue.add('restaurantCreationApproved', { to: restaurant.ownerDetails?.email, name: restaurant.ownerDetails?.name, restaurantName: restaurant.name, subject: 'Restaurant Creation Approved' })
                }
            }

            if (restaurantBulkOperations.length) {
                await Restaurant.bulkWrite(restaurantBulkOperations, { session })
            }
            if (userBulkOperations.length) {
                await User.bulkWrite(userBulkOperations, { session })
            }
        })
    } finally {
        await session.endSession()
    }
}

export const approveDeliveryPartnerRequests = async () => {

    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {
            const deliveryPartners = await DeliveryPartner.aggregate([
                {
                    $match: {
                        status: 'PENDING'
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$userDetails',
                        preserveNullAndEmptyArrays: true
                    }
                }
            ], { session })

            const deliveryPartnersBulkOperations = []
            const usersBulkOperations = []

            for (const dp of deliveryPartners) {

                const shouldApproved = (dp.userDetails?.isActive && dp.userDetails?.isVerified && dp.userDetails?.role === 'CUSTOMER')

                deliveryPartnersBulkOperations.push({
                    updateOne: {
                        filter: {
                            _id: dp._id,
                            userId: dp.userId,
                            status: 'PENDING'
                        },
                        update: {
                            $set: {
                                status: shouldApproved ? 'ACTIVE' : 'REJECTED'
                            }
                        }
                    }
                })

                if (shouldApproved) {
                    usersBulkOperations.push({
                        updateOne: {
                            filter: {
                                _id: dp.userDetails?._id,
                                isActive: true,
                                isVerified: true,
                                role: 'CUSTOMER'
                            },
                            update: {
                                $set: {
                                    role: 'DELIVERY_PARTNER'
                                }
                            }
                        }
                    })

                    await queue.emailQueue.add('deliveryPartnerCreationApproved', { to: dp.userDetails?.email, name: dp.userDetails?.name, subject: 'Delivery Partner Creation Approved' })
                }
            }

            if (deliveryPartnersBulkOperations.length) {
                await DeliveryPartner.bulkWrite(deliveryPartnersBulkOperations, { session })
            }
            if (usersBulkOperations.length) {
                await User.bulkWrite(usersBulkOperations, { session })
            }
        })
    } finally {
        await session.endSession()
    }
}

export const removeRestaurantOwnerStatus = async ({ body }) => {

    const result = adminValidation.removeRestaurantOwnerStatus.safeParse({ body })
    if (!result.success) throw new ValidationError(ErrorCodes.VALIDATION.INVALID_INPUT);
    const restaurantId = result.data.body

    let ownerName, ownerEmail;
    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {

            const restaurant = await Restaurant.findByIdAndUpdate(
                restaurantId,
                {
                    $set: {
                        status: 'SUSPENDED'
                    }
                },
                {
                    returnDocument: 'after',
                    session
                }
            );

            let ownerId;

            if (!restaurant) {

                const existingRestaurant = await Restaurant.findById(restaurantId, null, { session });
                if (!existingRestaurant || existingRestaurant?.status !== 'SUSPENDED') {
                    throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);
                }

                ownerId = existingRestaurant.ownerId;
            } else {
                ownerId = restaurant.ownerId;
            }

            const user = await User.findOneAndUpdate(
                {
                    _id: ownerId,
                    role: 'RESTAURANT_OWNER'
                },
                {
                    $set: {
                        role: 'CUSTOMER'
                    }
                },
                {
                    returnDocument: 'after',
                    session
                }
            );

            if (!user) {

                const existingUser = await User.findById(ownerId, null, { session });
                if (!existingUser) {
                    throw new NotFoundError(ErrorCodes.AUTH.USER_NOT_FOUND);
                }

                if (existingUser.role !== 'CUSTOMER' && existingUser.role !== 'RESTAURANT_OWNER') {
                    throw new ConflictError("User possesses an invalid role for this operation");
                }

                ownerName = existingUser.name
                ownerEmail = existingUser.email
            } else {
                ownerName = user.name
                ownerEmail = user.email
            }

            await Food.updateMany(
                { restaurantId: restaurantId },
                {
                    $set: {
                        isActive: false
                    }
                },
                { session }
            );
        });

    } finally {
        await session.endSession()
    }
    await queue.restaurantReactivateQueue.add('reactivateRestaurant', { restaurantId })
    await queue.emailQueue.add('restaurantOwnerStatusRemoved', { to: ownerEmail, name: ownerName, subject: 'Restaurant Owner Status Removed and Restaurant Suspended' })
}

export const removeDeliveryPartnerStatus = async ({ body }) => {

    const result = adminValidation.removeDeliveryPartnerStatus.safeParse({ body })
    if (!result.success) throw new ValidationError(`ERR: ${result.error.issues.map(issue => issue.message).join(', ')}`);
    const deliveryPartnerId = result.data.body

    let userName, userEmail;
    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {
            const deliveryPartner = await DeliveryPartner.findByIdAndUpdate(
                deliveryPartnerId,
                {
                    $set: {
                        status: 'SUSPENDED'
                    }
                },
                {
                    returnDocument: 'after',
                    session
                }
            )

            let userId;
            if (!deliveryPartner) {
                const existingDeliveryPartner = await DeliveryPartner.findById(deliveryPartnerId, null, { session })
                if (!existingDeliveryPartner || existingDeliveryPartner.status !== 'SUSPENDED') throw new NotFoundError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_NOT_FOUND);

                userId = existingDeliveryPartner.userId
            } else {
                userId = deliveryPartner.userId
            }

            const user = await User.findByIdAndUpdate(
                userId,
                {
                    $set: {
                        role: 'CUSTOMER'
                    }
                },
                {
                    returnDocument: 'after',
                    session
                }
            )

            if (!user) {
                const existingUser = await User.findById(userId, null, { session })
                if (!existingUser) throw new NotFoundError(ErrorCodes.AUTH.USER_NOT_FOUND);
                if (existingUser.role !== 'CUSTOMER' && existingUser.role !== 'DELIVERY_PARTNER') throw new ConflictError("User possesses an invalid role for this operation");

                userName = existingUser.name
                userEmail = existingUser.email
            } else {
                userName = user.name
                userEmail = user.email
            }
        })
    } finally {
        await session.endSession()
    }
    await queue.deliveryPartnerReactivateQueue.add('reactivateDeliveryPartner', { deliveryPartnerId })
    await queue.emailQueue.add('deliveryPartnerStatusRemoved', { to: userEmail, name: userName, subject: 'Delivery Partner Status Removed and Delivery Partner Suspended' })
}