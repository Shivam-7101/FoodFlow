import * as utils from '../utils/index.js'
import * as restaurantServices from '../services/restaurant.services.js'
import { InternalServerError } from '../errors/InternalServerError.js'
import { ErrorCodes } from '../errors/Errorcodes.js'

export const createRestaurant = utils.asyncHandler(async (req, res) => {

    const restuarant = await restaurantServices.createRestaurant({ userId: req.auth.user._id, email: req.auth.user.email, name: req.auth.user.name, files: req.files, restaurantBody: req.body })

    res.status(201).json(new utils.ApiResponse(201, { restuarant }, 'restaurant opening application submitted.'))
})

export const updateRestaurant = utils.asyncHandler(async (req, res) => {

    const restaurant = await restaurantServices.updateRestaurant({
        userId: req.auth.user._id,
        files: req?.files || {},
        restaurantBody: req.body,
        restaurantId: req.params?.id
    })

    res.status(200).json(new utils.ApiResponse(200, { restaurant }, 'restaurant updated successfully.'))
})

export const deleteRestaurant = utils.asyncHandler(async (req, res) => {

    await restaurantServices.deleteRestaurant({
        userId: req.auth.user._id,
        restaurantId: req.params?.id
    })

    res.status(200).json(new utils.ApiResponse(200, {}, 'restaurant deleted successfully.'))
})

export const getRestaurant = utils.asyncHandler(async (req, res) => {

    console.log(`RESTAURANT ID: ${req.params?.id}`)
    console.log(`USER ID: ${req.auth.user._id}`)
    const restaurant = await restaurantServices.getRestaurant({
        userId: req.auth.user._id,
        restaurantId: req.params?.id
    })

    res.status(200).json(new utils.ApiResponse(200, { restaurant }, 'restaurant details fetched successfully.'))
})

export const setRestaurantStatusToOpen = utils.asyncHandler(async (req, res) => {

    const restaurant = await restaurantServices.setRestaurantStatusToOpen({
        ownerId: req.auth.user._id,
        restaurantId: req.params?.id
    })

    res.status(200).json(new utils.ApiResponse(200, { restaurant }, 'restaurant status set to open successfully.'))
})

export const setRestaurantStatusToClose = utils.asyncHandler(async (req, res) => {

    const restaurant = await restaurantServices.setRestaurantStatusToClose({
        ownerId: req.auth.user._id,
        restaurantId: req.params?.id
    })
    res.status(200).json(new utils.ApiResponse(200, { restaurant }, 'restaurant status set to close successfully.'))
})

export const acceptOrder = utils.asyncHandler(async (req, res) => {

    const isAccepted = await restaurantServices.acceptOrder({ orderId: req.params.orderId })

    if (!isAccepted) throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);

    res.status(200).json(new utils.ApiResponse(200, { orderId: req.params.orderId }, 'order accepted successfully.'))
})

export const rejectOrder = utils.asyncHandler(async (req, res) => {

    const isRejected = await restaurantServices.rejectOrder({ orderId: req.params.orderId })

    if (!isRejected) throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);

    res.status(200).json(new utils.ApiResponse(200, { orderId: req.params.orderId }, 'order rejected successfully.'))
})

export const preparingOrder = utils.asyncHandler(async (req, res) => {

    const isPreparingOrder = await restaurantServices.preparingOrder({ orderId: req.params.orderId })

    if (!isPreparingOrder) throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);

    res.status(200).json(new utils.ApiResponse(200, { orderId: req.params.orderId }, 'order status successfully set to preparing.'))
})

export const readyForPickup = utils.asyncHandler(async (req, res) => {

    const isPreparingOrder = await restaurantServices.readyForPickup({ orderId: req.params.orderId })

    if (!isPreparingOrder) throw new InternalServerError(ErrorCodes.COMMON.SOMETHING_WENT_WRONG);

    res.status(200).json(new utils.ApiResponse(200, { orderId: req.params.orderId }, 'order status successfully set to ready for pickup.'))
})