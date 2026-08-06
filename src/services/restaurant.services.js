import { User, Restaurant, Food } from '../models/index.js'
import * as restaurantValidation from '../validators/restaurantValidation.js'
import { BadRequestError, ConflictError, ErrorCodes, ForbiddenError, NotFoundError, ValidationError } from '../errors/index.js'
import * as utils from '../utils/index.js'
import mongoose, { mongo } from 'mongoose'
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
    await queue.emailQueue.add('restaurant-creation-request-notification', { to: email, name: name, subject: 'Restaurant creation request.' })

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
                if (!restaurant.banner) return;
                await utils.cloudinary.deleteOne(restaurant.banner.public_id)
            }
        }
        trackUploads([logo, banner].filter(Boolean))

        const newlyUpdatedRestaurant = await Restaurant.findOneAndUpdate(
            {
                _id: restaurantId,
                ownerId: userId,
                role: 'ACTIVE'
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
                    banner: banner || restaurant.banner
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
                    role: {
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
                if (existingRestaurant.role !== 'ACTIVE' || existingRestaurant.role !== 'SUSPENDED') throw new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE);

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

            return returnableRestaurant
        })
    } finally {
        await session.endSession()
    }
}

export const getRestaurantForOwner = async ({ userId, restaurantId }) => {
    const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        ownerId: userId,
        status: 'ACTIVE',
        isActive: true
    })
    if (!restaurant) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);

    return mapper.restaurantMapper(restaurant)
}

export const getRestaurantForCustomer = async ({ restaurantId }) => {

    const restaurant = await Restaurant.aggregate([
        {
            $match: {
                _id: restaurantId,
                status: "ACTIVE",
                isActive: true
            }
        },
        {
            $lookup: {
                from: "foods",
                let: { rId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$restaurantId', '$$rId']
                            },
                            isActive: true,
                            isAvailable: true
                        }
                    },
                    {
                        $sort: {
                            createdAt: -1
                        }
                    },
                    {
                        $limit: 10
                    },
                    {
                        $project: {
                            _id: 0,
                            category: 1,
                            name: 1,
                            images: 1,
                            isVeg: 1,
                            variants: 1
                        }
                    }
                ],
                as: 'foods'
            }
        },
        {
            $project: {
                _id: 0,
                name: 1,
                description: 1,
                logo: 1,
                banner: 1,
                address: 1,
                openingHours: 1,
                isOpen: 1,
                ratings: 1,
                totalRatings: 1,
                createdAt: 1,
                foods: 1
            }
        }
    ])

    if (!restaurant.length) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);

    return restaurant?.[0]
}