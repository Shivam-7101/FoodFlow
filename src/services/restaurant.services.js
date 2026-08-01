import { User, Restaurant } from '../models/index.js'
import * as restaurantValidation from '../validators/restaurantValidation.js'
import { BadRequestError, ConflictError, ErrorCodes, ValidationError } from '../errors/index.js'
import * as utils from '../utils/index.js'
import mongoose, { mongo } from 'mongoose'
import * as mapper from '../mapper/index.js'

export const createRestaurant = async ({ userId, restaurantBody, files }) => {

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

    return  mapper.restaurantMapper(restaurant)
}