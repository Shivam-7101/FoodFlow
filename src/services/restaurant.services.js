import { Restaurant, Food } from '../models/index.js'
import * as restaurantValidation from '../validators/restaurantValidation.js'
import { BadRequestError, ConflictError, ErrorCodes, ForbiddenError, InternalServerError, NotFoundError, ValidationError } from '../errors/index.js'
import * as utils from '../utils/index.js'
import mongoose from 'mongoose'
import * as mapper from '../mapper/index.js'
import * as queue from '../queues/index.js'

export const createRestaurant = async ({ userId, email, name, restaurantBody, files }) => {

    restaurantBody.address = JSON.parse(restaurantBody.address)
    restaurantBody.openingHours = JSON.parse(restaurantBody.openingHours)
    const result = restaurantValidation.createRestaurant.safeParse(restaurantBody)
    if (!result.success) throw new ValidationError(`ERROR: ${result.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')}`);

    const data = result.data
    const restuarantExists = await Restaurant.exists({
        ownerId: userId,
        name: data.name,
        "address.addressLine1": data.address.addressLine1
    })
    if (restuarantExists) throw new ConflictError(ErrorCodes.RESTAURANT.RESTAURANT_ALREADY_EXISTS);

    const address = {
        addressLine1: data.address.addressLine1,
        addressLine2: data.address?.addressLine2,
        city: data.address.city,
        state: data.address.state,
        country: data.address.country,
        postalCode: data.address.postalCode
    }
    const openingHours = {
        open: data.openingHours.open,
        close: data.openingHours.close
    }

    const restaurant = await utils.withCloudinaryCleanup(async (trackUploads) => {

        let logo = null
        let banner = null
        if (!files || !files?.['logo']?.[0]) throw new BadRequestError(ErrorCodes.IMAGE.IMAGE_NOT_FOUND);
        logo = await utils.cloudinary.uploadOne(files['logo']?.[0], 'logos')
        if (files && files?.['banner']?.[0]) {
            banner = await utils.cloudinary.uploadOne(files['banner']?.[0], 'banners')
        }
        trackUploads([logo, banner].filter(Boolean))

        return Restaurant.create({
            name: data.name,
            description: data.description,
            address: address,
            openingHours: openingHours,
            logo: logo,
            banner: banner,
            status: 'PENDING',
            minimumOrderAmount: data.minimumOrderAmount,
            deliveryFee: data.deliveryFee,
            ownerId: userId
        })
    })
    await queue.emailQueue.add('restaurantCreationRequest', { to: email, name: name, subject: 'Restaurant creation request.' })

    return mapper.restaurantMapper(restaurant)
}

export const updateRestaurant = async ({ userId, restaurantId, restaurantBody, files }) => {

    restaurantBody.address = JSON.parse(restaurantBody.address)
    restaurantBody.openingHours = JSON.parse(restaurantBody.openingHours)
    const result = restaurantValidation.createRestaurant.safeParse(restaurantBody)
    if (!result.success) throw new ValidationError(ErrorCodes.VALIDATION.INVALID_INPUT);
    const data = result.data

    const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        ownerId: userId
    })
    if (!restaurant) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);
    if (restaurant.status !== 'ACTIVE' || !restaurant.isActive) throw new BadRequestError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE);

    const updatedRestaurant = await utils.withCloudinaryCleanup(async (trackUploads) => {

        let logo, banner;
        if (files?.logo?.[0]) {
            logo = await utils.cloudinary.uploadOne(files.logo[0], 'logos')
            if (logo) {
                await utils.cloudinary.deleteOne(restaurant.logo.public_id)
            }
        }
        if (files?.banner?.[0]) {
            banner = await utils.cloudinary.uploadOne(files.banner[0], 'banners')
            if (banner) {
                if (restaurant.banner) {
                    await utils.cloudinary.deleteOne(restaurant.banner.public_id)
                }
            }
        }
        trackUploads([logo, banner].filter(Boolean))

        const newlyUpdatedRestaurant = await Restaurant.findOneAndUpdate(
            {
                _id: restaurantId,
                ownerId: userId,
                status: 'ACTIVE'
            },
            {
                $set: {
                    name: data.name,
                    description: data.description,
                    address: data.address,
                    openingHours: data.openingHours,
                    minimumOrderAmount: data.minimumOrderAmount,
                    deliveryFee: data.deliveryFee,
                    logo: logo || restaurant.logo,
                    banner: banner || restaurant.banner,
                }
            },
            {
                returnDocument: 'after'
            }
        )
        if (!newlyUpdatedRestaurant) {
            const existingRestaurant = await Restaurant.findOne({
                _id: restaurantId,
                ownerId: userId,
                status: 'ACTIVE'
            })
            if (!existingRestaurant) throw new NotFoundError(`${ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND} OR ${ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE}`);

            return existingRestaurant
        }
        return newlyUpdatedRestaurant
    })

    await utils.cache.invalidateRestaurant({ restaurantId: updatedRestaurant._id })
    return mapper.restaurantMapper(updatedRestaurant)
}

export const deleteRestaurant = async ({ userId, restaurantId }) => {

    const session = await mongoose.startSession()
    try {
        return await session.withTransaction(async () => {

            let returnableRestaurant;
            const restaurant = await Restaurant.findOneAndUpdate(
                {
                    _id: restaurantId,
                    ownerId: userId,
                    status: {
                        $in: ['ACTIVE', 'SUSPENDED']
                    }
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
            )
            if (!restaurant) {
                const existingRestaurant = await Restaurant.findById(restaurantId, null, { session })
                if (!existingRestaurant) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);
                if (existingRestaurant.status !== 'ACTIVE' || existingRestaurant.status !== 'SUSPENDED') throw new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE);

                returnableRestaurant = existingRestaurant
            } else {
                returnableRestaurant = restaurant
            }

            await Food.updateMany(
                {
                    restaurantId: returnableRestaurant._id,
                    isActive: true
                },
                {
                    $set: {
                        isActive: false
                    }
                },
                { session }
            )
            await utils.cache.invalidateRestaurant({ restaurantId: returnableRestaurant._id })
            return returnableRestaurant
        })
    } finally {
        await session.endSession()
    }
}

export const getRestaurant = async ({ userId, restaurantId }) => {

    const restaurant = await utils.cache.getRestaurant({ restaurantId })

    if (!restaurant.status || restaurant.data.ownerId?.toString() !== userId.toString()) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);

    return mapper.restaurantMapper(restaurant)
}

export const setRestaurantStatusToOpen = async ({ restaurantId, ownerId }) => {
    const restaurant = await Restaurant.findOneAndUpdate(
        {
            _id: restaurantId,
            ownerId: ownerId,
            status: 'ACTIVE',
            isActive: true
        },
        {
            $set: {
                isOpen: true
            }
        },
        {
            returnDocument: 'after'
        }
    )
    if (!restaurant) {
        const isRestaurantExists = await Restaurant.findOne({ _id: restaurantId, ownerId: ownerId })
        if (!isRestaurantExists) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);
        if (isRestaurantExists.status !== 'ACTIVE') throw new UnauthorizedError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE);
        if (!isRestaurantExists.isActive) throw new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_DELETED);
        if (!isRestaurantExists.isOpen) throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);
    }
    await utils.cache.invalidateRestaurant({ restaurantId: restaurant._id })
    return mapper.restaurantMapper(restaurant)
}

export const setRestaurantStatusToClose = async ({ restaurantId, ownerId }) => {
    const restaurant = await Restaurant.findOneAndUpdate(
        {
            _id: restaurantId,
            ownerId: ownerId,
            status: 'ACTIVE',
            isActive: true
        },
        {
            $set: {
                isOpen: false
            }
        },
        {
            returnDocument: 'after'
        }
    )
    if (!restaurant) {
        const isRestaurantExists = await Restaurant.findOne({ _id: restaurantId, ownerId: ownerId })
        if (!isRestaurantExists) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);
        if (isRestaurantExists.status !== 'ACTIVE') throw new UnauthorizedError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE);
        if (!isRestaurantExists.isActive) throw new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_DELETED);
        if (isRestaurantExists.isOpen) throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);
    }
    await utils.cache.invalidateRestaurant({ restaurantId: restaurant._id })
    return mapper.restaurantMapper(restaurant)
}