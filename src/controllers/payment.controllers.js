import * as paymentServices from '../services/payment.services.js'
import { Order } from '../models/index.js'
import * as utils from '../utils/index.js'

export const verifyPaymentFromClient = utils.asyncHandler(async (req, res) => {

    const data = await paymentServices.verifyPaymentFromClient({ body: req.body, orderId: req?.params?.orderId })

    if (!data.status) {
        return res.status(400).json(new utils.ApiResponse(400, data, data.message))
    }

    res.status(200).json(new utils.ApiResponse(200, data, data.message))
})

export const verifyWebhookSignature = utils.asyncHandler(async (req, res) => {

    const data = await paymentServices.verifyWebhookSignature({
        body: req.body,
        rawBody: req.rawBody,
        signature: req.headers['x-razorpay-signature']
    })

    res.status(200).send(data.message)
})