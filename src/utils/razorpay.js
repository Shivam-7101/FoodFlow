import * as razorpay from '../config/razorpay.js'
import { ErrorCodes, BadRequestError } from '../errors/index.js'

export const createRazorpayOrder = ({ amount }) => {
    if (typeof amount !== 'number' || amount <= 0) throw new BadRequestError(`ORDER-AMOUNT-ERR: minimum order amount should be 1.`);

    return  razorpay.createRazorpayOrder({ amount })
}