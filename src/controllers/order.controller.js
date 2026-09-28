import * as orderServices from '../services/order.services.js'
import * as utils from '../utils/index.js'

export const createOrder = utils.asyncHandler(async (req, res) => {

    const data = await orderServices.createOrder({ user: req.auth.user, body: req?.body || {} })

    const returnAbleData = { order: data.order }
    if (data.razorpayOrder) {
        returnAbleData.razorpayOrder = data.razorpayOrder
        returnAbleData.razorpayKey = process.env.RAZORPAY_KEY_ID
    }

    res.status(201).json(new utils.ApiResponse(201, returnAbleData, 'order checkout succes'))
})