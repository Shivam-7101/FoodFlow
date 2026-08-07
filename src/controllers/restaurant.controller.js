import * as utils from '../utils/index.js'
import * as restaurantServices from '../services/restaurant.services.js'

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

    const restaurant = await restaurantServices.getRestaurant({
        userId: req.auth.user._id,
        restaurantId: req.params?.id
    })

    res.status(200).json(new utils.ApiResponse(200, { restaurant }, 'restaurant details fetched successfully.'))
})