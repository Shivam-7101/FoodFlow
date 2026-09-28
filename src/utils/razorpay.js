import * as razorpay from '../config/razorpay.js'
import { ErrorCodes, BadRequestError } from '../errors/index.js'

export const createRazorpayOrder = ({ amount }) => {
    if (typeof amount !== 'number' || amount <= 0) throw new BadRequestError(`ORDER-AMOUNT-ERR: minimum order amount should be 1.`);

    return razorpay.createRazorpayOrder({ amount })
}

export const validatePaymentVerification = ({ razorpayOrderId, razorpayPaymentId, signature }) => {
    return razorpay.validatePaymentVerification({ razorpayOrderId, razorpayPaymentId, signature })
}

export const validateWebhookSignature = ({ reqBody, signature }) => {
    return razorpay.validateWebhookSignature({ reqBody, signature })
}

export const refund = ({ paymentId, amount = 0, reason }) => {

    if (amount <= 1) {
        return razorpay.refund({ paymentId, reason, amount: 0 })
    }
    return razorpay.refund({ paymentId, reason, amount })
}