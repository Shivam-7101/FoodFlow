import * as deliveryPartnerValidation from '../validators/deliveryPartnerValidation.js'
import { DeliveryPartner, User, Restaurant } from '../models/index.js'
import { emailQueue } from '../queues/emailQueue.js'
import * as utils from '../utils/index.js'
import { ErrorCodes, BadRequestError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, InternalServerError, ConflictError } from '../errors/index.js'
import * as mapper from '../mapper/index.js'
import mongoose from 'mongoose'

export const createDeliveryPartner = async ({ body, files, user }) => {

    const isDeliveryPartnerAccountExists = await DeliveryPartner.findOne({ userId: user._id }).lean()
    if (isDeliveryPartnerAccountExists && isDeliveryPartnerAccountExists.status === 'ACTIVE' && isDeliveryPartnerAccountExists.isActive) throw new BadRequestError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_ACCOUNT_ALREADY_EXISTS);
    if (isDeliveryPartnerAccountExists && isDeliveryPartnerAccountExists.status === 'PENDING') throw new BadRequestError(ErrorCodes.DELIVERY.ACCOUNT_CREATION_REQUEST_IS_STILL_PENDING);
    if (isDeliveryPartnerAccountExists && (isDeliveryPartnerAccountExists.status === 'REJECTED' || isDeliveryPartnerAccountExists.status === 'SUSPENDED')) throw new ForbiddenError(ErrorCodes.DELIVERY.UNAUTHORIZED_STATUS);
    if (isDeliveryPartnerAccountExists && !isDeliveryPartnerAccountExists.isActive) {

        const session = await mongoose.startSession()
        try {

            const accountFoundEarly = await session.withTransaction(async () => {

                const deliveryPartnerAccountExistsButDeletedByUser = await DeliveryPartner.findOneAndUpdate(
                    {
                        userId: user._id,
                        status: 'ACTIVE'
                    },
                    {
                        $set: {
                            isActive: true
                        }
                    },
                    {
                        returnDocument: 'after',
                        runValidators: true,
                        session
                    }
                )

                const userAccount = await User.findByIdAndUpdate(user._id,
                    {
                        $set: {
                            role: 'DELIVERY_PARTNER'
                        }
                    },
                    {
                        returnDocument: 'after',
                        runValidators: true,
                        session
                    }
                )
                if (deliveryPartnerAccountExistsButDeletedByUser && userAccount) return deliveryPartnerAccountExistsButDeletedByUser;
                throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);
            })

            await emailQueue.add('deliveryPartnerAccountIsNowActive', { to: user.email, name: user.name, subject: 'you are now ready to work as deliveryPartner' })

            return mapper.deliveryPartnerMapper(accountFoundEarly)
        } catch (error) {
            throw error
        } finally {
            await session.endSession()
        }
    }

    if (!user.isVerified) throw new UnauthorizedError(ErrorCodes.AUTH.ACCOUNT_NOT_VERIFIED);
    const isRestaurantExists = await Restaurant.findOne({ ownerId: user._id }).lean()
    if (isRestaurantExists) throw new BadRequestError(ErrorCodes.ROLE.UNAUTHORIZED_ROLE);

    body.coordinates = JSON.parse(body.coordinates)
    const result = deliveryPartnerValidation.createDeliveryPartner.safeParse(body)
    if (!result.success) throw new ValidationError(`Error: ${result.error.issues.map((issue) => issue.message).join(', ')}`);

    const data = result.data
    if (!Object.keys(files).length !== 2) throw new BadRequestError(ErrorCodes.DELIVERY.INVALID_DOCUMENTS);

    const deliveryPartner = await utils.withCloudinaryCleanup(async (trackUploads) => {

        if (!files?.['adhaarCard']?.[0]) throw new BadRequestError("adhaar card is an required field");
        if (!files?.['vehiclePaper']?.[0]) throw new BadRequestError("vehicle paper is an required field");
        const [adhaarCard, vehiclePaper] = await Promise.all([
            utils.cloudinary.uploadOne(files['adhaarCard'][0], 'deliveryPartnerDocuments'),
            utils.cloudinary.uploadOne(files['vehiclePaper'][0], 'deliveryPartnerDocuments')
        ])
        trackUploads([adhaarCard, vehiclePaper])

        return DeliveryPartner.create({
            userId: user._id,
            vehicleType: data.vehicleType,
            vehicleNumber: data.vehicleNumber,
            currentLocation: { coordinates: data.coordinates },
            documents: { adhaarCard, vehiclePaper },
            status: 'PENDING'
        })
    })

    await emailQueue.add('deliveryPartnerCreationRequest', { to: user.email, name: user.name, subject: 'Delivery Partner Creation Request' })

    return mapper.deliveryPartnerMapper(deliveryPartner)
}

export const updateDeliveryPartner = async ({ body, files, deliveryPartnerId }) => {

    const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId).lean()
    if (!deliveryPartner) throw new NotFoundError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_NOT_FOUND);
    if (deliveryPartner.status !== 'ACTIVE') throw new ForbiddenError(ErrorCodes.DELIVERY.UNAUTHORIZED_STATUS);
    if (!deliveryPartner.isActive) throw new ForbiddenError(ErrorCodes.DELIVERY.ACCOUNT_INVACTIVE);

    const result = deliveryPartnerValidation.updateDeliveryPartner.safeParse(body)
    if (!result.success) throw new ValidationError(`ERROR: ${result.error.issues.map(issue => issue.message).join(', ')}`)

    const data = result.data

    const updatedDeliveryPartner = await utils.withCloudinaryCleanup(async (trackUploads) => {
        let adhaarCard, vehiclePaper;
        if (Object.keys(files).length) {
            if (files?.['adhaarCard']?.[0]) {
                adhaarCard = await utils.cloudinary.uploadOne(files['adhaarCard'][0], 'deliveryPartnerDocuments')
            }
            if (files?.['vehiclePaper']?.[0]) {
                vehiclePaper = await utils.cloudinary.uploadOne(files['vehiclePaper'][0], 'deliveryPartnerDocuments')
            }
        }
        if (adhaarCard || vehiclePaper) trackUploads([adhaarCard, vehiclePaper].filter(Boolean));

        return DeliveryPartner.findByIdAndUpdate(deliveryPartnerId,
            {
                $set: {
                    vehicleNumber: data.vehicleNumber,
                    vehicleType: data.vehicleType,
                    documents: {
                        adhaarCard: adhaarCard ?? deliveryPartner.documents.adhaarCard,
                        vehiclePaper: vehiclePaper ?? deliveryPartner.documents.vehiclePaper
                    }
                }
            },
            {
                returnDocument: 'after'
            }
        ).lean()
    })
    return mapper.deliveryPartnerMapper(updatedDeliveryPartner)
}

export const getDeliveryPartnerDetails = async ({ deliveryPartnerId, user }) => {

    const deliveryPartner = await DeliveryPartner.findOne({ _id: deliveryPartnerId, userId: user._id })
    if (!deliveryPartner) throw new NotFoundError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_NOT_FOUND);

    return mapper.deliveryPartnerMapper(deliveryPartner)
}

export const deleteDeliveryPartner = async ({ deliveryPartnerId, user }) => {

    const session = await mongoose.startSession()
    try {
        const deliveryPartnerForMapper = await session.withTransaction(async () => {

            let returnAbleDeliveryPartner;
            const deliveryPartner = await DeliveryPartner.findOneAndUpdate(
                {
                    _id: deliveryPartnerId,
                    userId: user._id,
                    isActive: true,
                    status: 'ACTIVE'
                },
                {
                    $set: {
                        isActive: false
                    }
                },
                {
                    returnDocument: 'after',
                    session
                }
            ).lean()

            if (!deliveryPartner) {
                const isDeliveryPartnerExists = await DeliveryPartner.findOne({ _id: deliveryPartnerId, userId: user._id }).lean()
                if (!isDeliveryPartnerExists) throw new NotFoundError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_NOT_FOUND);
                if (isDeliveryPartnerExists.status !== 'ACTIVE') throw new ForbiddenError(ErrorCodes.DELIVERY.ACCOUNT_INVACTIVE);
                if (isDeliveryPartnerExists.isActive) throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);
                returnAbleDeliveryPartner = isDeliveryPartnerExists
            } else {
                returnAbleDeliveryPartner = deliveryPartner
            }

            await User.findByIdAndUpdate(user._id,
                {
                    $set: {
                        role: 'CUSTOMER'
                    }
                },
                {
                    runValidators: true,
                    session
                }
            )

            return returnAbleDeliveryPartner
        })

        return mapper.deliveryPartnerMapper(deliveryPartnerForMapper)
    } finally {
        await session.endSession()
    }
}

export const setDeliveryPartnerStatusToOnline = async ({ deliveryPartnerId, userId }) => {
    const deliveryPartner = await DeliveryPartner.findOneAndUpdate(
        {
            _id: deliveryPartnerId,
            userId: userId,
            status: 'ACTIVE',
            isActive: true
        },
        {
            $set: {
                isOnline: true
            }
        },
        {
            returnDocument: 'after'
        }
    )
    if (!deliveryPartner) {
        const isDeliveryPartnerExists = await DeliveryPartner.findOne({ _id: deliveryPartnerId, userId: userId })
        if (!isDeliveryPartnerExists) throw new NotFoundError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_NOT_FOUND);
        if (isDeliveryPartnerExists.status !== 'ACTIVE') throw new UnauthorizedError(ErrorCodes.DELIVERY.UNAUTHORIZED_STATUS);
        if (!isDeliveryPartnerExists.isActive) throw new ForbiddenError(ErrorCodes.DELIVERY.ACCOUNT_INVACTIVE);
        if (!isDeliveryPartnerExists.isOnline) throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);
    }

    return mapper.deliveryPartnerMapper(deliveryPartner)
}

export const setDeliveryPartnerStatusToOffline = async ({ deliveryPartnerId, userId }) => {
    const deliveryPartner = await DeliveryPartner.findOneAndUpdate(
        {
            _id: deliveryPartnerId,
            userId: userId,
            status: 'ACTIVE',
            isActive: true
        },
        {
            $set: {
                isOnline: false
            }
        },
        {
            returnDocument: 'after'
        }
    )
    if (!deliveryPartner) {
        const isDeliveryPartnerExists = await DeliveryPartner.findOne({ _id: deliveryPartnerId, userId: userId })
        if (!isDeliveryPartnerExists) throw new NotFoundError(ErrorCodes.DELIVERY.DELIVERY_PARTNER_NOT_FOUND);
        if (isDeliveryPartnerExists.status !== 'ACTIVE') throw new UnauthorizedError(ErrorCodes.DELIVERY.UNAUTHORIZED_STATUS);
        if (!isDeliveryPartnerExists.isActive) throw new ForbiddenError(ErrorCodes.DELIVERY.ACCOUNT_INVACTIVE);
        if (isDeliveryPartnerExists.isOnline) throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);
    }

    return mapper.deliveryPartnerMapper(deliveryPartner)
}