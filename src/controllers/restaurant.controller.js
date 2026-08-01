import * as utils from '../utils/index.js'
import * as restaurantServices from '../services/restaurant.services.js'

export const createRestaurant = utils.asyncHandler(async (req, res) => {

    const restuarant = await restaurantServices.createRestaurant({ userId: req.auth.user._id, files: req.files, restaurantBody: req.body })

    res.status(201).json(new utils.ApiResponse(201, { restuarant }, 'restaurant opening application submitted.'))
})