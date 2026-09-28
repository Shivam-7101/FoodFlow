import { z } from 'zod'
import { isValidObjectId } from 'mongoose'

export const paymentBody = z.object({
    razorpay_payment_id: z.string().min(1),
    razorpay_order_id: z.string().min(1),
    razorpay_signature: z.string().min(1)
})