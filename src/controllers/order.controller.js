import * as orderServices from '../services/order.services.js'
import * as utils from '../utils/index.js'

export const createOrder = utils.asyncHandler(async (req, res) => {

    const data = await orderServices.createOrder({ user: req.auth.user, body: req?.body || {} })

    res.status(201).json(new utils.ApiResponse(201, { order: data.order, razorpayOrder: data.razorpayOrder, razorpay_key: process.env.RAZORPAY_KEY_ID }, 'order created successfully, please proceed with payment'))
})