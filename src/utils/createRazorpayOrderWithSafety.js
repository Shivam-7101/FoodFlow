import { BadRequestError } from "../errors/index.js"
import * as razorpay from './razorpay.js'
import { FoodVariant, Order } from '../models/index.js'

export const createRazorpayOrderWithSafety = async ({ amount, bulkOperation, orderId }) => {
    try {
        return  razorpay.createRazorpayOrder({ amount });
    } catch (error) {
        console.log(`RAZORPAY ERR: failed to create razorpay order.`)
        await Promise.all([
            FoodVariant.bulkWrite(bulkOperation),
            Order.findByIdAndUpdate(orderId, { $set: { status: 'FAILED' } })
        ])
        throw error
    }
};
